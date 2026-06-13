export type NotificationNavigationInput = {
  type: string;
  entityId?: string | null;
  postId?: string | null;
  actorUsername?: string | null;
};

const POST_NOTIFICATION_TYPES = new Set([
  "LIKE",
  "COMMENT",
  "MENTION",
  "SHARE",
  "ROAST_REACTION",
  "PROJECT_ROAST",
]);

export function getNotificationTarget({
  type,
  entityId,
  postId,
  actorUsername,
}: NotificationNavigationInput): string | null {
  if (POST_NOTIFICATION_TYPES.has(type) && postId) {
    return `/post/${postId}`;
  }

  switch (type) {
    case "LIKE":
    case "COMMENT":
    case "MENTION":
    case "SHARE":
    case "ROAST_REACTION":
      return entityId ? `/post/${entityId}` : null;
    case "PROJECT_ROAST":
      return entityId ? `/project/${entityId}` : null;
    case "FOLLOW":
      return actorUsername ? `/profile/${actorUsername}` : null;
    case "JOB_APPLICATION":
      return entityId ? `/jobs/${entityId}` : "/jobs";
    case "EVENT_REMINDER":
      return entityId ? `/events/${entityId}` : "/events";
    case "LAUNCHPAD_INTEREST":
      return "/launchpad";
    default:
      return null;
  }
}
