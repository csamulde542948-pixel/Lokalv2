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

  // Get current profile xp and rank
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { xp: true, rankId: true },
  });
  if (!profile) return { newXp: 0, leveledUp: false };

  const newXp = profile.xp + xpToAdd;

  // Get all ranks to check for level-up
  const ranks = await prisma.rank.findMany({ orderBy: { minXp: "asc" } });
  const newRank = ranks
    .filter((r: any) => newXp >= r.minXp)
    .pop(); // highest rank the user qualifies for

  const leveledUp =
    newRank !== undefined && newRank.id !== profile.rankId;

  // Update profile xp and rank in a transaction
  await prisma.$transaction([
    prisma.profile.update({
      where: { id: profileId },
      data: {
        xp: newXp,
        rankId: newRank?.id ?? profile.rankId,
      },
    }),
    prisma.xpLog.create({
      data: {
        profileId,
        action,
        xpEarned: xpToAdd,
      },
    }),
  ]);

  return {
    newXp,
    leveledUp,
    newRankName: leveledUp ? newRank?.name : undefined,
  };
}
