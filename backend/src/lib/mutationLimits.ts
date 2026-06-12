import { GraphQLError } from "graphql";
import { PrismaClient } from "@prisma/client";

const POST_DAILY_LIMIT = 5;
const COMMENT_PER_MINUTE_LIMIT = 5;
const COMMENT_HOURLY_LIMIT = 40;
const COMMENT_DAILY_LIMIT = 250;
const REACTION_TARGET_WINDOW_LIMIT = 8;
const REACTION_GLOBAL_WINDOW_LIMIT = 80;

function rateLimitError(message: string, retryAfterSeconds?: number): GraphQLError {
  return new GraphQLError(message, {
    extensions: {
      code: "RATE_LIMITED",
      ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
    },
  });
}

function since(ms: number): Date {
  return new Date(Date.now() - ms);
}

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function assertPostDailyLimit(profileId: string, prisma: PrismaClient): Promise<void> {
  const count = await prisma.post.count({
    where: {
      authorId: profileId,
      createdAt: { gte: startOfUtcDay() },
    },
  });

  if (count >= POST_DAILY_LIMIT) {
    throw rateLimitError(`You can post up to ${POST_DAILY_LIMIT} times per day.`);
  }
}

export async function assertCommentRateLimit(profileId: string, prisma: PrismaClient): Promise<void> {
  const now = Date.now();
  const [perMinute, perHour, perDay] = await Promise.all([
    prisma.postComment.count({
      where: { authorId: profileId, createdAt: { gte: new Date(now - 60 * 1000) } },
    }),
    prisma.postComment.count({
      where: { authorId: profileId, createdAt: { gte: new Date(now - 60 * 60 * 1000) } },
    }),
    prisma.postComment.count({
      where: { authorId: profileId, createdAt: { gte: startOfUtcDay() } },
    }),
  ]);

  if (perMinute >= COMMENT_PER_MINUTE_LIMIT) {
    throw rateLimitError(`You can comment up to ${COMMENT_PER_MINUTE_LIMIT} times per minute.`, 60);
  }
  if (perHour >= COMMENT_HOURLY_LIMIT) {
    throw rateLimitError(`You can comment up to ${COMMENT_HOURLY_LIMIT} times per hour.`, 60 * 60);
  }
  if (perDay >= COMMENT_DAILY_LIMIT) {
    throw rateLimitError(`You can comment up to ${COMMENT_DAILY_LIMIT} times per day.`);
  }
}

export async function assertReactionAntiSpam(args: {
  profileId: string;
  action: "POST_REACTION" | "COMMENT_REACTION";
  targetId: string;
  prisma: PrismaClient;
}): Promise<void> {
  const { profileId, action, targetId, prisma } = args;
  const targetRecent = await (prisma as any).userActionEvent.count({
    where: {
      profileId,
      action,
      targetId,
      createdAt: { gte: since(5 * 60 * 1000) },
    },
  });

  if (targetRecent >= REACTION_TARGET_WINDOW_LIMIT) {
    throw rateLimitError("Slow down. Too many reaction changes on the same item.", 5 * 60);
  }

  const globalRecent = await (prisma as any).userActionEvent.count({
    where: {
      profileId,
      action,
      createdAt: { gte: since(60 * 60 * 1000) },
    },
  });

  if (globalRecent >= REACTION_GLOBAL_WINDOW_LIMIT) {
    throw rateLimitError("Slow down. Too many reaction changes in a short time.", 60 * 60);
  }
}

export async function recordActionEvent(args: {
  profileId: string;
  action: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  prisma: PrismaClient;
}): Promise<void> {
  const { profileId, action, targetId, metadata, prisma } = args;
  await (prisma as any).userActionEvent.create({
    data: {
      profileId,
      action,
      targetId: targetId ?? null,
      metadata: metadata ?? {},
    },
  });
}
