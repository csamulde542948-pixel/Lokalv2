// ─── Launchpad ────────────────────────────────────────────────────────────────
// Discovery grid for launchpad events with sections (All / Hosting / Joined),
// sort options, a featured row, and a multi-step wizard for creating events.

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "../components/ui/dialog";
import {
  Rocket, MessageSquare, Users, Calendar,
  Plus,
  AlertCircle,
  Search, Filter, Loader2, Check, ArrowUpDown,
  X, BadgeCheck, Clock, Flame, ArrowRight,
} from "lucide-react";
import { cn } from "../components/ui/utils";
import { useAuth } from "../../contexts/AuthContext";
import {
  eventTypeConfig, FILTER_TABS,
  deadlineLabel, deadlineToneClasses, clamp,
  useLayoutBottomOffset,
  type LaunchpadEventType,
} from "../features/launchpad";
import { CreateEventWizard } from "../features/launchpad/create-event-wizard";
import { AsciiFireAnimation } from "../components/ascii-fire";

// ─── GQL ──────────────────────────────────────────────────────────────────────

const GET_LAUNCHPAD_EVENTS = gql`
  query GetLaunchpadEvents($limit: Int, $offset: Int) {
    launchpadEvents(limit: $limit, offset: $offset) {
      id projectName iconUrl screenshotUrl projectTagline projectCategory projectStatus eventType title description deadline link
      spotsTotal interestedCount interestedByMe tags { name } createdAt
      author { id name username avatarUrl isVerified }
    }
  }
`;

const MARK_INTERESTED = gql`
  mutation MarkInterested($launchpadEventId: ID!, $commitmentEmail: String, $commitmentNote: String) {
    markInterested(launchpadEventId: $launchpadEventId, commitmentEmail: $commitmentEmail, commitmentNote: $commitmentNote) {
      id interestedCount interestedByMe
    }
  }
`;

const MARK_NOT_INTERESTED = gql`
  mutation MarkNotInterested($launchpadEventId: ID!) {
    markNotInterested(launchpadEventId: $launchpadEventId) {
      id interestedCount interestedByMe
    }
  }
`;

// ─── Scope tabs ───────────────────────────────────────────────────────────────

type Scope = "all" | "hosting" | "joined";

// ─── Sort options ────────────────────────────────────────────────────────────

type SortKey = "newest" | "deadline" | "popular";

const SORT_OPTIONS: { id: SortKey; label: string; icon: typeof Clock }[] = [
  { id: "newest",   label: "Newest",     icon: Clock },
  { id: "deadline", label: "Deadline",   icon: Calendar },
  { id: "popular",  label: "Popular",    icon: Flame },
];

// ─── Skeleton card ───────────────────────────────────────────────────────────

function EventCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 overflow-hidden bg-background/70">
      <Skeleton className={cn("w-full", compact ? "aspect-[21/9]" : "aspect-[16/9]")} />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-1.5 w-full rounded-sm" />
      </div>
    </div>
  );
}

// ─── Event card ──────────────────────────────────────────────────────────────

function EventCard({ event, user, onJoin, onLeave, joining, onClick }: {
  event: any;
  user: any;
  onJoin: (eventId: string, email: string, note: string) => void;
  onLeave: (eventId: string) => void;
  joining: boolean;
  onClick: () => void;
}) {
  const cfg = eventTypeConfig[event.eventType as LaunchpadEventType] ?? eventTypeConfig.FEEDBACK;
  const EventIcon = cfg.icon;
  const isCreator = user && event.author?.id === user.id;

  const dl = deadlineLabel(event.deadline);
  const spotsTotal: number | null = event.spotsTotal ?? null;
  const joined: number = event.interestedCount ?? 0;
  const pct = spotsTotal && spotsTotal > 0 ? clamp(Math.round((joined / spotsTotal) * 100), 0, 100) : null;
  const isFull = pct !== null && pct >= 100;
  const isClosed = dl?.tone === "muted";

  return (
    <Card
      onClick={onClick}
      className="group overflow-hidden border-border/60 hover:border-orange-500/50 transition-all duration-300 rounded-lg bg-background/75 backdrop-blur-sm cursor-pointer shadow-none"
    >
      <CardContent className="p-0">
        {/* ── Screenshot banner ──────────────────────────────────────── */}
        <div className="relative aspect-[16/9] overflow-hidden bg-muted border-b border-border/60">
          {event.screenshotUrl ? (
            <img
              src={event.screenshotUrl}
              alt={`${event.projectName} screenshot`}
              className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className={cn("absolute inset-0 bg-gradient-to-br", cfg.gradient, "flex items-center justify-center")}>
              <EventIcon className={cn("w-14 h-14", cfg.accent, "opacity-30")} strokeWidth={1.2} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          {/* Type badge — top left */}
          <Badge className={cn("absolute top-2.5 left-2.5 gap-1 backdrop-blur-md rounded-sm font-mono uppercase tracking-wider", cfg.bg, cfg.accent, cfg.border, "border")}>
            <EventIcon className="w-3 h-3" strokeWidth={2.5} />
            [{cfg.short}]
          </Badge>

          {/* Status badge — top right */}
          {(isClosed || (isFull && !event.interestedByMe)) && (
            <Badge variant="secondary" className="absolute top-2.5 right-2.5 backdrop-blur-md bg-black/70 text-white border-white/20 text-[10px]">
              {isClosed ? "Closed" : "Full"}
            </Badge>
          )}

          {/* Author chip — bottom right */}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2 py-1 rounded-sm bg-black/60 backdrop-blur-md border border-white/10">
            <Avatar className="w-4 h-4">
              {event.author?.avatarUrl && <AvatarImage src={event.author.avatarUrl} />}
              <AvatarFallback className="text-[8px]">
                {event.author?.name?.[0]?.toUpperCase() ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] font-medium text-white">@{event.author?.username}</span>
            {event.author?.isVerified && <BadgeCheck className="w-3 h-3 text-blue-400" />}
          </div>
        </div>

        {/* ── Body ──────────────────────────────────────────────────── */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <span>// launch cell</span>
            <span>{event.projectStatus || "open"}</span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm leading-tight truncate tracking-tight">
                {event.projectName || event.title}
              </h3>
              {event.title && event.title !== event.projectName && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{event.title}</p>
              )}
            </div>
          </div>

          {event.description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {event.description}
            </p>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.tags.slice(0, 3).map((t: any) => (
                <span
                  key={t.name}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm border border-border/60 bg-muted/50 text-muted-foreground"
                >
                  #{t.name}
                </span>
              ))}
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center justify-between text-[11px] font-mono">
            {dl && (
              <span
                className={cn(
                  "flex items-center gap-1 font-medium",
                  deadlineToneClasses(dl.tone)
                )}
              >
                <Calendar className="w-3 h-3" />
                {dl.text}
              </span>
            )}
            <span className="flex items-center gap-1 text-muted-foreground">
              <Users className="w-3 h-3" />
              <span className="font-semibold text-foreground">{joined}</span>
              {spotsTotal && <span>/{spotsTotal}</span>}
            </span>
          </div>

          {/* Progress bar */}
          {spotsTotal !== null && (
            <div className="h-1 rounded-sm bg-muted overflow-hidden">
              <div
                className={cn("h-full rounded-sm transition-all duration-500", cfg.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          {/* Action row — only primary CTA so the card click goes to detail */}
          <div
            className="pt-1 flex items-center gap-2"
            onClick={e => e.stopPropagation()}
          >
            {isCreator ? (
              <>
                <Button
                  size="sm" variant="outline"
                  onClick={onClick}
                  className="flex-1 h-8 gap-1.5 rounded-md text-xs font-mono"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Open controls
                </Button>
              </>
            ) : event.interestedByMe ? (
              <Button
                size="sm"
                onClick={onClick}
                className={cn("w-full h-8 gap-1.5 rounded-md text-xs font-mono", cfg.bg, cfg.accent, "hover:opacity-90")}
              >
                <MessageSquare className="w-3.5 h-3.5" /> Open
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onClick}
                disabled={!user || isFull || isClosed}
                className="w-full h-8 gap-1.5 rounded-md text-xs font-mono"
              >
                <EventIcon className="w-3.5 h-3.5" />
                {isClosed ? "Closed" : isFull ? "Full" : "View details"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function Launchpad() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const bottomOffset = useLayoutBottomOffset();
  const [showWizard, setShowWizard] = useState(false);
  const [scope, setScope] = useState<Scope>("all");
  const [filter, setFilter] = useState<LaunchpadEventType | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_LAUNCHPAD_EVENTS, {
    variables: { limit: 30 },
    fetchPolicy: "cache-and-network",
  });

  const [markInterested] = useMutation(MARK_INTERESTED);
  const [markNotInterested] = useMutation(MARK_NOT_INTERESTED);

  const events: any[] = data?.launchpadEvents ?? [];

  // Scope filter
  const scoped = useMemo(() => {
    if (!user) return events;
    if (scope === "hosting") return events.filter((e: any) => e.author?.id === user.id);
    if (scope === "joined") return events.filter((e: any) => e.interestedByMe);
    return events;
  }, [events, scope, user]);

  // Type + search filter
  const filtered = useMemo(() => {
    let list = scoped;
    if (filter !== "ALL") list = list.filter((e: any) => e.eventType === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e: any) =>
        (e.projectName ?? "").toLowerCase().includes(q) ||
        (e.title ?? "").toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q) ||
        (e.projectTagline ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [scoped, filter, search]);

  // Sort
  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === "newest") {
      list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    } else if (sort === "deadline") {
      list.sort((a, b) => {
        const ax = a.deadline ? +new Date(a.deadline) : Infinity;
        const bx = b.deadline ? +new Date(b.deadline) : Infinity;
        return ax - bx;
      });
    } else if (sort === "popular") {
      list.sort((a, b) => (b.interestedCount ?? 0) - (a.interestedCount ?? 0));
    }
    return list;
  }, [filtered, sort]);

  const hostingCount = user ? events.filter((e: any) => e.author?.id === user.id).length : 0;
  const joinedCount = user ? events.filter((e: any) => e.interestedByMe).length : 0;
  const handleJoin = useCallback(async (eventId: string, email: string, note: string) => {
    if (!user) return;
    setJoiningId(eventId);
    try {
      await markInterested({
        variables: { launchpadEventId: eventId, commitmentEmail: email, commitmentNote: note || undefined },
        update(cache, { data }) {
          if (!data?.markInterested) return;
          cache.modify({
            id: cache.identify({ __typename: "LaunchpadEvent", id: eventId }),
            fields: {
              interestedCount: () => data.markInterested.interestedCount,
              interestedByMe: () => true,
            },
          });
        },
      });
      navigate(`/launchpad/${eventId}`);
    } catch (_) { } finally {
      setJoiningId(null);
    }
  }, [user, markInterested, navigate]);

  const handleLeave = useCallback(async (eventId: string) => {
    if (!user) return;
    try {
      await markNotInterested({
        variables: { launchpadEventId: eventId },
        update(cache, { data }) {
          if (!data?.markNotInterested) return;
          cache.modify({
            id: cache.identify({ __typename: "LaunchpadEvent", id: eventId }),
            fields: {
              interestedCount: () => data.markNotInterested.interestedCount,
              interestedByMe: () => false,
            },
          });
        },
      });
    } catch (_) {}
  }, [user, markNotInterested]);

  const showEmpty = !loading && events.length === 0;
  const showNoMatch = !loading && events.length > 0 && sorted.length === 0;

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── ATMOSPHERE LAYER — ASCII fire background (matches projects.tsx) ──
          Stops flush with the top of the footer/tab bar so it never gets
          covered. */}
      <div
        className="fixed inset-x-0 top-0 pointer-events-none z-0"
        style={{ bottom: `${bottomOffset}px` }}
      >
        <AsciiFireAnimation className="absolute inset-0" />
        <div className="absolute inset-0 bg-background/75" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border) / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.4) 1px, transparent 1px), radial-gradient(circle, hsl(var(--foreground) / 0.18) 1.2px, transparent 1.2px)",
            backgroundSize: "48px 48px, 48px 48px, 24px 24px",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl">
        {/* ── Header ── */}
        <section className="mb-6 border-y border-border/60 bg-background/68 backdrop-blur-sm">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="p-5 sm:p-7 lg:border-r border-border/60">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-md bg-orange-500/10 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                  <Rocket className="w-5 h-5 text-orange-500" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-orange-500/80 mb-1">// launch operations</p>
                  <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight">Launchpad</h1>
                  <p className="text-sm text-muted-foreground max-w-2xl mt-2 leading-relaxed">
                    Find contributors, organize joiners, publish updates, and keep every launch conversation in one place.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-px bg-border/60 mt-6 border border-border/60 rounded-md overflow-hidden max-w-xl">
                {[
                  ["Live events", events.length],
                  ["You host", hostingCount],
                  ["You joined", joinedCount],
                ].map(([label, value]) => (
                  <div key={label} className="bg-background/85 px-3 sm:px-4 py-3">
                    <div className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">{label}</div>
                    <div className="text-xl font-semibold tabular-nums mt-1">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 sm:p-6 bg-background/45">
              {user ? (
                <div className="h-full flex flex-col justify-between gap-6">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Host controls</p>
                    <h2 className="font-semibold mt-2">Run your next launch</h2>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Create an event, review joiner commitments, publish announcements, and open a participant group chat.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => setShowWizard(true)} className="w-full justify-between rounded-md font-mono">
                      <span className="inline-flex items-center gap-1.5">
                        <Plus className="w-4 h-4" />
                        Create Event
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <button
                      type="button"
                      onClick={() => setScope("hosting")}
                      className="h-9 px-3 rounded-md border border-border/60 bg-background/65 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 text-left"
                    >
                      Open hosted events ({hostingCount})
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col justify-between gap-6">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">Your launch workspace</p>
                    <h2 className="font-semibold mt-2">Host and join events</h2>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Sign in to create events, access group chat, and manage your joiner list.</p>
                  </div>
                  <Button onClick={() => navigate("/login")} className="rounded-md font-mono">Sign in</Button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Scope tabs + count ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div className={cn(
            "grid gap-px bg-border/60 border border-border/60 rounded-md overflow-hidden",
            user ? "grid-cols-3" : "grid-cols-1"
          )}>
            {([
              { id: "all",     label: "Discover", count: events.length },
              ...(user ? [
                { id: "hosting", label: "Hosting", count: hostingCount },
                { id: "joined",  label: "Joined",  count: joinedCount },
              ] : []),
            ] as { id: Scope; label: string; count: number }[]).map(s => (
              <button
                key={s.id}
                onClick={() => setScope(s.id)}
                className={cn(
                  "px-4 sm:px-5 h-11 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-2 bg-background/80",
                  scope === s.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {s.label}
                <span className={cn(
                  "text-[10px] font-mono",
                  scope === s.id ? "text-foreground/60" : "text-muted-foreground/70"
                )}>
                  {s.count}
                </span>
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 text-xs self-end lg:self-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <div className="inline-flex p-0.5 bg-background/70 border border-border/60 rounded-lg">
              {SORT_OPTIONS.map(o => {
                const Icon = o.icon;
                const active = sort === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setSort(o.id)}
                    className={cn(
                      "px-2 h-7 text-[11px] font-mono font-medium rounded-md flex items-center gap-1 transition-colors",
                      active
                        ? "bg-foreground text-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Filters + search ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3 border border-border/60 bg-background/60 backdrop-blur-sm rounded-lg p-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search events, projects, tags…"
              className="pl-9 h-10 rounded-md bg-background/70 font-mono text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "flex-shrink-0 px-3 h-9 rounded-md text-xs font-mono font-semibold transition-colors",
                  filter === tab.id
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
              {scope === "hosting" ? "your event operations" : scope === "joined" ? "your active communities" : "public launch directory"}
            </p>
            <h2 className="text-base font-semibold mt-1">
              {scope === "hosting" ? "Events you manage" : scope === "joined" ? "Events you joined" : "Explore launch events"}
            </h2>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">{sorted.length} result{sorted.length === 1 ? "" : "s"}</span>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-6">
            {error.message}
          </div>
        )}

        {/* ── Events grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
          {loading && events.length === 0
            ? Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)
            : sorted.map((event: any) => (
              <EventCard
                key={event.id}
                event={event}
                user={user}
                onJoin={handleJoin}
                onLeave={handleLeave}
                joining={joiningId === event.id}
                onClick={() => navigate(`/launchpad/${event.id}`)}
              />
            ))}

          {showEmpty && (
            <div className="col-span-full">
              <div className="border border-dashed border-border rounded-lg py-16 text-center bg-background/60">
                <div className="w-16 h-16 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Rocket className="w-8 h-8 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-lg mb-2">No launch events yet</h3>
                <p className="text-sm text-muted-foreground mb-5">Be the first to share a launch or find collaborators.</p>
                {user && (
                  <Button onClick={() => setShowWizard(true)} className="gap-2 rounded-md">
                    <Plus className="w-4 h-4" />Create Event
                  </Button>
                )}
              </div>
            </div>
          )}

          {showNoMatch && (
            <div className="col-span-full">
              <div className="border border-dashed border-border rounded-lg py-12 text-center bg-background/60">
                <Filter className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="font-semibold text-sm mb-1">
                  {scope === "hosting"
                    ? "You haven't hosted any events in this view"
                    : scope === "joined"
                      ? "You haven't joined any events in this view"
                      : "No events match your filters"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Try clearing the search or selecting a different category.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateEventWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onCreated={() => {}}
      />
    </div>
  );
}
