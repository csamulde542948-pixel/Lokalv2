import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { 
  HomeIcon as HomeSolid, 
  TrophyIcon as TrophySolid,
  RocketLaunchIcon as RocketSolid,
  FireIcon as FireSolid
} from "@heroicons/react/24/solid";
import { Search, Bell, MessageSquare, Menu, Code2, X, User, Users, FolderKanban, BarChart3, Settings, LogOut, Shield, Briefcase } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { MessagesPopover } from "./messages-popover";
import { NotificationsPopover } from "./notifications-popover";
import { ThemeToggle } from "./theme-toggle";
import { useState, useEffect, useRef } from "react";
import { useChat } from "../../contexts/ChatContext";
import { useAuth } from "../../contexts/AuthContext";
import { gql } from "@apollo/client/core";
import { useQuery, useLazyQuery } from "@apollo/client/react";
import { avatarSrc } from "../../lib/defaults";

const GET_ME_LAYOUT = gql`
  query GetMeLayout {
    me { id name username displayName avatarUrl rank { name color } unreadNotificationsCount }
  }
`;

const GLOBAL_SEARCH = gql`
  query GlobalSearch($query: String!, $limit: Int) {
    globalSearch(query: $query, limit: $limit) {
      profiles { id name username displayName avatarUrl }
      projects { id name tagline }
      jobs     { id title company }
    }
  }
`;

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [showMessages, setShowMessages] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const { totalUnread } = useChat();

  // Global search
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [runSearch, { data: searchData, loading: searchLoading }] = useLazyQuery(GLOBAL_SEARCH, {
    fetchPolicy: "network-only",
  });

  // Debounce search input → only fire GQL after 300 ms of no typing
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput);
      if (searchInput.trim().length >= 2) {
        runSearch({ variables: { query: searchInput.trim(), limit: 4 } });
        setSearchOpen(true);
      } else {
        setSearchOpen(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, runSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchResults = searchData?.globalSearch;
  const hasResults = searchResults && (
    searchResults.profiles.length + searchResults.projects.length + searchResults.jobs.length > 0
  );

  // Real user data for avatar + name
  const { data: meData } = useQuery(GET_ME_LAYOUT, {
    fetchPolicy: "cache-and-network",
    pollInterval: 15_000,   // lightweight poll — reads one profile row, no notification table scan
  });
  const me = meData?.me;

  // Seed badge count from the me query (keeps badge in sync between polls)
  useEffect(() => {
    if (me?.unreadNotificationsCount != null) {
      setUnreadNotifCount(me.unreadNotificationsCount);
    }
  }, [me?.unreadNotificationsCount]);

  const handleLogout = async () => {
    setShowMobileMenu(false);
    await signOut();
    navigate("/login");
  };

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
              <BrandLogo className="hidden md:flex" />
              <BrandLogo showText={false} className="md:hidden" />
              
              <div ref={searchRef} className="relative max-w-md w-full hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
                <Input
                  type="search"
                  placeholder="Search developers, projects, jobs…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSearchOpen(false);
                  }}
                  className="pl-10 bg-muted border rounded-md h-9 text-sm focus-visible:ring-1"
                />

                {/* Dropdown */}
                {searchOpen && (
                  <div className="absolute top-full mt-1 left-0 right-0 bg-card border rounded-xl shadow-xl z-[100] overflow-hidden">
                    {searchLoading && (
                      <div className="px-4 py-3 text-xs text-muted-foreground">Searching…</div>
                    )}

                    {!searchLoading && !hasResults && searchQuery.length >= 2 && (
                      <div className="px-4 py-3 text-xs text-muted-foreground">No results for &ldquo;{searchQuery}&rdquo;</div>
                    )}

                    {!searchLoading && hasResults && (
                      <>
                        {/* Profiles */}
                        {searchResults!.profiles.length > 0 && (
                          <div>
                            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">People</p>
                            {searchResults!.profiles.map((p: any) => (
                              <button
                                key={p.id}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left"
                                onClick={() => { navigate(`/profile/${p.username}`); setSearchOpen(false); setSearchInput(""); }}
                              >
                                <Avatar className="w-7 h-7 border flex-shrink-0">
                                  <AvatarImage src={avatarSrc(p.avatarUrl)} />
                                  <AvatarFallback className="text-[10px]">{(p.displayName ?? p.name)?.[0]?.toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{p.displayName ?? p.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Projects */}
                        {searchResults!.projects.length > 0 && (
                          <div>
                            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Projects</p>
                            {searchResults!.projects.map((p: any) => (
                              <button
                                key={p.id}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left"
                                onClick={() => { navigate(`/project/${p.id}`); setSearchOpen(false); setSearchInput(""); }}
                              >
                                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Code2 className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{p.name}</p>
                                  {p.tagline && <p className="text-xs text-muted-foreground truncate">{p.tagline}</p>}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Jobs */}
                        {searchResults!.jobs.length > 0 && (
                          <div>
                            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Jobs</p>
                            {searchResults!.jobs.map((j: any) => (
                              <button
                                key={j.id}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted transition-colors text-left"
                                onClick={() => { navigate(`/jobs/${j.id}`); setSearchOpen(false); setSearchInput(""); }}
                              >
                                <div className="w-7 h-7 rounded-md bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                                  <Briefcase className="w-3.5 h-3.5 text-teal-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{j.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">{j.company}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="px-3 py-2 border-t">
                          <button
                            className="text-xs text-primary hover:underline w-full text-left"
                            onClick={() => { navigate(`/search?q=${encodeURIComponent(searchQuery)}`); setSearchOpen(false); setSearchInput(""); }}
                          >
                            See all results for &ldquo;{searchQuery}&rdquo; →
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
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
                {totalUnread > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full"
                  >
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </Badge>
                )}
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
                  <AvatarImage src={avatarSrc(me?.avatarUrl)} />
                  <AvatarFallback>{(me?.displayName ?? me?.name ?? "?")[0]?.toUpperCase()}</AvatarFallback>
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
                  <AvatarImage src={avatarSrc(me?.avatarUrl)} />
                  <AvatarFallback>{(me?.displayName ?? me?.name ?? "?")[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{me?.displayName ?? me?.name ?? "Your Profile"}</p>
                  <p className="text-xs text-muted-foreground truncate">{me?.username ? `@${me.username}` : ""}</p>
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
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-3 py-2 rounded-md transition-colors text-destructive hover:bg-destructive/10"
              >
                <LogOut className="w-5 h-5" strokeWidth={2} />
                <span className="text-sm font-medium">Log Out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Legal footer ── */}
      <footer className="border-t bg-muted/20 py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground/60">
            © 2026 lokalhost.club &middot; Made with 🔥 by Filipino developers
          </p>
          <nav className="flex items-center gap-4 flex-wrap justify-end">
            <Link to="/terms"          className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy"        className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/refund-policy"  className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors">Refund Policy</Link>
            <Link to="/cookie-policy"  className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors">Cookies</Link>
            <Link to="/acceptable-use" className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors">Acceptable Use</Link>
            <a href="mailto:legal@lokalhost.club" className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors">Contact</a>
          </nav>
        </div>
      </footer>

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