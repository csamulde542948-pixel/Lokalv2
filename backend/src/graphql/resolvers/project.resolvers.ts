import { GraphQLContext } from "../context";
import { awardXp } from "../../services/xp";
import { addActivityToFeed } from "../../lib/stream";

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
    createProject: async (
      _: unknown,
      { input }: { input: any },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

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
            demoUrl: input.demoUrl,
            githubUrl: input.githubUrl,
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

      // Publish to GetStream feed
      addActivityToFeed(user.id, {
        verb: "project_launch",
        object: `project:${project.id}`,
        foreignId: `project:${project.id}`,
        time: project.createdAt,
        projectName: project.name,
      }).catch(console.error);

      // Award XP
      awardXp(user.id, "LAUNCH_PROJECT").catch(console.error);

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

      return prisma.project.update({
        where: { id },
        data: { ...input, updatedAt: new Date() },
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
      await prisma.projectLike.upsert({
        where: { projectId_profileId: { projectId, profileId: user.id } },
        create: { projectId, profileId: user.id },
        update: {},
      });
      return prisma.project.update({
        where: { id: projectId },
        data: { likesCount: { increment: 1 } },
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },

    unlikeProject: async (
      _: unknown,
      { projectId }: { projectId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      await prisma.projectLike.deleteMany({
        where: { projectId, profileId: user.id },
      });
      return prisma.project.update({
        where: { id: projectId },
        data: { likesCount: { decrement: 1 } },
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },

    starProject: async (
      _: unknown,
      { projectId }: { projectId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      await prisma.projectStar.upsert({
        where: { projectId_profileId: { projectId, profileId: user.id } },
        create: { projectId, profileId: user.id },
        update: {},
      });
      awardXp(user.id, "SHARE_PROJECT").catch(console.error);
      return prisma.project.update({
        where: { id: projectId },
        data: { starsCount: { increment: 1 } },
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },

    unstarProject: async (
      _: unknown,
      { projectId }: { projectId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      await prisma.projectStar.deleteMany({
        where: { projectId, profileId: user.id },
      });
      return prisma.project.update({
        where: { id: projectId },
        data: { starsCount: { decrement: 1 } },
        include: { author: { include: { rank: true } }, tags: { include: { tag: true } } },
      });
    },
  },

  Project: {
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
