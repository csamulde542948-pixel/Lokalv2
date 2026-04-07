import { GraphQLContext } from "../context";
import { addActivityToFeed, getRawFeed } from "../../lib/stream";
import {
  rankPosts,
  applyDiversityPass,
  PostSignals,
  sigmoidNormalize,
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
      { limit = 20, offset = 0, seenIds = [] }: { limit?: number; offset?: number; seenIds?: string[] },
      { user, prisma }: GraphQLContext
    ) => {
      // Unauthenticated users get the explore feed
      if (!user) {
        return exploreFeed(limit, offset, prisma);
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

      const affinityMap = new Map(
        userTagAffinities.map((a: any) => [a.tagName, a.score])
      );
      const followingSet = new Set(userFollows.map((f: any) => f.followingId));

      // Collect unique author IDs from posts for affinity lookup
      const authorIds = [...new Set(posts.map((p: any) => p.authorId))];

      // Social proof + author affinity queries (run in parallel)
      const [mutualLikeResults, authorAffinities] = await Promise.all([
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
      ]);

      const socialProofMap = new Map<string, number>();
      for (const like of mutualLikeResults) {
        socialProofMap.set(like.postId, (socialProofMap.get(like.postId) ?? 0) + 1);
      }

      // Normalize author affinity to 0–1 range using sigmoid (smooth, unbounded input)
      const authorAffinityMap = new Map<string, number>();
      for (const aff of authorAffinities) {
        authorAffinityMap.set(aff.authorId, sigmoidNormalize(aff.score));
      }

      // 3. Build signals for each post
      const signals: (PostSignals & { post: any })[] = posts.map((post: any) => {
        const postTagNames = post.tags.map((pt: any) => pt.tag.name);
        const tagAffinityScore =
          postTagNames.reduce(
            (sum: number, tag: string) => sum + ((affinityMap.get(tag) as number) ?? 0),
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
        };
      });

      // 4. Score + sort
      const ranked = rankPosts(signals as PostSignals[]);

      // 5. 2nd-degree candidates: posts liked by people the user follows
      //    (friends-of-friends discovery — Facebook's key growth loop)
      let secondDegreeSignals: (PostSignals & { post: any })[] = [];
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

            secondDegreeSignals = sdPosts.map((post: any) => {
              const postTagNames = post.tags.map((pt: any) => pt.tag.name);
              const tagAff =
                postTagNames.reduce(
                  (sum: number, tag: string) => sum + ((affinityMap.get(tag) as number) ?? 0),
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
              };
            });
          }
        }
      } catch (err) {
        console.error("[feed] 2nd-degree candidates error:", err);
      }

      // 6. Diversity pass — inject 2nd-degree explore content
      const diversified = applyDiversityPass(ranked, secondDegreeSignals as PostSignals[]);

      // Merge post maps for ranking
      const allPostsMap = new Map(posts.map((p: any) => [p.id, p]));
      for (const sig of secondDegreeSignals) {
        allPostsMap.set(sig.postId, sig.post);
      }

      const rankedPosts = diversified
        .map((s) => allPostsMap.get(s.postId))
        .filter(Boolean);

      return {
        posts: rankedPosts.slice(0, limit),
        hasMore: rankedPosts.length > limit,
        nextOffset: offset + limit,
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

      await prisma.postLike.deleteMany({
        where: { postId, profileId: user.id },
      });

      return prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
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
     */
    recordPostView: async (
      _: unknown,
      { postId, dwellMs, source = "feed" }: { postId: string; dwellMs: number; source?: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return false;

      try {
        // 1. Record the view
        await prisma.postView.create({
          data: {
            postId,
            viewerId: user.id,
            dwellMs: Math.min(dwellMs, 300_000), // cap at 5 min
            source,
          },
        });

        // 2. Fetch the post to get authorId
        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { authorId: true },
        });
        if (!post) return false;

        // 3. Update author affinity (async, don't block response)
        updateAuthorAffinity(user.id, post.authorId, "viewCount", prisma).catch(console.error);

        // 4. Update tag affinity based on dwell time
        // Only meaningful if user dwelled ≥ 2 seconds
        if (dwellMs >= 2000) {
          updateTagAffinitiesOnEngagement(user.id, postId, 0.05, prisma).catch(console.error);
        }

        return true;
      } catch (err) {
        console.error("[recordPostView] error:", err);
        return false;
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
      parent: { id: string },
      _: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return false;
      const like = await prisma.postLike.findUnique({
        where: { postId_profileId: { postId: parent.id, profileId: user.id } },
      });
      return !!like;
    },

    myReaction: async (
      parent: { id: string },
      _: unknown,
      { user, prisma }: GraphQLContext
    ) => {
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

async function exploreFeed(
  limit: number,
  offset: number,
  prisma: any
) {
  const posts = await prisma.post.findMany({
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
 */
async function updateAuthorAffinity(
  userId: string,
  authorId: string,
  field: "likeCount" | "commentCount" | "shareCount" | "viewCount",
  prisma: any
) {
  if (userId === authorId) return; // don't track self-affinity

  try {
    const existing = await prisma.userAuthorAffinity.findUnique({
      where: { userId_authorId: { userId, authorId } },
    });

    if (existing) {
      const updated = { ...existing, [field]: existing[field] + 1 };
      await prisma.userAuthorAffinity.update({
        where: { userId_authorId: { userId, authorId } },
        data: {
          [field]: { increment: 1 },
          score: computeAuthorAffinityScore(updated),
        },
      });
    } else {
      const seed = { likeCount: 0, commentCount: 0, shareCount: 0, viewCount: 0, [field]: 1 };
      await prisma.userAuthorAffinity.create({
        data: {
          userId,
          authorId,
          ...seed,
          score: computeAuthorAffinityScore(seed as any),
        },
      });
    }
  } catch (err) {
    console.error("[feedRanking] updateAuthorAffinity:", err);
  }
}
