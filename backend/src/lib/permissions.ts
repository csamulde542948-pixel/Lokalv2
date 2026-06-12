import type { PrismaClient } from "@prisma/client";

export const PERMISSION_LEVEL = {
  USER: 0,
  MODERATOR: 1,
  ADMIN: 2,
} as const;

export type PermissionLevel = (typeof PERMISSION_LEVEL)[keyof typeof PERMISSION_LEVEL];

const DEFAULT_ADMIN_PROFILE_IDS = new Set(
  [
    process.env.LOKALHOST_ADMIN_PROFILE_ID,
    "1efb2d7c-adf9-4c34-a292-72566f9271bc",
  ].filter((value): value is string => Boolean(value))
);

const ENV_ADMIN_PROFILE_IDS = new Set(
  (process.env.ADMIN_PROFILE_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

const ENV_MODERATOR_PROFILE_IDS = new Set(
  (process.env.MODERATOR_PROFILE_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

const ADMIN_ROLE_NAMES = ["admin", "administrator"];
const MODERATOR_ROLE_NAMES = ["moderator"];

export const SELF_AWARDABLE_ROLE_NAMES = new Set<string>([]);
export const MODERATOR_AWARDABLE_ROLE_NAMES = new Set<string>([]);

function isKnownAdminProfile(userId: string): boolean {
  return DEFAULT_ADMIN_PROFILE_IDS.has(userId) || ENV_ADMIN_PROFILE_IDS.has(userId);
}

function isKnownModeratorProfile(userId: string): boolean {
  return ENV_MODERATOR_PROFILE_IDS.has(userId);
}

async function getStoredPermissionLevel(prisma: PrismaClient, userId: string): Promise<number | null> {
  try {
    const rows = await prisma.$queryRaw<{ permissionLevel: number | null }[]>`
      SELECT "permissionLevel"
      FROM profiles
      WHERE id = ${userId}::uuid
      LIMIT 1
    `;
    const value = rows[0]?.permissionLevel;
    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
}

async function hasNamedRole(prisma: PrismaClient, userId: string, names: string[]): Promise<boolean> {
  const match = await prisma.userRole.findFirst({
    where: {
      profileId: userId,
      role: {
        name: {
          in: names,
          mode: "insensitive",
        } as any,
      },
    },
    select: { id: true },
  });
  return Boolean(match);
}

export async function getPermissionLevel(prisma: PrismaClient, userId: string): Promise<PermissionLevel> {
  if (isKnownAdminProfile(userId)) return PERMISSION_LEVEL.ADMIN;
  if (isKnownModeratorProfile(userId)) return PERMISSION_LEVEL.MODERATOR;

  const storedPermissionLevel = await getStoredPermissionLevel(prisma, userId);
  if (storedPermissionLevel !== null) {
    if (storedPermissionLevel >= PERMISSION_LEVEL.ADMIN) return PERMISSION_LEVEL.ADMIN;
    if (storedPermissionLevel >= PERMISSION_LEVEL.MODERATOR) return PERMISSION_LEVEL.MODERATOR;
  }

  if (await hasNamedRole(prisma, userId, ADMIN_ROLE_NAMES)) {
    return PERMISSION_LEVEL.ADMIN;
  }
  if (await hasNamedRole(prisma, userId, MODERATOR_ROLE_NAMES)) {
    return PERMISSION_LEVEL.MODERATOR;
  }

  return PERMISSION_LEVEL.USER;
}

export async function assertAdminPermission(prisma: PrismaClient, userId: string): Promise<void> {
  const level = await getPermissionLevel(prisma, userId);
  if (level < PERMISSION_LEVEL.ADMIN) {
    throw new Error("Forbidden: admin role required");
  }
}

export function canManuallyAwardRole(args: {
  actorId: string;
  targetId: string;
  actorLevel: PermissionLevel;
  roleName: string;
}): boolean {
  const { actorId, targetId, actorLevel, roleName } = args;
  const isSelfAward = actorId === targetId;

  if (actorLevel >= PERMISSION_LEVEL.ADMIN) {
    return true;
  }

  if (actorLevel >= PERMISSION_LEVEL.MODERATOR) {
    if (isSelfAward) {
      return SELF_AWARDABLE_ROLE_NAMES.has(roleName);
    }
    return MODERATOR_AWARDABLE_ROLE_NAMES.has(roleName);
  }

  if (isSelfAward) {
    return SELF_AWARDABLE_ROLE_NAMES.has(roleName);
  }

  return false;
}
