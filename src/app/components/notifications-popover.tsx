import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Share2,
  Trophy,
  Rocket,
  Settings as SettingsIcon
} from "lucide-react";

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "share" | "achievement" | "launch";
  user?: {
    name: string;
    avatar: string;
    username: string;
  };
  content: string;
  timestamp: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "like",
    user: {
      name: "Angela Torres",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      username: "@angelat",
    },
    content: "liked your post",
    timestamp: "5m",
    read: false,
  },
  {
    id: "2",
    type: "comment",
    user: {
      name: "Carlos Reyes",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      username: "@carlosr",
    },
    content: "commented on your project",
    timestamp: "15m",
    read: false,
  },
  {
    id: "3",
    type: "follow",
    user: {
      name: "Maria Santos",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      username: "@mariasantos",
    },
    content: "started following you",
    timestamp: "1h",
    read: false,
  },
  {
    id: "4",
    type: "achievement",
    content: "You've reached 1,000 points!",
    timestamp: "2h",
    read: true,
  },
  {
    id: "5",
    type: "share",
    user: {
      name: "Juan dela Cruz",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      username: "@juandc",
    },
    content: "shared your project",
    timestamp: "3h",
    read: true,
  },
];

const getNotificationIcon = (type: Notification["type"]) => {
  switch (type) {
    case "like":
      return <Heart className="w-3 h-3 text-red-500" strokeWidth={2} fill="currentColor" />;
    case "comment":
      return <MessageCircle className="w-3 h-3 text-blue-500" strokeWidth={2} />;
    case "follow":
      return <UserPlus className="w-3 h-3 text-green-500" strokeWidth={2} />;
    case "share":
      return <Share2 className="w-3 h-3 text-purple-500" strokeWidth={2} />;
    case "achievement":
      return <Trophy className="w-3 h-3 text-yellow-500" strokeWidth={2} fill="currentColor" />;
    case "launch":
      return <Rocket className="w-3 h-3 text-primary" strokeWidth={2} />;
    default:
      return null;
  }
};

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsPopover({ isOpen, onClose }: NotificationsPopoverProps) {
  const [notifications, setNotifications] = useState(mockNotifications);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />

      {/* Notifications Panel */}
      <div className="fixed top-16 right-4 z-50 w-96 max-h-[calc(100vh-5rem)] bg-card border rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-base">Notifications</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full"
            >
              <SettingsIcon className="w-4 h-4" strokeWidth={2} />
            </Button>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-primary text-xs"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.map((notification, index) => (
            <div key={notification.id}>
              <div
                className={`p-3 hover:bg-muted cursor-pointer transition-colors ${
                  !notification.read ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon or Avatar */}
                  <div className="flex-shrink-0">
                    {notification.user ? (
                      <div className="relative">
                        <Avatar className="w-10 h-10 border-2 border-border">
                          <AvatarImage src={notification.user.avatar} />
                          <AvatarFallback>{notification.user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-card rounded-full flex items-center justify-center border border-border">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">
                      {notification.user && (
                        <span className="font-semibold">{notification.user.name} </span>
                      )}
                      <span className={!notification.read ? "font-medium" : "text-muted-foreground"}>
                        {notification.content}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-primary">{notification.timestamp}</span>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {index < notifications.length - 1 && <Separator />}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full text-sm text-primary h-9">
            See all notifications
          </Button>
        </div>
      </div>
    </>
  );
}
