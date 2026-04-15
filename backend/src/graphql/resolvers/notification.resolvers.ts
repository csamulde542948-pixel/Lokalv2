import { GraphQLContext } from "../context";

export const notificationResolvers = {
  Query: {
    notifications: async (
      _: unknown,
      {
        limit = 30,
        offset = 0,
      }: { limit?: number; offset?: number },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const safeLimit = Math.min(limit, 50);
      // HIGH-04: Cap offset to prevent full-table Postgres scan
      const safeOffset = Math.min(offset, 10_000);

      const [total, items] = await Promise.all([
        prisma.notification.count({ where: { recipientId: user.id } }),
        prisma.notification.findMany({
          where: { recipientId: user.id },
          orderBy: { createdAt: "desc" },
          take: safeLimit,
          skip: safeOffset,
          include: {
            actor: { include: { rank: true } },
            post: true,
            project: true,
          },
        }),
      ]);

      const unreadCount = await prisma.notification.count({
        where: { recipientId: user.id, isRead: false },
      });

      return {
        notifications: items,
        unreadCount,
        total,
      };
    },
  },

  Mutation: {
    markNotificationRead: async (
      _: unknown,
      { notificationId }: { notificationId: string },
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      const notification = await prisma.notification.findUnique({
        where: { id: notificationId },
      });
      if (notification?.recipientId !== user.id) throw new Error("Forbidden");

      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
        include: {
          actor: { include: { rank: true } },
          post: true,
          project: true,
        },
      });

      // Decrement unread count on profile (floor at 0)
      await prisma.$executeRaw`
        UPDATE "profiles"
        SET "unreadNotificationsCount" = GREATEST("unreadNotificationsCount" - 1, 0)
        WHERE id = ${user.id}::uuid
      `;

      return updated;
    },

    markAllNotificationsRead: async (
      _: unknown,
      __: unknown,
      { user, prisma }: GraphQLContext
    ) => {
      if (!user) throw new Error("Unauthorized");

      await prisma.notification.updateMany({
        where: { recipientId: user.id, isRead: false },
        data: { isRead: true },
      });

      await prisma.profile.update({
        where: { id: user.id },
        data: { unreadNotificationsCount: 0 },
      });

      return true;
    },
  },

  Notification: {
    actor: async (parent: { actorId?: string | null }, _: unknown, { loaders }: GraphQLContext) => {
      if (!parent.actorId) return null;
      return loaders.profileLoader.load(parent.actorId);
    },
    // Resolve entityId: prefer postId, then projectId, then raw entityId
    entityId: (parent: { postId?: string | null; projectId?: string | null; entityId?: string | null }) => {
      return parent.postId ?? parent.projectId ?? parent.entityId ?? null;
    },
    // Expose postId directly so the frontend can open post modals precisely.
    // For PROJECT_ROAST notifications created before the postId fix (postId = null),
    // look up the feed post by finding the roaster's most-recent #roast post for
    // this project so clicking the notification still opens the PostModal.
    postId: async (
      parent: { postId?: string | null; type: string; actorId?: string | null; projectId?: string | null },
      _: unknown,
      { prisma }: GraphQLContext
    ) => {
      if (parent.postId) return parent.postId;
      if (parent.type !== "PROJECT_ROAST" || !parent.actorId || !parent.projectId) return null;
      try {
        // Find the project so we know its name
        const project = await prisma.project.findUnique({
          where: { id: parent.projectId },
          select: { name: true },
        });
        if (!project) return null;
        // Find the most-recent feed post authored by the roaster with #roast tag
        // and matching projectName — this is the feed post created by submitRoast
        const post = await prisma.post.findFirst({
          where: {
            authorId: parent.actorId,
            projectName: project.name,
            tags: { some: { tag: { name: "roast" } } },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        return post?.id ?? null;
      } catch {
        return null;
      }
    },
    // Ensure message is never null (fallback to empty string)
    message: (parent: { message?: string | null; type: string }) => {
      if (parent.message) return parent.message;
      switch (parent.type) {
        case "LIKE":               return "liked your post";
        case "COMMENT":            return "commented on your post";
        case "FOLLOW":             return "started following you";
        case "MENTION":            return "mentioned you in a comment";
        case "SHARE":              return "shared your post";
        case "PROJECT_ROAST":      return "roasted your project";
        case "ROAST_REACTION":     return "gave your roast a 🔥";
        case "XP_LEVELUP":         return "You leveled up!";
        case "EARNED_ROLE":        return "You earned a new role!";
        case "LAUNCHPAD_INTEREST": return "is interested in your launch";
        case "JOB_APPLICATION":    return "applied to your job posting";
        case "EVENT_REMINDER":     return "Your event is coming up soon";
        default:                   return "sent you a notification";
      }
    },
  },
};
