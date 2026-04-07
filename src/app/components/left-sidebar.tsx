import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Skeleton } from "./ui/skeleton";
import { User, Users, FolderKanban, BarChart3, Settings, Rocket, Flame, Trophy, Sparkles, Shield, Briefcase, Calendar } from "lucide-react";
import { Link, useLocation } from "react-router";
import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "../../contexts/AuthContext";

const GET_ME_SIDEBAR = gql`
  query GetMeSidebar {
    me {
      id
      name
      username
      avatarUrl
      rank { name color }
    }
  }
`;

interface LeftSidebarProps {
  className?: string;
}

// Featured/Special navigation items
const featuredItems = [
  {
    icon: Rocket,
    label: "Launchpad",
    description: "Launch your projects",
    path: "/launchpad",
    gradient: "from-blue-500 to-cyan-500",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-500/10",
    hoverBg: "hover:bg-blue-500/20",
  },
  {
    icon: Flame,
    label: "Get Roasted",
    description: "AI code reviews",
    path: "/roast",
    gradient: "from-orange-500 to-red-500",
    iconColor: "text-orange-500",
    bgColor: "bg-orange-500/10",
    hoverBg: "hover:bg-orange-500/20",
  },
  {
    icon: Trophy,
    label: "Leaderboard",
    description: "Top developers",
    path: "/leaderboard",
    gradient: "from-yellow-500 to-orange-500",
    iconColor: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    hoverBg: "hover:bg-yellow-500/20",
  },
  {
    icon: Shield,
    label: "Rank & Role",
    description: "Level up your status",
    path: "/rank-role",
    gradient: "from-purple-500 to-pink-500",
    iconColor: "text-purple-500",
    bgColor: "bg-purple-500/10",
    hoverBg: "hover:bg-purple-500/20",
  },
  {
    icon: Briefcase,
    label: "Hire or Get Hired",
    description: "Jobs & opportunities",
    path: "/jobs",
    gradient: "from-green-500 to-emerald-500",
    iconColor: "text-green-500",
    bgColor: "bg-green-500/10",
    hoverBg: "hover:bg-green-500/20",
  },
  {
    icon: Calendar,
    label: "Community Events",
    description: "Webinars & meetups",
    path: "/events",
    gradient: "from-pink-500 to-rose-500",
    iconColor: "text-pink-500",
    bgColor: "bg-pink-500/10",
    hoverBg: "hover:bg-pink-500/20",
  },
];

const menuItems = [
  {
    icon: User,
    label: "Your Profile",
    badge: null,
    path: "/profile",
  },
  {
    icon: Users,
    label: "Friends",
    badge: null,
    path: "/friends",
  },
  {
    icon: FolderKanban,
    label: "Projects",
    badge: null,
    path: "/projects",
  },
  {
    icon: BarChart3,
    label: "Analytics",
    badge: null,
    path: "/analytics",
  },
  {
    icon: Settings,
    label: "Settings",
    badge: null,
    path: "/settings",
  },
];

export function LeftSidebar({ className = "" }: LeftSidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { data: meData, loading: meLoading } = useQuery(GET_ME_SIDEBAR, {
    skip: !user,
    fetchPolicy: "cache-first",
  });
  const me = meData?.me;

  return (
    <aside className={`w-64 p-4 space-y-4 ${className}`}>
      {/* User Profile Card */}
      <Link to="/profile">
        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors">
          {meLoading ? (
            <>
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <Skeleton className="h-3 w-24" />
            </>
          ) : (
            <>
              <Avatar className="w-8 h-8 border-2 border-border flex-shrink-0">
                <AvatarImage src={me?.avatarUrl ?? undefined} />
                <AvatarFallback>{(me?.name ?? user?.email ?? "?")[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{me?.name ?? user?.email ?? "You"}</p>
                {me?.username && <p className="text-xs text-muted-foreground truncate">@{me.username}</p>}
              </div>
            </>
          )}
        </div>
      </Link>

      {/* Regular Menu Items */}
      <div className="space-y-1">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link key={index} to={item.path}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted cursor-pointer transition-colors group ${
                  isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                {item.badge && (
                  <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Featured Section - No Container */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-2">
          <Sparkles className="w-4 h-4 text-primary" strokeWidth={2} />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Featured</h3>
        </div>
        
        <div className="space-y-1">
          {featuredItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link key={index} to={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group relative overflow-hidden ${
                    isActive 
                      ? `${item.bgColor} ${item.iconColor} font-semibold shadow-sm` 
                      : `hover:bg-muted/80 text-foreground ${item.hoverBg}`
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive ? item.bgColor : "bg-muted"
                  } group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-4 h-4 ${isActive ? item.iconColor : "text-muted-foreground"}`} strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-primary">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  {isActive && (
                    <div className="w-1 h-6 bg-primary rounded-full absolute right-2" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}