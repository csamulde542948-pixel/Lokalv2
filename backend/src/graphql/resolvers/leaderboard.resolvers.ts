import { GraphQLContext } from "../context";

export const leaderboardResolvers = {
  Query: {
    leaderboard: async (
      _: unknown,
      { limit = 50 }: { limit?: number },
      { prisma }: GraphQLContext
    ) => {
      // Top developers by XP
      const developers = await prisma.profile.findMany({
        where: { xp: { gt: 0 } },
        orderBy: { xp: "desc" },
        take: limit,
        include: { rank: true },
      });

      // Top projects by stars + likes composite
      const projects = await prisma.project.findMany({
        where: { visibility: "PUBLIC" },
        orderBy: [{ starsCount: "desc" }, { likesCount: "desc" }],
        take: limit,
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });

      return {
        developers: developers.map((d: any, idx: number) => ({
          rank: idx + 1,
          profile: d,
          xp: d.xp,
          badges: 0, // populated by field resolver if needed
        })),
        projects: projects.map((p: any, idx: number) => ({
          rank: idx + 1,
          project: p,
          stars: p.starsCount,
          likes: p.likesCount,
        })),
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
      // Count tag usage across posts, projects, events, jobs, launchpad
      const postTags = await prisma.postTag.groupBy({
        by: ["tagId"],
        _count: { tagId: true },
        orderBy: { _count: { tagId: "desc" } },
        take: limit,
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
        take: limit,
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
          xp: log.xpAwarded,
          reason: log.reason,
        })),
      };
    },
  },
};
