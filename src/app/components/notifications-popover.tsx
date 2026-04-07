import { useEffect, useRef } from "react";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import {
  Heart, MessageCircle, UserPlus, Share2,
  Trophy, Rocket, AtSign, Bell, Settings as SettingsIcon, Loader2,
} from "lucide-react";

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
  switch (type) {
    case "LIKE":               return <Heart         className="w-3 h-3 text-red-500"    strokeWidth={2} fill="currentColor" />;
    case "COMMENT":            return <MessageCircle className="w-3 h-3 text-blue-500"   strokeWidth={2} />;
    case "FOLLOW":             return <UserPlus      className="w-3 h-3 text-green-500"  strokeWidth={2} />;
    case "MENTION":            return <AtSign        className="w-3 h-3 text-sky-500"    strokeWidth={2} />;
    case "PROJECT_ROAST":      return <Rocket        className="w-3 h-3 text-primary"    strokeWidth={2} />;
    case "XP_LEVELUP":         return <Trophy        className="w-3 h-3 text-yellow-500" strokeWidth={2} fill="currentColor" />;
    case "LAUNCHPAD_INTEREST": return <Rocket        className="w-3 h-3 text-primary"    strokeWidth={2} />;
    default:                   return <Share2        className="w-3 h-3 text-purple-500" strokeWidth={2} />;
  }
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "Just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function navTarget(type: NotifType, entityId?: string | null): string | null {
  if (!entityId) return null;
  switch (type) {
    case "LIKE":
    case "COMMENT":
    case "MENTION":            return `/posts/${entityId}`;
    case "FOLLOW":             return `/profile/${entityId}`;
    case "PROJECT_ROAST":      return `/projects/${entityId}`;
    case "LAUNCHPAD_INTEREST": return `/launchpad`;
    default: return null;
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
    const target = navTarget(notif.type, notif.entityId);
    if (target) { navigate(target); onClose(); }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-16 right-4 z-50 w-96 max-h-[calc(100vh-5rem)] bg-card border rounded-xl shadow-2xl flex flex-col"
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
                            <AvatarImage src={n.actor.avatarUrl} />
                            <AvatarFallback>{n.actor.name?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-card rounded-full flex items-center justify-center border border-border">
                            {getIcon(n.type)}
                          </div>
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
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
                          {n.message}
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
