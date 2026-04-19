import { GraphQLContext } from "../context";
import { addActivityToFeed, getRawFeed } from "../../lib/stream";
import { createNotification } from "../../lib/notifications";
import { sanitizeInput } from "../../middleware/security";
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
import { awardXp, checkAndAwardRoles } from "../../services/xp";

// ─────────────────────────────────────────────────────────────
// Cursor Helpers — Relay-style opaque cursor encoding
// ─────────────────────────────────────────────────────────────

interface CursorPayload {
  score: number;
  createdAt: string; // ISO 8601
  id: string;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    if (typeof parsed.score === "number" && parsed.createdAt && parsed.id) {
      return parsed as CursorPayload;
    }
    return null;
  } catch {
    return null;
  }
}

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
      {
        first, after, limit = 20, offset = 0, seenIds = [], feedVariant, sessionId: incomingSessionId,
      }: {
        first?: number; after?: string;
        limit?: number; offset?: number; seenIds?: string[];
        feedVariant?: string; sessionId?: string;
      },
      { user, prisma }: GraphQLContext
    ) => {
      // Normalize: prefer Relay-style `first`/`after`, fall back to legacy `limit`/`offset`
      const requestedLimit = first ?? limit;
      // Server-side limit cap — prevent abuse
      const safeLimit = Math.min(requestedLimit, 50);

      // Decode cursor if provided
      const cursorPayload = after ? decodeCursor(after) : null;

      // Unauthenticated users get the explore feed
      if (!user) {
        return exploreFeedAsConnection(safeLimit, offset, prisma);
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
      // P3 #17: Accept sessionId from client to resume pagination session
      let sessionId: string | null = incomingSessionId ?? null;
      let sessionCtr: number | undefined = undefined;
      try {
        if (incomingSessionId) {
          // Client passed a sessionId from previous page — resume it
          const existingSession = await prisma.feedSession.findUnique({
            where: { id: incomingSessionId },
          });
          if (existingSession && existingSession.userId === user.id) {
            sessionId = existingSession.id;
            sessionCtr = existingSession.ctr;
            await prisma.feedSession.update({
              where: { id: existingSession.id },
              data: { postsShown: { increment: safeLimit } },
            }).catch(console.error);
          } else {
            sessionId = null; // invalid session, fall through to create/find
          }
        }

        if (!sessionId) {
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
            await prisma.feedSession.update({
              where: { id: activeSession.id },
              data: { postsShown: { increment: safeLimit } },
            }).catch(console.error);
          } else {
            const newSession = await prisma.feedSession.create({
              data: {
                userId: user.id,
                feedVariant: resolvedVariant,
                postsShown: safeLimit,
              },
            });
            sessionId = newSession.id;
            sessionCtr = undefined;
          }
        }
      } catch (err) {
        console.error("[feed] session management error:", err);
      }

      // 1. Get raw activities from GetStream
      //    Wrapped in try/catch — if GetStream isn't fully configured (missing token,
      //    client-side mode) we fall through gracefully to the explore feed.
      let rawActivities: any[] = [];
      try {
        rawActivities = await getRawFeed(user.id, safeLimit + 10, offset);
      } catch (streamErr: any) {
        // Timeline feed group may not exist — silently fall back to explore feed
        if (!streamErr?.message?.includes("does not exist")) {
          console.warn("[feed] GetStream unavailable, falling back to explore feed:", streamErr?.message);
        }
        return exploreFeedAsConnection(safeLimit, offset, prisma);
      }

      // Extract post IDs from activities (format: "post:abc123")
      const postIds = rawActivities
        .map((a: any) => {
          const obj = a.object as string;
          return obj?.startsWith("post:") ? obj.replace("post:", "") : null;
        })
        .filter(Boolean) as string[];

      // Filter out already-seen posts to avoid showing duplicates across refreshes.
      // Cap seenIds at 200 entries — a client that accumulates hundreds of IDs
      // over days of scrolling can exhaust the entire candidate pool and produce
      // a blank feed.  We keep only the 200 most-recently-seen (tail of the array)
      // because older entries are unlikely to re-appear anyway.
      const cappedSeenIds = seenIds.length > 200 ? seenIds.slice(-200) : seenIds;
      const seenSet = new Set(cappedSeenIds);
      let freshPostIds = postIds.filter((id) => !seenSet.has(id));

      // Cold-start: if user has very few candidates (< 5), supplement with trending posts.
      // Try progressively wider windows (72h → 7d → 30d) so a quiet period or a
      // brand-new account never ends up with an empty candidate list.
      if (freshPostIds.length < 5) {
        const coldWindows = [72, 7 * 24, 30 * 24];
        for (const hours of coldWindows) {
          try {
            const trendingPosts = await prisma.post.findMany({
              where: {
                id: { notIn: [...freshPostIds, ...cappedSeenIds] },
                createdAt: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) },
              },
              orderBy: [{ likesCount: "desc" }, { commentsCount: "desc" }],
              take: 15,
              select: { id: true },
            });
            if (trendingPosts.length > 0) {
              freshPostIds = [...freshPostIds, ...trendingPosts.map((p: any) => p.id)];
              break; // stop widening once we have results
            }
          } catch (err) {
            console.error("[feed] cold-start trending fallback error:", err);
            break;
          }
        }
      }

      if (freshPostIds.length === 0) {
        return exploreFeedAsConnection(safeLimit, offset, prisma);
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

      // Social proof + author affinity + embeddings + dwell + notInterested + reactions queries (run in parallel)
      const [mutualLikeResults, authorAffinities, semanticScores, avgDwellResults, notInterestedResults, reactionWeightResults] = await Promise.all([
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
        }).catch((err: any) => {
          console.error("[feed] userAuthorAffinity.findMany error (non-fatal):", err?.message ?? err);
          return [] as { authorId: string; score: number }[];
        }),
        // Semantic relevance: cosine similarity between user's interestEmbedding and post contentEmbeddings
        // Uses pgvector <=> operator (cosine distance). Returns 1 - distance = similarity.
        (async () => {
          try {
            const result: { post_id: string; similarity: number }[] = await prisma.$queryRawUnsafe(`
              SELECT p.id AS post_id,
                     1 - (p."contentEmbedding" <=> prof."interestEmbedding") AS similarity
              FROM posts p, profiles prof
              WHERE prof.id = $1::uuid
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
        // P2 #8: Reaction-weighted like counts per post
        (async () => {
          try {
            const result: { postId: string; weightedLikes: number }[] = await prisma.$queryRawUnsafe(`
              SELECT "postId",
                SUM(CASE
                  WHEN reaction IN ('Love', 'Fire') THEN 2.0
                  WHEN reaction IN ('Haha', 'Wow') THEN 1.5
                  WHEN reaction = 'Angry' THEN 0.5
                  WHEN reaction = 'Sad' THEN 0.8
                  ELSE 1.0
                END)::float AS "weightedLikes"
              FROM post_likes
              WHERE "postId" = ANY($1::text[])
              GROUP BY "postId"
            `, freshPostIds);
            return result;
          } catch {
            return [];
          }
        })(),
      ]);

      const socialProofMap = new Map<string, number>();
      for (const like of mutualLikeResults) {
        socialProofMap.set(like.postId, (socialProofMap.get(like.postId) ?? 0) + 1);
      }

      // Not-interested set: posts the user explicitly marked
      const notInterestedSet = new Set(
        (notInterestedResults as { postId: string }[]).map((r) => r.postId)
      );

      // P2 #8: Reaction-weighted likes map (Love/Fire=2.0, Haha/Wow=1.5, Like=1.0)
      const reactionWeightMap = new Map<string, number>();
      for (const row of reactionWeightResults as { postId: string; weightedLikes: number }[]) {
        reactionWeightMap.set(row.postId, row.weightedLikes);
      }

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
          reactionWeightedLikes: reactionWeightMap.get(post.id), // P2 #8: weighted by reaction type
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

      // ── Cursor-based filtering ──
      // If a cursor was provided, skip all items up to and including the cursor position.
      // Posts are sorted by finalScore desc, then createdAt desc, then id desc.
      let sliceStart = diversified;
      if (cursorPayload) {
        const idx = diversified.findIndex((s) => s.postId === cursorPayload.id);
        if (idx !== -1) {
          sliceStart = diversified.slice(idx + 1);
        } else {
          // Cursor post not in current set — fall back to score comparison
          sliceStart = diversified.filter((s) => {
            const score = s._breakdown.finalScore;
            if (score < cursorPayload.score) return true;
            if (score === cursorPayload.score) {
              const postObj = allPostsMap.get(s.postId);
              const createdAt = postObj ? new Date(postObj.createdAt).toISOString() : '';
              if (createdAt < cursorPayload.createdAt) return true;
              if (createdAt === cursorPayload.createdAt && s.postId < cursorPayload.id) return true;
            }
            return false;
          });
        }
      }

      const hasNextPage = sliceStart.length > safeLimit;
      const finalPosts = sliceStart.slice(0, safeLimit);

      // 7. Log FeedScoreLog — full breakdown for every post shown (fire-and-forget)
      // NOTE: allPostsMap entries have author.displayName / author.username / author.name.
      //       The GraphQL Post.author resolver (below) should prefer displayName ?? username ?? name
      //       so emails stored in `name` are never surfaced to the client.
      logFeedScoreLogs(
        prisma,
        user.id,
        sessionId,
        resolvedVariant,
        finalPosts
      ).catch((err) => console.error("[feed] FeedScoreLog error:", err));

      // P3 #16: Update rankScore on posts (fire-and-forget) for exploreFeed sorting
      updatePostRankScores(prisma, finalPosts).catch((err) =>
        console.error("[feed] rankScore update error:", err)
      );

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
        pageInfo: {
          hasNextPage,
          endCursor: rankedPosts.length > 0
            ? encodeCursor({
                score: finalPosts[finalPosts.length - 1]._breakdown.finalScore,
                createdAt: (rankedPosts[rankedPosts.length - 1] as any).createdAt
                  ? new Date((rankedPosts[rankedPosts.length - 1] as any).createdAt).toISOString()
                  : new Date().toISOString(),
                id: (rankedPosts[rankedPosts.length - 1] as any).id,
              })
            : null,
        },
        hasMore: hasNextPage,
        nextOffset: offset + safeLimit,
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
      return exploreFeed(Math.min(limit, 50), offset, prisma);
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
      // CRIT-03: Admin-only — internal A/B test metrics must not be public
      await assertAdminRole(prisma, user.id);

      // Cap to prevent full table scan on feed_sessions / feed_score_logs
      const safeDays = Math.min(days, 90);
      const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

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
          days: safeDays,
        };
      } catch (err) {
        console.error("[feedMetrics] error:", err);
        return {
          rankedAvgCTR: 0, chronologicalAvgCTR: 0,
          rankedAvgDwell: 0, chronologicalAvgDwell: 0,
          rankedEngagementRate: 0, chronologicalEngagementRate: 0,
          totalImpressions: 0, totalEngagements: 0, totalSessions: 0,
          diversityScore: 0, days: safeDays,
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

    /**
     * On-demand lazy loading of comment replies.
     * Called when the user clicks "View X replies" on a comment.
     */
    commentReplies: async (
      _: unknown,
      { commentId, limit = 20, offset = 0 }: { commentId: string; limit?: number; offset?: number },
      { prisma }: GraphQLContext
    ) => {
      const safeLimit = Math.min(limit, 30);
      return prisma.postComment.findMany({
        where: { parentId: commentId },
        orderBy: { createdAt: "asc" },
        take: safeLimit,
        skip: offset,
        include: {
          author: { include: { rank: true } },
          editHistory: { orderBy: { editedAt: "desc" } },
          _count: { select: { replies: true } },
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { include: { rank: true } },
              editHistory: { orderBy: { editedAt: "desc" } },
              _count: { select: { replies: true } },
            },
          },
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
      const safeLimit = Math.min(limit, 50);
      // HIGH-04: Cap offset to prevent full-table Postgres scan
      const safeOffset = Math.min(offset, 10_000);
      const posts = await prisma.post.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: "desc" },
        take: safeLimit + 1,
        skip: safeOffset,
        include: {
          author: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });

      const hasMore = posts.length > safeLimit;
      return {
        posts: posts.slice(0, safeLimit),
        hasMore,
        nextOffset: offset + safeLimit,
      };
    },
  },

  Mutation: {
    createPost: async (
      _: unknown,
      { input }: { input: any },
      { user, prisma, clientIp }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Medium #13: Input length limits
      if (!input.content?.trim()) throw new Error("Post content cannot be empty");
      if (input.content.length > 5000) throw new Error("Post content must be 5 000 characters or fewer");
      if (input.projectName && input.projectName.length > 120) throw new Error("Project name must be 120 characters or fewer");
      if (Array.isArray(input.tags) && input.tags.length > 10) throw new Error("A post can have at most 10 tags");

      // Medium #21: Strip HTML tags from user-provided text fields
      const safeContent = sanitizeInput(input.content);
      const safeProjectName = input.projectName ? sanitizeInput(input.projectName) : input.projectName;

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
            content: safeContent,
            imageUrl: input.imageUrl ?? input.imageUrls?.[0],
            imageUrls: input.imageUrls ?? (input.imageUrl ? [input.imageUrl] : []),
            projectName: safeProjectName,
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
      await awardXp(user.id, "CREATE_POST", undefined, clientIp).catch(console.error);

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
      // HIGH-06: Return correct error — null post must be Not found, not Forbidden
      if (!post) throw new Error("Not found");
      if (post.authorId !== user.id) throw new Error("Forbidden");
      await prisma.post.delete({ where: { id } });
      return true;
    },

    likePost: async (
      _: unknown,
      { postId, reaction = "Like" }: { postId: string; reaction?: string },
      { user, prisma, clientIp }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // P2 #8: Updated to match unified Facebook-style + Fire reaction set
      const validReactions = ["Like", "Love", "Haha", "Wow", "Sad", "Angry", "Fire"];
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

      // Track author affinity + tag affinity for feed ranking.
      // XP is awarded only on a *new* like — not on a reaction change — to prevent
      // exploit where a user rapidly toggles reactions to farm RECEIVE_LIKE XP.
      if (!existing) {
        // Pass actorId so awardXp can reject self-likes at the service level
        awardXp(post.authorId, "RECEIVE_LIKE", user.id, clientIp).catch(console.error);
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
        createNotification(prisma, {
          recipientId: post.authorId,
          actorId: user.id,
          type: "LIKE",
          postId: postId,
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
      { user, prisma, clientIp }: GraphQLContext
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
        createNotification(prisma, {
          recipientId: rootOriginal.authorId,
          actorId: user.id,
          type: "SHARE",
          postId: rootOriginalId,
        }).catch(console.error);
      }

      // Award XP to sharer
      awardXp(user.id, "CREATE_POST", undefined, clientIp).catch(console.error);

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
      { user, prisma, clientIp }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Medium #13: Input length limits
      if (!input.content?.trim()) throw new Error("Comment cannot be empty");
      if (input.content.length > 2000) throw new Error("Comment must be 2 000 characters or fewer");
      if (Array.isArray(input.mentions) && input.mentions.length > 20) throw new Error("Cannot mention more than 20 users");

      // Medium #21: Strip HTML tags
      const safeContent = sanitizeInput(input.content);

      const comment = await prisma.postComment.create({
        data: {
          postId: input.postId,
          authorId: user.id,
          content: safeContent,
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
      awardXp(comment.post.authorId, "RECEIVE_COMMENT", user.id, clientIp).catch(console.error);
      // Check Mentor role (20+ comments on others' posts)
      checkAndAwardRoles(user.id).catch(console.error);

      // Notify
      if (comment.post.authorId !== user.id) {
        createNotification(prisma, {
          recipientId: comment.post.authorId,
          actorId: user.id,
          type: "COMMENT",
          postId: input.postId,
        }).catch(console.error);
      }

      // Notify mentioned users
      for (const mentionedId of input.mentions ?? []) {
        if (mentionedId !== user.id) {
          createNotification(prisma, {
            recipientId: mentionedId,
            actorId: user.id,
            type: "MENTION",
            postId: input.postId,
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

      // Medium #13: Input length limits
      if (!input.content?.trim()) throw new Error("Reply cannot be empty");
      if (input.content.length > 2000) throw new Error("Reply must be 2 000 characters or fewer");
      if (Array.isArray(input.mentions) && input.mentions.length > 20) throw new Error("Cannot mention more than 20 users");

      // Medium #21: Strip HTML tags
      const safeContent = sanitizeInput(input.content);

      const parent = await prisma.postComment.findUnique({
        where: { id: input.parentId },
        include: { post: true },
      });
      if (!parent) throw new Error("Parent comment not found");

      const reply = await prisma.postComment.create({
        data: {
          postId: input.postId,
          authorId: user.id,
          content: safeContent,
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
        createNotification(prisma, {
          recipientId: parent.authorId,
          actorId: user.id,
          type: "COMMENT",
          postId: input.postId,
          message: "replied to your comment",
        }).catch(console.error);
      }

      // Notify mentioned users
      for (const mentionedId of input.mentions ?? []) {
        if (mentionedId !== user.id) {
          createNotification(prisma, {
            recipientId: mentionedId,
            actorId: user.id,
            type: "MENTION",
            postId: input.postId,
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

      const updatedComment = await prisma.postComment.update({
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

      // Notify the comment author on a new like (skip if liker is the author; skip reaction changes)
      if (!existing && updatedComment.authorId !== user.id) {
        createNotification(prisma, {
          recipientId: updatedComment.authorId,
          actorId: user.id,
          type: "LIKE",
          postId: updatedComment.postId,
        }).catch(console.error);
      }

      return updatedComment;
    },

    unlikeComment: async (
      _: unknown,
      { commentId }: { commentId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const deleted = await prisma.commentLike.deleteMany({
        where: { commentId, profileId: user.id },
      });

      return prisma.postComment.update({
        where: { id: commentId },
        data: deleted.count > 0 ? { likesCount: { decrement: 1 } } : {},
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

      // Medium #13 / CRIT-02: Same validation as createComment
      if (!content?.trim()) throw new Error("Comment cannot be empty");
      if (content.length > 2000) throw new Error("Comment must be 2 000 characters or fewer");
      // Medium #21 / CRIT-02: Strip HTML tags
      const safeContent = sanitizeInput(content);

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
        data: { content: safeContent },
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

      // CRIT-01: Cascade-delete the comment (DB foreign-key CASCADE removes all
      // descendants automatically). Then recompute commentsCount directly from
      // the DB to avoid the "depth-1 only" under-decrement bug.
      await prisma.postComment.delete({ where: { id: commentId } });

      const actualCount = await prisma.postComment.count({
        where: { postId: comment.postId },
      });
      await prisma.post.update({
        where: { id: comment.postId },
        data: { commentsCount: actualCount },
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

    /**
     * P2 #10: Admin mutation to update feed ranking weights without code deploys.
     * Upserts key/value rows in the feed_config table and invalidates the in-memory cache.
     */
    updateFeedConfig: async (
      _: unknown,
      { entries }: { entries: { key: string; value: number; label?: string }[] },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      // Admin role check — only users with an "admin" role can modify feed config
      await assertAdminRole(prisma, user.id);

      const results = [];
      for (const entry of entries) {
        const row = await prisma.feedConfig.upsert({
          where: { key: entry.key },
          create: { key: entry.key, value: entry.value, label: entry.label },
          update: { value: entry.value, ...(entry.label ? { label: entry.label } : {}) },
        });
        results.push({ key: row.key, value: row.value, label: row.label });
      }

      // Invalidate in-memory cache so next feed request uses updated weights
      invalidateWeightCache();

      return results;
    },

    /**
     * P3 #15: Cleanup old user_interactions to prevent unbounded table growth.
     * Deletes records older than the specified number of days.
     * Returns the count of deleted records.
     */
    cleanupOldInteractions: async (
      _: unknown,
      { olderThanDays }: { olderThanDays: number },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      await assertAdminRole(prisma, user.id);
      if (!Number.isFinite(olderThanDays) || olderThanDays < 7) {
        throw new Error("Minimum retention period is 7 days");
      }
      const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

      const result = await prisma.userInteraction.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });

      return result.count;
    },

    /**
     * P2 #6: Cleanup old feed_score_logs to prevent unbounded table growth.
     * Deletes records older than the specified number of days.
     * Returns the count of deleted records.
     */
    cleanupOldScoreLogs: async (
      _: unknown,
      { olderThanDays }: { olderThanDays: number },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      await assertAdminRole(prisma, user.id);
      if (!Number.isFinite(olderThanDays) || olderThanDays < 7) {
        throw new Error("Minimum retention period is 7 days");
      }
      const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

      const result = await prisma.feedScoreLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });

      return result.count;
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
    originalPost: async (parent: { originalPostId?: string | null }, _: unknown, { loaders }: GraphQLContext) => {
      if (!parent.originalPostId) return null;
      return loaders.originalPostLoader.load(parent.originalPostId);
    },

    postType: async (parent: { id: string; tags?: any[] }, _: unknown, { loaders }: GraphQLContext) => {
      // Use pre-loaded tags if available on parent, otherwise batch-load via DataLoader
      const tags: { name: string }[] = parent.tags?.length
        ? parent.tags.map((t: any) => t.tag ?? t) // handle PostTag join or raw Tag
        : await loaders.postTagsLoader.load(parent.id);
      return tags.some((t) => t.name === "roast") ? "roast" : "post";
    },

    tags: async (parent: { id: string; tags?: any[] }, _: unknown, { loaders }: GraphQLContext) => {
      // If tags already loaded on parent (from include), use them
      if (parent.tags?.length) {
        return parent.tags.map((t: any) => t.tag ?? t);
      }
      return loaders.postTagsLoader.load(parent.id);
    },

    likedByMe: async (
      parent: { id: string; _likedByMe?: boolean },
      _: unknown,
      { user, loaders }: GraphQLContext
    ) => {
      if (parent._likedByMe !== undefined) return parent._likedByMe;
      if (!user) return false;
      return loaders.postLikedByMeLoader.load(parent.id);
    },

    myReaction: async (
      parent: { id: string; _myReaction?: string | null },
      _: unknown,
      { user, loaders }: GraphQLContext
    ) => {
      if (parent._myReaction !== undefined) return parent._myReaction;
      if (!user) return null;
      return loaders.postMyReactionLoader.load(parent.id);
    },

    roastReactionCount: (parent: any) => {
      return parent.roastReactionCount ?? 0;
    },

    roastReactedByMe: async (
      parent: { id: string },
      _: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return false;
      const reaction = await prisma.roastReaction.findUnique({
        where: { postId_reactorId: { postId: parent.id, reactorId: user.id } },
      });
      return !!reaction;
    },

    /**
     * Lightweight comment preview for feed cards.
     * Returns top N root comments sorted by likes (descending), with NO nested replies.
     * Full comment trees are loaded on-demand when the user expands comments.
     */
    commentsPreview: async (
      parent: { id: string },
      { limit = 3 }: { limit?: number },
      { prisma }: GraphQLContext
    ) => {
      const safeLim = Math.min(limit, 10); // hard cap at 10 for previews
      return prisma.postComment.findMany({
        where: { postId: parent.id, parentId: null },
        orderBy: { likesCount: "desc" },
        take: safeLim,
        include: {
          author: { include: { rank: true } },
          editHistory: { orderBy: { editedAt: "desc" } },
          _count: { select: { replies: true } },
          // NO nested replies — feed card only needs top-level comments
          // Full thread is loaded on-demand when user clicks "View all comments"
        },
      });
    },

    comments: async (
      parent: { id: string },
      { limit = 10, offset = 0 }: { limit?: number; offset?: number },
      { prisma }: GraphQLContext
    ) => {
      const safeLimit = Math.min(limit, 30);
      return prisma.postComment.findMany({
        where: { postId: parent.id, parentId: null },
        orderBy: { createdAt: "asc" },
        take: safeLimit,
        skip: offset,
        include: {
          author: { include: { rank: true } },
          editHistory: { orderBy: { editedAt: "desc" } },
          _count: { select: { replies: true } },
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { include: { rank: true } },
              editHistory: { orderBy: { editedAt: "desc" } },
              _count: { select: { replies: true } },
              replies: {
                orderBy: { createdAt: "asc" },
                include: {
                  author: { include: { rank: true } },
                  editHistory: { orderBy: { editedAt: "desc" } },
                  _count: { select: { replies: true } },
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
      { user, loaders }: GraphQLContext
    ) => {
      if (!user) return false;
      return loaders.commentLikedByMeLoader.load(parent.id);
    },

    myReaction: async (
      parent: { id: string },
      _: unknown,
      { user, loaders }: GraphQLContext
    ) => {
      if (!user) return null;
      return loaders.commentMyReactionLoader.load(parent.id);
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

    repliesCount: async (
      parent: { id: string; _count?: { replies?: number } },
      _: unknown,
      { prisma }: GraphQLContext
    ) => {
      // If Prisma eagerly loaded _count, use it
      if (parent._count?.replies != null) return parent._count.replies;
      // Otherwise count from DB
      return prisma.postComment.count({ where: { parentId: parent.id } });
    },

    replies: async (
      parent: { id: string; replies?: any[] },
      { limit = 20, offset = 0 }: { limit?: number; offset?: number },
      { prisma }: GraphQLContext
    ) => {
      // If the parent query already eagerly loaded replies, return them directly.
      // This avoids N+1 re-fetches and preserves the full nested structure.
      if (Array.isArray((parent as any).replies)) {
        const all = (parent as any).replies as any[];
        return offset === 0 ? all.slice(0, Math.min(limit, 30)) : all.slice(offset, offset + Math.min(limit, 30));
      }
      const safeLimit = Math.min(limit, 30);
      return prisma.postComment.findMany({
        where: { parentId: parent.id },
        orderBy: { createdAt: "asc" },
        take: safeLimit,
        skip: offset,
        include: {
          author: { include: { rank: true } },
          editHistory: { orderBy: { editedAt: "desc" } },
          _count: { select: { replies: true } },
          replies: {
            orderBy: { createdAt: "asc" },
            include: {
              author: { include: { rank: true } },
              editHistory: { orderBy: { editedAt: "desc" } },
              _count: { select: { replies: true } },
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
  // MED-07: Sort by rankScore DESC, then likesCount, then createdAt.
  // Time window widens progressively so a low-activity period never
  // returns an empty list: try 7 days → 30 days → all time.
  const orderBy = [
    { rankScore: { sort: "desc", nulls: "last" } },
    { likesCount: "desc" },
    { createdAt: "desc" },
  ] as const;
  const include = {
    author: { include: { rank: true } },
    tags: { include: { tag: true } },
  };

  const windows = [7, 30, null] as const; // null = no time filter (all-time)
  for (const days of windows) {
    const where = days
      ? { createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } }
      : {};
    const posts = await prisma.post.findMany({
      where,
      orderBy,
      take: limit + 1,
      skip: offset,
      include,
    });
    if (posts.length > 0) {
      return {
        posts: posts.slice(0, limit),
        hasMore: posts.length > limit,
        nextOffset: offset + limit,
      };
    }
  }

  // Absolute fallback — platform has no posts at all yet
  return { posts: [], hasMore: false, nextOffset: offset };
}

/**
 * Wraps exploreFeed result in the FeedConnection shape (with pageInfo)
 * for unauthenticated users hitting the `feed` query.
 */
async function exploreFeedAsConnection(
  limit: number,
  offset: number,
  prisma: any
) {
  const result = await exploreFeed(limit, offset, prisma);
  const lastPost = result.posts[result.posts.length - 1];
  return {
    posts: result.posts,
    pageInfo: {
      hasNextPage: result.hasMore,
      endCursor: lastPost
        ? encodeCursor({
            score: 0, // explore feed has no ranking score
            createdAt: new Date(lastPost.createdAt).toISOString(),
            id: lastPost.id,
          })
        : null,
    },
    hasMore: result.hasMore,
    nextOffset: result.nextOffset,
    feedVariant: 'explore',
    sessionId: null,
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
    // HIGH-03: Run all upserts in parallel — was sequential, caused N DB round-trips
    await Promise.all(
      postTags.map((pt: any) =>
        prisma.userTagAffinity.upsert({
          where: { profileId_tagName: { profileId, tagName: pt.tag.name } },
          create: { profileId, tagName: pt.tag.name, score: delta },
          update: { score: { increment: delta } },
        })
      )
    );
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

  // Critical #4: replaced $executeRawUnsafe (string-interpolated SQL) with
  // separate $executeRaw tagged-template calls — no interpolation, fully parameterised.
  // NOTE: DB columns are snake_case (user_id, author_id, like_count, etc.)
  try {
    if (field === "likeCount") {
      await prisma.$executeRaw`
        INSERT INTO user_author_affinities (id, user_id, author_id, like_count, comment_count, share_count, view_count, score, updated_at)
        VALUES (gen_random_uuid()::text, ${userId}::uuid, ${authorId}::uuid, 1, 0, 0, 0, ${weights.likeCount}, NOW())
        ON CONFLICT (user_id, author_id) DO UPDATE SET
          like_count = user_author_affinities.like_count + 1,
          score = (user_author_affinities.like_count + 1) * 1.5
               + user_author_affinities.comment_count * 3.0
               + user_author_affinities.share_count   * 5.0
               + user_author_affinities.view_count    * 0.2,
          updated_at = NOW()
      `;
    } else if (field === "commentCount") {
      await prisma.$executeRaw`
        INSERT INTO user_author_affinities (id, user_id, author_id, like_count, comment_count, share_count, view_count, score, updated_at)
        VALUES (gen_random_uuid()::text, ${userId}::uuid, ${authorId}::uuid, 0, 1, 0, 0, ${weights.commentCount}, NOW())
        ON CONFLICT (user_id, author_id) DO UPDATE SET
          comment_count = user_author_affinities.comment_count + 1,
          score = user_author_affinities.like_count * 1.5
               + (user_author_affinities.comment_count + 1) * 3.0
               + user_author_affinities.share_count   * 5.0
               + user_author_affinities.view_count    * 0.2,
          updated_at = NOW()
      `;
    } else if (field === "shareCount") {
      await prisma.$executeRaw`
        INSERT INTO user_author_affinities (id, user_id, author_id, like_count, comment_count, share_count, view_count, score, updated_at)
        VALUES (gen_random_uuid()::text, ${userId}::uuid, ${authorId}::uuid, 0, 0, 1, 0, ${weights.shareCount}, NOW())
        ON CONFLICT (user_id, author_id) DO UPDATE SET
          share_count = user_author_affinities.share_count + 1,
          score = user_author_affinities.like_count    * 1.5
               + user_author_affinities.comment_count  * 3.0
               + (user_author_affinities.share_count + 1) * 5.0
               + user_author_affinities.view_count    * 0.2,
          updated_at = NOW()
      `;
    } else {
      // viewCount
      await prisma.$executeRaw`
        INSERT INTO user_author_affinities (id, user_id, author_id, like_count, comment_count, share_count, view_count, score, updated_at)
        VALUES (gen_random_uuid()::text, ${userId}::uuid, ${authorId}::uuid, 0, 0, 0, 1, ${weights.viewCount}, NOW())
        ON CONFLICT (user_id, author_id) DO UPDATE SET
          view_count = user_author_affinities.view_count + 1,
          score = user_author_affinities.like_count   * 1.5
               + user_author_affinities.comment_count * 3.0
               + user_author_affinities.share_count   * 5.0
               + (user_author_affinities.view_count + 1) * 0.2,
          updated_at = NOW()
      `;
    }
  } catch (err) {
    console.error("[feedRanking] updateAuthorAffinity:", err);
  }
}

// ─────────────────────────────────────────────────────────────
// Phase 3 Helpers — Feedback Loops & Online Learning
// ─────────────────────────────────────────────────────────────

/**
 * Assert the current user has an "admin" role.
 * Throws a Forbidden error if not.
 */
async function assertAdminRole(prisma: any, userId: string): Promise<void> {
  const adminRole = await prisma.userRole.findFirst({
    where: {
      profileId: userId,
      role: { name: { in: ["admin", "Admin", "ADMIN"] } },
    },
  });
  if (!adminRole) {
    throw new Error("Forbidden: admin role required");
  }
}

/**
 * Log full score breakdown for every post in a feed response.
 * Fire-and-forget batch insert — never blocks the response.
 */
/**
 * P3 #16: Fire-and-forget update of rankScore on Post records.
 * Stores the latest finalScore so exploreFeed can sort by ranking quality.
 */
async function updatePostRankScores(
  prisma: any,
  posts: ScoredPost[]
): Promise<void> {
  if (posts.length === 0) return;

  // Batch update using individual parameterized queries to avoid SQL injection
  // Prisma doesn't support CASE expressions with $queryRaw, so we batch individual updates
  // NOTE: rankScore column may not exist if migration 04_feed_ranking_signals.sql hasn't run;
  //       Promise.allSettled + individual try-catch ensures this is fully silent on failure
  const updates = posts.map((p) =>
    prisma.post.update({
      where: { id: p.postId },
      data: { rankScore: p._breakdown.finalScore },
      select: { id: true },
    }).catch(() => { /* rankScore column not yet migrated — skip silently */ })
  );

  await Promise.allSettled(updates);
}

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
 * P3 #13: Position-weighted CTR — engagements deeper in feed are more signal-rich.
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
      select: { id: true, sessionId: true, position: true },
    });
    if (!recentView) return;

    // Mark it as engaged
    await prisma.postView.update({
      where: { id: recentView.id },
      data: { engaged: true },
    });

    // P3 #13: Position-weighted engagement — clicks at position 10+ are worth more
    // than clicks at position 0-2 (top of feed gets clicks regardless of quality)
    const position = recentView.position ?? 0;
    const positionWeight = 1.0 + Math.min(position / 20, 1.0); // 1.0x at top, up to 2.0x at position 20+

    // Store positionWeight on the view itself for offline analysis
    await prisma.postView.update({
      where: { id: recentView.id },
      data: { engagementWeight: positionWeight },
    }).catch(() => {}); // best-effort — column may not exist yet

    // Atomic session engagement + CTR update — avoids read-compute-write race condition
    // MED-01: Use tagged $executeRaw (parameterised template literal) instead of
    // $executeRawUnsafe — the value is safely passed as a bound parameter, never
    // string-interpolated into the SQL.
    if (recentView.sessionId) {
      const sessionId = recentView.sessionId;
      await prisma.$executeRaw`
        UPDATE feed_sessions
        SET "postsEngaged" = "postsEngaged" + 1,
            ctr = ("postsEngaged" + 1)::float / GREATEST("postsShown", 1)
        WHERE id = ${sessionId}
      `;
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
