import { PrismaClient, NotificationType } from "@prisma/client";

type NotificationInput = {
  recipientId: string;
  actorId?: string | null;
  type: NotificationType;
  postId?: string | null;
  projectId?: string | null;
  entityId?: string | null;
  message?: string | null;
};

/**
 * Creates a notification AND increments the recipient's unread badge counter
 * in a single transaction. Use this everywhere instead of bare prisma.notification.create.
 */
export async function createNotification(
  prisma: PrismaClient,
  data: NotificationInput
): Promise<void> {
  await prisma.$transaction([
    prisma.notification.create({ data }),
    prisma.profile.update({
      where: { id: data.recipientId },
      data: { unreadNotificationsCount: { increment: 1 } },
    }),
  ]);
}
