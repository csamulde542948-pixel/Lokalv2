import { useEffect, useRef, useState } from "react";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import {
  Heart, MessageCircle, UserPlus, Share2, AtSign,
  Flame, Trophy, Rocket, Bell, Settings as SettingsIcon,
  Loader2, Briefcase, CalendarClock,
} from "lucide-react";
import { avatarSrc } from "../../lib/defaults";
import { PostModal } from "./post-modal";

/* ─── GQL ─────────────────────────────────────────────────────────────────── */
const GET_NOTIFICATIONS = gql`
  query GetNotifications($limit: Int, $offset: Int) {
    notifications(limit: $limit, offset: $offset) {
      unreadCount
      notifications {
        id
        type
        message
        isRead
        createdAt
        entityId
        actor {
          id
          name
          username
          avatarUrl
        }
      }
    }
  }
`;

const MARK_READ = gql`
  mutation MarkNotificationRead($notificationId: ID!) {
    markNotificationRead(notificationId: $notificationId) { id isRead }
  }
`;

const MARK_ALL_READ = gql`
  mutation MarkAllNotificationsRead { markAllNotificationsRead }
`;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
type NotifType = "LIKE" | "COMMENT" | "FOLLOW" | "PROJECT_ROAST" | "JOB_APPLICATION"
  | "EVENT_REMINDER" | "LAUNCHPAD_INTEREST" | "XP_LEVELUP" | "MENTION" | string;

function getIcon(type: NotifType) {
  const s = "w-3.5 h-3.5";
  switch (type) {
    case "LIKE":               return <Heart          className={`${s} text-rose-500`}        strokeWidth={2} fill="currentColor" />;
    case "COMMENT":            return <MessageCircle  className={`${s} text-sky-500`}         strokeWidth={2} />;
    case "FOLLOW":             return <UserPlus       className={`${s} text-emerald-500`}     strokeWidth={2} />;
    case "SHARE":              return <Share2         className={`${s} text-violet-500`}      strokeWidth={2} />;
    case "MENTION":            return <AtSign         className={`${s} text-cyan-500`}        strokeWidth={2} />;
    case "PROJECT_ROAST":      return <Flame          className={`${s} text-orange-500`}      strokeWidth={2} fill="currentColor" />;
    case "XP_LEVELUP":         return <Trophy         className={`${s} text-yellow-400`}      strokeWidth={2} fill="currentColor" />;
    case "LAUNCHPAD_INTEREST": return <Rocket         className={`${s} text-indigo-500`}      strokeWidth={2} />;
    case "JOB_APPLICATION":    return <Briefcase      className={`${s} text-teal-500`}        strokeWidth={2} />;
    case "EVENT_REMINDER":     return <CalendarClock  className={`${s} text-pink-500`}        strokeWidth={2} />;
    default:                   return <Bell           className={`${s} text-muted-foreground`} strokeWidth={2} />;
  }
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "Just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function navTarget(type: NotifType, entityId?: string | null, actorUsername?: string | null): string | null {
  switch (type) {
    // Post-related: navigate to feed with the post highlighted via query param
    case "LIKE":
    case "COMMENT":
    case "MENTION":
    case "SHARE":              return entityId ? `/?post=${entityId}` : "/";
    // FOLLOW: navigate to actor's profile by username
    case "FOLLOW":             return actorUsername ? `/profile/${actorUsername}` : null;
    // Project: route is /project/:id (no "s")
    case "PROJECT_ROAST":      return entityId ? `/project/${entityId}` : null;
    // Job application notification → job detail page
    case "JOB_APPLICATION":    return entityId ? `/jobs/${entityId}` : "/jobs";
    // Event reminder → event detail page
    case "EVENT_REMINDER":     return entityId ? `/events/${entityId}` : "/events";
    case "LAUNCHPAD_INTEREST": return `/launchpad`;
    // XP/system notifications have no specific destination
    case "XP_LEVELUP":         return null;
    default:                   return null;
  }
}

/** Notification types that should open the PostModal instead of navigating */
const POST_MODAL_TYPES: NotifType[] = ["LIKE", "COMMENT", "MENTION", "SHARE"];

/** Returns the display message — uses stored message if set, else a type default */
function displayMessage(type: NotifType, message?: string | null): string {
  if (message) return message;
  switch (type) {
    case "LIKE":               return "liked your post";
    case "COMMENT":            return "commented on your post";
    case "FOLLOW":             return "started following you";
    case "SHARE":              return "shared your post";
    case "MENTION":            return "mentioned you in a post";
    case "PROJECT_ROAST":      return "roasted your project";
    case "XP_LEVELUP":         return "You leveled up!";
    case "LAUNCHPAD_INTEREST": return "is interested in your launch";
    case "JOB_APPLICATION":    return "applied to your job posting";
    case "EVENT_REMINDER":     return "Upcoming event reminder";
    default:                   return "sent you a notification";
  }
}

/* ─── Component ──────────────────────────────────────────────────────────── */
interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the live unread count so the layout bell badge stays in sync */
  onUnreadCount?: (count: number) => void;
}

export function NotificationsPopover({ isOpen, onClose, onUnreadCount }: NotificationsPopoverProps) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const [modalPostId, setModalPostId] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery(GET_NOTIFICATIONS, {
    variables: { limit: 30, offset: 0 },
    skip: !isOpen,
    fetchPolicy: "cache-and-network",
    pollInterval: isOpen ? 30_000 : 0,
  });

  const [markRead]    = useMutation(MARK_READ);
  const [markAllRead] = useMutation(MARK_ALL_READ);

  const notifications: any[] = data?.notifications?.notifications ?? [];
  const unreadCount: number  = data?.notifications?.unreadCount   ?? 0;

  useEffect(() => { onUnreadCount?.(unreadCount); }, [unreadCount, onUnreadCount]);
  useEffect(() => { if (isOpen) refetch(); }, [isOpen, refetch]);

  async function handleMarkAllRead() {
    await markAllRead();
    refetch();
  }

  async function handleClick(notif: any) {
    if (!notif.isRead) {
      await markRead({ variables: { notificationId: notif.id } });
    }
    // Post-related: open inline modal so user sees the card without leaving the page
    if (POST_MODAL_TYPES.includes(notif.type) && notif.entityId) {
      setModalPostId(notif.entityId);
      return;
    }
    const target = navTarget(notif.type, notif.entityId, notif.actor?.username);
    if (target) { navigate(target); onClose(); }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Post modal — shown over the popover */}
      {modalPostId && (
        <PostModal
          postId={modalPostId}
          onClose={() => setModalPostId(null)}
        />
      )}
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-16 left-2 right-2 sm:left-auto sm:right-4 z-50 sm:w-96 max-h-[calc(100vh-5rem)] bg-card border rounded-xl shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-base">Notifications</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => { navigate("/settings"); onClose(); }}
            >
              <SettingsIcon className="w-4 h-4" strokeWidth={2} />
            </Button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-primary hover:underline font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
              <Bell className="w-10 h-10 opacity-20" strokeWidth={1.5} />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n: any, i: number) => (
              <div key={n.id}>
                <button
                  onClick={() => handleClick(n)}
                  className={`w-full text-left p-3 hover:bg-muted/60 transition-colors ${!n.isRead ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {n.actor ? (
                        <div className="relative">
                          <Avatar className="w-10 h-10 border-2 border-border">
                            <AvatarImage src={avatarSrc(n.actor.avatarUrl)} />
                            <AvatarFallback>{n.actor.name?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="absolute -bottom-0.5 -right-0.5">
                            {getIcon(n.type)}
                          </span>
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-card rounded-full flex items-center justify-center border border-border">
                          {getIcon(n.type)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">
                        {n.actor && (
                          <span className="font-semibold">{n.actor.name} </span>
                        )}
                        <span className={!n.isRead ? "font-medium" : "text-muted-foreground"}>
                          {displayMessage(n.type, n.message)}
                        </span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-primary">{timeAgo(n.createdAt)}</span>
                        {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                    </div>
                  </div>
                </button>
                {i < notifications.length - 1 && <Separator />}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              className="w-full text-sm text-primary h-9"
              onClick={() => { navigate("/settings"); onClose(); }}
            >
              Notification settings
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
