import { Outlet, Link, useLocation } from "react-router";
import { 
  HomeIcon as HomeSolid, 
  TrophyIcon as TrophySolid,
  RocketLaunchIcon as RocketSolid,
  FireIcon as FireSolid
} from "@heroicons/react/24/solid";
import { Search, Bell, MessageSquare, Menu, Code2, X, User, Users, FolderKanban, BarChart3, Settings, LogOut, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { MessagesPopover } from "./messages-popover";
import { NotificationsPopover } from "./notifications-popover";
import { ThemeToggle } from "./theme-toggle";
import { useState } from "react";

export function Layout() {
  const location = useLocation();
  const [showMessages, setShowMessages] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const menuItems = [
    { icon: User, label: "Your Profile", path: "/profile" },
    { icon: Users, label: "Friends", path: "/friends" },
    { icon: FolderKanban, label: "Projects", path: "/projects" },
    { icon: BarChart3, label: "Analytics", path: "/analytics" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo & Search */}
            <div className="flex items-center gap-4 flex-1">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">L</span>
                </div>
                <span className="font-semibold text-lg hidden md:inline">lokalhost.club</span>
              </Link>
              
              <div className="relative max-w-md w-full hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
                <Input 
                  type="search" 
                  placeholder="Search developers, projects..." 
                  className="pl-10 bg-muted border rounded-md h-9 text-sm focus-visible:ring-1"
                />
              </div>
            </div>

            {/* Center: Navigation */}
            <nav className="flex items-center gap-1 px-4">
              <Link
                to="/"
                className={`flex items-center justify-center w-24 h-16 border-b-[3px] transition-colors relative group ${
                  isActive("/")
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:bg-muted/50 rounded-lg"
                }`}
              >
                {isActive("/") ? (
                  <HomeSolid className="w-6 h-6" />
                ) : (
                  <HomeSolid className="w-6 h-6" />
                )}
              </Link>
              <Link
                to="/launchpad"
                className={`flex items-center justify-center w-24 h-16 border-b-[3px] transition-colors relative group ${
                  isActive("/launchpad")
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:bg-muted/50 rounded-lg"
                }`}
              >
                {isActive("/launchpad") ? (
                  <RocketSolid className="w-6 h-6" />
                ) : (
                  <RocketSolid className="w-6 h-6" />
                )}
              </Link>
              <Link
                to="/roast"
                className={`flex items-center justify-center w-24 h-16 border-b-[3px] transition-colors relative group ${
                  isActive("/roast")
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:bg-muted/50 rounded-lg"
                }`}
              >
                {isActive("/roast") ? (
                  <FireSolid className="w-6 h-6" />
                ) : (
                  <FireSolid className="w-6 h-6" />
                )}
              </Link>
              <Link
                to="/leaderboard"
                className={`flex items-center justify-center w-24 h-16 border-b-[3px] transition-colors relative group ${
                  isActive("/leaderboard")
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:bg-muted/50 rounded-lg"
                }`}
              >
                {isActive("/leaderboard") ? (
                  <TrophySolid className="w-6 h-6" />
                ) : (
                  <TrophySolid className="w-6 h-6" />
                )}
              </Link>
            </nav>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              <ThemeToggle />
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-md h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted relative"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowMessages(false);
                }}
              >
                <Bell className="w-5 h-5" strokeWidth={2} />
                {unreadNotifCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full"
                  >
                    {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                  </Badge>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-md h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted relative"
                onClick={() => {
                  setShowMessages(!showMessages);
                  setShowNotifications(false);
                }}
              >
                <MessageSquare className="w-5 h-5" strokeWidth={2} />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full"
                >
                  2
                </Badge>
              </Button>
              <div className="h-6 w-px bg-border mx-1"></div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-md h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? (
                  <X className="w-5 h-5" strokeWidth={2} />
                ) : (
                  <Menu className="w-5 h-5" strokeWidth={2} />
                )}
              </Button>
              <Link to="/profile">
                <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-muted transition-all border-2 border-border">
                  <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" />
                  <AvatarFallback>ME</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
            onClick={() => setShowMobileMenu(false)}
          />
          
          {/* Mobile Menu Panel */}
          <div className="fixed top-16 right-0 w-80 bg-card border-l border-b shadow-xl z-50 animate-in slide-in-from-right duration-300">
            <div className="p-4 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
              {/* User Profile Section */}
              <Link 
                to="/profile" 
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 p-3 rounded-md hover:bg-muted cursor-pointer transition-colors mb-4"
              >
                <Avatar className="w-10 h-10 border-2 border-border">
                  <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" />
                  <AvatarFallback>ME</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">Your Profile</p>
                  <p className="text-xs text-muted-foreground truncate">@yourusername</p>
                </div>
              </Link>

              <div className="border-t pt-2 mb-2"></div>

              {/* Navigation Links */}
              <div className="space-y-1 mb-4">
                <p className="px-3 text-xs font-semibold text-muted-foreground mb-2">NAVIGATION</p>
                <Link
                  to="/"
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive("/")
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {isActive("/") ? (
                    <HomeSolid className="w-5 h-5" />
                  ) : (
                    <HomeSolid className="w-5 h-5" />
                  )}
                  <span className="text-sm">Home</span>
                </Link>
                <Link
                  to="/launchpad"
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive("/launchpad")
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {isActive("/launchpad") ? (
                    <RocketSolid className="w-5 h-5" />
                  ) : (
                    <RocketSolid className="w-5 h-5" />
                  )}
                  <span className="text-sm">Launchpad</span>
                </Link>
                <Link
                  to="/roast"
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive("/roast")
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {isActive("/roast") ? (
                    <FireSolid className="w-5 h-5" />
                  ) : (
                    <FireSolid className="w-5 h-5" />
                  )}
                  <span className="text-sm">Roast My Code</span>
                </Link>
                <Link
                  to="/leaderboard"
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive("/leaderboard")
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {isActive("/leaderboard") ? (
                    <TrophySolid className="w-5 h-5" />
                  ) : (
                    <TrophySolid className="w-5 h-5" />
                  )}
                  <span className="text-sm">Leaderboard</span>
                </Link>
                <Link
                  to="/rank-role"
                  onClick={() => setShowMobileMenu(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    isActive("/rank-role")
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Shield className="w-5 h-5" strokeWidth={2} />
                  <span className="text-sm">Rank & Role</span>
                </Link>
              </div>

              <div className="border-t pt-2 mb-2"></div>

              {/* Menu Items */}
              <div className="space-y-1">
                <p className="px-3 text-xs font-semibold text-muted-foreground mb-2">MENU</p>
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                        isActive(item.path)
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5" strokeWidth={2} />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="border-t pt-2 mt-2"></div>

              {/* Logout Button */}
              <Link
                to="/login"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <LogOut className="w-5 h-5" strokeWidth={2} />
                <span className="text-sm font-medium">Log Out</span>
              </Link>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Popovers */}
      <MessagesPopover 
        isOpen={showMessages} 
        onClose={() => setShowMessages(false)} 
      />
      <NotificationsPopover 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)}
        onUnreadCount={setUnreadNotifCount}
      />
    </div>
  );
}