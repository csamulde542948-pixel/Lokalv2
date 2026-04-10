import { GraphQLContext } from "../context";
import { sendEventRegistrationEmail } from "../../services/email";
import { awardXp } from "../../services/xp";

export const eventResolvers = {
  Query: {
    events: async (
      _: unknown,
      {
        limit = 20,
        offset = 0,
        filter,
        search,
      }: { limit?: number; offset?: number; filter?: string; search?: string },
      { prisma }: GraphQLContext
    ) => {
      const safeLimit = Math.min(limit, 50);
      const where: any = {};

      if (filter === "UPCOMING") where.startDate = { gte: new Date() };
      if (filter === "PAST") where.endDate = { lt: new Date() };
      if (filter === "FEATURED") where.isFeatured = true;
      if (filter === "ONLINE") {
        where.tags = {
          some: { tag: { name: { contains: "online", mode: "insensitive" } } },
        };
      }
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { shortDesc: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
        ];
      }

      const [total, events] = await Promise.all([
        prisma.event.count({ where }),
        prisma.event.findMany({
          where,
          orderBy: [{ isFeatured: "desc" }, { startDate: "asc" }],
          take: safeLimit + 1,
          skip: offset,
          include: {
            organizer: { include: { rank: true } },
            tags: { include: { tag: true } },
          },
        }),
      ]);

      return {
        events: events.slice(0, safeLimit),
        hasMore: events.length > safeLimit,
        nextOffset: offset + safeLimit,
        total,
      };
    },

    event: async (_: unknown, { id }: { id: string }, { prisma }: GraphQLContext) => {
      return prisma.event.findUnique({
        where: { id },
        include: {
          organizer: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },

    myEvents: async (_: unknown, __: unknown, { user, prisma }: GraphQLContext) => {
      if (!user) throw new Error("Unauthorized");
      const regs = await prisma.eventRegistration.findMany({
        where: { profileId: user.id },
        include: {
          event: {
            include: { organizer: { include: { rank: true } }, tags: { include: { tag: true } } },
          },
        },
      });
      return regs.map((r: any) => r.event);
    },
  },

  Mutation: {
    createEvent: async (
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

      return prisma.event.create({
        data: {
          organizerId: user.id,
          title: input.title,
          type: input.type,
          coverImageUrl: input.coverImageUrl,
          shortDesc: input.shortDesc,
          fullDesc: input.fullDesc,
          location: input.location,
          eventUrl: input.eventUrl,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          maxAttendees: input.maxAttendees,
          isFeatured: input.isFeatured ?? false,
          tags: { create: tagRecords.map((t: any) => ({ tagId: t.id })) },
        },
        include: {
          organizer: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },

    updateEvent: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const event = await prisma.event.findUnique({ where: { id } });
      if (event?.organizerId !== user.id) throw new Error("Forbidden");

      // Medium #14: Whitelist — never spread raw input directly into Prisma
      const allowed = [
        "title", "description", "bannerUrl", "date", "endDate",
        "timeLabel", "location", "isOnline", "type", "price",
        "maxAttendees", "tags",
      ] as const;
      type AllowedKey = typeof allowed[number];
      const safeData = Object.fromEntries(
        allowed
          .filter((k): k is AllowedKey => k in input)
          .map((k) => [k, input[k]])
      );

      return prisma.event.update({
        where: { id },
        data: { ...safeData, updatedAt: new Date() },
        include: {
          organizer: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },

    deleteEvent: async (
      _: unknown,
      { id }: { id: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const event = await prisma.event.findUnique({ where: { id } });
      if (event?.organizerId !== user.id) throw new Error("Forbidden");
      await prisma.event.delete({ where: { id } });
      return true;
    },

    registerForEvent: async (
      _: unknown,
      { eventId }: { eventId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) throw new Error("Event not found");

      // Check capacity
      if (event.maxAttendees && event.attendeesCount >= event.maxAttendees) {
        throw new Error("Event is fully booked");
      }

      await prisma.eventRegistration.upsert({
        where: { eventId_profileId: { eventId, profileId: user.id } },
        create: { eventId, profileId: user.id },
        update: {},
      });

      const updatedEvent = await prisma.event.update({
        where: { id: eventId },
        data: { attendeesCount: { increment: 1 } },
        include: {
          organizer: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });

      const profile = await prisma.profile.findUnique({ where: { id: user.id } });
      if (profile?.email) {
        sendEventRegistrationEmail(
          profile.email,
          profile.displayName ?? profile.username,
          event.title,
          event.startDate.toISOString(),
          event.location ?? "Online"
        ).catch(console.error);
      }

      awardXp(user.id, "REGISTER_EVENT").catch(console.error);
      return updatedEvent;
    },

    unregisterFromEvent: async (
      _: unknown,
      { eventId }: { eventId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      await prisma.eventRegistration.deleteMany({
        where: { eventId, profileId: user.id },
      });
      return prisma.event.update({
        where: { id: eventId },
        data: { attendeesCount: { decrement: 1 } },
        include: {
          organizer: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },
  },

  Event: {
    tags: async (parent: { id: string }, _: unknown, { prisma }: GraphQLContext) => {
      const et = await prisma.eventTag.findMany({
        where: { eventId: parent.id },
        include: { tag: true },
      });
      return et.map((e: any) => e.tag);
    },

    registeredByMe: async (
      parent: { id: string },
      _: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) return false;
      const reg = await prisma.eventRegistration.findUnique({
        where: { eventId_profileId: { eventId: parent.id, profileId: user.id } },
      });
      return !!reg;
    },
  },
};
