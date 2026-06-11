import { ApiClient, requests } from "recombee-api-client";

type RecombeeResponse = {
  recomms?: Array<{ id?: string } | string>;
  recommId?: string;
};

type SyncPostInput = {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  lastActivityAt?: Date | null;
  postType?: string | null;
  topicTags?: string[] | null;
  intentTags?: string[] | null;
  language?: string | null;
  feedVisibility?: string | null;
  visibility?: string | null;
  rootPostId?: string | null;
  parentPostId?: string | null;
  depth?: number | null;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  hasLink?: boolean | null;
  linkDomain?: string | null;
  fireCount?: number;
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  bookmarksCount?: number;
  viewsCount?: number;
  engagementScore?: number;
  qualityScore?: number;
  isDeleted?: boolean;
  moderationStatus?: string | null;
  isSensitive?: boolean | null;
  isAuthorVerified?: boolean | null;
};

type SyncUserInput = {
  id: string;
  username: string;
  createdAt: Date;
  rankId?: number | null;
  xp?: number | null;
  isVerified?: boolean | null;
};

type RecommendPostsOptions = {
  userId: string;
  count: number;
  recommId?: string | null;
  scenario?: "for_you" | "following" | "trending" | "cold_start" | "social_feed";
  followingAuthorIds?: string[];
  coldStart?: boolean;
};

type TrackInteractionInput = {
  userId: string;
  postId: string;
  kind: "view" | "fire" | "comment" | "share";
  recommId?: string | null;
  durationMs?: number;
};

const RECOMBEE_DB_ID = process.env.RECOMBEE_DATABASE_ID ?? "";
const RECOMBEE_TOKEN = process.env.RECOMBEE_PRIVATE_TOKEN ?? "";
const RECOMBEE_REGION = process.env.RECOMBEE_REGION ?? "ap-se";

const SOCIAL_SCENARIO = "social_feed";
const FOR_YOU_SCENARIO = "social_for_you";
const FOLLOWING_SCENARIO = "social_following";
const TRENDING_SCENARIO = "social_trending";
const COLD_START_SCENARIO = "social_cold_start";
export const REQUIRED_RECOMBEE_SCENARIOS = [
  SOCIAL_SCENARIO,
  FOR_YOU_SCENARIO,
  FOLLOWING_SCENARIO,
  TRENDING_SCENARIO,
  COLD_START_SCENARIO,
] as const;
const MAIN_FEED_FILTER = `'visibility' == "public" and 'isDeleted' == false and 'moderationStatus' == "approved" and 'feedVisibility' == "MAIN_FEED"`;
const NEW_POST_BOOSTER = [
  "if 'createdAt' > now() - 6*3600 then 3.0",
  "else if 'createdAt' > now() - 24*3600 then 2.2",
  "else if 'createdAt' > now() - 3*24*3600 then 1.5",
  "else 1.0",
].join(" ");
const TRENDING_BOOSTER = [
  NEW_POST_BOOSTER,
  "* (if 'engagementScore' > 50 then 2.0 else if 'engagementScore' > 10 then 1.5 else 1.0)",
  "* (if 'qualityScore' > 0.75 then 1.4 else if 'qualityScore' > 0.45 then 1.15 else 1.0)",
].join(" ");
const ITEM_PROPERTIES = [
  { name: "authorId", type: "string" },
  { name: "content", type: "string" },
  { name: "postType", type: "string" },
  { name: "topicTags", type: "set" },
  { name: "intentTags", type: "set" },
  { name: "language", type: "string" },
  { name: "createdAt", type: "timestamp" },
  { name: "lastActivityAt", type: "timestamp" },
  { name: "feedVisibility", type: "string" },
  { name: "visibility", type: "string" },
  { name: "rootPostId", type: "string" },
  { name: "parentPostId", type: "string" },
  { name: "depth", type: "int" },
  { name: "hasImage", type: "boolean" },
  { name: "hasLink", type: "boolean" },
  { name: "linkDomain", type: "string" },
  { name: "fireCount", type: "int" },
  { name: "likesCount", type: "int" },
  { name: "commentsCount", type: "int" },
  { name: "sharesCount", type: "int" },
  { name: "bookmarksCount", type: "int" },
  { name: "viewsCount", type: "int" },
  { name: "engagementScore", type: "double" },
  { name: "qualityScore", type: "double" },
  { name: "isDeleted", type: "boolean" },
  { name: "moderationStatus", type: "string" },
  { name: "isSensitive", type: "boolean" },
  { name: "isAuthorVerified", type: "boolean" },
] as const;

const USER_PROPERTIES = [
  { name: "username", type: "string" },
  { name: "createdAt", type: "timestamp" },
  { name: "rankId", type: "int" },
  { name: "xp", type: "int" },
  { name: "isVerified", type: "boolean" },
] as const;

let propertyBootstrapPromise: Promise<void> | null = null;

function getClient() {
  if (!RECOMBEE_DB_ID || !RECOMBEE_TOKEN) return null;
  return new ApiClient(RECOMBEE_DB_ID, RECOMBEE_TOKEN, { region: RECOMBEE_REGION });
}

export function isRecombeeConfigured() {
  return !!getClient();
}

async function ensureItemProperties() {
  const client = getClient();
  if (!client) return;

  if (!propertyBootstrapPromise) {
    propertyBootstrapPromise = (async () => {
      for (const property of ITEM_PROPERTIES) {
        try {
          await client.send(new requests.AddItemProperty(property.name, property.type));
        } catch (error: any) {
          const message = String(error?.message ?? error);
          if (!message.toLowerCase().includes("already exists")) {
            console.error(`[recombee] item property ${property.name} failed:`, message);
          }
        }
      }
      for (const property of USER_PROPERTIES) {
        try {
          await client.send(new requests.AddUserProperty(property.name, property.type));
        } catch (error: any) {
          const message = String(error?.message ?? error);
          if (!message.toLowerCase().includes("already exists")) {
            console.error(`[recombee] user property ${property.name} failed:`, message);
          }
        }
      }
    })();
  }

  await propertyBootstrapPromise;
}

export async function bootstrapRecombeeCatalog() {
  await ensureItemProperties();
}

export async function syncUserToRecombee(profile: SyncUserInput) {
  const client = getClient();
  if (!client) return;

  try {
    await ensureItemProperties();
    await client.send(
      new requests.SetUserValues(
        profile.id,
        {
          username: profile.username,
          createdAt: profile.createdAt.toISOString(),
          rankId: profile.rankId ?? 0,
          xp: profile.xp ?? 0,
          isVerified: !!profile.isVerified,
        },
        { cascadeCreate: true }
      )
    );
  } catch (error) {
    console.error("[recombee] syncUserToRecombee failed:", error);
  }
}

export async function syncPostToRecombee(post: SyncPostInput) {
  const client = getClient();
  if (!client) return;

  try {
    await ensureItemProperties();
    await client.send(
      new requests.SetItemValues(
        post.id,
        {
          authorId: post.authorId,
          content: post.content.slice(0, 4000),
          postType: post.postType ?? "post",
          topicTags: post.topicTags ?? [],
          intentTags: post.intentTags ?? [],
          language: post.language ?? "mixed",
          createdAt: post.createdAt.toISOString(),
          lastActivityAt: (post.lastActivityAt ?? post.createdAt).toISOString(),
          feedVisibility: post.feedVisibility ?? "MAIN_FEED",
          visibility: post.visibility ?? "public",
          rootPostId: post.rootPostId ?? post.id,
          parentPostId: post.parentPostId ?? "",
          depth: post.depth ?? 0,
          hasImage: !!post.imageUrl || !!post.imageUrls?.length,
          hasLink: !!post.hasLink,
          linkDomain: post.linkDomain ?? "",
          fireCount: post.fireCount ?? post.likesCount ?? 0,
          likesCount: post.likesCount ?? 0,
          commentsCount: post.commentsCount ?? 0,
          sharesCount: post.sharesCount ?? 0,
          bookmarksCount: post.bookmarksCount ?? 0,
          viewsCount: post.viewsCount ?? 0,
          engagementScore: post.engagementScore ?? 0,
          qualityScore: post.qualityScore ?? 0,
          isDeleted: !!post.isDeleted,
          moderationStatus: post.moderationStatus ?? "approved",
          isSensitive: !!post.isSensitive,
          isAuthorVerified: !!post.isAuthorVerified,
        },
        { cascadeCreate: true }
      )
    );
  } catch (error) {
    console.error("[recombee] syncPostToRecombee failed:", error);
  }
}

export async function deletePostFromRecombee(postId: string) {
  const client = getClient();
  if (!client) return;

  try {
    await client.send(new requests.DeleteItem(postId));
  } catch (error) {
    console.error("[recombee] deletePostFromRecombee failed:", error);
  }
}

export async function sendRecombeeBatch(batchRequests: any[]) {
  const client = getClient();
  if (!client || batchRequests.length === 0) return null;

  try {
    const response = await client.send(new requests.Batch(batchRequests));
    return response;
  } catch (error) {
    console.error("[recombee] batch request failed:", error);
    return null;
  }
}

export function createRecombeeRequests() {
  return requests;
}

export async function listRecombeeScenarios() {
  const client = getClient();
  if (!client) return [];
  try {
    const scenarios = await client.send(new requests.ListScenarios()) as Array<{ name?: string; id?: string }>;
    return scenarios.map((scenario) => scenario.name ?? scenario.id).filter((name): name is string => Boolean(name));
  } catch (error) {
    console.error("[recombee] listRecombeeScenarios failed:", error);
    return [];
  }
}

export async function recommendPostIdsForUser({
  userId,
  count,
  recommId,
  scenario = "for_you",
  followingAuthorIds,
  coldStart,
}: RecommendPostsOptions): Promise<{ ids: string[]; recommId: string | null }> {
  const client = getClient();
  if (!client) return { ids: [], recommId: null };

  const parseRecommendationResponse = (response: RecombeeResponse) => {
    const ids = (response.recomms ?? [])
      .map((entry) => (typeof entry === "string" ? entry : entry?.id))
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    return {
      ids,
      recommId: response.recommId ?? recommId ?? null,
    };
  };

  const scenarioName =
    scenario === "following" ? FOLLOWING_SCENARIO :
    scenario === "trending" ? TRENDING_SCENARIO :
    scenario === "cold_start" || coldStart ? COLD_START_SCENARIO :
    scenario === "social_feed" ? SOCIAL_SCENARIO :
    FOR_YOU_SCENARIO;
  const followingFilter = followingAuthorIds?.length
    ? ` and 'authorId' in {${followingAuthorIds.map((id) => `"${id}"`).join(",")}}`
    : "";
  const filter = `${MAIN_FEED_FILTER}${scenario === "following" ? followingFilter : ""}`;
  const booster = scenario === "trending" || coldStart ? TRENDING_BOOSTER : NEW_POST_BOOSTER;
  const minRelevance = coldStart || scenario === "trending" ? "low" : "medium";
  const rotationRate = coldStart ? 0.08 : 0.18;

  try {
    const response: RecombeeResponse = recommId
      ? ((await client.send(new requests.RecommendNextItems(recommId, count))) as RecombeeResponse)
      : ((await client.send(
          new requests.RecommendItemsToUser(userId, count, {
            cascadeCreate: true,
            scenario: scenarioName,
            filter,
            booster,
            minRelevance,
            diversity: 0.25,
            rotationRate,
            rotationTime: 3600,
          })
        )) as RecombeeResponse);

    return parseRecommendationResponse(response);
  } catch (error) {
    const message = String((error as any)?.message ?? error).toLowerCase();
    if (!recommId && message.includes("scenario does not exist")) {
      try {
        const response = (await client.send(
          new requests.RecommendItemsToUser(userId, count, {
            cascadeCreate: true,
            filter,
            booster,
            minRelevance: "low",
            diversity: 0.2,
            rotationRate: 0.12,
            rotationTime: 3600,
          })
        )) as RecombeeResponse;

        return parseRecommendationResponse(response);
      } catch (fallbackError) {
        console.error("[recombee] recommendPostIdsForUser fallback failed:", fallbackError);
      }
    }
    console.error("[recombee] recommendPostIdsForUser failed:", error);
    return { ids: [], recommId: null };
  }
}

export async function trackRecombeeInteraction({
  userId,
  postId,
  kind,
  recommId,
  durationMs,
}: TrackInteractionInput) {
  const client = getClient();
  if (!client) return;

  try {
    let request:
      | InstanceType<typeof requests.AddDetailView>
      | InstanceType<typeof requests.AddBookmark>
      | InstanceType<typeof requests.AddCartAddition>
      | InstanceType<typeof requests.AddPurchase>;

    if (kind === "view") {
      request = new requests.AddDetailView(userId, postId, {
        cascadeCreate: true,
        recommId: recommId ?? undefined,
        duration: durationMs ? Math.max(0, Math.round(durationMs / 1000)) : undefined,
        autoPresented: true,
      });
    } else if (kind === "fire") {
      request = new requests.AddBookmark(userId, postId, {
        cascadeCreate: true,
        recommId: recommId ?? undefined,
      });
    } else if (kind === "comment") {
      request = new requests.AddCartAddition(userId, postId, {
        cascadeCreate: true,
        recommId: recommId ?? undefined,
      });
    } else {
      request = new requests.AddPurchase(userId, postId, {
        cascadeCreate: true,
        recommId: recommId ?? undefined,
      });
    }

    await client.send(request);
  } catch (error) {
    console.error("[recombee] trackRecombeeInteraction failed:", error);
  }
}
