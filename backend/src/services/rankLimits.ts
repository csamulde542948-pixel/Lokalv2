/**
 * Rank-based submission limits
 *
 * Controls how many Projects and Launchpad Events a user may create
 * in total (lifetime), based on their current rank.
 *
 * Philosophy:
 *  - Limits follow a natural progression: 1 → 2 → 3 → 5 → 8 → 10 → 15 → ∞
 *    (roughly Fibonacci-like), so each rank feels meaningfully more powerful.
 *  - Newbies get exactly 1 of each — enough to participate, not enough to spam.
 *  - Legend rank is unlimited — these users have demonstrably invested
 *    150,000+ XP in the community.
 *  - Projects and Launchpad Events share the same slot counts intentionally:
 *    both represent "I am shipping something real".
 *
 * ┌──────────────┬────────────┬──────────┬────────────────┐
 * │ Rank         │ XP range   │ Projects │ Launchpad Evts │
 * ├──────────────┼────────────┼──────────┼────────────────┤
 * │ Newbie       │ 0–999      │        1 │              1 │
 * │ Junior Dev   │ 1k–2.4k    │        2 │              2 │
 * │ Developer    │ 2.5k–5.9k  │        3 │              3 │
 * │ Senior Dev   │ 6k–14.9k   │        5 │              5 │
 * │ Tech Lead    │ 15k–34.9k  │        8 │              8 │
 * │ Architect    │ 35k–74.9k  │       10 │             10 │
 * │ Principal    │ 75k–149.9k │       15 │             15 │
 * │ Legend       │ 150k+      │        ∞ │              ∞ │
 * └──────────────┴────────────┴──────────┴────────────────┘
 *
 * Note: "unlimited" is represented as Number.MAX_SAFE_INTEGER internally.
 */

import { prisma } from "../lib/prisma";

// ─── Limit tables ─────────────────────────────────────────────────────────────

interface RankLimit {
  projects: number;
  launchpadEvents: number;
}

/**
 * Keys match the `name` field in the `ranks` table exactly.
 * Fallback for unknown rank names: Newbie limits (safest default).
 */
const RANK_LIMITS: Record<string, RankLimit> = {
  "Newbie":      { projects: 3,                       launchpadEvents: 1  },
  "Junior Dev":  { projects: 3,                       launchpadEvents: 2  },
  "Developer":   { projects: 3,                       launchpadEvents: 3  },
  "Senior Dev":  { projects: 5,                       launchpadEvents: 5  },
  "Tech Lead":   { projects: 8,                       launchpadEvents: 8  },
  "Architect":   { projects: 10,                      launchpadEvents: 10 },
  "Principal":   { projects: 15,                      launchpadEvents: 15 },
  "Legend":      { projects: Number.MAX_SAFE_INTEGER, launchpadEvents: Number.MAX_SAFE_INTEGER },
};

const FALLBACK_LIMIT: RankLimit = RANK_LIMITS["Newbie"];

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Returns the rank-based submission limits for a given profile.
 * Fetches the profile's rank name from the DB.
 * Falls back to Newbie limits if the rank is unknown.
 */
export async function getRankLimits(profileId: string): Promise<RankLimit & { rankName: string }> {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { rank: { select: { name: true } } },
  });

  const rankName = profile?.rank?.name ?? "Newbie";
  const limits = RANK_LIMITS[rankName] ?? FALLBACK_LIMIT;

  return { ...limits, rankName };
}

/**
 * Checks whether a user can create another project.
 * Throws a descriptive error if the limit is reached.
 */
export async function assertCanCreateProject(profileId: string): Promise<void> {
  const { projects: limit, rankName } = await getRankLimits(profileId);

  // Legend → no check needed
  if (limit === Number.MAX_SAFE_INTEGER) return;

  const current = await prisma.project.count({ where: { authorId: profileId } });

  if (current >= limit) {
    const nextRank = getNextRankName(rankName);
    const nextHint = nextRank
      ? ` Reach ${nextRank} rank to unlock more slots.`
      : "";
    throw new Error(
      `You've reached the project limit for ${rankName} rank (${limit} project${limit === 1 ? "" : "s"}).${nextHint}`
    );
  }
}

/**
 * Checks whether a user can create another launchpad event.
 * Throws a descriptive error if the limit is reached.
 */
export async function assertCanCreateLaunchpadEvent(profileId: string): Promise<void> {
  const { launchpadEvents: limit, rankName } = await getRankLimits(profileId);

  // Legend → no check needed
  if (limit === Number.MAX_SAFE_INTEGER) return;

  const current = await prisma.launchpadEvent.count({ where: { creatorId: profileId } });

  if (current >= limit) {
    const nextRank = getNextRankName(rankName);
    const nextHint = nextRank
      ? ` Reach ${nextRank} rank to unlock more slots.`
      : "";
    throw new Error(
      `You've reached the launchpad event limit for ${rankName} rank (${limit} event${limit === 1 ? "" : "s"}).${nextHint}`
    );
  }
}

/**
 * Returns a summary of a user's current usage vs limits.
 * Useful for surfacing "X of Y slots used" on the frontend.
 */
export async function getSubmissionQuota(profileId: string): Promise<{
  rankName: string;
  projects: { used: number; limit: number | "unlimited" };
  launchpadEvents: { used: number; limit: number | "unlimited" };
}> {
  const { projects: pLimit, launchpadEvents: lLimit, rankName } = await getRankLimits(profileId);

  const [projectsUsed, launchpadUsed] = await Promise.all([
    prisma.project.count({ where: { authorId: profileId } }),
    prisma.launchpadEvent.count({ where: { creatorId: profileId } }),
  ]);

  return {
    rankName,
    projects: {
      used: projectsUsed,
      limit: pLimit === Number.MAX_SAFE_INTEGER ? "unlimited" : pLimit,
    },
    launchpadEvents: {
      used: launchpadUsed,
      limit: lLimit === Number.MAX_SAFE_INTEGER ? "unlimited" : lLimit,
    },
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const RANK_ORDER = [
  "Newbie",
  "Junior Dev",
  "Developer",
  "Senior Dev",
  "Tech Lead",
  "Architect",
  "Principal",
  "Legend",
];

function getNextRankName(currentRankName: string): string | null {
  const idx = RANK_ORDER.indexOf(currentRankName);
  if (idx === -1 || idx === RANK_ORDER.length - 1) return null;
  return RANK_ORDER[idx + 1];
}
