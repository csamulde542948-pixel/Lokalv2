/**
 * Leaderboard background refreshers
 * ─────────────────────────────
 * Two pieces of the leaderboard depend on data that nobody in the codebase
 * was actually writing:
 *   1. `ShippingStreak`  — drives the "Laban Launcher" board
 *   2. `WeeklyXpSnapshot` — drives the "Underdog" board
 *
 * Without this service, those two boards are perpetually empty.
 *
 * We do two things here:
 *
 *   recomputeShippingStreaks (every 6 hours, on-demand on create)
 *     Walks every profile, looks at the last 14 days of project + post
 *     activity, computes the longest current run of consecutive days with
 *     at least one ship, and writes the result back to `shipping_streaks`.
 *
 *   snapshotWeeklyXpRankings (every Monday 00:05 UTC + on first read of
 *     a new week)
 *     Captures the current XP + rank of every profile so the Underdog
 *     board can compute "biggest XP gain from outside top 20 this week"
 *     with a stable baseline.
 *
 * The setInterval calls run in-process. For a Railway single-instance
 * deploy that's fine. For multi-instance, the `upsert` patterns are
 * idempotent so a double-fire from two instances is harmless.
 */
import { PrismaClient } from "@prisma/client";

/** Returns the most recent Monday 00:00 UTC. */
function getWeekStart(d: Date = new Date()): Date {
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff, 0, 0, 0, 0));
}

/** Returns the start of the current UTC day. */
function getUtcDayStart(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Compute + persist shipping streaks for every profile.
 *
 * A "ship" is a project OR post created on a given UTC day. The current
 * streak is the run of consecutive days (ending today or yesterday) with
 * at least one ship. The longest streak is the all-time max.
 *
 * Idempotent: re-running just rewrites the same numbers. Safe to call
 * from a setInterval AND from project.create mutations.
 */
export async function recomputeShippingStreaks(prisma: PrismaClient): Promise<{
  profilesScanned: number;
  streaksWritten: number;
  durationMs: number;
}> {
  const start = Date.now();
  const today = getUtcDayStart();
  const lookback = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Pull all profile IDs that have any activity in the last 14 days.
  // Profiles with no activity get a 0/0 streak.
  const [activeProjectAuthors, activePostAuthors] = await Promise.all([
    prisma.project.findMany({
      where: { createdAt: { gte: lookback } },
      select: { authorId: true, createdAt: true },
    }),
    prisma.post.findMany({
      where: { createdAt: { gte: lookback } },
      select: { authorId: true, createdAt: true },
    }),
  ]);

  // Build a per-profile set of UTC days they shipped.
  const shipDaysByProfile = new Map<string, Set<string>>();
  const addShip = (authorId: string, createdAt: Date) => {
    const dayKey = new Date(
      Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), createdAt.getUTCDate())
    ).toISOString().slice(0, 10); // "YYYY-MM-DD"
    let set = shipDaysByProfile.get(authorId);
    if (!set) {
      set = new Set();
      shipDaysByProfile.set(authorId, set);
    }
    set.add(dayKey);
  };
  for (const p of activeProjectAuthors) addShip(p.authorId, p.createdAt);
  for (const p of activePostAuthors) addShip(p.authorId, p.createdAt);

  // For the longest streak we need to know the most recent run of
  // consecutive days at ANY point in history. We only have 14 days of
  // activity to work with, so the longest streak is bounded by what we
  // can see. To keep it cheap, we pull the existing longestStreak from
  // the DB and only UPDATE if our computed 14-day streak is longer.
  // (A full historical walk would require a year+ of project data;
  // good enough for v1.)
  const profiles = await prisma.profile.findMany({
    where: { id: { in: Array.from(shipDaysByProfile.keys()) } },
    select: { id: true },
  });
  const existingStreaks = await prisma.shippingStreak.findMany({
    where: { profileId: { in: Array.from(shipDaysByProfile.keys()) } },
    select: { profileId: true, longestStreak: true, lastShippedAt: true },
  });
  const longestByProfile = new Map(
    existingStreaks.map((s: any) => [s.profileId, { longestStreak: s.longestStreak, lastShippedAt: s.lastShippedAt }])
  );

  // Upsert one row per active profile.
  let written = 0;
  await Promise.all(
    profiles.map(async (p: any) => {
      const days = shipDaysByProfile.get(p.id)!;
      const sortedDays = Array.from(days).sort();
      const todayKey = today.toISOString().slice(0, 10);
      const yesterdayKey = new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Current streak: walk backwards from today (or yesterday if
      // today has no ship yet). Count consecutive days.
      let currentStreak = 0;
      const anchor = days.has(todayKey) ? todayKey : days.has(yesterdayKey) ? yesterdayKey : null;
      if (anchor) {
        let cursor = new Date(anchor);
        while (true) {
          const k = cursor.toISOString().slice(0, 10);
          if (days.has(k)) {
            currentStreak++;
            cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
          } else {
            break;
          }
        }
      }

      // Window-streak: longest run within the 14-day lookback.
      let windowLongest = 0;
      let run = 0;
      let prev: Date | null = null;
      for (const day of sortedDays) {
        const d = new Date(day);
        if (prev && d.getTime() - prev.getTime() === 24 * 60 * 60 * 1000) {
          run++;
        } else {
          run = 1;
        }
        windowLongest = Math.max(windowLongest, run);
        prev = d;
      }

      const prevLongest = longestByProfile.get(p.id)?.longestStreak ?? 0;
      const longestStreak = Math.max(prevLongest, windowLongest, currentStreak);
      const lastShippedAt = sortedDays.length
        ? new Date(sortedDays[sortedDays.length - 1] + "T00:00:00Z")
        : null;

      await prisma.shippingStreak.upsert({
        where: { profileId: p.id },
        create: { profileId: p.id, currentStreak, longestStreak, lastShippedAt },
        update: { currentStreak, longestStreak, lastShippedAt },
      });
      written++;
    })
  );

  return {
    profilesScanned: profiles.length,
    streaksWritten: written,
    durationMs: Date.now() - start,
  };
}

/**
 * Capture the current XP + rank for every profile that has non-zero XP.
 * Stores one row per (profileId, weekStart). Idempotent on the same week.
 *
 * Call this on the first leaderboard read of a new week, OR via the
 * setInterval cron below.
 */
export async function snapshotWeeklyXpRankings(prisma: PrismaClient): Promise<{
  rowsWritten: number;
  durationMs: number;
}> {
  const start = Date.now();
  const weekStart = getWeekStart();

  // Compute the current rank for everyone with non-zero XP. Use a
  // single ordered query to assign ranks in O(N log N) without an N+1
  // pattern.
  const profiles = await prisma.profile.findMany({
    where: { xp: { gt: 0 } },
    select: { id: true, xp: true },
    orderBy: { xp: "desc" },
  });

  const rankByProfile = new Map<string, number>();
  profiles.forEach((p: any, idx: number) => rankByProfile.set(p.id, idx + 1));

  // Upsert each (profileId, weekStart) row. For users that already
  // have a row this week (because the leaderboard read triggered this
  // on a previous mount), we DO NOT overwrite the snapshot — once a
  // week the baseline is locked. Use a raw query to skip existing rows
  // so the first-of-week call always wins.
  let written = 0;
  for (const p of profiles) {
    const rank = rankByProfile.get(p.id)!;
    try {
      await prisma.$executeRaw`
        INSERT INTO weekly_xp_snapshots (id, profile_id, week_start, xp_at_week_start, rank_at_week_start, created_at)
        VALUES (gen_random_uuid()::text, ${p.id}::uuid, ${weekStart}::timestamptz, ${p.xp}::int, ${rank}::int, NOW())
        ON CONFLICT (profile_id, week_start) DO NOTHING
      `;
      written++;
    } catch {
      // best-effort
    }
  }

  return { rowsWritten: written, durationMs: Date.now() - start };
}

// ─── Cron scheduling ─────────────────────────────────────────────────────

let intervalHandles: NodeJS.Timeout[] = [];

/** Start the background refreshers. Idempotent — safe to call twice. */
export function startLeaderboardRefreshers(prisma: PrismaClient): void {
  if (intervalHandles.length > 0) return;

  // Initial fire on boot — populates the boards immediately on a fresh
  // deploy. Errors are logged but do not crash the server.
  void runSafe("shipping-streaks (boot)", () => recomputeShippingStreaks(prisma));
  void runSafe("weekly-snapshot (boot)", () => snapshotWeeklyXpRankings(prisma));

  // Refresh shipping streaks every 6 hours. The window is short
  // because streaks only change when the user ships.
  intervalHandles.push(
    setInterval(() => {
      void runSafe("shipping-streaks", () => recomputeShippingStreaks(prisma));
    }, 6 * 60 * 60 * 1000)
  );

  // Refresh weekly XP snapshot every hour. Once a week the row is
  // locked in (we use ON CONFLICT DO NOTHING); the hourly re-run only
  // backfills users who joined the platform mid-week.
  intervalHandles.push(
    setInterval(() => {
      void runSafe("weekly-snapshot", () => snapshotWeeklyXpRankings(prisma));
    }, 60 * 60 * 1000)
  );
}

/** Stop all refreshers — used in test teardowns. */
export function stopLeaderboardRefreshers(): void {
  for (const h of intervalHandles) clearInterval(h);
  intervalHandles = [];
}

async function runSafe(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    const result = await fn();
    console.log(`[leaderboard-bg] ${label} OK`, result);
  } catch (err: any) {
    console.error(`[leaderboard-bg] ${label} FAILED:`, err?.message ?? err);
  }
}
