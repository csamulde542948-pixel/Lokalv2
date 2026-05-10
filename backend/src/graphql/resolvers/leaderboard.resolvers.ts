import { GraphQLContext } from "../context";
import { getSubmissionQuota } from "../../services/rankLimits";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the most recent Monday 00:00 UTC (used as weekly window start) */
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since last Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff, 0, 0, 0, 0));
  return monday;
}

/** Returns the first day of the current month 00:00 UTC */
function getMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

const PROFILE_FIELDS = {
  id: true,
  username: true,
  name: true,
  displayName: true,
  avatarUrl: true,
  xp: true,
};

export const leaderboardResolvers = {
  Query: {
    leaderboard: async (
      _: unknown,
      { limit = 10 }: { limit?: number },
      { prisma }: GraphQLContext
    ) => {
      const safeLimit = Math.min(limit, 20);
      const weekStart = getWeekStart();
      const monthStart = getMonthStart();

      // ── 1. Top Developers (all-time XP) ───────────────────────────────────
      const topDevelopers = await prisma.profile.findMany({
        where: { xp: { gt: 0 } },
        orderBy: { xp: "desc" },
        take: safeLimit,
      });

      // ── 2. Top Projects (stars + likes) ───────────────────────────────────
      const topProjects = await prisma.project.findMany({
        where: { visibility: "PUBLIC" },
        orderBy: [{ starsCount: "desc" }, { likesCount: "desc" }],
        take: safeLimit,
        include: { author: true },
      });

      // ── 3. Featured Projects ───────────────────────────────────────────────
      const featuredProjects = await prisma.project.findMany({
        where: { isFeatured: true, visibility: "PUBLIC" },
        orderBy: { starsCount: "desc" },
        take: 6,
        include: { author: true },
      });

      // ── 4. Shipper of the Week ─────────────────────────────────────────────
      // Count projects created + posts created this week, group by author
      const [weeklyProjects, weeklyPosts] = await Promise.all([
        prisma.project.groupBy({
          by: ["authorId"],
          where: { createdAt: { gte: weekStart } },
          _count: { id: true },
        }),
        prisma.post.groupBy({
          by: ["authorId"],
          where: { createdAt: { gte: weekStart } },
          _count: { id: true },
        }),
      ]);

      // Merge maps: profileId → { projects, posts }
      const shipperMap = new Map<string, { projects: number; posts: number }>();
      for (const row of weeklyProjects) {
        shipperMap.set(row.authorId, { projects: row._count.id, posts: 0 });
      }
      for (const row of weeklyPosts) {
        const existing = shipperMap.get(row.authorId) ?? { projects: 0, posts: 0 };
        existing.posts = row._count.id;
        shipperMap.set(row.authorId, existing);
      }

      const shipperIds = [...shipperMap.keys()];
      const shipperProfiles = shipperIds.length > 0
        ? await prisma.profile.findMany({
            where: { id: { in: shipperIds } },
            select: PROFILE_FIELDS,
          })
        : [];

      const shipperEntries = shipperProfiles
        .map((p: any) => {
          const stats = shipperMap.get(p.id)!;
          return { profile: p, projectsShipped: stats.projects, postsCount: stats.posts, score: stats.projects * 3 + stats.posts };
        })
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, safeLimit)
        .map((e: any, idx: number) => ({
          rank: idx + 1,
          profile: e.profile,
          projectsShipped: e.projectsShipped,
          postsCount: e.postsCount,
          trend: "SAME" as const,
        }));

      // ── 5. Roast Survivor (permanent hall of fame) ─────────────────────────
      // Profiles with roasts on their projects, sorted by number of roasts received
      const roastAggs = await prisma.roast.groupBy({
        by: ["projectId"],
        _count: { id: true },
        having: { id: { _count: { gte: 1 } } },
      });

      // Get project → author mapping (filter out nulls — roasts without a linked project)
      const projectIds = roastAggs.map((r: any) => r.projectId).filter((id: any): id is string => id != null);
      const roastedProjects = projectIds.length > 0
        ? await prisma.project.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, authorId: true },
          })
        : [];

      // Aggregate per author
      const survivorMap = new Map<string, { roastsReceived: number }>();
      for (const agg of roastAggs) {
        const proj = roastedProjects.find((p: any) => p.id === agg.projectId);
        if (!proj) continue;
        const existing = survivorMap.get(proj.authorId) ?? { roastsReceived: 0 };
        existing.roastsReceived += agg._count.id;
        survivorMap.set(proj.authorId, existing);
      }

      const survivorIds = [...survivorMap.keys()];
      const survivorProfiles = survivorIds.length > 0
        ? await prisma.profile.findMany({
            where: { id: { in: survivorIds } },
            select: PROFILE_FIELDS,
          })
        : [];

      const roastSurvivorEntries = survivorProfiles
        .map((p: any) => {
          const stats = survivorMap.get(p.id)!;
          return { profile: p, roastsReceived: stats.roastsReceived };
        })
        .sort((a: any, b: any) => b.roastsReceived - a.roastsReceived)
        .slice(0, safeLimit)
        .map((e: any, idx: number) => ({
          rank: idx + 1,
          profile: e.profile,
          roastsReceived: e.roastsReceived,
        }));

      // ── 6. Laban Launcher (longest active shipping streak) ─────────────────
      let labanEntries: any[] = [];
      try {
        const streaks = await (prisma as any).shippingStreak.findMany({
          where: { currentStreak: { gt: 0 } },
          orderBy: [{ currentStreak: "desc" }, { longestStreak: "desc" }],
          take: safeLimit,
          include: { profile: { select: PROFILE_FIELDS } },
        });
        labanEntries = streaks.map((s: any, idx: number) => ({
          rank: idx + 1,
          profile: s.profile,
          currentStreak: s.currentStreak,
          longestStreak: s.longestStreak,
        }));
      } catch (_) {
        // Table may not exist yet — run migration 17_leaderboard_tracking.sql
        labanEntries = [];
      }

      // ── 7. Community Builder (monthly) ─────────────────────────────────────
      // Score = roasts given this month × 3 + launchpad interests this month × 2
      const [monthlyRoasts, monthlyLaunchpad] = await Promise.all([
        prisma.roast.groupBy({
          by: ["reviewerId"],
          where: { createdAt: { gte: monthStart } },
          _count: { id: true },
        }),
        prisma.launchpadInterest.groupBy({
          by: ["profileId"],
          where: { createdAt: { gte: monthStart } },
          _count: { id: true },
        }),
      ]);

      const communityMap = new Map<string, { roastsGiven: number; launchpadParticipation: number }>();
      for (const r of monthlyRoasts) {
        communityMap.set(r.reviewerId, { roastsGiven: r._count.id, launchpadParticipation: 0 });
      }
      for (const l of monthlyLaunchpad) {
        const existing = communityMap.get(l.profileId) ?? { roastsGiven: 0, launchpadParticipation: 0 };
        existing.launchpadParticipation = l._count.id;
        communityMap.set(l.profileId, existing);
      }

      const communityIds = [...communityMap.keys()];
      const communityProfiles = communityIds.length > 0
        ? await prisma.profile.findMany({
            where: { id: { in: communityIds } },
            select: PROFILE_FIELDS,
          })
        : [];

      const communityEntries = communityProfiles
        .map((p: any) => {
          const stats = communityMap.get(p.id)!;
          const score = stats.roastsGiven * 3 + stats.launchpadParticipation * 2;
          return { profile: p, roastsGiven: stats.roastsGiven, launchpadParticipation: stats.launchpadParticipation, communityScore: score };
        })
        .sort((a: any, b: any) => b.communityScore - a.communityScore)
        .slice(0, safeLimit)
        .map((e: any, idx: number) => ({
          rank: idx + 1,
          profile: e.profile,
          roastsGiven: e.roastsGiven,
          launchpadParticipation: e.launchpadParticipation,
          communityScore: e.communityScore,
        }));

      // ── 8. Underdog (biggest XP gain this week, from outside top 20) ───────
      let underdogEntries: any[] = [];
      try {
        const weeklySnapshots = await (prisma as any).weeklyXpSnapshot.findMany({
          where: { weekStart: { gte: weekStart } },
          select: { profileId: true, xpAtWeekStart: true, rankAtWeekStart: true },
        });

        const snapshotMap = new Map<string, { xpAtWeekStart: number; rankAtWeekStart: number }>(
          weeklySnapshots.map((s: any) => [s.profileId, { xpAtWeekStart: s.xpAtWeekStart, rankAtWeekStart: s.rankAtWeekStart }])
        );

        const underdogCandidateIds = weeklySnapshots
          .filter((s: any) => s.rankAtWeekStart > 20)
          .map((s: any) => s.profileId);

        const underdogProfiles = underdogCandidateIds.length > 0
          ? await prisma.profile.findMany({
              where: { id: { in: underdogCandidateIds } },
              select: PROFILE_FIELDS,
            })
          : [];

        underdogEntries = underdogProfiles
          .map((p: any) => {
            const snap = snapshotMap.get(p.id)!;
            const xpGain = p.xp - snap.xpAtWeekStart;
            return { profile: p, xpGain, previousRank: snap.rankAtWeekStart, currentXp: p.xp };
          })
          .filter((e: any) => e.xpGain > 0)
          .sort((a: any, b: any) => b.xpGain - a.xpGain)
          .slice(0, safeLimit)
          .map((e: any, idx: number) => ({
            rank: idx + 1,
            profile: e.profile,
            xpGain: e.xpGain,
            previousRank: e.previousRank,
            currentXp: e.currentXp,
          }));
      } catch (_) {
        // Table may not exist yet — run migration 17_leaderboard_tracking.sql
        underdogEntries = [];
      }

      return {
        developers: topDevelopers.map((d: any, idx: number) => ({
          rank: idx + 1,
          profile: d,
          xp: d.xp,
          projectsCount: 0,
          trend: "SAME",
        })),
        projects: topProjects.map((p: any, idx: number) => ({
          rank: idx + 1,
          project: p,
          trend: "SAME",
        })),
        featuredProjects,
        shipper: shipperEntries,
        roastSurvivor: roastSurvivorEntries,
        labanLauncher: labanEntries,
        communityBuilder: communityEntries,
        underdog: underdogEntries,
      };
    },

    ranks: async (_: unknown, __: unknown, { prisma }: GraphQLContext) => {
      return prisma.rank.findMany({ orderBy: { minXp: "asc" } });
    },

    roles: async (_: unknown, __: unknown, { prisma }: GraphQLContext) => {
      return prisma.role.findMany({ orderBy: { id: "asc" } });
    },

    xpActivities: async (_: unknown, __: unknown, { prisma }: GraphQLContext) => {
      return prisma.xpActivity.findMany({ orderBy: { xpReward: "desc" } });
    },

    mySubmissionQuota: async (_: unknown, __: unknown, { user }: GraphQLContext) => {
      if (!user) throw new Error("Unauthorized");
      const quota = await getSubmissionQuota(user.id);
      return {
        rankName: quota.rankName,
        projects: {
          used: quota.projects.used,
          limit: quota.projects.limit === "unlimited" ? null : quota.projects.limit,
        },
        launchpadEvents: {
          used: quota.launchpadEvents.used,
          limit: quota.launchpadEvents.limit === "unlimited" ? null : quota.launchpadEvents.limit,
        },
      };
    },

    popularTags: async (
      _: unknown,
      { limit = 20 }: { limit?: number },
      { prisma }: GraphQLContext
    ) => {
      const safeLimit = Math.min(limit, 50);
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
        viewsCount: 0,
      }));
    },
  },
};
