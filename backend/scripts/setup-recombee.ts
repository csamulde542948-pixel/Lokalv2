import "../src/env";
import { prisma } from "../src/lib/prisma";
import {
  bootstrapRecombeeCatalog,
  createRecombeeRequests,
  isRecombeeConfigured,
  recommendPostIdsForUser,
  sendRecombeeBatch,
} from "../src/lib/recombee";
import { inferPostMetadata } from "../src/services/postIntelligence.service";

const BATCH_SIZE = 250;
const MAX_VIEW_EVENTS = 15_000;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function sendBatches(label: string, requestBatches: any[][]) {
  let sent = 0;
  for (const batch of requestBatches) {
    await sendRecombeeBatch(batch);
    sent += batch.length;
    console.log(`[recombee:setup] ${label}: ${sent}`);
  }
}

async function syncUsers() {
  const rqs = createRecombeeRequests();
  const users = await prisma.profile.findMany({
    select: {
      id: true,
      username: true,
      createdAt: true,
      rankId: true,
      xp: true,
      isVerified: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const requests = users.map(
    (profile) =>
      new rqs.SetUserValues(
        profile.id,
        {
          username: profile.username,
          createdAt: profile.createdAt.toISOString(),
          rankId: profile.rankId,
          xp: profile.xp,
          isVerified: profile.isVerified,
        },
        { cascadeCreate: true }
      )
  );

  await sendBatches("users synced", chunk(requests, BATCH_SIZE));
  return users.length;
}

async function syncPosts() {
  const rqs = createRecombeeRequests();
  const posts = await prisma.post.findMany({
    select: {
      id: true,
      authorId: true,
      content: true,
      createdAt: true,
      imageUrl: true,
      imageUrls: true,
      likesCount: true,
      commentsCount: true,
      sharesCount: true,
      bookmarksCount: true,
      viewsCount: true,
      roastReactionCount: true,
      postType: true,
      topicTags: true,
      intentTags: true,
      language: true,
      lastActivityAt: true,
      hasLink: true,
      linkDomain: true,
      engagementScore: true,
      qualityScore: true,
      visibility: true,
      isDeleted: true,
      moderationStatus: true,
      isSensitive: true,
      author: { select: { isVerified: true } },
      tags: { select: { tag: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const requests = posts.map((post) => {
    const tagNames = post.tags.map((entry) => entry.tag.name.toLowerCase());
    const inferred = inferPostMetadata(post);
    const postType = post.postType || (tagNames.includes("roast") ? "roast" : inferred.postType);
    return (
      new rqs.SetItemValues(
        post.id,
        {
          authorId: post.authorId,
          content: post.content.slice(0, 4000),
          postType,
          topicTags: post.topicTags.length > 0 ? post.topicTags : inferred.topicTags,
          intentTags: post.intentTags.length > 0 ? post.intentTags : inferred.intentTags,
          language: post.language || inferred.language,
          createdAt: post.createdAt.toISOString(),
          lastActivityAt: (post.lastActivityAt ?? post.createdAt).toISOString(),
          feedVisibility: "MAIN_FEED",
          visibility: post.visibility || "public",
          rootPostId: post.id,
          parentPostId: "",
          depth: 0,
          hasImage: !!post.imageUrl || post.imageUrls.length > 0,
          hasLink: post.hasLink || inferred.hasLink,
          linkDomain: post.linkDomain ?? inferred.linkDomain ?? "",
          fireCount: post.roastReactionCount + post.likesCount,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          sharesCount: post.sharesCount,
          bookmarksCount: post.bookmarksCount,
          viewsCount: post.viewsCount,
          engagementScore: post.engagementScore || inferred.engagementScore,
          qualityScore: post.qualityScore || inferred.qualityScore,
          isDeleted: post.isDeleted,
          moderationStatus: post.moderationStatus || "approved",
          isSensitive: post.isSensitive,
          isAuthorVerified: post.author?.isVerified ?? false,
        },
        { cascadeCreate: true }
      )
    );
  });

  await sendBatches("posts synced", chunk(requests, BATCH_SIZE));
  return posts.length;
}

async function syncEngagements() {
  const rqs = createRecombeeRequests();

  const [likes, comments, postShares, postViews, impressions] = await Promise.all([
    prisma.postLike.findMany({
      select: { profileId: true, postId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.postComment.findMany({
      select: { authorId: true, postId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.userInteraction.findMany({
      where: { type: "POST_SHARE", entityId: { not: null } },
      select: { fromId: true, entityId: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.postView.findMany({
      select: { viewerId: true, postId: true, dwellMs: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: MAX_VIEW_EVENTS,
    }),
    prisma.userPostImpression.findMany({
      select: { userId: true, postId: true, dwellMs: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: MAX_VIEW_EVENTS,
    }),
  ]);

  const requests = [
    ...likes.map(
      (like) =>
        new rqs.AddBookmark(like.profileId, like.postId, {
          cascadeCreate: true,
          timestamp: like.createdAt.toISOString(),
        })
    ),
    ...comments.map(
      (comment) =>
        new rqs.AddCartAddition(comment.authorId, comment.postId, {
          cascadeCreate: true,
          timestamp: comment.createdAt.toISOString(),
        })
    ),
    ...postShares.filter((share) => !!share.entityId).map(
      (share) =>
        new rqs.AddPurchase(share.fromId, share.entityId as string, {
          cascadeCreate: true,
          timestamp: share.createdAt.toISOString(),
        })
    ),
    ...postViews.map(
      (view) =>
        new rqs.AddDetailView(view.viewerId, view.postId, {
          cascadeCreate: true,
          timestamp: view.createdAt.toISOString(),
          duration: Math.max(0, Math.round(view.dwellMs / 1000)),
          autoPresented: true,
        })
    ),
    ...impressions.map(
      (impression) =>
        new rqs.AddDetailView(impression.userId, impression.postId, {
          cascadeCreate: true,
          timestamp: impression.createdAt.toISOString(),
          duration: Math.max(0, Math.round(impression.dwellMs / 1000)),
          autoPresented: true,
        })
    ),
  ];

  await sendBatches("engagements synced", chunk(requests, BATCH_SIZE));
  return {
    likes: likes.length,
    comments: comments.length,
    shares: postShares.length,
    postViews: postViews.length,
    impressions: impressions.length,
  };
}

async function smokeRecommendation() {
  const profile = await prisma.profile.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    console.log("[recombee:setup] smoke skipped: no profiles found");
    return;
  }

  const result = await recommendPostIdsForUser({ userId: profile.id, count: 5 });
  console.log(`[recombee:setup] smoke recommendations: ${result.ids.length}`);
}

async function main() {
  if (!isRecombeeConfigured()) {
    throw new Error("Recombee is not configured. Set RECOMBEE_DATABASE_ID and RECOMBEE_PRIVATE_TOKEN.");
  }

  console.log("[recombee:setup] bootstrapping properties");
  await bootstrapRecombeeCatalog();

  const userCount = await syncUsers();
  const postCount = await syncPosts();
  const interactionCounts = await syncEngagements();
  await smokeRecommendation();

  console.log("[recombee:setup] complete", {
    users: userCount,
    posts: postCount,
    interactions: interactionCounts,
  });
}

main()
  .catch((error) => {
    console.error("[recombee:setup] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
