import { connect, StreamClient } from "getstream";

const apiKey = process.env.GETSTREAM_API_KEY!;
const apiSecret = process.env.GETSTREAM_API_SECRET!;
const appId = process.env.GETSTREAM_APP_ID ?? "1568856";

let _client: StreamClient | null = null;

function getStreamClient(): StreamClient {
  if (!_client) {
    _client = connect(apiKey, apiSecret, appId, { timeout: 10000 });
  }
  return _client;
}

// ─── User Management ─────────────────────────────────────────────────────────

export async function upsertStreamUser(
  user: { id: string; name: string; username: string; imageUrl?: string | null }
) {
  const client = getStreamClient();
  // Set user data via getstream's user object
  const streamUser = client.user(user.id);
  await streamUser.update({
    name: user.name,
    username: user.username,
    image: user.imageUrl ?? undefined,
  } as any);
}

export function generateStreamToken(userId: string): string {
  const client = getStreamClient();
  return client.createUserToken(userId);
}

// ─── Feed Operations ─────────────────────────────────────────────────────────

/**
 * Add an activity to the user's own feed.
 * Followers' timeline feeds are fanned out automatically by GetStream.
 */
export async function addActivityToFeed(
  userId: string,
  activity: {
    verb: string;
    object: string;
    foreignId?: string;
    time?: Date;
    [key: string]: unknown;
  }
) {
  const client = getStreamClient();
  const userFeed = client.feed("user", userId);
  const { verb, object: obj, foreignId, time, ...extra } = activity;
  await userFeed.addActivity({
    actor: `SU:${userId}`,
    verb,
    object: obj,
    foreign_id: foreignId,
    time: (time ?? new Date()).toISOString(),
    ...extra,
  });
}

/**
 * Get raw unranked activities from a user's timeline feed.
 * Ranking is done in the Apollo resolver using our custom scoring function.
 */
export async function getRawFeed(
  userId: string,
  limit = 25,
  offset = 0
) {
  const client = getStreamClient();
  const timelineFeed = client.feed("timeline", userId);
  const result = await timelineFeed.get({ limit, offset });
  return (result as any).results ?? [];
}

// ─── Social Graph ─────────────────────────────────────────────────────────────

export async function streamFollowUser(followerId: string, followingId: string) {
  const client = getStreamClient();
  const timelineFeed = client.feed("timeline", followerId);
  await timelineFeed.follow("user", followingId);
}

export async function streamUnfollowUser(followerId: string, followingId: string) {
  const client = getStreamClient();
  const timelineFeed = client.feed("timeline", followerId);
  await timelineFeed.unfollow("user", followingId);
}

// ─── DM Channel placeholder ───────────────────────────────────────────────────
// Phase 2: integrate stream-chat SDK separately for messaging
export async function createDMChannel(userAId: string, userBId: string): Promise<string> {
  return `dm-${[userAId, userBId].sort().join("-")}`;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function sendStreamNotification(
  toUserId: string,
  activity: {
    verb: string;
    object: string;
    foreignId?: string;
    [key: string]: unknown;
  }
) {
  const client = getStreamClient();
  const notifFeed = client.feed("notification", toUserId);
  const { verb, object: obj, foreignId, ...extra } = activity;
  await notifFeed.addActivity({
    actor: "system",
    verb,
    object: obj,
    foreign_id: foreignId,
    time: new Date().toISOString(),
    ...extra,
  });
}
