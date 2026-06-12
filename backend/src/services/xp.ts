import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { createNotification } from "../lib/notifications";

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
  GIVE_ROAST_REACT: 3,
  RECEIVE_ROAST_REACT: 8,
};

const DAILY_ACTION_CAPS: Partial<Record<string, number>> = {
  CREATE_POST: 10,
  RECEIVE_LIKE: 50,
  RECEIVE_COMMENT: 20,
  SHARE_PROJECT: 5,
  LAUNCHPAD_INTEREST_RECEIVED: 20,
  MAKE_CONNECTION: 10,
  REGISTER_EVENT: 3,
  LAUNCH_PROJECT: 2,
  GET_ROASTED: 5,
  CREATE_JOB: 3,
  GIVE_ROAST_REACT: 3,
  RECEIVE_ROAST_REACT: 20,
  COMPLETE_PROFILE: 1,
};

const DEFAULT_DAILY_ACTION_CAP = 10;
const DAILY_XP_HARD_CAP = 500;
const ONE_TIME_ACTIONS = new Set(["COMPLETE_PROFILE"]);
const IP_MAX_ACCOUNTS_PER_DAY = 5;

type DbClient = Prisma.TransactionClient | typeof prisma;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

async function xpAccountsFromIpToday(client: DbClient, ip: string): Promise<Set<string>> {
  try {
    const startOfDay = new Date(`${todayUtc()}T00:00:00.000Z`);
    const rows = await (client.xpLog as any).findMany({
      where: { ipAddress: ip, createdAt: { gte: startOfDay } },
      select: { profileId: true },
      distinct: ["profileId"],
    }) as { profileId: string }[];
    return new Set(rows.map((row) => row.profileId));
  } catch {
    return new Set();
  }
}

async function countTodayLogs(client: DbClient, profileId: string, action: string): Promise<number> {
  const startOfDay = new Date(`${todayUtc()}T00:00:00.000Z`);
  return client.xpLog.count({
    where: {
      profileId,
      action,
      createdAt: { gte: startOfDay },
    },
  });
}

async function totalXpToday(client: DbClient, profileId: string): Promise<number> {
  const startOfDay = new Date(`${todayUtc()}T00:00:00.000Z`);
  const result = await client.xpLog.aggregate({
    where: { profileId, createdAt: { gte: startOfDay } },
    _sum: { xpEarned: true },
  });
  return result._sum.xpEarned ?? 0;
}

function isRetryableTransactionError(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "P2034";
}

export async function awardXp(
  profileId: string,
  action: keyof typeof XP_REWARDS,
  actorId?: string,
  clientIp?: string
): Promise<{ newXp: number; leveledUp: boolean; newRankName?: string; blocked?: boolean }> {
  const xpToAdd = XP_REWARDS[action];
  if (!xpToAdd) return { newXp: 0, leveledUp: false };

  if (actorId && actorId === profileId) {
    return { newXp: 0, leveledUp: false, blocked: true };
  }

  const runAwardTransaction = () =>
    prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id
        FROM profiles
        WHERE id = ${profileId}::uuid
        FOR UPDATE
      `;

      if (clientIp) {
        const ipAccounts = await xpAccountsFromIpToday(tx, clientIp);
        if (ipAccounts.size >= IP_MAX_ACCOUNTS_PER_DAY && !ipAccounts.has(profileId)) {
          return { newXp: 0, leveledUp: false, blocked: true } as const;
        }
      }

      if (ONE_TIME_ACTIONS.has(action)) {
        const alreadyEarned = await tx.xpLog.findFirst({
          where: { profileId, action },
          select: { id: true },
        });
        if (alreadyEarned) {
          return { newXp: 0, leveledUp: false, blocked: true } as const;
        }
      }

      const actionCap = DAILY_ACTION_CAPS[action] ?? DEFAULT_DAILY_ACTION_CAP;
      const todayCount = await countTodayLogs(tx, profileId, action);
      if (todayCount >= actionCap) {
        return { newXp: 0, leveledUp: false, blocked: true } as const;
      }

      const earnedToday = await totalXpToday(tx, profileId);
      if (earnedToday >= DAILY_XP_HARD_CAP) {
        return { newXp: 0, leveledUp: false, blocked: true } as const;
      }

      const effectiveXp = Math.min(xpToAdd, DAILY_XP_HARD_CAP - earnedToday);
      if (effectiveXp <= 0) {
        return { newXp: 0, leveledUp: false, blocked: true } as const;
      }

      const updated = await tx.profile.update({
        where: { id: profileId },
        data: { xp: { increment: effectiveXp } },
        select: { xp: true, rankId: true },
      });

      await (tx.xpLog as any).create({
        data: {
          profileId,
          action,
          xpEarned: effectiveXp,
          ...(clientIp ? { ipAddress: clientIp } : {}),
        },
      });

      const ranks = await tx.rank.findMany({ orderBy: { minXp: "asc" } });
      const newRank = ranks.filter((rank: any) => updated.xp >= rank.minXp).pop();
      const leveledUp = Boolean(newRank && newRank.id !== updated.rankId);

      if (leveledUp && newRank) {
        await tx.profile.update({
          where: { id: profileId },
          data: { rankId: newRank.id },
        });
      }

      return {
        newXp: updated.xp,
        leveledUp,
        newRankName: leveledUp ? newRank?.name : undefined,
        blocked: false,
      } as const;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

  let result:
    | { newXp: number; leveledUp: boolean; newRankName?: string; blocked?: boolean }
    | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      result = await runAwardTransaction();
      break;
    } catch (error) {
      if (!isRetryableTransactionError(error) || attempt === 1) {
        throw error;
      }
    }
  }

  if (!result) {
    return { newXp: 0, leveledUp: false, blocked: true };
  }

  if (result.leveledUp && result.newRankName) {
    createNotification(prisma, {
      recipientId: profileId,
      type: "XP_LEVELUP",
      message: `You ranked up to ${result.newRankName}!`,
    }).catch(console.error);
  }

  return result;
}

export const ROLE_NAMES = {
  OPEN_SOURCERER: "Open Sourcerer",
  LAUNCH_KING: "Launch King",
  ROAST_MASTER: "Roast Master",
  EVENT_ORGANIZER: "Event Organizer",
  HIRED: "Hired!",
  TOP_CONTRIBUTOR: "Top Contributor",
  MENTOR: "Mentor",
} as const;

export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

export async function awardRole(
  profileId: string,
  roleName: RoleName
): Promise<{ awarded: boolean; roleName: string }> {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    console.warn(`[awardRole] Unknown role: ${roleName}`);
    return { awarded: false, roleName };
  }

  const existing = await prisma.userRole.findUnique({
    where: { profileId_roleId: { profileId, roleId: role.id } },
  });
  if (existing) return { awarded: false, roleName };

  await prisma.userRole.create({ data: { profileId, roleId: role.id } });

  createNotification(prisma, {
    recipientId: profileId,
    type: "EARNED_ROLE" as any,
    message: `You earned the ${role.emoji ?? ""} ${role.name} role!`,
  }).catch(console.error);

  return { awarded: true, roleName };
}

export async function checkAndAwardRoles(profileId: string): Promise<void> {
  try {
    const [projectCount, roastCount, commentCount] = await Promise.all([
      prisma.project.count({ where: { authorId: profileId } }),
      prisma.roast.count({ where: { reviewerId: profileId } }),
      prisma.postComment.count({
        where: {
          authorId: profileId,
          post: { authorId: { not: profileId } },
        },
      }),
    ]);

    const checks: Array<[boolean, RoleName]> = [
      [projectCount >= 5, ROLE_NAMES.LAUNCH_KING],
      [roastCount >= 10, ROLE_NAMES.ROAST_MASTER],
      [commentCount >= 20, ROLE_NAMES.MENTOR],
    ];

    await Promise.allSettled(
      checks
        .filter(([condition]) => condition)
        .map(([, role]) => awardRole(profileId, role))
    );
  } catch (error) {
    console.error("[checkAndAwardRoles] error:", error);
  }
}
