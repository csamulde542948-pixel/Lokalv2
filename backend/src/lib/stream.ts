import { connect, StreamClient } from "getstream";
import { StreamChat } from "stream-chat";

// Read lazily so Railway env vars are always current at call time
function getApiKey(): string {
  const key = process.env.GETSTREAM_API_KEY;
  if (!key) throw new Error("GETSTREAM_API_KEY is not configured");
  return key;
}
function getApiSecret(): string {
  const secret = process.env.GETSTREAM_API_SECRET;
  if (!secret) throw new Error("GETSTREAM_API_SECRET is not configured");
  return secret;
}
const appId = process.env.GETSTREAM_APP_ID ?? "1568856";

// ─── Stream Chat (messaging) server client ────────────────────────────────────
let _chatClient: StreamChat | null = null;
let _chatClientKey: string | null = null; // track which key the client was built with

function getChatClient(): StreamChat {
  const key = getApiKey();
  const secret = getApiSecret();
  // Rebuild if the client doesn't exist or was built with a different key
  if (!_chatClient || _chatClientKey !== key) {
    // Use `new StreamChat` (not getInstance) — the singleton cache can get poisoned
    // if connectUser/disconnectUser was ever called on the same instance, which
    // breaks the token manager and causes "Both secret and user tokens are not set".
    _chatClient = new StreamChat(key, secret);
    _chatClientKey = key;
  }
  return _chatClient;
}

// ─── Stream Feeds (activity / social graph) client ───────────────────────────
let _feedClient: StreamClient | null = null;
let _feedClientKey: string | null = null;

function getStreamClient(): StreamClient {
  const key = getApiKey();
  const secret = getApiSecret();
  if (!_feedClient || _feedClientKey !== key) {
    _feedClient = connect(key, secret, appId, { timeout: 10000 });
    _feedClientKey = key;
  }
  return _feedClient;
}

// ─── User Management ─────────────────────────────────────────────────────────

/**
 * Upsert user in Stream Feeds (activity feed / social graph).
 * Uses the batch upsert endpoint which creates-or-updates, so it works
 * even if the user has never been added to Feeds before.
 */
export async function upsertStreamUser(
  user: { id: string; name: string; username: string; imageUrl?: string | null }
) {
  try {
    const client = getStreamClient();
    // `client.setUser` on the server uses the batch upsert endpoint (PUT /users)
    // which creates the user if they don't exist, unlike streamUser.update() which
    // returns 404 when the user is absent from the Feeds graph.
    await (client as any).user(user.id).getOrCreate({
      name: user.name,
      username: user.username,
      image: user.imageUrl ?? undefined,
    });
    // After ensuring the user exists, sync the latest data
    await (client as any).user(user.id).update({
      name: user.name,
      username: user.username,
      image: user.imageUrl ?? undefined,
    });
  } catch (err: any) {
    // Non-fatal — GetStream sync failure should never block profile saves
    console.warn("[stream] upsertStreamUser failed (non-fatal):", err?.message ?? err);
  }
}

/**
 * Upsert user in Stream Chat — must be called server-side before the client
 * attempts connectUser. Also called automatically on first connectUser from client.
 */
export async function upsertChatUser(
  user: { id: string; name: string; username?: string; imageUrl?: string | null }
) {
  const client = getChatClient();
  await client.upsertUser({
    id: user.id,
    name: user.name,
    username: user.username,
    image: user.imageUrl ?? undefined,
  });
}

/**
 * Generate a Stream CHAT JWT using the official server SDK.
 * Produces { user_id, iat } payload signed HS256 — exactly what the client expects.
 */
export function generateStreamToken(userId: string): string {
  return getChatClient().createToken(userId);
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
 * Returns empty array if the feed group doesn't exist or GetStream is unreachable.
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
  try {
    const client = getStreamClient();
    const timelineFeed = client.feed("timeline", followerId);
    await timelineFeed.follow("user", followingId);
  } catch (err: any) {
    // Silently ignore if timeline feed group isn't configured
    if (!err?.message?.includes("does not exist")) {
      console.error("[stream] streamFollowUser error:", err?.message);
    }
  }
}

export async function streamUnfollowUser(followerId: string, followingId: string) {
  try {
    const client = getStreamClient();
    const timelineFeed = client.feed("timeline", followerId);
    await timelineFeed.unfollow("user", followingId);
  } catch (err: any) {
    // Silently ignore if timeline feed group isn't configured
    if (!err?.message?.includes("does not exist")) {
      console.error("[stream] streamUnfollowUser error:", err?.message);
    }
  }
}

// ─── DM Channel ──────────────────────────────────────────────────────────────

/**
 * Create (or get existing) a 1-on-1 messaging channel between two users.
 * Uses a deterministic channel ID so the same pair always reuses the same channel.
 * Returns the channel CID (e.g. "messaging:dm-abc-xyz").
 */
export async function createDMChannel(userAId: string, userBId: string): Promise<string> {
  const client = getChatClient();
  // Sort IDs for stable order-independent channel ID, then truncate each to 8 chars
  // Full UUIDs would produce a 76-char ID which exceeds Stream's 64-char limit
  const [a, b] = [userAId, userBId].sort();
  const channelId = `dm-${a.replace(/-/g, "").slice(0, 12)}-${b.replace(/-/g, "").slice(0, 12)}`;
  const channel = client.channel("messaging", channelId, {
    members: [userAId, userBId],
    created_by_id: userAId,
  });
  await channel.create();
  return channel.cid; // e.g. "messaging:dm-abc-xyz"
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
