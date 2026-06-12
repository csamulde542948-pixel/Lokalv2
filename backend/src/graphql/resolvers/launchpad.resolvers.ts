import { GraphQLContext } from "../context";
import { awardXp } from "../../services/xp";
import { assertCanCreateLaunchpadEvent } from "../../services/rankLimits";
import { createNotification } from "../../lib/notifications";
import { isValidEmail } from "../../middleware/security";

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
      const safeLimit = Math.min(limit, 50);
      const where: any = {};
      if (type) where.type = type;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { shortDesc: { contains: search, mode: "insensitive" } },
        ];
      }

      const events = await prisma.launchpadEvent.findMany({
        where,
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        take: safeLimit,
        skip: offset,
        include: {
          creator: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });

      return events;
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

    myLaunchpadEvents: async (
      _: unknown,
      __: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      return prisma.launchpadEvent.findMany({
        where: { creatorId: user.id },
        orderBy: { createdAt: "desc" },
        include: {
          creator: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });
    },

    launchpadEventParticipants: async (
      _: unknown,
      { eventId }: { eventId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const event = await prisma.launchpadEvent.findUnique({ where: { id: eventId } });
      if (!event) throw new Error("Event not found");
      if (event.creatorId !== user.id) throw new Error("Forbidden");

      return prisma.launchpadInterest.findMany({
        where: { launchpadEventId: eventId },
        orderBy: { createdAt: "desc" },
        include: { profile: { include: { rank: true } } },
      });
    },

    launchpadEventStats: async (
      _: unknown,
      { eventId }: { eventId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const event = await prisma.launchpadEvent.findUnique({ where: { id: eventId } });
      if (!event) throw new Error("Event not found");
      if (event.creatorId !== user.id) throw new Error("Forbidden");

      const interests = await prisma.launchpadInterest.findMany({
        where: { launchpadEventId: eventId },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      });

      const totalJoined = interests.length;
      const spotsTotal = event.spotsTotal ?? null;
      const fillRate = spotsTotal && spotsTotal > 0 ? (totalJoined / spotsTotal) * 100 : 0;

      // Group by day (last 14 days)
      const dayCounts: Record<string, number> = {};
      for (const i of interests) {
        const day = i.createdAt.toISOString().slice(0, 10);
        dayCounts[day] = (dayCounts[day] ?? 0) + 1;
      }
      const joinsByDay = Object.entries(dayCounts).map(([date, count]) => ({ date, count }));

      return { totalJoined, spotsTotal, fillRate, joinsByDay };
    },

    launchpadAnnouncements: async (
      _: unknown,
      { eventId }: { eventId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const event = await prisma.launchpadEvent.findUnique({
        where: { id: eventId },
        include: { interests: { select: { profileId: true } } },
      });
      if (!event) throw new Error("Event not found");
      const canRead = event.creatorId === user.id || event.interests.some((i) => i.profileId === user.id);
      if (!canRead) throw new Error("Forbidden");

      return prisma.launchpadAnnouncement.findMany({
        where: { launchpadEventId: eventId },
        orderBy: { createdAt: "desc" },
        include: { creator: { include: { rank: true } } },
      });
    },

    /**
     * Chat thread for a launchpad event. Visible to the host and to any user
     * who has joined the event via markInterested. We hard-fail for
     * unauthenticated requests and for users who have no relationship with
     * the event — never silently leak a private thread.
     */
    launchpadEventMessages: async (
      _: unknown,
      { eventId, limit = 100, offset = 0 }: { eventId: string; limit?: number; offset?: number },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const event = await prisma.launchpadEvent.findUnique({
        where: { id: eventId },
        include: { interests: { select: { profileId: true } } },
      });
      if (!event) throw new Error("Event not found");

      const isHost = event.creatorId === user.id;
      const isParticipant = event.interests.some((i) => i.profileId === user.id);
      if (!isHost && !isParticipant) throw new Error("Forbidden");

      const safeLimit = Math.min(Math.max(limit, 1), 200);

      return prisma.launchpadMessage.findMany({
        where: { launchpadEventId: eventId },
        orderBy: { createdAt: "asc" },
        take: safeLimit,
        skip: offset,
        include: { author: { include: { rank: true } } },
      });
    },
  },

  Mutation: {
    createLaunchpadEvent: async (
      _: unknown,
      { input }: { input: any },
      { user, prisma, clientIp }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // ── Rank-based launchpad event slot check ──────────────────────────────
      // Throws with a descriptive message if the user has hit their rank limit.
      await assertCanCreateLaunchpadEvent(user.id);

      const tagNames: string[] = input.tags ?? [];
      const tagRecords = await Promise.all(
        tagNames.map((name: string) =>
          prisma.tag.upsert({ where: { name }, create: { name }, update: {} })
        )
      );

      const eventType = (input.eventType ?? input.type ?? "LAUNCH") as string;
      const shortDesc = (input.description ?? input.shortDesc ?? "").trim();
      const deadlineRaw = input.deadline ?? input.launchDate;

      const launchpadEvent = await prisma.launchpadEvent.create({
        data: {
          creatorId: user.id,
          title: String(input.title ?? ""),
          type: eventType as any,
          shortDesc: shortDesc || "No description provided.",
          ...(input.fullDesc != null ? { fullDesc: input.fullDesc } : {}),
          ...(input.coverImageUrl != null ? { coverImageUrl: input.coverImageUrl } : {}),
          ...(input.link ?? input.targetUrl ? { targetUrl: input.link ?? input.targetUrl } : {}),
          ...(deadlineRaw ? { launchDate: new Date(deadlineRaw) } : {}),
          isFeatured: input.isFeatured ?? false,
          // Project branding — stored to DB so they survive restarts
          projectName: input.projectName ?? null,
          iconUrl: input.iconUrl ?? null,
          screenshotUrl: input.screenshotUrl ?? null,
          spotsTotal: input.spotsTotal ?? null,
          projectTagline: input.projectTagline ?? null,
          projectCategory: input.projectCategory ?? null,
          projectStatus: input.projectStatus ?? null,
          tags: { create: tagRecords.map((t: any) => ({ tagId: t.id })) },
        },
        include: {
          creator: { include: { rank: true } },
          tags: { include: { tag: true } },
        },
      });

      // Award XP for launching
      awardXp(user.id, "LAUNCH_PROJECT", undefined, clientIp).catch(console.error);
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

      const data: any = { updatedAt: new Date() };
      if (input.title != null) data.title = input.title;
      if (input.description != null) data.shortDesc = input.description;
      if (input.deadline !== undefined) data.launchDate = input.deadline ? new Date(input.deadline) : null;
      if (input.link !== undefined) data.targetUrl = input.link ?? null;
      if (input.spotsTotal !== undefined) data.spotsTotal = input.spotsTotal ?? null;
      if (input.isOpen !== undefined) data.isOpen = input.isOpen;

      return prisma.launchpadEvent.update({
        where: { id },
        data,
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

    createLaunchpadAnnouncement: async (
      _: unknown,
      { eventId, message }: { eventId: string; message: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const event = await prisma.launchpadEvent.findUnique({
        where: { id: eventId },
        include: { interests: { include: { profile: true } } },
      });
      if (!event) throw new Error("Event not found");
      if (event.creatorId !== user.id) throw new Error("Forbidden");

      const announcement = await prisma.launchpadAnnouncement.create({
        data: { launchpadEventId: eventId, creatorId: user.id, message: message.trim() },
        include: { creator: { include: { rank: true } } },
      });

      // Medium #18: Use createNotification() for each participant so that
      // unreadNotificationsCount is incremented atomically for every recipient.
      // We batch them in a single Promise.allSettled so one failure doesn't
      // block the others, and we fire-and-forget the whole batch.
      const participantIds = event.interests.map((i: any) => i.profileId).filter((id: string) => id !== user.id);
      if (participantIds.length > 0) {
        Promise.allSettled(
          participantIds.map((recipientId: string) =>
            createNotification(prisma, {
              recipientId,
              actorId: user.id,
              type: "LAUNCHPAD_INTEREST" as any,
              entityId: eventId,
              message: `📢 New announcement in "${event.title}": ${message.slice(0, 100)}${message.length > 100 ? "…" : ""}`,
            })
          )
        ).catch(console.error);
      }

      return announcement;
    },

    markInterested: async (
      _: unknown,
      { launchpadEventId, commitmentEmail, commitmentNote }: { launchpadEventId: string; commitmentEmail?: string; commitmentNote?: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      // HIGH-05: Validate optional email before storing
      if (commitmentEmail && !isValidEmail(commitmentEmail)) {
        throw new Error("Invalid email address");
      }

      const updated = await prisma.$transaction(async (tx) => {
        const existing = await tx.launchpadInterest.findUnique({
          where: {
            launchpadEventId_profileId: {
              launchpadEventId,
              profileId: user.id,
            },
          },
          select: { id: true },
        });

        await tx.launchpadInterest.upsert({
          where: {
            launchpadEventId_profileId: {
              launchpadEventId,
              profileId: user.id,
            },
          },
          create: {
            launchpadEventId,
            profileId: user.id,
            commitmentEmail: commitmentEmail ?? null,
            commitmentNote: commitmentNote ?? null,
          },
          update: {
            ...(commitmentEmail !== undefined ? { commitmentEmail: commitmentEmail ?? null } : {}),
            ...(commitmentNote !== undefined ? { commitmentNote: commitmentNote ?? null } : {}),
          },
        });

        return tx.launchpadEvent.update({
          where: { id: launchpadEventId },
          data: existing ? {} : { interestedCount: { increment: 1 } },
          include: {
            creator: { include: { rank: true } },
            tags: { include: { tag: true } },
          },
        });
      });

      return updated;
    },

    markNotInterested: async (
      _: unknown,
      { launchpadEventId }: { launchpadEventId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      return prisma.$transaction(async (tx) => {
        const deleted = await tx.launchpadInterest.deleteMany({
          where: { launchpadEventId, profileId: user.id },
        });

        if (deleted.count > 0) {
          await tx.$executeRaw`
            UPDATE launchpad_events
            SET "interestedCount" = GREATEST(0, "interestedCount" - 1)
            WHERE id = ${launchpadEventId}
          `;
        }

        return tx.launchpadEvent.findUniqueOrThrow({
          where: { id: launchpadEventId },
          include: {
            creator: { include: { rank: true } },
            tags: { include: { tag: true } },
          },
        });
      });
    },

    /**
     * Post a chat message in a launchpad event. Hard auth: the user must be
     * the event host or have a launchpad_interest row for the event. The
     * event must still be open. Body is trimmed and capped at 2000 chars.
     */
    sendLaunchpadMessage: async (
      _: unknown,
      { eventId, body }: { eventId: string; body: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const trimmed = String(body ?? "").trim();
      if (!trimmed) throw new Error("Message body is required");
      if (trimmed.length > 2000) throw new Error("Message too long (max 2000 chars)");

      const event = await prisma.launchpadEvent.findUnique({
        where: { id: eventId },
        include: { interests: { select: { profileId: true } } },
      });
      if (!event) throw new Error("Event not found");
      if (!event.isOpen) throw new Error("This event is closed");

      const isHost = event.creatorId === user.id;
      const isParticipant = event.interests.some((i) => i.profileId === user.id);
      if (!isHost && !isParticipant) {
        throw new Error("Join the event before posting in the chat");
      }

      return prisma.launchpadMessage.create({
        data: {
          launchpadEventId: eventId,
          authorId: user.id,
          body: trimmed,
        },
        include: { author: { include: { rank: true } } },
      });
    },

    /**
     * Soft-delete a chat message. Author and event host can delete. We never
     * hard-delete so the surrounding messages stay in order.
     */
    deleteLaunchpadMessage: async (
      _: unknown,
      { id }: { id: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");
      const message = await prisma.launchpadMessage.findUnique({
        where: { id },
        include: { launchpadEvent: { select: { creatorId: true } } },
      });
      if (!message || message.isDeleted) throw new Error("Message not found");

      const isAuthor = message.authorId === user.id;
      const isHost = message.launchpadEvent.creatorId === user.id;
      if (!isAuthor && !isHost) throw new Error("Forbidden");

      await prisma.launchpadMessage.update({
        where: { id },
        data: { isDeleted: true, body: "" },
      });
      return true;
    },
  },

  LaunchpadEvent: {
    // Map DB "creator" → GQL "author"
    author: (parent: any) => parent.creator,

    // Map DB "type" → GQL "eventType"
    eventType: (parent: any) => parent.type,

    // Map DB "shortDesc" → GQL "description"
    description: (parent: any) => parent.shortDesc ?? "",

    // Map DB "launchDate" → GQL "deadline"
    deadline: (parent: any) => parent.launchDate ?? null,

    // Map DB "targetUrl" → GQL "link"
    link: (parent: any) => parent.targetUrl ?? null,

    // isOpen: direct DB column
    isOpen: (parent: any) => parent.isOpen ?? true,

    // projectName: stored in DB; fall back to title if old record
    projectName: (parent: any) => parent.projectName ?? parent.title ?? "",

    // iconUrl, screenshotUrl, spotsTotal: now real DB columns
    iconUrl: (parent: any) => parent.iconUrl ?? null,
    screenshotUrl: (parent: any) => parent.screenshotUrl ?? null,
    spotsTotal: (parent: any) => parent.spotsTotal ?? null,
    projectTagline: (parent: any) => parent.projectTagline ?? null,
    projectCategory: (parent: any) => parent.projectCategory ?? null,
    projectStatus: (parent: any) => parent.projectStatus ?? null,

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

  // Field resolvers for LaunchpadParticipant
  LaunchpadParticipant: {
    // DB column is createdAt; GQL field is joinedAt
    joinedAt: (parent: any) => parent.createdAt,
    profile: (parent: any) => parent.profile,
    commitmentEmail: (parent: any) => parent.commitmentEmail ?? null,
    commitmentNote: (parent: any) => parent.commitmentNote ?? null,
  },

  // Field resolvers for LaunchpadAnnouncement
  LaunchpadAnnouncement: {
    creator: (parent: any) => parent.creator,
  },

  // Field resolvers for LaunchpadMessage
  LaunchpadMessage: {
    author: (parent: any) => parent.author,
    body: (parent: any) => (parent.isDeleted ? "" : parent.body),
  },
};
