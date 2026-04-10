/**
 * XP Service
 * Handles XP awarding and rank-up detection.
 * Called from resolvers after relevant mutations.
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
};

/**
 * Award XP to a profile for an action.
 * Checks for rank-up and returns the new rank name if leveled up.
 */
export async function awardXp(
  profileId: string,
  action: keyof typeof XP_REWARDS
): Promise<{ newXp: number; leveledUp: boolean; newRankName?: string }> {
  const xpToAdd = XP_REWARDS[action];
  if (!xpToAdd) return { newXp: 0, leveledUp: false };

  // CRIT-06: Atomic increment — avoids TOCTOU race condition on concurrent requests.
  // prisma.profile.update with { increment } issues a single atomic UPDATE in Postgres,
  // so two simultaneous calls cannot both read the same stale xp value.
  const [updated] = await prisma.$transaction([
    prisma.profile.update({
      where: { id: profileId },
      data: { xp: { increment: xpToAdd } },
      select: { xp: true, rankId: true },
    }),
    prisma.xpLog.create({
      data: { profileId, action, xpEarned: xpToAdd },
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
