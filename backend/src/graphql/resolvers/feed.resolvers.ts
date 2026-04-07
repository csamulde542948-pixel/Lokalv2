import { GraphQLContext } from "../context";
import { addActivityToFeed, getRawFeed } from "../../lib/stream";
import {
  rankPosts,
  applyDiversityPass,
  PostSignals,
  ScoredPost,
  ScoreBreakdown,
  sigmoidNormalize,
  loadWeightConfig,
  invalidateWeightCache,
  FeedWeightConfig,
  DEFAULT_WEIGHTS,
} from "../../services/feedRanking";
import { awardXp } from "../../services/xp";

export const feedResolvers = {
  Query: {
    /**
     * Personalized ranked feed for the authenticated user.
     *
     * Pipeline:
     * 1. GetStream delivers raw timeline activities (posts from follows)
     * 2. We fetch full post data from Supabase via Prisma
     * 3. We collect ranking signals per post
     * 4. We score + sort (feed ranking service)
     * 5. Diversity pass
     * 6. Return ranked feed to client
     */
    feed: async (
      _: unknown,
      { limit = 20, offset = 0, seenIds = [], feedVariant }: { limit?: number; offset?: number; seenIds?: string[]; feedVariant?: string },
      { user, prisma }: GraphQLContext
    ) => {
      // Unauthenticated users get the explore feed
      if (!user) {
        return exploreFeed(limit, offset, prisma);
      }

      // Load configurable weights from DB (cached 60s)
      const weights = await loadWeightConfig(prisma);

      // A/B testing: 10% of requests get chronological variant
      const resolvedVariant: "ranked" | "chronological" =
        feedVariant === "chronological"
          ? "chronological"
          : feedVariant === "ranked"
            ? "ranked"
            : Math.random() < 0.10
              ? "chronological"
              : "ranked";

      // Session management: find or create an active session (30 min window)
      let sessionId: string | null = null;
      let sessionCtr: number | undefined = undefined;
      try {
        const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
        const activeSession = await prisma.feedSession.findFirst({
          where: {
            userId: user.id,
            isActive: true,
            updatedAt: { gte: thirtyMinAgo },
          },
          orderBy: { createdAt: "desc" },
        });
        if (activeSession) {
          sessionId = activeSession.id;
          sessionCtr = activeSession.ctr;
          // Update postsShown
          await prisma.feedSession.update({
            where: { id: activeSession.id },
            data: { postsShown: { increment: limit } },
          }).catch(console.error);
        } else {
          // Create new session
          const newSession = await prisma.feedSession.create({
            data: {
              userId: user.id,
              feedVariant: resolvedVariant,
              postsShown: limit,
            },
          });
          sessionId = newSession.id;
          sessionCtr = undefined; // new session, no CTR data yet
        }
      } catch (err) {
        console.error("[feed] session management error:", err);
      }

      // 1. Get raw activities from GetStream
      const rawActivities = await getRawFeed(user.id, limit + 10, offset);

      // Extract post IDs from activities (format: "post:abc123")
      const postIds = rawActivities
        .map((a: any) => {
          const obj = a.object as string;
          return obj?.startsWith("post:") ? obj.replace("post:", "") : null;
        })
        .filter(Boolean) as string[];

      // Filter out already-seen posts to avoid showing duplicates across refreshes
      const seenSet = new Set(seenIds);
      let freshPostIds = postIds.filter((id) => !seenSet.has(id));

      // Cold-start: if user has very few candidates (< 5), supplement with trending posts
      if (freshPostIds.length < 5) {
        try {
          const trendingPosts = await prisma.post.findMany({
            where: {
              id: { notIn: [...freshPostIds, ...seenIds] },
              createdAt: { gte: new Date(Date.now() - 72 * 60 * 60 * 1000) }, // last 72h
            },
            orderBy: [{ likesCount: "desc" }, { commentsCount: "desc" }],
            take: 15,
            select: { id: true },
          });
          const trendingIds = trendingPosts.map((p: any) => p.id);
          freshPostIds = [...freshPostIds, ...trendingIds];
        } catch (err) {
          console.error("[feed] cold-start trending fallback error:", err);
        }
      }

      if (freshPostIds.length === 0) {
        return exploreFeed(limit, offset, prisma);
      }

      // 2. Fetch full post data + signals in parallel
      const [posts, userTagAffinities, userFollows] = await Promise.all([
        prisma.post.findMany({
          where: { id: { in: freshPostIds } },
          include: {
            author: { include: { rank: true } },
            tags: { include: { tag: true } },
            _count: { select: { likes: true, comments: true } },
          },
        }),
        prisma.userTagAffinity.findMany({ where: { profileId: user.id } }),
        prisma.follow.findMany({
          where: { followerId: user.id },
          select: { followingId: true },
        }),
      ]);

      const followingSet = new Set(userFollows.map((f: any) => f.followingId));

      // Collect unique author IDs from posts for affinity lookup
      const authorIds = [...new Set(posts.map((p: any) => p.authorId))];

      // Social proof + author affinity + embeddings + dwell + notInterested queries (run in parallel)
      const [mutualLikeResults, authorAffinities, semanticScores, avgDwellResults, notInterestedResults] = await Promise.all([
        followingSet.size > 0
          ? prisma.postLike.findMany({
              where: {
                postId: { in: freshPostIds },
                profileId: { in: Array.from(followingSet) },
              },
              select: { postId: true },
            })
          : Promise.resolve([]),
        prisma.userAuthorAffinity.findMany({
          where: {
            userId: user.id,
            authorId: { in: authorIds },
          },
          select: { authorId: true, score: true },
        }),
        // Semantic relevance: cosine similarity between user's interestEmbedding and post contentEmbeddings
        // Uses pgvector <=> operator (cosine distance). Returns 1 - distance = similarity.
        (async () => {
          try {
            const result: { post_id: string; similarity: number }[] = await prisma.$queryRawUnsafe(`
              SELECT p.id AS post_id,
                     1 - (p."contentEmbedding" <=> prof."interestEmbedding") AS similarity
              FROM posts p, profiles prof
              WHERE prof.id = $1
                AND prof."interestEmbedding" IS NOT NULL
                AND p."contentEmbedding" IS NOT NULL
                AND p.id = ANY($2::text[])
            `, user.id, freshPostIds);
            return result;
          } catch {
            return [];
          }
        })(),
        // Average dwell time per post from PostView table
        (async () => {
          try {
            const result: { postId: string; avgDwell: number }[] = await prisma.$queryRawUnsafe(`
              SELECT "postId", AVG("dwellMs")::float AS "avgDwell"
              FROM post_views
              WHERE "postId" = ANY($1::text[])
              GROUP BY "postId"
            `, freshPostIds);
            return result;
          } catch {
            return [];
          }
        })(),
        // P1 #2: Batch-fetch "not interested" flags for the current user
        prisma.userNotInterested.findMany({
          where: { userId: user.id, postId: { in: freshPostIds } },
          select: { postId: true },
        }).catch(() => [] as { postId: string }[]),
      ]);

      const socialProofMap = new Map<string, number>();
      for (const like of mutualLikeResults) {
        socialProofMap.set(like.postId, (socialProofMap.get(like.postId) ?? 0) + 1);
      }

      // Not-interested set: posts the user explicitly marked
      const notInterestedSet = new Set(
        (notInterestedResults as { postId: string }[]).map((r) => r.postId)
      );

      // Normalize author affinity to 0–1 range using sigmoid (smooth, unbounded input)
      const authorAffinityMap = new Map<string, number>();
      for (const aff of authorAffinities) {
        authorAffinityMap.set(aff.authorId, sigmoidNormalize(aff.score));
      }

      // Semantic relevance map: postId → 0–1 cosine similarity
      const semanticMap = new Map<string, number>();
      for (const row of semanticScores) {
        const sim = Math.max(0, Math.min(1, (row as any).similarity ?? 0));
        semanticMap.set((row as any).post_id, sim);
      }

      // Average dwell time map: postId → avgDwellMs
      const dwellMap = new Map<string, number>();
      for (const row of avgDwellResults) {
        dwellMap.set((row as any).postId, (row as any).avgDwell ?? 0);
      }

      // Tag affinity decay: apply 0.95^daysSinceLastEngagement to raw affinity scores
      const now = Date.now();
      const decayedAffinityMap = new Map<string, number>();
      for (const aff of userTagAffinities as any[]) {
        const daysSinceUpdate = (now - new Date(aff.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        const decayedScore = aff.score * Math.pow(0.95, daysSinceUpdate);
        decayedAffinityMap.set(aff.tagName, decayedScore);
      }

      // 3. Build signals for each post
      const signals: (PostSignals & { post: any })[] = posts.map((post: any) => {
        const postTagNames = post.tags.map((pt: any) => pt.tag.name);
        // Use decayed tag affinity scores (recency-aware)
        const tagAffinityScore =
          postTagNames.reduce(
            (sum: number, tag: string) => sum + ((decayedAffinityMap.get(tag) as number) ?? 0),
            0
          ) / Math.max(postTagNames.length, 1);

        // Derive postType from actual data instead of hardcoding
        const detectedPostType: PostSignals["postType"] = postTagNames.includes("roast")
          ? "roast"
          : postTagNames.includes("event")
            ? "event"
            : post.projectName || post.projectId
              ? "project"
              : "post";

        return {
          post,
          postId: post.id,
          authorId: post.authorId,
          likesCount: post._count.likes,
          commentsCount: post._count.comments,
          sharesCount: post.sharesCount,
          createdAt: post.createdAt,
          authorXp: (post.author as any).xp,
          tagAffinityScore: Math.min(tagAffinityScore, 1.0),
          socialProof: socialProofMap.get(post.id) ?? 0,
          isFromFollowing: followingSet.has(post.authorId),
          authorAffinityScore: authorAffinityMap.get(post.authorId) ?? 0,
          postType: detectedPostType,
          semanticRelevance: semanticMap.get(post.id) ?? 0,
          avgDwellMs: dwellMap.get(post.id) ?? 0,
          feedVariant: resolvedVariant,
          notInterested: notInterestedSet.has(post.id), // P1 #2: populated from UserNotInterested
        };
      });

      // 4. Score + sort (with configurable weights & session CTR)
      const ranked = rankPosts(signals as PostSignals[], weights, sessionCtr);

      // 5. 2nd-degree candidates: posts liked by people the user follows
      //    (friends-of-friends discovery — Facebook's key growth loop)
      let secondDegreeSignals: ScoredPost[] = [];
      try {
        if (followingSet.size > 0) {
          const recentFollowLikes = await prisma.postLike.findMany({
            where: {
              profileId: { in: Array.from(followingSet) },
              post: {
                authorId: { notIn: [user.id, ...Array.from(followingSet)] }, // outside follow graph
                createdAt: { gte: new Date(Date.now() - 72 * 60 * 60 * 1000) }, // last 72h
              },
            },
            select: { postId: true },
            distinct: ["postId"],
            take: 10,
          });
          const secondDegreeIds = recentFollowLikes
            .map((l) => l.postId)
            .filter((id) => !seenSet.has(id) && !freshPostIds.includes(id));

          if (secondDegreeIds.length > 0) {
            const sdPosts = await prisma.post.findMany({
              where: { id: { in: secondDegreeIds } },
              include: {
                author: { include: { rank: true } },
                tags: { include: { tag: true } },
                _count: { select: { likes: true, comments: true } },
              },
            });

            const sdSignals: PostSignals[] = sdPosts.map((post: any) => {
              const postTagNames = post.tags.map((pt: any) => pt.tag.name);
              const tagAff =
                postTagNames.reduce(
                  (sum: number, tag: string) => sum + ((decayedAffinityMap.get(tag) as number) ?? 0),
                  0
                ) / Math.max(postTagNames.length, 1);

              const detectedType: PostSignals["postType"] = postTagNames.includes("roast")
                ? "roast"
                : postTagNames.includes("event")
                  ? "event"
                  : post.projectName || post.projectId
                    ? "project"
                    : "post";

              return {
                post,
                postId: post.id,
                authorId: post.authorId,
                likesCount: post._count.likes,
                commentsCount: post._count.comments,
                sharesCount: post.sharesCount,
                createdAt: post.createdAt,
                authorXp: (post.author as any).xp ?? 0,
                tagAffinityScore: Math.min(tagAff, 1.0),
                socialProof: socialProofMap.get(post.id) ?? 0,
                isFromFollowing: false,
                authorAffinityScore: authorAffinityMap.get(post.authorId) ?? 0,
                postType: detectedType,
                semanticRelevance: semanticMap.get(post.id) ?? 0,
                avgDwellMs: dwellMap.get(post.id) ?? 0,
                feedVariant: resolvedVariant,
              };
            });

            // Score 2nd-degree posts so they have _breakdown
            secondDegreeSignals = rankPosts(sdSignals, weights, sessionCtr);
          }
        }
      } catch (err) {
        console.error("[feed] 2nd-degree candidates error:", err);
      }

      // 6. Diversity pass — inject 2nd-degree explore content
      const diversified = applyDiversityPass(ranked, secondDegreeSignals);

      // Merge post maps for ranking
      const allPostsMap = new Map(posts.map((p: any) => [p.id, p]));
      for (const sig of secondDegreeSignals) {
        allPostsMap.set(sig.postId, (sig as any).post);
      }

      const finalPosts = diversified.slice(0, limit);

      // 7. Log FeedScoreLog — full breakdown for every post shown (fire-and-forget)
      logFeedScoreLogs(
        prisma,
        user.id,
        sessionId,
        resolvedVariant,
        finalPosts
      ).catch((err) => console.error("[feed] FeedScoreLog error:", err));

      const rankedPosts = finalPosts
        .map((s) => allPostsMap.get(s.postId))
        .filter(Boolean);

      // ── Batch-populate likedByMe + myReaction to avoid N+1 field resolvers ──
      const rankedPostIds = rankedPosts.map((p: any) => p.id);
      try {
        const myLikes = await prisma.postLike.findMany({
          where: { postId: { in: rankedPostIds }, profileId: user.id },
          select: { postId: true, reaction: true },
        });
        const likeMap = new Map(myLikes.map((l: any) => [l.postId, l.reaction]));
        for (const p of rankedPosts) {
          (p as any)._likedByMe = likeMap.has((p as any).id);
          (p as any)._myReaction = likeMap.get((p as any).id) ?? null;
        }
      } catch (err) {
        console.error("[feed] batch likedByMe error:", err);
      }

      return {
        posts: rankedPosts,
        hasMore: diversified.length > limit,
        nextOffset: offset + limit,
        feedVariant: resolvedVariant,
        sessionId,
      };
    },

    /**
     * Explore feed — trending/recent posts outside the user's follow graph.
     */
    exploreFeed: async (
      _: unknown,
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      { prisma }: GraphQLContext
    ) => {
      return exploreFeed(limit, offset, prisma);
    },

    /**
     * Feed metrics — A/B comparison stats for admin dashboards.
     * Compares ranked vs chronological feed variants over the given time window.
     */
    feedMetrics: async (
      _: unknown,
      { days = 7 }: { days?: number },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      try {
        // Session-level aggregations grouped by feed variant
        const sessionStats: { feedVariant: string; avgCtr: number; avgDwell: number; totalSessions: number; totalImpressions: number; totalEngagements: number }[] =
          await prisma.$queryRawUnsafe(`
            SELECT
              "feedVariant",
              AVG(ctr)::float AS "avgCtr",
              AVG("avgDwellMs")::float AS "avgDwell",
              COUNT(*)::int AS "totalSessions",
              SUM("postsShown")::int AS "totalImpressions",
              SUM("postsEngaged")::int AS "totalEngagements"
            FROM feed_sessions
            WHERE "createdAt" >= $1
            GROUP BY "feedVariant"
          `, since);

        const rankedStats = sessionStats.find((s) => s.feedVariant === "ranked");
        const chronStats = sessionStats.find((s) => s.feedVariant === "chronological");

        // Diversity score: measure how varied post types are in recent score logs
        let diversityScore = 0;
        try {
          const typeDistribution: { postType: string; cnt: number }[] =
            await prisma.$queryRawUnsafe(`
              SELECT "postType", COUNT(*)::int AS cnt
              FROM feed_score_logs
              WHERE "createdAt" >= $1
              GROUP BY "postType"
            `, since);
          const total = typeDistribution.reduce((s, r) => s + r.cnt, 0);
          if (total > 0) {
            // Shannon entropy normalized to 0–1 (higher = more diverse)
            const entropy = typeDistribution.reduce((sum, r) => {
              const p = r.cnt / total;
              return sum - (p > 0 ? p * Math.log2(p) : 0);
            }, 0);
            const maxEntropy = Math.log2(Math.max(typeDistribution.length, 1));
            diversityScore = maxEntropy > 0 ? entropy / maxEntropy : 0;
          }
        } catch {
          // Ignore diversity calc errors
        }

        return {
          rankedAvgCTR: rankedStats?.avgCtr ?? 0,
          chronologicalAvgCTR: chronStats?.avgCtr ?? 0,
          rankedAvgDwell: rankedStats?.avgDwell ?? 0,
          chronologicalAvgDwell: chronStats?.avgDwell ?? 0,
          rankedEngagementRate: rankedStats
            ? (rankedStats.totalImpressions > 0
              ? rankedStats.totalEngagements / rankedStats.totalImpressions
              : 0)
            : 0,
          chronologicalEngagementRate: chronStats
            ? (chronStats.totalImpressions > 0
              ? chronStats.totalEngagements / chronStats.totalImpressions
              : 0)
            : 0,
          totalImpressions: (rankedStats?.totalImpressions ?? 0) + (chronStats?.totalImpressions ?? 0),
          totalEngagements: (rankedStats?.totalEngagements ?? 0) + (chronStats?.totalEngagements ?? 0),
          totalSessions: (rankedStats?.totalSessions ?? 0) + (chronStats?.totalSessions ?? 0),
          diversityScore,
          days,
        };
      } catch (err) {
        console.error("[feedMetrics] error:", err);
        return {
          rankedAvgCTR: 0, chronologicalAvgCTR: 0,
          rankedAvgDwell: 0, chronologicalAvgDwell: 0,
          rankedEngagementRate: 0, chronologicalEngagementRate: 0,
          totalImpressions: 0, totalEngagements: 0, totalSessions: 0,
          diversityScore: 0, days,
        };
      }
    },

    post: async (
      _: unknown,
      { id }: { id: string },
      { prisma }: GraphQLContext
    ) => {
      return prisma.post.findUnique({
        where: { id },
        include: {
          author: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },

    userPosts: async (
      _: unknown,
      {
        userId,
        limit = 10,
        offset = 0,
      }: { userId: string; limit?: number; offset?: number },
      { prisma }: GraphQLContext
    ) => {
      const posts = await prisma.post.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        skip: offset,
        include: {
          author: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });

      const hasMore = posts.length > limit;
      return {
        posts: posts.slice(0, limit),
        hasMore,
        nextOffset: offset + limit,
      };
    },
  },

  Mutation: {
    createPost: async (
      _: unknown,
      { input }: { input: any },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Create post + connect tags in a transaction
      const post = await prisma.$transaction(async (tx: any) => {
        const tagNames: string[] = input.tags ?? [];

        // Upsert tags
        const tagRecords = await Promise.all(
          tagNames.map((name: string) =>
            tx.tag.upsert({
              where: { name },
              create: { name },
              update: {},
            })
          )
        );

        return tx.post.create({
          data: {
            authorId: user.id,
            content: input.content,
            imageUrl: input.imageUrl ?? input.imageUrls?.[0],
            imageUrls: input.imageUrls ?? (input.imageUrl ? [input.imageUrl] : []),
            projectName: input.projectName,
            projectId: input.projectId,
            tags: {
              create: tagRecords.map((tag) => ({ tagId: tag.id })),
            },
          },
          include: {
            author: { include: { rank: true } },
            tags: { include: { tag: true } },
          },
        });
      });

      // Publish to GetStream (async, don't block response)
      addActivityToFeed(user.id, {
        verb: "post",
        object: `post:${post.id}`,
        foreignId: `post:${post.id}`,
        time: post.createdAt,
        content: post.content.slice(0, 200),
      }).catch(console.error);

      // Award XP
      await awardXp(user.id, "CREATE_POST").catch(console.error);

      // Update tag affinity scores
      updateTagAffinities(user.id, input.tags ?? [], prisma).catch(
        console.error
      );

      return post;
    },

    deletePost: async (
      _: unknown,
      { id }: { id: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const post = await prisma.post.findUnique({ where: { id } });
      if (post?.authorId !== user.id) throw new Error("Forbidden");
      await prisma.post.delete({ where: { id } });
      return true;
    },

    likePost: async (
      _: unknown,
      { postId, reaction = "Like" }: { postId: string; reaction?: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const validReactions = ["Like", "Love", "Fire", "Haha", "Wow", "Sad"];
      const safeReaction = validReactions.includes(reaction) ? reaction : "Like";

      // Check if like already exists (reaction change vs new like)
      const existing = await prisma.postLike.findUnique({
        where: { postId_profileId: { postId, profileId: user.id } },
      });

      await prisma.postLike.upsert({
        where: { postId_profileId: { postId, profileId: user.id } },
        create: { postId, profileId: user.id, reaction: safeReaction },
        update: { reaction: safeReaction },
      });

      // Only increment count on a new like (not a reaction change)
      const post = await prisma.post.update({
        where: { id: postId },
        data: existing ? {} : { likesCount: { increment: 1 } },
        include: {
          author: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });

      // Award XP to post author
      awardXp(post.authorId, "RECEIVE_LIKE").catch(console.error);

      // Track author affinity + tag affinity for feed ranking
      if (!existing) {
        updateAuthorAffinity(user.id, post.authorId, "likeCount", prisma).catch(console.error);
        updateTagAffinitiesOnEngagement(user.id, postId, 0.1, prisma).catch(console.error);
        logInteraction(prisma, user.id, post.authorId, postId, "POST_LIKE", 1.0);

        // Phase 3: CTR tracking — mark the most recent PostView for this post as "engaged"
        markPostViewEngaged(prisma, user.id, postId).catch(console.error);

        // Phase 3: Interest embedding trigger — increment engagement count
        incrementFeedEngagementCount(prisma, user.id).catch(console.error);
      }

      // Notify post author
      if (post.authorId !== user.id) {
        prisma.notification.create({
          data: {
            recipientId: post.authorId,
            actorId: user.id,
            type: "LIKE",
            postId: postId,
          },
        }).catch(console.error);
      }

      return post;
    },

    unlikePost: async (
      _: unknown,
      { postId }: { postId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // P1 #11: Only decrement if a like actually existed (prevents negative counts)
      const deleted = await prisma.postLike.deleteMany({
        where: { postId, profileId: user.id },
      });

      if (deleted.count > 0) {
        return prisma.post.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
          include: {
            author: { include: { rank: true } },
            tags: { include: { tag: true } },
          },
        });
      }

      // No like existed — just return the post unchanged
      return prisma.post.findUnique({
        where: { id: postId },
        include: {
          author: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },

    sharePost: async (
      _: unknown,
      { postId, message = "" }: { postId: string; message?: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Get the post being shared — could itself be a share
      const targetPost = await prisma.post.findUniqueOrThrow({
        where: { id: postId },
        include: { author: true },
      });

      // Resolve the ROOT original post (flatten share chains).
      // If User A shares Post X → originalPostId = X
      // If User B shares User A's share → originalPostId = X  (not A's post)
      const rootOriginalId: string = targetPost.originalPostId ?? postId;

      // Fetch the root original for building content
      const rootOriginal = rootOriginalId === postId
        ? targetPost
        : await prisma.post.findUniqueOrThrow({
            where: { id: rootOriginalId },
            include: { author: true },
          });

      // Build the share content: optional user message only (no `[shared:...]` marker)
      const shareContent = message?.trim() ?? "";

      // Create new post in sharer's feed
      const newPost = await prisma.post.create({
        data: {
          authorId: user.id,
          content: shareContent,
          // No images / projectName on the share post itself — original is embedded via originalPost
          originalPostId: rootOriginalId,
        },
        include: {
          author: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });

      // Increment sharesCount on the ROOT original post
      await prisma.post.update({
        where: { id: rootOriginalId },
        data: { sharesCount: { increment: 1 } },
      });

      // Notify root original author (not for self-shares)
      if (rootOriginal.authorId !== user.id) {
        prisma.notification.create({
          data: {
            recipientId: rootOriginal.authorId,
            actorId: user.id,
            type: "LIKE",   // closest available type; no POST_SHARE in enum yet
            postId: rootOriginalId,
          },
        }).catch(console.error);
      }

      // Award XP to sharer
      awardXp(user.id, "CREATE_POST").catch(console.error);

      // Track author affinity + tag affinity for feed ranking
      updateAuthorAffinity(user.id, rootOriginal.authorId, "shareCount", prisma).catch(console.error);
      updateTagAffinitiesOnEngagement(user.id, rootOriginalId, 0.3, prisma).catch(console.error);
      logInteraction(prisma, user.id, rootOriginal.authorId, rootOriginalId, "POST_SHARE", 3.0);

      // Phase 3: CTR tracking + interest embedding trigger
      markPostViewEngaged(prisma, user.id, rootOriginalId).catch(console.error);
      incrementFeedEngagementCount(prisma, user.id).catch(console.error);

      return newPost;
    },

    commentOnPost: async (
      _: unknown,
      { input }: { input: { postId: string; content: string; mentions?: string[] } },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const comment = await prisma.postComment.create({
        data: {
          postId: input.postId,
          authorId: user.id,
          content: input.content,
          parentId: null,
          mentions: input.mentions ?? [],
        },
        include: {
          author: { include: { rank: true } },
          post: true,
          editHistory: { orderBy: { editedAt: "desc" } },
          replies: {
            include: { author: { include: { rank: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      // Update comment counter
      await prisma.post.update({
        where: { id: input.postId },
        data: { commentsCount: { increment: 1 } },
      });

      // Track author affinity + tag affinity for feed ranking
      updateAuthorAffinity(user.id, comment.post.authorId, "commentCount", prisma).catch(console.error);
      updateTagAffinitiesOnEngagement(user.id, input.postId, 0.2, prisma).catch(console.error);
      logInteraction(prisma, user.id, comment.post.authorId, input.postId, "POST_COMMENT", 2.0);

      // Phase 3: CTR tracking + interest embedding trigger
      markPostViewEngaged(prisma, user.id, input.postId).catch(console.error);
      incrementFeedEngagementCount(prisma, user.id).catch(console.error);

      // Award XP to post author
      awardXp(comment.post.authorId, "RECEIVE_COMMENT").catch(console.error);

      // Notify
      if (comment.post.authorId !== user.id) {
        prisma.notification.create({
          data: {
            recipientId: comment.post.authorId,
            actorId: user.id,
            type: "COMMENT",
            postId: input.postId,
          },
        }).catch(console.error);
      }

      // Notify mentioned users
      for (const mentionedId of input.mentions ?? []) {
        if (mentionedId !== user.id) {
          prisma.notification.create({
            data: {
              recipientId: mentionedId,
              actorId: user.id,
              type: "MENTION",
              postId: input.postId,
            },
          }).catch(console.error);
        }
      }

      return comment;
    },

    replyToComment: async (
      _: unknown,
      { input }: { input: { postId: string; parentId: string; content: string; mentions?: string[] } },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const parent = await prisma.postComment.findUnique({
        where: { id: input.parentId },
        include: { post: true },
      });
      if (!parent) throw new Error("Parent comment not found");

      const reply = await prisma.postComment.create({
        data: {
          postId: input.postId,
          authorId: user.id,
          content: input.content,
          parentId: input.parentId,
          mentions: input.mentions ?? [],
        },
        include: {
          author: { include: { rank: true } },
          post: true,
          editHistory: { orderBy: { editedAt: "desc" } },
          replies: {
            include: { author: { include: { rank: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      // Update post comment counter
      await prisma.post.update({
        where: { id: input.postId },
        data: { commentsCount: { increment: 1 } },
      });

      // Notify the parent comment author
      if (parent.authorId !== user.id) {
        prisma.notification.create({
          data: {
            recipientId: parent.authorId,
            actorId: user.id,
            type: "COMMENT",
            postId: input.postId,
          },
        }).catch(console.error);
      }

      // Notify mentioned users
      for (const mentionedId of input.mentions ?? []) {
        if (mentionedId !== user.id) {
          prisma.notification.create({
            data: {
              recipientId: mentionedId,
              actorId: user.id,
              type: "MENTION",
              postId: input.postId,
            },
          }).catch(console.error);
        }
      }

      return reply;
    },

    likeComment: async (
      _: unknown,
      { commentId, reaction = "Like" }: { commentId: string; reaction?: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const validReactions = ["Like", "Love", "Fire", "Haha", "Wow", "Sad"];
      const safeReaction = validReactions.includes(reaction) ? reaction : "Like";

      const existing = await prisma.commentLike.findUnique({
        where: { commentId_profileId: { commentId, profileId: user.id } },
      });

      await prisma.commentLike.upsert({
        where: { commentId_profileId: { commentId, profileId: user.id } },
        create: { commentId, profileId: user.id, reaction: safeReaction },
        update: { reaction: safeReaction },
      });

      return prisma.postComment.update({
        where: { id: commentId },
        data: existing ? {} : { likesCount: { increment: 1 } },
        include: {
          author: { include: { rank: true } },
          post: true,
          editHistory: { orderBy: { editedAt: "desc" } },
          replies: {
            include: { author: { include: { rank: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    },

    unlikeComment: async (
      _: unknown,
      { commentId }: { commentId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      await prisma.commentLike.deleteMany({
        where: { commentId, profileId: user.id },
      });

      return prisma.postComment.update({
        where: { id: commentId },
        data: { likesCount: { decrement: 1 } },
        include: {
          author: { include: { rank: true } },
          post: true,
          editHistory: { orderBy: { editedAt: "desc" } },
          replies: {
            include: { author: { include: { rank: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    },

    editComment: async (
      _: unknown,
      { commentId, content }: { commentId: string; content: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const comment = await prisma.postComment.findUnique({
        where: { id: commentId },
      });
      if (!comment) throw new Error("Comment not found");
      if (comment.authorId !== user.id) throw new Error("Forbidden");

      // Save previous content to edit history
      await prisma.postCommentEdit.create({
        data: {
          commentId,
          previousContent: comment.content,
        },
      });

      return prisma.postComment.update({
        where: { id: commentId },
        data: { content },
        include: {
          author: { include: { rank: true } },
          post: true,
          editHistory: { orderBy: { editedAt: "desc" } },
          replies: {
            include: { author: { include: { rank: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    },

    deleteComment: async (
      _: unknown,
      { commentId }: { commentId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const comment = await prisma.postComment.findUnique({
        where: { id: commentId },
        include: { replies: { select: { id: true } } },
      });
      if (!comment) throw new Error("Comment not found");
      if (comment.authorId !== user.id) throw new Error("Forbidden");
      // Count this comment + all its replies for the decrement
      const totalToDecrement = 1 + (comment as any).replies.length;
      await prisma.postComment.delete({ where: { id: commentId } });
      await prisma.post.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: totalToDecrement } },
      });
      return true;
    },

    /**
     * Record a post view with dwell time — the most important ranking signal.
     * Also updates UserAuthorAffinity (view count) and tag affinities.
     * Phase 3: accepts position + sessionId for CTR tracking.
     */
    recordPostView: async (
      _: unknown,
      { postId, dwellMs, source = "feed", feedVariant, position, sessionId }: {
        postId: string; dwellMs: number; source?: string; feedVariant?: string;
        position?: number; sessionId?: string;
      },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return null;

      try {
        // 1. Record the view (with position + sessionId for CTR analysis)
        const view = await prisma.postView.create({
          data: {
            postId,
            viewerId: user.id,
            dwellMs: Math.min(dwellMs, 300_000), // cap at 5 min
            source,
            ...(feedVariant ? { feedVariant } : {}),
            ...(position !== undefined ? { position } : {}),
            ...(sessionId ? { sessionId } : {}),
          },
        });

        // 2. Update session metrics (postsShown, totalDwellMs)
        if (sessionId) {
          prisma.feedSession.update({
            where: { id: sessionId },
            data: {
              totalDwellMs: { increment: Math.min(dwellMs, 300_000) },
            },
          }).catch(console.error);
        }

        // 3. Fetch the post to get authorId
        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { authorId: true },
        });
        if (!post) return view.id;

        // 4. Update author affinity (async, don't block response)
        updateAuthorAffinity(user.id, post.authorId, "viewCount", prisma).catch(console.error);

        // 4b. Log to UserInteraction table
        logInteraction(prisma, user.id, post.authorId, postId, "PROFILE_VIEW", 0.2);

        // 5. Update tag affinity based on dwell time
        // Only meaningful if user dwelled ≥ 2 seconds
        if (dwellMs >= 2000) {
          updateTagAffinitiesOnEngagement(user.id, postId, 0.05, prisma).catch(console.error);
        }

        return view.id;
      } catch (err) {
        console.error("[recordPostView] error:", err);
        return null;
      }
    },

    /**
     * "Not interested" — negative ranking signal.
     * Decreases author affinity so future posts from this author rank lower.
     * Also updates tag affinity downward for the post's tags.
     */
    markNotInterestedInPost: async (
      _: unknown,
      { postId }: { postId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      try {
        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { authorId: true },
        });
        if (!post) return false;

        // Decrease author affinity significantly
        const existing = await prisma.userAuthorAffinity.findUnique({
          where: { userId_authorId: { userId: user.id, authorId: post.authorId } },
        });
        if (existing) {
          const newScore = Math.max(existing.score - 5.0, 0);
          await prisma.userAuthorAffinity.update({
            where: { userId_authorId: { userId: user.id, authorId: post.authorId } },
            data: { score: newScore },
          });
        }

        // P1 #2: Persist the "not interested" flag for future feed filtering
        await prisma.userNotInterested.upsert({
          where: { userId_postId: { userId: user.id, postId } },
          create: { userId: user.id, postId },
          update: {},
        });

        // Decrease tag affinity for this post's tags
        updateTagAffinitiesOnEngagement(user.id, postId, -0.3, prisma).catch(console.error);

        return true;
      } catch (err) {
        console.error("[markNotInterestedInPost] error:", err);
        return false;
      }
    },
  },

  Post: {
    imageUrls: (parent: any) => {
      // Return stored array, falling back to wrapping imageUrl for old posts
      if (parent.imageUrls && parent.imageUrls.length > 0) return parent.imageUrls;
      if (parent.imageUrl) return [parent.imageUrl];
      return [];
    },

    // Resolve the root original post for shared posts
    originalPost: async (parent: { originalPostId?: string | null }, _: unknown, { prisma }: GraphQLContext) => {
      if (!parent.originalPostId) return null;
      return prisma.post.findUnique({
        where: { id: parent.originalPostId },
        include: {
          author: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },

    postType: async (parent: { id: string; tags?: any[] }, _: unknown, { prisma }: GraphQLContext) => {
      // Use pre-loaded tags if available on parent, otherwise query
      const tags: { name: string }[] = parent.tags?.length
        ? parent.tags.map((t: any) => t.tag ?? t) // handle PostTag join or raw Tag
        : await prisma.postTag
            .findMany({ where: { postId: parent.id }, include: { tag: true } })
            .then((pts: any[]) => pts.map((pt) => pt.tag));
      return tags.some((t) => t.name === "roast") ? "roast" : "post";
    },

    tags: async (parent: { id: string }, _: unknown, { prisma }: GraphQLContext) => {
      const postTags = await prisma.postTag.findMany({
        where: { postId: parent.id },
        include: { tag: true },
      });
      return postTags.map((pt: any) => pt.tag);
    },

    likedByMe: async (
      parent: { id: string; _likedByMe?: boolean },
      _: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (parent._likedByMe !== undefined) return parent._likedByMe;
      if (!user) return false;
      const like = await prisma.postLike.findUnique({
        where: { postId_profileId: { postId: parent.id, profileId: user.id } },
      });
      return !!like;
    },

    myReaction: async (
      parent: { id: string; _myReaction?: string | null },
      _: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (parent._myReaction !== undefined) return parent._myReaction;
      if (!user) return null;
      const like = await prisma.postLike.findUnique({
        where: { postId_profileId: { postId: parent.id, profileId: user.id } },
      });
      return like?.reaction ?? null;
    },

    comments: async (
      parent: { id: string },
      { limit = 10, offset = 0 }: { limit?: number; offset?: number },
      { prisma }: GraphQLContext
    ) => {
      return prisma.postComment.findMany({
        where: { postId: parent.id, parentId: null },
        orderBy: { createdAt: "asc" },
        take: limit,
        skip: offset,
        include: {
          author: { include: { rank: true } },
          editHistory: { orderBy: { editedAt: "desc" } },
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { include: { rank: true } },
              editHistory: { orderBy: { editedAt: "desc" } },
              replies: {
                orderBy: { createdAt: "asc" },
                include: {
                  author: { include: { rank: true } },
                  editHistory: { orderBy: { editedAt: "desc" } },
                  replies: { select: { id: true } }, // depth-3 not rendered but we need the array
                },
              },
            },
          },
        },
      });
    },
  },

  PostComment: {
    likedByMe: async (
      parent: { id: string },
      _: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return false;
      const like = await prisma.commentLike.findUnique({
        where: { commentId_profileId: { commentId: parent.id, profileId: user.id } },
      });
      return !!like;
    },

    myReaction: async (
      parent: { id: string },
      _: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return null;
      const like = await prisma.commentLike.findUnique({
        where: { commentId_profileId: { commentId: parent.id, profileId: user.id } },
      });
      return like?.reaction ?? null;
    },

    editHistory: async (
      parent: { id: string; editHistory?: any[] },
      _: unknown,
      { prisma }: GraphQLContext
    ) => {
      // If eagerly loaded, use it; otherwise query
      if (parent.editHistory) return parent.editHistory;
      return prisma.postCommentEdit.findMany({
        where: { commentId: parent.id },
        orderBy: { editedAt: "desc" },
      });
    },

    isEdited: (parent: { editHistory?: any[] }) => {
      return (parent.editHistory?.length ?? 0) > 0;
    },

    mentions: (parent: { mentions?: string[] }) => {
      return parent.mentions ?? [];
    },

    replies: async (
      parent: { id: string },
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      { prisma }: GraphQLContext
    ) => {
      // replies are also eagerly included by the parent query, so this is a fallback
      return prisma.postComment.findMany({
        where: { parentId: parent.id },
        orderBy: { createdAt: "asc" },
        take: limit,
        skip: offset,
        include: {
          author: { include: { rank: true } },
          editHistory: { orderBy: { editedAt: "desc" } },
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { include: { rank: true } },
              editHistory: { orderBy: { editedAt: "desc" } },
              replies: { select: { id: true } },
            },
          },
        },
      });
    },
  },
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Log a user interaction to the UserInteraction table.
 * Fire-and-forget — never blocks the response.
 */
function logInteraction(
  prisma: any,
  fromId: string,
  toId: string | null,
  entityId: string | null,
  type: string,
  weight: number = 1.0
) {
  prisma.userInteraction
    .create({
      data: { fromId, toId, entityId, type, weight },
    })
    .catch((err: any) => console.error("[logInteraction]", type, err));
}

async function exploreFeed(
  limit: number,
  offset: number,
  prisma: any
) {
  // P1 #5: Time filter — only show posts from last 7 days to avoid full table scan
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const posts = await prisma.post.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    orderBy: [{ likesCount: "desc" }, { createdAt: "desc" }],
    take: limit + 1,
    skip: offset,
    include: {
      author: { include: { rank: true } },
      tags: { include: { tag: true } },
    },
  });

  return {
    posts: posts.slice(0, limit),
    hasMore: posts.length > limit,
    nextOffset: offset + limit,
  };
}

/**
 * After a user creates a post with tags, boost their affinity scores for those tags.
 * This powers the interest-based ranking later.
 */
async function updateTagAffinities(
  profileId: string,
  tagNames: string[],
  prisma: any
) {
  for (const tagName of tagNames) {
    await prisma.userTagAffinity.upsert({
      where: { profileId_tagName: { profileId, tagName } },
      create: { profileId, tagName, score: 0.1 },
      update: { score: { increment: 0.05 } }, // boost affinity each time they use tag
    });
  }
}

/**
 * Boost tag affinity when a user ENGAGES with someone else's tagged post.
 * Deltas are smaller than "create" because engagement is a weaker signal.
 */
async function updateTagAffinitiesOnEngagement(
  profileId: string,
  postId: string,
  delta: number,
  prisma: any
) {
  try {
    const postTags = await prisma.postTag.findMany({
      where: { postId },
      include: { tag: true },
    });
    for (const pt of postTags) {
      await prisma.userTagAffinity.upsert({
        where: { profileId_tagName: { profileId, tagName: pt.tag.name } },
        create: { profileId, tagName: pt.tag.name, score: delta },
        update: { score: { increment: delta } },
      });
    }
  } catch (err) {
    console.error("[feedRanking] updateTagAffinitiesOnEngagement:", err);
  }
}

/**
 * Recompute composite score formula:
 * score = likeCount * 1.5 + commentCount * 3.0 + shareCount * 5.0 + viewCount * 0.2
 */
function computeAuthorAffinityScore(row: {
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
}): number {
  return (
    row.likeCount * 1.5 +
    row.commentCount * 3.0 +
    row.shareCount * 5.0 +
    row.viewCount * 0.2
  );
}

/**
 * Increment one field on UserAuthorAffinity and recompute the composite score.
 * P1 #9: Atomic upsert using INSERT ... ON CONFLICT to avoid race conditions.
 */
async function updateAuthorAffinity(
  userId: string,
  authorId: string,
  field: "likeCount" | "commentCount" | "shareCount" | "viewCount",
  prisma: any
) {
  if (userId === authorId) return; // don't track self-affinity

  // Weight map matching computeAuthorAffinityScore formula
  const weights: Record<string, number> = {
    likeCount: 1.5,
    commentCount: 3.0,
    shareCount: 5.0,
    viewCount: 0.2,
  };

  // Map field names to DB column names (camelCase → snake_case in @@map table)
  const colMap: Record<string, string> = {
    likeCount: '"likeCount"',
    commentCount: '"commentCount"',
    shareCount: '"shareCount"',
    viewCount: '"viewCount"',
  };

  const targetCol = colMap[field];

  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO user_author_affinities (id, "userId", "authorId", "likeCount", "commentCount", "shareCount", "viewCount", score, "updatedAt")
      VALUES (gen_random_uuid()::text, $1, $2, 
        ${field === 'likeCount' ? 1 : 0}, 
        ${field === 'commentCount' ? 1 : 0}, 
        ${field === 'shareCount' ? 1 : 0}, 
        ${field === 'viewCount' ? 1 : 0},
        ${weights[field]},
        NOW()
      )
      ON CONFLICT ("userId", "authorId") DO UPDATE SET
        ${targetCol} = user_author_affinities.${targetCol} + 1,
        score = (user_author_affinities."likeCount" + ${field === 'likeCount' ? 1 : 0}) * 1.5
             + (user_author_affinities."commentCount" + ${field === 'commentCount' ? 1 : 0}) * 3.0
             + (user_author_affinities."shareCount" + ${field === 'shareCount' ? 1 : 0}) * 5.0
             + (user_author_affinities."viewCount" + ${field === 'viewCount' ? 1 : 0}) * 0.2,
        "updatedAt" = NOW()
    `, userId, authorId);
  } catch (err) {
    console.error("[feedRanking] updateAuthorAffinity:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// Phase 3 Helpers — Feedback Loops & Online Learning
// ─────────────────────────────────────────────────────────────

/**
 * Log full score breakdown for every post in a feed response.
 * Fire-and-forget batch insert — never blocks the response.
 */
async function logFeedScoreLogs(
  prisma: any,
  userId: string,
  sessionId: string | null,
  feedVariant: string,
  posts: ScoredPost[]
): Promise<void> {
  if (posts.length === 0) return;

  const data = posts.map((post, index) => ({
    userId,
    postId: post.postId,
    sessionId: sessionId ?? undefined,
    feedVariant,
    position: index,
    finalScore: post._breakdown.finalScore,
    engagementScore: post._breakdown.engagementScore,
    decayFactor: post._breakdown.decayFactor,
    rankBoost: post._breakdown.rankBoost,
    socialBoost: post._breakdown.socialBoost,
    typeBoost: post._breakdown.typeBoost,
    interestBoost: post._breakdown.interestBoost,
    followingBoost: post._breakdown.followingBoost,
    authorAffinityBoost: post._breakdown.authorAffinityBoost,
    velocityBoost: post._breakdown.velocityBoost,
    semanticBoost: post._breakdown.semanticBoost,
    dwellBoost: post._breakdown.dwellBoost,
    notInterestedPenalty: post._breakdown.notInterestedPenalty,
    postType: post.postType,
    authorId: post.authorId,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    sharesCount: post.sharesCount,
  }));

  await prisma.feedScoreLog.createMany({ data });
}

/**
 * Mark the most recent PostView as "engaged" when user likes/comments/shares.
 * This enables CTR calculation: engaged views / total views.
 */
async function markPostViewEngaged(
  prisma: any,
  userId: string,
  postId: string
): Promise<void> {
  try {
    // Find the most recent view of this post by this user
    const recentView = await prisma.postView.findFirst({
      where: { viewerId: userId, postId },
      orderBy: { createdAt: "desc" },
      select: { id: true, sessionId: true },
    });
    if (!recentView) return;

    // Mark it as engaged
    await prisma.postView.update({
      where: { id: recentView.id },
      data: { engaged: true },
    });

    // Update session engagement count + CTR
    if (recentView.sessionId) {
      const session = await prisma.feedSession.findUnique({
        where: { id: recentView.sessionId },
        select: { postsShown: true, postsEngaged: true },
      });
      if (session) {
        const newEngaged = session.postsEngaged + 1;
        const newCtr = session.postsShown > 0 ? newEngaged / session.postsShown : 0;
        await prisma.feedSession.update({
          where: { id: recentView.sessionId },
          data: {
            postsEngaged: { increment: 1 },
            ctr: newCtr,
          },
        });
      }
    }
  } catch (err) {
    console.error("[markPostViewEngaged] error:", err);
  }
}

/**
 * Increment feed engagement count on Profile.
 * Every 10th engagement triggers interest embedding recomputation.
 */
async function incrementFeedEngagementCount(
  prisma: any,
  userId: string
): Promise<void> {
  try {
    const profile = await prisma.profile.update({
      where: { id: userId },
      data: { feedEngagementCount: { increment: 1 } },
      select: { feedEngagementCount: true },
    });

    // Trigger recompute every 10 engagements
    if (profile.feedEngagementCount % 10 === 0) {
      triggerInterestEmbeddingRecompute(userId).catch(console.error);
    }
  } catch (err) {
    console.error("[incrementFeedEngagementCount] error:", err);
  }
}

/**
 * Trigger the Supabase Edge Function to recompute user's interest embedding.
 * This is a weighted average of content embeddings from posts the user engaged with.
 */
async function triggerInterestEmbeddingRecompute(userId: string): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("[triggerInterestEmbeddingRecompute] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/recompute-interest-embedding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ userId }),
    });

    if (!resp.ok) {
      console.error("[triggerInterestEmbeddingRecompute] Edge Function error:", resp.status, await resp.text());
    } else {
      console.log(`[triggerInterestEmbeddingRecompute] Recomputed interest embedding for user ${userId}`);
    }
  } catch (err) {
    console.error("[triggerInterestEmbeddingRecompute] fetch error:", err);
  }
}
