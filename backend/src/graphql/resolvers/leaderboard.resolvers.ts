import { GraphQLContext } from "../context";

export const leaderboardResolvers = {
  Query: {
    leaderboard: async (
      _: unknown,
      { limit = 50 }: { limit?: number },
      { prisma }: GraphQLContext
    ) => {
      const safeLimit = Math.min(limit, 50);

      // Top developers by XP
      const developers = await prisma.profile.findMany({
        where: { xp: { gt: 0 } },
        orderBy: { xp: "desc" },
        take: safeLimit,
        include: { rank: true },
      });

      // Top projects by stars + likes composite
      const projects = await prisma.project.findMany({
        where: { visibility: "PUBLIC" },
        orderBy: [{ starsCount: "desc" }, { likesCount: "desc" }],
        take: safeLimit,
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });

      // Featured projects for sidebar display
      const featuredProjects = await prisma.project.findMany({
        where: { isFeatured: true, visibility: "PUBLIC" },
        orderBy: { starsCount: "desc" },
        take: 5,
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });

      return {
        developers: developers.map((d: any, idx: number) => ({
          rank: idx + 1,
          profile: d,
          xp: d.xp,
          projectsCount: 0,
          badges: 0,
          trend: "SAME",
        })),
        projects: projects.map((p: any, idx: number) => ({
          rank: idx + 1,
          project: p,
          stars: p.starsCount,
          likes: p.likesCount,
          trend: "SAME",
        })),
        featuredProjects,
      };
    },

    ranks: async (_: unknown, __: unknown, { prisma }: GraphQLContext) => {
      return prisma.rank.findMany({ orderBy: { minXp: "asc" } });
    },

    xpActivities: async (_: unknown, __: unknown, { prisma }: GraphQLContext) => {
      return prisma.xpActivity.findMany({ orderBy: { xpReward: "desc" } });
    },

    popularTags: async (
      _: unknown,
      { limit = 20 }: { limit?: number },
      { prisma }: GraphQLContext
    ) => {
      const safeLimit = Math.min(limit, 50);
      // Count tag usage across posts, projects, events, jobs, launchpad
      const postTags = await prisma.postTag.groupBy({
        by: ["tagId"],
        _count: { tagId: true },
        orderBy: { _count: { tagId: "desc" } },
        take: safeLimit,
      });

      const tagIds = postTags.map((pt: any) => pt.tagId);
      return prisma.tag.findMany({ where: { id: { in: tagIds } } });
    },

    searchTags: async (
      _: unknown,
      { query, limit = 10 }: { query: string; limit?: number },
      { prisma }: GraphQLContext
    ) => {
      return prisma.tag.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        take: Math.min(limit, 30),
        orderBy: { name: "asc" },
      });
    },

    analytics: async (
      _: unknown,
      __: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const [
        totalPosts,
        totalProjects,
        totalFollowers,
        totalFollowing,
        postLikes,
        projectStars,
        xpHistory,
      ] = await Promise.all([
        prisma.post.count({ where: { authorId: user.id } }),
        prisma.project.count({ where: { authorId: user.id } }),
        prisma.follow.count({ where: { followingId: user.id } }),
        prisma.follow.count({ where: { followerId: user.id } }),
        prisma.postLike.count({ where: { post: { authorId: user.id } } }),
        prisma.projectStar.count({ where: { project: { authorId: user.id } } }),
        prisma.xpLog.findMany({
          where: { profileId: user.id },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
      ]);

      const profile = await prisma.profile.findUnique({
        where: { id: user.id },
        include: { rank: true },
      });

      return {
        totalPosts,
        totalProjects,
        totalFollowers,
        totalFollowing,
        totalLikesReceived: postLikes,
        totalStarsReceived: projectStars,
        xp: profile?.xp ?? 0,
        rank: profile?.rank ?? null,
        xpHistory: xpHistory.map((log: any) => ({
          date: log.createdAt.toISOString(),
          xp: log.xpEarned ?? 0,
          action: log.action ?? "unknown",
        })),
      };
    },

    // ── Per-post analytics ─────────────────────────────────────────────────
    myPostsAnalytics: async (
      _: unknown,
      { limit = 50 }: { limit?: number },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const posts = await prisma.post.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: "desc" },
        take: Math.min(limit, 100),
      });

      // Fetch view counts in a single batch query
      const viewCounts = await prisma.postView.groupBy({
        by: ["postId"],
        where: { postId: { in: posts.map((p: any) => p.id) } },
        _count: { postId: true },
      });
      const viewMap = new Map(viewCounts.map((v: any) => [v.postId, v._count.postId]));

      return posts.map((p: any) => {
        const views = (viewMap.get(p.id) as number) ?? 0;
        const interactions = p.likesCount + p.commentsCount + p.sharesCount;
        const engagementRate = views > 0 ? (interactions / views) * 100 : 0;
        return {
          id: p.id,
          content: p.content,
          imageUrl: p.imageUrl ?? null,
          createdAt: p.createdAt.toISOString(),
          likesCount: p.likesCount,
          commentsCount: p.commentsCount,
          sharesCount: p.sharesCount,
          viewsCount: views,
          engagementRate: Math.round(engagementRate * 10) / 10,
        };
      });
    },

    // ── Per-project analytics ──────────────────────────────────────────────
    myProjectsAnalytics: async (
      _: unknown,
      __: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const projects = await prisma.project.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: "desc" },
      });

      return projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        iconUrl: p.iconUrl ?? null,
        category: p.category,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        starsCount: p.starsCount,
        likesCount: p.likesCount,
        forksCount: p.forksCount,
        roastsCount: p.roastsCount,
        rating: p.rating,
        viewsCount: 0, // placeholder — no per-project view tracking yet
      }));
    },
  },
};
