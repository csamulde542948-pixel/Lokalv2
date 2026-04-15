import { GraphQLContext } from "../context";
import { awardXp, checkAndAwardRoles } from "../../services/xp";
import { assertCanCreateProject } from "../../services/rankLimits";
import { addActivityToFeed } from "../../lib/stream";
import { scrapeProjectInfo } from "../../services/projectScraper.service";
import { captureAndUploadScreenshot } from "../../services/screenshot.service";
import { assertSafeExternalUrl } from "../../lib/ssrf";
import { scrapeRateLimiter } from "../../lib/rateLimit";

export const projectResolvers = {
  Query: {
    projects: async (
      _: unknown,
      {
        limit = 20,
        offset = 0,
        filter,
        category,
        search,
      }: { limit?: number; offset?: number; filter?: string; category?: string; search?: string },
      { prisma }: GraphQLContext
    ) => {
      const where: any = { visibility: "PUBLIC" };

      if (filter === "FEATURED") where.isFeatured = true;
      if (filter === "TRENDING") where.isTrending = true;
      if (filter === "GITHUB") where.type = "GITHUB";
      if (filter === "PERSONAL") where.type = "PERSONAL";
      if (category) where.category = category;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { tagline: { contains: search, mode: "insensitive" } },
        ];
      }

      return prisma.project.findMany({
        where,
        orderBy: { starsCount: "desc" },
        take: limit,
        skip: offset,
        include: {
          author: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },

    project: async (
      _: unknown,
      { id }: { id: string },
      { prisma }: GraphQLContext
    ) => {
      return prisma.project.findUnique({
        where: { id },
        include: {
          author: { include: { rank: true } },
          tags: { include: { tag: true } },
          members: true,
        },
      });
    },

    userProjects: async (
      _: unknown,
      { userId }: { userId: string },
      { user, prisma }: GraphQLContext
    ) => {
      // Medium #20: Only the owner can see their own private/draft projects.
      // Everyone else only sees PUBLIC projects.
      const isOwner = user?.id === userId;
      return prisma.project.findMany({
        where: {
          authorId: userId,
          ...(!isOwner ? { visibility: "PUBLIC" } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },

    featuredProjects: async (
      _: unknown,
      { limit = 3 }: { limit?: number },
      { prisma }: GraphQLContext
    ) => {
      return prisma.project.findMany({
        where: { isFeatured: true, visibility: "PUBLIC" },
        orderBy: { starsCount: "desc" },
        take: limit,
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },

    trendingProjects: async (
      _: unknown,
      { limit = 6 }: { limit?: number },
      { prisma }: GraphQLContext
    ) => {
      return prisma.project.findMany({
        where: { isTrending: true, visibility: "PUBLIC" },
        orderBy: { likesCount: "desc" },
        take: limit,
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },
  },

  Mutation: {
    scrapeProjectInfo: async (
      _: unknown,
      { url }: { url: string },
      { user }: GraphQLContext
    ) => {
      // Require authentication — prevents unauthenticated server-side URL fetching (SSRF)
      if (!user) throw new Error("Unauthorized");

      // Medium #19: Per-user rate limit — max 10 scrapes per 10 minutes
      scrapeRateLimiter.check(user.id);

      // SSRF protection: validate URL before fetching
      const safeUrl = await assertSafeExternalUrl(url);

      const info = await scrapeProjectInfo(safeUrl);
      return info;
    },

    captureProjectScreenshot: async (
      _: unknown,
      { projectId }: { projectId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new Error("Project not found");
      if (project.authorId !== user.id) throw new Error("Forbidden");
      if (!project.projectUrl) throw new Error("Project has no URL to capture");

      const screenshotUrl = await captureAndUploadScreenshot(
        project.projectUrl,
        project.id,
        user.id
      );

      return prisma.project.update({
        where: { id: projectId },
        data: { screenshotUrl },
        include: {
          author: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },

    createProject: async (
      _: unknown,
      { input }: { input: any },
      { user, prisma, clientIp }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // ── Rank-based project slot check ──────────────────────────────────────
      // Throws with a descriptive message if the user has hit their rank limit.
      await assertCanCreateProject(user.id);

      const project = await prisma.$transaction(async (tx: any) => {
        const tagNames: string[] = input.tags ?? [];
        const tagRecords = await Promise.all(
          tagNames.map((name: string) =>
            tx.tag.upsert({ where: { name }, create: { name }, update: {} })
          )
        );

        return tx.project.create({
          data: {
            authorId: user.id,
            name: input.name,
            tagline: input.tagline,
            description: input.description,
            iconUrl: input.iconUrl,
            bannerUrl: input.bannerUrl,
            projectUrl: input.projectUrl,
            githubUrl: input.githubUrl,
            twitterUrl: input.twitterUrl,
            linkedinUrl: input.linkedinUrl,
            screenshots: input.screenshots ?? [],
            type: input.type,
            visibility: input.visibility,
            category: input.category,
            tags: { create: tagRecords.map((t: any) => ({ tagId: t.id })) },
          },
          include: {
            author: { include: { rank: true } },
            tags: { include: { tag: true } },
          },
        });
      });

      // Auto-capture screenshot in background (non-blocking)
      if (input.projectUrl) {
        captureAndUploadScreenshot(input.projectUrl, project.id, user.id)
          .then(screenshotUrl => {
            prisma.project.update({
              where: { id: project.id },
              data: { screenshotUrl },
            }).catch(console.error);
          })
          .catch(console.error);
      }

      // Publish to GetStream feed
      addActivityToFeed(user.id, {
        verb: "project_launch",
        object: `project:${project.id}`,
        foreignId: `project:${project.id}`,
        time: project.createdAt,
        projectName: project.name,
      }).catch(console.error);

      // Award XP
      awardXp(user.id, "LAUNCH_PROJECT", undefined, clientIp).catch(console.error);
      checkAndAwardRoles(user.id).catch(console.error);

      return project;
    },

    updateProject: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const existing = await prisma.project.findUnique({ where: { id } });
      if (existing?.authorId !== user.id) throw new Error("Forbidden");

      // Medium #14: Whitelist — never spread raw input directly into Prisma
      const allowed = [
        "name", "tagline", "description", "iconUrl", "bannerUrl",
        "projectUrl", "githubUrl", "twitterUrl", "linkedinUrl",
        "screenshots", "visibility", "category", "status", "progress", "tags",
      ] as const;
      type AllowedKey = typeof allowed[number];
      const safeData = Object.fromEntries(
        allowed
          .filter((k): k is AllowedKey => k in input)
          .map((k) => [k, input[k]])
      );

      return prisma.project.update({
        where: { id },
        data: { ...safeData, updatedAt: new Date() },
        include: {
          author: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },

    deleteProject: async (
      _: unknown,
      { id }: { id: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const existing = await prisma.project.findUnique({ where: { id } });
      if (existing?.authorId !== user.id) throw new Error("Forbidden");
      await prisma.project.delete({ where: { id } });
      return true;
    },

    likeProject: async (
      _: unknown,
      { projectId }: { projectId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Check if already liked to prevent double-counting
      const existing = await prisma.projectLike.findUnique({
        where: { projectId_profileId: { projectId, profileId: user.id } },
      });

      if (!existing) {
        await prisma.projectLike.create({
          data: { projectId, profileId: user.id },
        });
        return prisma.project.update({
          where: { id: projectId },
          data: { likesCount: { increment: 1 } },
          include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
        });
      }

      // Already liked — return project unchanged
      return prisma.project.findUnique({
        where: { id: projectId },
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },

    unlikeProject: async (
      _: unknown,
      { projectId }: { projectId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Only decrement if a like actually existed (prevents negative counts)
      const deleted = await prisma.projectLike.deleteMany({
        where: { projectId, profileId: user.id },
      });

      if (deleted.count > 0) {
        return prisma.project.update({
          where: { id: projectId },
          data: { likesCount: { decrement: 1 } },
          include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
        });
      }

      // No like existed — return project unchanged
      return prisma.project.findUnique({
        where: { id: projectId },
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },

    starProject: async (
      _: unknown,
      { projectId }: { projectId: string },
      { user, prisma, clientIp }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Check if already starred to prevent double-counting
      const existing = await prisma.projectStar.findUnique({
        where: { projectId_profileId: { projectId, profileId: user.id } },
      });

      if (!existing) {
        await prisma.projectStar.create({
          data: { projectId, profileId: user.id },
        });
        awardXp(user.id, "SHARE_PROJECT", undefined, clientIp).catch(console.error);
        return prisma.project.update({
          where: { id: projectId },
          data: { starsCount: { increment: 1 } },
          include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
        });
      }

      // Already starred — return project unchanged
      return prisma.project.findUnique({
        where: { id: projectId },
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },

    unstarProject: async (
      _: unknown,
      { projectId }: { projectId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // Only decrement if a star actually existed (prevents negative counts)
      const deleted = await prisma.projectStar.deleteMany({
        where: { projectId, profileId: user.id },
      });

      if (deleted.count > 0) {
        return prisma.project.update({
          where: { id: projectId },
          data: { starsCount: { decrement: 1 } },
          include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
        });
      }

      // No star existed — return project unchanged
      return prisma.project.findUnique({
        where: { id: projectId },
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },
  },

  Project: {
    // The DB relation is `author` but the GraphQL type exposes `owner`
    owner: (parent: any) => parent.author ?? null,

    tags: async (parent: { id: string }, _: unknown, { prisma }: GraphQLContext) => {
      const pt = await prisma.projectTag.findMany({
        where: { projectId: parent.id },
        include: { tag: true },
      });
      return pt.map((p: any) => p.tag);
    },

    roasts: async (
      parent: { id: string },
      { limit = 5 }: { limit?: number },
      { prisma }: GraphQLContext
    ) => {
      return prisma.roast.findMany({
        where: { projectId: parent.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { reviewer: { include: { rank: true } } },
      });
    },

    members: async (parent: { id: string }, _: unknown, { prisma }: GraphQLContext) => {
      return prisma.projectMember.findMany({ where: { projectId: parent.id } });
    },

    likedByMe: async (
      parent: { id: string },
      _: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return false;
      const like = await prisma.projectLike.findUnique({
        where: { projectId_profileId: { projectId: parent.id, profileId: user.id } },
      });
      return !!like;
    },

    starredByMe: async (
      parent: { id: string },
      _: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return false;
      const star = await prisma.projectStar.findUnique({
        where: { projectId_profileId: { projectId: parent.id, profileId: user.id } },
      });
      return !!star;
    },
  },
};
