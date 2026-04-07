import { GraphQLContext } from "../context";
import { awardXp } from "../../services/xp";

export const launchpadResolvers = {
  Query: {
    launchpadEvents: async (
      _: unknown,
      {
        limit = 20,
        offset = 0,
        type,
        search,
      }: { limit?: number; offset?: number; type?: string; search?: string },
      { prisma }: GraphQLContext
    ) => {
      const where: any = {};
      if (type) where.type = type;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { shortDesc: { contains: search, mode: "insensitive" } },
        ];
      }

      const [total, launchpadEvents] = await Promise.all([
        prisma.launchpadEvent.count({ where }),
        prisma.launchpadEvent.findMany({
          where,
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          take: limit + 1,
          skip: offset,
          include: {
            creator: { include: { rank: true } },
            tags: { include: { tag: true } },
          },
        }),
      ]);

      return {
        launchpadEvents: launchpadEvents.slice(0, limit),
        hasMore: launchpadEvents.length > limit,
        nextOffset: offset + limit,
        total,
      };
    },

    launchpadEvent: async (
      _: unknown,
      { id }: { id: string },
      { prisma }: GraphQLContext
    ) => {
      return prisma.launchpadEvent.findUnique({
        where: { id },
        include: {
          creator: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },
  },

  Mutation: {
    createLaunchpadEvent: async (
      _: unknown,
      { input }: { input: any },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const tagNames: string[] = input.tags ?? [];
      const tagRecords = await Promise.all(
        tagNames.map((name: string) =>
          prisma.tag.upsert({ where: { name }, create: { name }, update: {} })
        )
      );

      const launchpadEvent = await prisma.launchpadEvent.create({
        data: {
          creatorId: user.id,
          title: input.title,
          type: input.type,
          coverImageUrl: input.coverImageUrl,
          shortDesc: input.shortDesc,
          fullDesc: input.fullDesc,
          targetUrl: input.targetUrl,
          launchDate: input.launchDate ? new Date(input.launchDate) : null,
          isFeatured: input.isFeatured ?? false,
          tags: { create: tagRecords.map((t: any) => ({ tagId: t.id })) },
        },
        include: {
          creator: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });

      // Award XP for launching
      awardXp(user.id, "LAUNCH_PROJECT").catch(console.error);
      return launchpadEvent;
    },

    updateLaunchpadEvent: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const event = await prisma.launchpadEvent.findUnique({ where: { id } });
      if (event?.creatorId !== user.id) throw new Error("Forbidden");
      return prisma.launchpadEvent.update({
        where: { id },
        data: { ...input, updatedAt: new Date() },
        include: {
          creator: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },

    deleteLaunchpadEvent: async (
      _: unknown,
      { id }: { id: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const event = await prisma.launchpadEvent.findUnique({ where: { id } });
      if (event?.creatorId !== user.id) throw new Error("Forbidden");
      await prisma.launchpadEvent.delete({ where: { id } });
      return true;
    },

    markInterested: async (
      _: unknown,
      { launchpadEventId }: { launchpadEventId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      await prisma.launchpadInterest.upsert({
        where: {
          launchpadEventId_profileId: {
            launchpadEventId,
            profileId: user.id,
          },
        },
        create: { launchpadEventId, profileId: user.id },
        update: {},
      });

      const updated = await prisma.launchpadEvent.update({
        where: { id: launchpadEventId },
        data: { interestedCount: { increment: 1 } },
        include: {
          creator: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });

      return updated;
    },

    markNotInterested: async (
      _: unknown,
      { launchpadEventId }: { launchpadEventId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      await prisma.launchpadInterest.deleteMany({
        where: { launchpadEventId, profileId: user.id },
      });

      return prisma.launchpadEvent.update({
        where: { id: launchpadEventId },
        data: { interestedCount: { decrement: 1 } },
        include: {
          creator: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },
  },

  LaunchpadEvent: {
    tags: async (parent: { id: string }, _: unknown, { prisma }: GraphQLContext) => {
      const lt = await prisma.launchpadTag.findMany({
        where: { launchpadEventId: parent.id },
        include: { tag: true },
      });
      return lt.map((l: any) => l.tag);
    },

    interestedByMe: async (
      parent: { id: string },
      _: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return false;
      const interest = await prisma.launchpadInterest.findUnique({
        where: {
          launchpadEventId_profileId: {
            launchpadEventId: parent.id,
            profileId: user.id,
          },
        },
      });
      return !!interest;
    },
  },
};
