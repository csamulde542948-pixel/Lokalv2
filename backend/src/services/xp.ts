/**
 * XP Service
 * Handles XP awarding, daily caps, anti-cheat guards, and rank-up detection.
 * Called from resolvers after relevant mutations.
 *
 * ── Anti-cheat & capping rules ───────────────────────────────────────────────
 *
 * 1. PER-ACTION DAILY CAP
 *    Each action has a maximum number of times it can award XP in a single
 *    calendar day (UTC).  Extra calls beyond the cap silently return 0.
 *    This stops bot-farming patterns like creating 1000 posts for 10000 XP.
 *
 * 2. GLOBAL DAILY XP CAP
 *    A user cannot earn more than DAILY_XP_HARD_CAP XP in total within one
 *    calendar day (UTC), regardless of which actions produced it.
 *    This is the last-resort ceiling against coordinated abuse.
 *
 * 3. ONE-TIME ACTION GUARD
 *    Actions that should only ever fire once (COMPLETE_PROFILE) are enforced
 *    here — if the user already has an xp_log entry for that action, the award
 *    is silently skipped.
 *
 * 4. SELF-INTERACTION GUARD
 *    Caller resolvers must NOT call awardXp(actorId, "RECEIVE_LIKE") where
 *    actorId == likerId.  The check is also enforced here as a safety net.
 *    (The resolver layer already skips notifications to self; this mirrors it
 *     in the XP layer.)
 *
 * 5. IP-BASED CROSS-ACCOUNT FRAUD DETECTION
 *    If multiple distinct accounts earn XP from the same IPv4/v6 address
 *    within a single UTC day, this is a strong signal of alt-account farming.
 *    Threshold: if IP_MAX_ACCOUNTS_PER_DAY or more DIFFERENT profileIds have
 *    already earned XP from this IP today, further awards to any NEW profile
 *    from the same IP are silently blocked.  Accounts that have ALREADY earned
 *    XP from this IP today are NOT blocked — only genuinely new entrants.
 *    Pass `clientIp` from the GraphQL context to enable this guard.
 */

import { prisma } from "../lib/prisma";

const XP_REWARDS: Record<string, number> = {
  CREATE_POST: 10,
  LAUNCH_PROJECT: 100,
  GET_ROASTED: 50,
  RECEIVE_LIKE: 2,
  RECEIVE_COMMENT: 5,
  SHARE_PROJECT: 15,
  COMPLETE_PROFILE: 50,
  MAKE_CONNECTION: 20,
  REGISTER_EVENT: 10,
  CREATE_JOB: 30,
  LAUNCHPAD_INTEREST_RECEIVED: 5,
  // Roast Token reactions
  GIVE_ROAST_REACT: 3,      // reactor earns XP for spending a token
  RECEIVE_ROAST_REACT: 8,   // post owner earns XP when their roast gets a 🔥 react
};

// ─── Daily per-action caps ────────────────────────────────────────────────────
// How many times per UTC day a single user can earn XP for each action.
// Actions NOT listed here default to DEFAULT_DAILY_ACTION_CAP.
const DAILY_ACTION_CAPS: Partial<Record<string, number>> = {
  CREATE_POST:                10,   // max 100 XP/day from posting
  RECEIVE_LIKE:               50,   // max 100 XP/day from received likes
  RECEIVE_COMMENT:            20,   // max 100 XP/day from received comments
  SHARE_PROJECT:              5,    // max 75 XP/day from sharing
  LAUNCHPAD_INTEREST_RECEIVED: 20,  // max 100 XP/day from launchpad interest
  MAKE_CONNECTION:            10,   // max 200 XP/day from follows
  REGISTER_EVENT:             3,    // max 30 XP/day from registrations
  LAUNCH_PROJECT:             2,    // max 200 XP/day from launching
  GET_ROASTED:                5,    // max 250 XP/day
  CREATE_JOB:                 3,    // max 90 XP/day
  GIVE_ROAST_REACT:           3,    // max 9 XP/day (3 tokens × 3 XP)
  RECEIVE_ROAST_REACT:        20,   // max 160 XP/day from incoming 🔥 reacts
  // One-time actions — enforced separately, but set cap=1 as belt-and-suspenders
  COMPLETE_PROFILE:           1,
};
const DEFAULT_DAILY_ACTION_CAP = 10;

// ─── Global daily XP ceiling ─────────────────────────────────────────────────
// A user cannot earn more than this many XP in a single UTC calendar day.
// Designed to allow a very active legitimate power user (~500 XP/day per the
// simulation in RANK_ROLE_SPEC.md) while blocking bots.
const DAILY_XP_HARD_CAP = 500;

// ─── One-time-only actions ────────────────────────────────────────────────────
// These actions may only ever produce XP once per account lifetime.
const ONE_TIME_ACTIONS = new Set(["COMPLETE_PROFILE"]);

// ─── IP fraud detection ───────────────────────────────────────────────────────
// If this many distinct accounts try to earn XP from the same IP in one UTC day
// we treat every additional NEW account as a likely alt-account farm and block it.
const IP_MAX_ACCOUNTS_PER_DAY = 5;

/**
 * Returns the set of distinct profileIds that have already earned XP from
 * `ip` today (UTC).  If the count reaches IP_MAX_ACCOUNTS_PER_DAY, any profile
 * NOT already in the set is blocked.
 *
 * We store ip in xp_logs via the optional `ipAddress` column (added in
 * migration 19_rank_thresholds_v2.sql).  If the column doesn't exist yet the
 * query will throw a Prisma validation error — we catch it and skip the guard
 * so as not to break existing deployments before the migration runs.
 */
async function xpAccountsFromIpToday(ip: string): Promise<Set<string>> {
  try {
    const startOfDay = new Date(`${todayUtc()}T00:00:00.000Z`);
    const rows = await (prisma.xpLog as any).findMany({
      where: { ipAddress: ip, createdAt: { gte: startOfDay } },
      select: { profileId: true },
      distinct: ["profileId"],
    }) as { profileId: string }[];
    return new Set(rows.map((r) => r.profileId));
  } catch {
    // Column not yet available — skip the guard gracefully
    return new Set();
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the UTC date string "YYYY-MM-DD" for today */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Count how many times a user has already earned XP for `action` today (UTC).
 * Uses xp_logs which are already written atomically alongside each XP grant.
 */
async function countTodayLogs(profileId: string, action: string): Promise<number> {
  const startOfDay = new Date(`${todayUtc()}T00:00:00.000Z`);
  return prisma.xpLog.count({
    where: {
      profileId,
      action,
      createdAt: { gte: startOfDay },
    },
  });
}

/**
 * Sum of all XP earned by a user today (UTC) across all actions.
 */
async function totalXpToday(profileId: string): Promise<number> {
  const startOfDay = new Date(`${todayUtc()}T00:00:00.000Z`);
  const result = await prisma.xpLog.aggregate({
    where: { profileId, createdAt: { gte: startOfDay } },
    _sum: { xpEarned: true },
  });
  return result._sum.xpEarned ?? 0;
}

/**
 * Award XP to a profile for an action.
 *
 * Enforces:
 *  - One-time action guard (COMPLETE_PROFILE etc.)
 *  - Per-action daily cap (configurable per action)
 *  - Global daily XP hard cap (500 XP/day)
 *
 * Checks for rank-up and returns the new rank name if leveled up.
 * Returns { blocked: true } silently when any cap is hit — never throws.
 */
export async function awardXp(
  profileId: string,
  action: keyof typeof XP_REWARDS,
  /** Optional: pass the actor's userId to enforce self-interaction guard */
  actorId?: string,
  /** Optional: pass clientIp from GraphQL context for IP fraud detection */
  clientIp?: string
): Promise<{ newXp: number; leveledUp: boolean; newRankName?: string; blocked?: boolean }> {
  const xpToAdd = XP_REWARDS[action];
  if (!xpToAdd) return { newXp: 0, leveledUp: false };

  // ── Self-interaction guard ──────────────────────────────────────────────────
  // Receiving-type rewards must not be awarded when the actor is the same person
  // (e.g. user likes their own post through an API call).
  if (actorId && actorId === profileId) {
    return { newXp: 0, leveledUp: false, blocked: true };
  }

  // ── IP cross-account fraud guard ────────────────────────────────────────────
  // Block if this IP has already had IP_MAX_ACCOUNTS_PER_DAY distinct earners
  // today AND the current profile is not one of them (new alt account).
  if (clientIp) {
    const ipAccounts = await xpAccountsFromIpToday(clientIp);
    if (ipAccounts.size >= IP_MAX_ACCOUNTS_PER_DAY && !ipAccounts.has(profileId)) {
      return { newXp: 0, leveledUp: false, blocked: true };
    }
  }

  // ── One-time action guard ───────────────────────────────────────────────────
  if (ONE_TIME_ACTIONS.has(action)) {
    const alreadyEarned = await prisma.xpLog.findFirst({
      where: { profileId, action },
      select: { id: true },
    });
    if (alreadyEarned) return { newXp: 0, leveledUp: false, blocked: true };
  }

  // ── Per-action daily cap ────────────────────────────────────────────────────
  const actionCap = DAILY_ACTION_CAPS[action] ?? DEFAULT_DAILY_ACTION_CAP;
  const todayCount = await countTodayLogs(profileId, action);
  if (todayCount >= actionCap) {
    return { newXp: 0, leveledUp: false, blocked: true };
  }

  // ── Global daily XP hard cap ────────────────────────────────────────────────
  const earnedToday = await totalXpToday(profileId);
  if (earnedToday >= DAILY_XP_HARD_CAP) {
    return { newXp: 0, leveledUp: false, blocked: true };
  }
  // Partial award: if adding full xpToAdd would exceed cap, award only the remainder
  const effectiveXp = Math.min(xpToAdd, DAILY_XP_HARD_CAP - earnedToday);

  // CRIT-06: Atomic increment — avoids TOCTOU race condition on concurrent requests.
  // prisma.profile.update with { increment } issues a single atomic UPDATE in Postgres,
  // so two simultaneous calls cannot both read the same stale xp value.
  const [updated] = await prisma.$transaction([
    prisma.profile.update({
      where: { id: profileId },
      data: { xp: { increment: effectiveXp } },
      select: { xp: true, rankId: true },
    }),
    (prisma.xpLog as any).create({
      data: {
        profileId,
        action,
        xpEarned: effectiveXp,
        // Store IP for cross-account fraud detection (column added in migration 19)
        ...(clientIp ? { ipAddress: clientIp } : {}),
      },
    }),
  ]);

  if (!updated) return { newXp: 0, leveledUp: false };

  const newXp = updated.xp;

  // Get all ranks to check for level-up
  const ranks = await prisma.rank.findMany({ orderBy: { minXp: "asc" } });
  const newRank = ranks
    .filter((r: any) => newXp >= r.minXp)
    .pop(); // highest rank the user qualifies for

  const leveledUp = newRank !== undefined && newRank.id !== updated.rankId;

  // Update rankId if user leveled up
  if (leveledUp && newRank) {
    await prisma.profile.update({
      where: { id: profileId },
      data: { rankId: newRank.id },
    });
  }

  // Fire XP_LEVELUP notification when user ranks up
  if (leveledUp && newRank) {
    prisma.notification.create({
      data: {
        recipientId: profileId,
        type: "XP_LEVELUP",
        message: `You ranked up to ${newRank.name}! 🎉`,
      },
    }).catch(console.error);
  }

  return {
    newXp,
    leveledUp,
    newRankName: leveledUp ? newRank?.name : undefined,
  };
}

// ─── Role Award Service ───────────────────────────────────────────────────────

/**
 * Role names as stored in the `roles` table.
 * Keep in sync with the seed in 01_schema.sql.
 */
export const ROLE_NAMES = {
  OPEN_SOURCERER:    "Open Sourcerer",
  LAUNCH_KING:       "Launch King",
  ROAST_MASTER:      "Roast Master",
  EVENT_ORGANIZER:   "Event Organizer",
  HIRED:             "Hired!",
  TOP_CONTRIBUTOR:   "Top Contributor",
  MENTOR:            "Mentor",
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

/**
 * Award a named role to a profile (idempotent — silently skips if already earned).
 * Fires an EARNED_ROLE notification.
 */
export async function awardRole(
  profileId: string,
  roleName: RoleName
): Promise<{ awarded: boolean; roleName: string }> {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    console.warn(`[awardRole] Unknown role: ${roleName}`);
    return { awarded: false, roleName };
  }

  // Upsert — safe if already has the role
  const existing = await prisma.userRole.findUnique({
    where: { profileId_roleId: { profileId, roleId: role.id } },
  });
  if (existing) return { awarded: false, roleName };

  await prisma.userRole.create({ data: { profileId, roleId: role.id } });

  // Notify
  prisma.notification.create({
    data: {
      recipientId: profileId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: "EARNED_ROLE" as any,
      message: `You earned the ${role.emoji ?? ""} ${role.name} role! 🎉`,
    },
  }).catch(console.error);

  return { awarded: true, roleName };
}

/**
 * Check all auto-awardable roles for a profile and grant any newly qualified ones.
 * Call this after any action that could unlock a role.
 *
 * Role conditions (must match requirements in 01_schema.sql seed):
 *   - Launch King      : 5+ projects launched
 *   - Roast Master     : 10+ roasts submitted
 *   - Mentor           : 20+ comments on others' posts (rough proxy)
 *   - Top Contributor  : managed externally (leaderboard cron — not auto-checked here)
 *   - Event Organizer  : managed externally (event creation with 20+ attendees)
 *   - Hired!           : managed externally (manual award)
 *   - Open Sourcerer   : GitHub stars checked via scraper (external trigger)
 */
export async function checkAndAwardRoles(profileId: string): Promise<void> {
  try {
    const [projectCount, roastCount, commentCount] = await Promise.all([
      // Projects they launched
      prisma.project.count({ where: { authorId: profileId } }),
      // Roasts they submitted
      prisma.roast.count({ where: { reviewerId: profileId } }),
      // Comments on other people's posts
      prisma.postComment.count({
        where: {
          authorId: profileId,
          post: { authorId: { not: profileId } },
        },
      }),
    ]);

    const checks: Array<[boolean, RoleName]> = [
      [projectCount >= 5,  ROLE_NAMES.LAUNCH_KING],
      [roastCount  >= 10,  ROLE_NAMES.ROAST_MASTER],
      [commentCount >= 20, ROLE_NAMES.MENTOR],
    ];

    await Promise.allSettled(
      checks
        .filter(([cond]) => cond)
        .map(([, role]) => awardRole(profileId, role))
    );
  } catch (err) {
    console.error("[checkAndAwardRoles] error:", err);
  }
}
