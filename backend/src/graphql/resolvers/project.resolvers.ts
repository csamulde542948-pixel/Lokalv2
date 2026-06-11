import { GraphQLContext } from "../context";
import { awardXp, checkAndAwardRoles } from "../../services/xp";
import { assertCanCreateProject } from "../../services/rankLimits";
import { addActivityToFeed } from "../../lib/stream";
import { scrapeProjectInfo } from "../../services/projectScraper.service";
import { captureAndUploadScreenshot } from "../../services/screenshot.service";
import { assertSafeExternalUrl } from "../../lib/ssrf";
import { scrapeRateLimiter } from "../../lib/rateLimit";

const PROJECT_NAME_MAX = 100;
const PROJECT_TAGLINE_MAX = 255;
const PROJECT_DESCRIPTION_MAX = 5000;
const PROJECT_TAG_MAX = 24;
const PROJECT_TAG_LIMIT = 8;
const PROJECT_URL_MAX = 2000;
const PROJECT_SCREENSHOT_LIMIT = 8;

function optionalString(value: unknown, max: number) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function requiredString(value: unknown, fieldName: string, max: number) {
  const normalized = optionalString(value, max);
  if (!normalized) throw new Error(`${fieldName} is required`);
  return normalized;
}

function normalizeProjectTags(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const raw of value) {
    const tag = optionalString(raw, PROJECT_TAG_MAX)
      ?.toLowerCase()
      .replace(/^#+/, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= PROJECT_TAG_LIMIT) break;
  }

  return tags;
}

function normalizeScreenshots(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((s) => optionalString(s, PROJECT_URL_MAX))
    .filter((s): s is string => Boolean(s))
    .slice(0, PROJECT_SCREENSHOT_LIMIT);
}

function normalizeCreateProjectInput(input: any) {
  return {
    name: requiredString(input.name, "Project name", PROJECT_NAME_MAX),
    tagline: requiredString(input.tagline, "Project tagline", PROJECT_TAGLINE_MAX),
    description: requiredString(input.description, "Project description", PROJECT_DESCRIPTION_MAX),
    iconUrl: optionalString(input.iconUrl, PROJECT_URL_MAX),
    bannerUrl: optionalString(input.bannerUrl, PROJECT_URL_MAX),
    projectUrl: optionalString(input.projectUrl, PROJECT_URL_MAX),
    githubUrl: optionalString(input.githubUrl, PROJECT_URL_MAX),
    twitterUrl: optionalString(input.twitterUrl, PROJECT_URL_MAX),
    linkedinUrl: optionalString(input.linkedinUrl, PROJECT_URL_MAX),
    facebookUrl: optionalString(input.facebookUrl, PROJECT_URL_MAX),
    youtubeUrl: optionalString(input.youtubeUrl, PROJECT_URL_MAX),
    screenshots: normalizeScreenshots(input.screenshots),
    type: input.type,
    visibility: input.visibility,
    category: input.category,
    tags: normalizeProjectTags(input.tags),
  };
}

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
      // Require authentication Ã¢â‚¬â€ prevents unauthenticated server-side URL fetching (SSRF)
      if (!user) throw new Error("Unauthorized");

      // Medium #19: Per-user rate limit Ã¢â‚¬â€ max 10 scrapes per 10 minutes
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
      console.log('[CREATE PROJECT] Request received', { userId: user?.id, inputKeys: Object.keys(input ?? {}) });
      if (!user) throw new Error("Unauthorized");
      const normalized = normalizeCreateProjectInput(input ?? {});

      // Ã¢â€â‚¬Ã¢â€â‚¬ Verify profile exists Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
      console.log('[CREATE PROJECT] Looking up profile for user:', user.id);
      const profile = await prisma.profile.findUnique({
        where: { id: user.id },
      });
      console.log('[CREATE PROJECT] Profile found:', profile ? { id: profile.id, username: profile.username } : 'NOT FOUND');
      if (!profile) {
        throw new Error("Profile not found. Please complete onboarding first.");
      }

      // Ã¢â€â‚¬Ã¢â€â‚¬ Rank-based project slot check Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
      // Throws with a descriptive message if the user has hit their rank limit.
      await assertCanCreateProject(user.id);

      const project = await prisma.$transaction(async (tx: any) => {
        const tagNames: string[] = normalized.tags;
        const tagRecords = await Promise.all(
          tagNames.map((name: string) =>
            tx.tag.upsert({ where: { name }, create: { name }, update: {} })
          )
        );

        return tx.project.create({
          data: {
            authorId: user.id,
            name: normalized.name,
            tagline: normalized.tagline,
            description: normalized.description,
            iconUrl: normalized.iconUrl,
            bannerUrl: normalized.bannerUrl,
            projectUrl: normalized.projectUrl,
            githubUrl: normalized.githubUrl,
            twitterUrl: normalized.twitterUrl,
            linkedinUrl: normalized.linkedinUrl,
            facebookUrl: normalized.facebookUrl,
            youtubeUrl: normalized.youtubeUrl,
            screenshots: normalized.screenshots,
            type: normalized.type,
            visibility: normalized.visibility,
            category: normalized.category,
            tags: { create: tagRecords.map((t: any) => ({ tagId: t.id })) },
          },
          include: {
            author: { include: { rank: true } },
            tags: { include: { tag: true } },
          },
        });
      }, { timeout: 15000 });

      // Auto-capture screenshot in background (non-blocking)
      if (normalized.projectUrl) {
        captureAndUploadScreenshot(normalized.projectUrl, project.id, user.id)
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
      console.log('[UPDATE PROJECT] Request received', { id, user: user?.id, inputKeys: Object.keys(input) });
      
      if (!user) throw new Error("Unauthorized");
      const existing = await prisma.project.findUnique({ where: { id } });
      if (!existing) throw new Error("Project not found");
      if (existing?.authorId !== user.id) throw new Error("Forbidden");

      console.log('[UPDATE PROJECT] Updating project:', { id, authorId: existing.authorId, inputKeys: Object.keys(input) });

      return prisma.$transaction(async (tx: any) => {
        // Medium #14: Whitelist Ã¢â‚¬â€ never spread raw input directly into Prisma
        const allowed = [
          "name", "tagline", "description", "iconUrl", "bannerUrl",
          "projectUrl", "githubUrl", "twitterUrl", "linkedinUrl", "facebookUrl", "youtubeUrl",
          "screenshots", "visibility", "category", "type", "status", "progress",
        ] as const;
        type AllowedKey = typeof allowed[number];
        const safeData = Object.fromEntries(
          allowed
            .filter((k): k is AllowedKey => k in input)
            .map((k) => [k, input[k]])
        );

        console.log('[UPDATE PROJECT] Safe data prepared:', Object.keys(safeData));

        // Handle tags separately (many-to-many relationship)
        if (input.tags) {
          console.log('[UPDATE PROJECT] Processing tags:', input.tags);
          const tagNames: string[] = input.tags;
          
          // Upsert all tags
          const tagRecords = await Promise.all(
            tagNames.map((name: string) =>
              tx.tag.upsert({ where: { name }, create: { name }, update: {} })
            )
          );

          console.log('[UPDATE PROJECT] Tags upserted:', tagRecords.length);

          // Delete existing tag associations
          await tx.projectTag.deleteMany({ where: { projectId: id } });
          console.log('[UPDATE PROJECT] Old tag associations deleted');

          // Create new tag associations
          safeData.tags = { create: tagRecords.map((t: any) => ({ tagId: t.id })) };
          console.log('[UPDATE PROJECT] New tag associations prepared');
        }

        const updated = await tx.project.update({
          where: { id },
          data: { ...safeData, updatedAt: new Date() },
          include: {
            author: { include: { rank: true } },
            tags: { include: { tag: true } },
          },
        });

        console.log('[UPDATE PROJECT] Project updated successfully:', { id: updated.id, name: updated.name });
        return updated;
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

      // Already liked Ã¢â‚¬â€ return project unchanged
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

      // No like existed Ã¢â‚¬â€ return project unchanged
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

      // Already starred Ã¢â‚¬â€ return project unchanged
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

      // No star existed Ã¢â‚¬â€ return project unchanged
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
