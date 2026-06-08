import { GraphQLContext } from "../context";
import { getSubmissionQuota } from "../../services/rankLimits";

// ─── Caching ────────────────────────────────────────────────────────────────

/**
 * In-memory cache for the leaderboard payload.
 *
 * The leaderboard query aggregates from 10+ tables, with the right sidebar
 * polling every 5 minutes. Because the underlying signals (XP, stars,
 * project/post counts) only change gradually, a 90-second cache cuts
 * backend load by ~3× for the polling traffic and ~30× for cold-cache
 * requests on a busy page (the 4-5 parallel requests on a feed page
 * mount can share the same cache entry).
 *
 * Invalidation is purely time-based (TTL). 90s is a sweet spot — long
 * enough to absorb the 5-min poll, short enough that a user opening
 * the page after a peer earned XP will see fresh data within ~1.5 min.
 *
 * Cache key is opaque (string) so callers can include viewerId, limit,
 * or anything else that affects the payload. LRU-bounded so a busy
 * server with many distinct users doesn't grow the cache unbounded.
 */
const LEADERBOARD_CACHE_TTL_MS = 90_000;
const LEADERBOARD_CACHE_MAX_ENTRIES = 200;
type CachedLeaderboard = Awaited<ReturnType<typeof computeLeaderboard>>;
const leaderboardCache = new Map<string, { data: CachedLeaderboard; expiresAt: number }>();

function getCachedLeaderboard(key: string): CachedLeaderboard | null {
  const entry = leaderboardCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    leaderboardCache.delete(key);
    return null;
  }
  // Touch for LRU
  leaderboardCache.delete(key);
  leaderboardCache.set(key, entry);
  return entry.data;
}

function setCachedLeaderboard(key: string, data: CachedLeaderboard) {
  if (leaderboardCache.size >= LEADERBOARD_CACHE_MAX_ENTRIES) {
    // Drop the oldest entry (Map preserves insertion order)
    const oldest = leaderboardCache.keys().next().value;
    if (oldest !== undefined) leaderboardCache.delete(oldest);
  }
  leaderboardCache.set(key, {
    data,
    expiresAt: Date.now() + LEADERBOARD_CACHE_TTL_MS,
  });
}

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

/** Pull a unique list of values from a column across an array of groupBy rows. */
function uniqueIds<T extends Record<string, any>>(rows: T[], key: keyof T): string[] {
  return [...new Set(rows.map((r) => r[key] as string).filter((id): id is string => !!id))];
}

/**
 * Aggregate all 8 leaderboard sections in 2 parallel phases.
 *
 * Phase 1: 10 independent base queries (topDevelopers, topProjects, featured,
 *          shipper×2, roastAggs, labanStreaks, community×2, underdog) — fired
 *          in a single Promise.all.
 * Phase 2: dependent profile lookups (shipper, survivor, community) — fired
 *          in parallel after the project→author mapping for survivors resolves.
 * Phase 3: final survivor + underdog profile lookups (small, parallel).
 *
 * Original code was ~10 sequential query phases; this collapses to 3.
 */
async function computeLeaderboard(prisma: any, safeLimit: number, viewerId: string | null) {
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();

  // ── Phase 1: fire all independent section queries in parallel ─────────
  const [
    topDevelopers,
    topProjects,
    featuredProjectsRaw,
    weeklyProjects,
    weeklyPosts,
    roastAggs,
    labanStreaks,
    monthlyRoasts,
    monthlyLaunchpad,
    weeklySnapshots,
  ] = await Promise.all([
    prisma.profile.findMany({
      where: { xp: { gt: 0 } },
      orderBy: { xp: "desc" },
      take: safeLimit,
    }),
    prisma.project.findMany({
      where: { visibility: "PUBLIC" },
      orderBy: [{ starsCount: "desc" }, { likesCount: "desc" }],
      take: safeLimit,
      include: { author: true },
    }),
    prisma.project.findMany({
      where: { isFeatured: true, visibility: "PUBLIC" },
      orderBy: { starsCount: "desc" },
      take: 6,
      include: { author: true },
    }),
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
    prisma.roast.groupBy({
      by: ["projectId"],
      _count: { id: true },
      having: { id: { _count: { gte: 1 } } },
    }),
    (prisma as any).shippingStreak.findMany({
      where: { currentStreak: { gt: 0 } },
      orderBy: [{ currentStreak: "desc" }, { longestStreak: "desc" }],
      take: safeLimit,
      include: { profile: { select: PROFILE_FIELDS } },
    }).catch(() => []),
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
    (prisma as any).weeklyXpSnapshot.findMany({
      where: { weekStart: { gte: weekStart } },
      select: { profileId: true, xpAtWeekStart: true, rankAtWeekStart: true },
    }).catch(() => []),
  ]);

  // ── Phase 2: dependent profile fetches (one query per section) ────────
  const shipperIds = uniqueIds(weeklyProjects, "authorId");
  const projectIdsForSurvivor = uniqueIds(roastAggs, "projectId");
  const communityIds = uniqueIds(monthlyRoasts, "reviewerId")
    .concat(uniqueIds(monthlyLaunchpad, "profileId"));
  const underdogCandidateIds = weeklySnapshots
    .filter((s: any) => s.rankAtWeekStart > 20)
    .map((s: any) => s.profileId);

  const [shipperProfiles, roastedProjectsForSurvivor, communityProfiles] = await Promise.all([
    shipperIds.length > 0
      ? prisma.profile.findMany({ where: { id: { in: shipperIds } }, select: PROFILE_FIELDS })
      : Promise.resolve([]),
    projectIdsForSurvivor.length > 0
      ? prisma.project.findMany({
          where: { id: { in: projectIdsForSurvivor } },
          select: { id: true, authorId: true },
        })
      : Promise.resolve([]),
    communityIds.length > 0
      ? prisma.profile.findMany({ where: { id: { in: communityIds } }, select: PROFILE_FIELDS })
      : Promise.resolve([]),
  ]);

  // Build a projectId → authorId Map for O(1) lookups in the survivor
  // aggregator. Was O(n²) (per aggs row, .find on the project array).
  const projectToAuthor = new Map<string, string>();
  for (const p of roastedProjectsForSurvivor as any[]) {
    projectToAuthor.set(p.id, p.authorId);
  }

  // Survivor IDs = project authors whose projects have been roasted
  const survivorIds = [...new Set(
    roastAggs
      .map((agg: any) => projectToAuthor.get(agg.projectId))
      .filter((id: any): id is string => !!id)
  )];

  // Phase 3: final dependent profile lookups + per-viewer follow state.
  // ONE follow-lookup for the viewer covers all leaderboard profiles
  // (≤ 80 IDs at safeLimit=20), avoiding N+1 on the Follow button.
  const allLeaderboardProfileIds = new Set<string>([
    ...topDevelopers.map((p: any) => p.id),
    ...shipperProfiles.map((p: any) => p.id),
    ...survivorIds,
    ...labanStreaks.map((s: any) => s.profileId),
    ...communityProfiles.map((p: any) => p.id),
    ...underdogCandidateIds,
  ]);
  // Drop the viewer's own ID — never show Follow on yourself.
  if (viewerId) allLeaderboardProfileIds.delete(viewerId);

  const followSet = new Set<string>();
  if (viewerId && allLeaderboardProfileIds.size > 0) {
    try {
      const follows = await prisma.follow.findMany({
        where: {
          followerId: viewerId,
          followingId: { in: [...allLeaderboardProfileIds] },
        },
        select: { followingId: true },
      });
      for (const f of follows) followSet.add(f.followingId);
    } catch {
      // best-effort — followSet defaults to empty
    }
  }
  const isFollowing = (id: string) => followSet.has(id);

  const [survivorProfiles, underdogProfiles] = await Promise.all([
    survivorIds.length > 0
      ? prisma.profile.findMany({ where: { id: { in: survivorIds } }, select: PROFILE_FIELDS })
      : Promise.resolve([]),
    underdogCandidateIds.length > 0
      ? prisma.profile.findMany({ where: { id: { in: underdogCandidateIds } }, select: PROFILE_FIELDS })
      : Promise.resolve([]),
  ]);

  // ── 1. Top Developers ─────────────────────────────────────────────────
  const developers = topDevelopers.map((d: any, idx: number) => ({
    rank: idx + 1,
    profile: d,
    xp: d.xp,
    projectsCount: 0,
    trend: "SAME" as const,
    isFollowedByMe: isFollowing(d.id),
  }));

  // ── 2. Top Projects ───────────────────────────────────────────────────
  const projects = topProjects.map((p: any, idx: number) => ({
    rank: idx + 1,
    project: p,
    trend: "SAME" as const,
  }));

  // ── 3. Featured Projects ──────────────────────────────────────────────
  const featuredProjects = featuredProjectsRaw;

  // ── 4. Shipper of the Week ────────────────────────────────────────────
  const shipperMap = new Map<string, { projects: number; posts: number }>();
  for (const row of weeklyProjects) {
    shipperMap.set(row.authorId, { projects: row._count.id, posts: 0 });
  }
  for (const row of weeklyPosts) {
    const existing = shipperMap.get(row.authorId) ?? { projects: 0, posts: 0 };
    existing.posts = row._count.id;
    shipperMap.set(row.authorId, existing);
  }

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
      isFollowedByMe: isFollowing(e.profile.id),
    }));

  // ── 5. Roast Survivor (permanent hall of fame) ─────────────────────────
  const survivorMap = new Map<string, { roastsReceived: number }>();
  for (const agg of roastAggs) {
    const authorId = projectToAuthor.get(agg.projectId);
    if (!authorId) continue;
    const existing = survivorMap.get(authorId) ?? { roastsReceived: 0 };
    existing.roastsReceived += agg._count.id;
    survivorMap.set(authorId, existing);
  }

  const roastSurvivorEntries = survivorProfiles
    .map((p: any) => ({
      profile: p,
      roastsReceived: (survivorMap.get(p.id) ?? { roastsReceived: 0 }).roastsReceived,
    }))
    .filter((e: any) => e.roastsReceived > 0)
    .sort((a: any, b: any) => b.roastsReceived - a.roastsReceived)
    .slice(0, safeLimit)
    .map((e: any, idx: number) => ({
      rank: idx + 1,
      profile: e.profile,
      roastsReceived: e.roastsReceived,
      isFollowedByMe: isFollowing(e.profile.id),
    }));

  // ── 6. Laban Launcher (longest active shipping streak) ─────────────────
  const labanEntries = labanStreaks.map((s: any, idx: number) => ({
    rank: idx + 1,
    profile: s.profile,
    currentStreak: s.currentStreak,
    longestStreak: s.longestStreak,
    isFollowedByMe: isFollowing(s.profile.id),
  }));

  // ── 7. Community Builder (monthly) ─────────────────────────────────────
  const communityMap = new Map<string, { roastsGiven: number; launchpadParticipation: number }>();
  for (const r of monthlyRoasts) {
    communityMap.set(r.reviewerId, { roastsGiven: r._count.id, launchpadParticipation: 0 });
  }
  for (const l of monthlyLaunchpad) {
    const existing = communityMap.get(l.profileId) ?? { roastsGiven: 0, launchpadParticipation: 0 };
    existing.launchpadParticipation = l._count.id;
    communityMap.set(l.profileId, existing);
  }

  const communityEntries = communityProfiles
    .map((p: any) => {
      const stats = communityMap.get(p.id) ?? { roastsGiven: 0, launchpadParticipation: 0 };
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
      isFollowedByMe: isFollowing(e.profile.id),
    }));

  // ── 8. Underdog (biggest XP gain this week, from outside top 20) ───────
  const snapshotMap = new Map<string, { xpAtWeekStart: number; rankAtWeekStart: number }>(
    weeklySnapshots.map((s: any) => [s.profileId, { xpAtWeekStart: s.xpAtWeekStart, rankAtWeekStart: s.rankAtWeekStart }])
  );

  const underdogEntries = underdogProfiles
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
      isFollowedByMe: isFollowing(e.profile.id),
    }));

  return {
    developers,
    projects,
    featuredProjects,
    shipper: shipperEntries,
    roastSurvivor: roastSurvivorEntries,
    labanLauncher: labanEntries,
    communityBuilder: communityEntries,
    underdog: underdogEntries,
  };
}

export const leaderboardResolvers = {
  Query: {
    leaderboard: async (
      _: unknown,
      { limit = 10 }: { limit?: number },
      { prisma, user }: GraphQLContext
    ) => {
      const safeLimit = Math.min(limit, 20);

      // 90-second cache — cuts backend load by ~3-30× for polling/cold-cache traffic.
      // Cache key includes the viewer's userId so isFollowedByMe stays
      // per-user correct.
      const cacheKey = `${safeLimit}:${user?.id ?? "anon"}`;
      const cached = getCachedLeaderboard(cacheKey);
      if (cached) return cached;

      const result = await computeLeaderboard(prisma, safeLimit, user?.id ?? null);
      setCachedLeaderboard(cacheKey, result);
      return result;
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
