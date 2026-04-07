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

      const [total, items] = await Promise.all([
        prisma.notification.count({ where: { recipientId: user.id } }),
        prisma.notification.findMany({
          where: { recipientId: user.id },
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
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
        UPDATE "Profile"
        SET "unreadNotificationsCount" = GREATEST("unreadNotificationsCount" - 1, 0)
        WHERE id = ${user.id}
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
    actor: async (parent: { actorId: string }, _: unknown, { loaders }: GraphQLContext) => {
      return loaders.profileLoader.load(parent.actorId);
    },
  },
};
