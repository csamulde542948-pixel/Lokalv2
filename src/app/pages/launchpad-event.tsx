// ─── Launchpad Event Detail ───────────────────────────────────────────────────
// A dedicated event page with hero, project branding, host info, participants
// preview, and a sticky action panel. Replaces the previous behavior of
// dropping users straight into the chat thread.

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import {
  format, formatDistanceToNow, formatDistanceToNowStrict,
} from "date-fns";
import {
  ArrowLeft, ExternalLink, Calendar, Users, MessageSquare, Megaphone,
  Rocket, Globe, Hash, Sparkles, ClipboardCheck,
  AlertCircle, Loader2, Check, Lock, TrendingUp, X, Share2,
  BadgeCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../components/ui/utils";
import {
  eventTypeConfig, type LaunchpadEventType,
  deadlineLabel, deadlineToneClasses,
  useLayoutBottomOffset,
} from "../features/launchpad";
import { JoinEventModal } from "../features/launchpad/join-event-modal";
import { AsciiFireAnimation } from "../components/ascii-fire";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GET_EVENT = gql`
  query GetLaunchpadEventDetail($id: ID!) {
    launchpadEvent(id: $id) {
      id projectName iconUrl screenshotUrl projectTagline projectCategory projectStatus
      eventType title description deadline link
      spotsTotal interestedCount interestedByMe isOpen createdAt updatedAt
      tags { name }
      author {
        id name username avatarUrl rank { name color }
        isVerified
      }
    }
  }
`;

const GET_PARTICIPANTS = gql`
  query GetLaunchpadEventDetailParticipants($eventId: ID!) {
    launchpadEventParticipants(eventId: $eventId) {
      id joinedAt
      profile {
        id name username avatarUrl rank { name color }
        isVerified
      }
    }
  }
`;

const GET_ANNOUNCEMENTS = gql`
  query GetLaunchpadEventDetailAnnouncements($eventId: ID!) {
    launchpadAnnouncements(eventId: $eventId) {
      id message createdAt
      creator { id name username avatarUrl }
    }
  }
`;

const GET_STATS = gql`
  query GetLaunchpadEventDetailStats($eventId: ID!) {
    launchpadEventStats(eventId: $eventId) {
      totalJoined spotsTotal fillRate
    }
  }
`;

const MARK_INTERESTED = gql`
  mutation MarkInterestedDetail($launchpadEventId: ID!, $commitmentEmail: String, $commitmentNote: String) {
    markInterested(launchpadEventId: $launchpadEventId, commitmentEmail: $commitmentEmail, commitmentNote: $commitmentNote) {
      id interestedCount interestedByMe
    }
  }
`;

const MARK_NOT_INTERESTED = gql`
  mutation MarkNotInterestedDetail($launchpadEventId: ID!) {
    markNotInterested(launchpadEventId: $launchpadEventId) {
      id interestedCount interestedByMe
    }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function timeAgo(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function timeShort(iso: string) {
  return format(new Date(iso), "MMM d, yyyy 'at' h:mm a");
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: Parameters<typeof deadlineToneClasses>[0];
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/65 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className={cn("mt-1 truncate text-sm font-semibold", tone ? deadlineToneClasses(tone) : "text-foreground")}>
        {value}
      </p>
    </div>
  );
}

function DetailTile({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border/50 bg-muted/30 p-3", className)}>
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="min-w-0 text-sm font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LaunchpadEvent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bottomOffset = useLayoutBottomOffset();
  const [joinOpen, setJoinOpen] = useState(false);
  const [tab, setTab] = useState<"about" | "participants" | "announcements">("about");
  const [copied, setCopied] = useState(false);

  const eventQuery = useQuery(GET_EVENT, { variables: { id }, skip: !id });
  const event = eventQuery.data?.launchpadEvent ?? null;
  const isHost = !!(user && event && event.author?.id === user.id);
  const canReadUpdates = !!(user && event && (isHost || event.interestedByMe));

  const participantsQuery = useQuery(GET_PARTICIPANTS, {
    variables: { eventId: id },
    skip: !id || !isHost,
  });
  const announcementsQuery = useQuery(GET_ANNOUNCEMENTS, {
    variables: { eventId: id },
    skip: !id || !canReadUpdates,
  });
  const statsQuery = useQuery(GET_STATS, { variables: { eventId: id }, skip: !id || !isHost });

  const [markInterested, { loading: joining }] = useMutation(MARK_INTERESTED, {
    update(cache, { data }) {
      if (!data?.markInterested) return;
      cache.modify({
        id: cache.identify({ __typename: "LaunchpadEvent", id }),
        fields: {
          interestedCount: () => data.markInterested.interestedCount,
          interestedByMe: () => true,
        },
      });
    },
    refetchQueries: isHost
      ? [
        { query: GET_PARTICIPANTS, variables: { eventId: id } },
        { query: GET_STATS, variables: { eventId: id } },
      ]
      : [],
  });

  const [markNotInterested, { loading: leaving }] = useMutation(MARK_NOT_INTERESTED, {
    update(cache, { data }) {
      if (!data?.markNotInterested) return;
      cache.modify({
        id: cache.identify({ __typename: "LaunchpadEvent", id }),
        fields: {
          interestedCount: () => data.markNotInterested.interestedCount,
          interestedByMe: () => false,
        },
      });
    },
    refetchQueries: isHost
      ? [
        { query: GET_PARTICIPANTS, variables: { eventId: id } },
        { query: GET_STATS, variables: { eventId: id } },
      ]
      : [],
  });

  const participants: any[] = participantsQuery.data?.launchpadEventParticipants ?? [];
  const announcements: any[] = announcementsQuery.data?.launchpadAnnouncements ?? [];
  const stats = statsQuery.data?.launchpadEventStats;
  const cfg = event ? eventTypeConfig[event.eventType as LaunchpadEventType] : null;
  const dl = event ? deadlineLabel(event.deadline) : null;

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!eventQuery.loading && !event) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center space-y-3 max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-muted-foreground/50" />
          </div>
          <h2 className="font-bold text-lg">Event not found</h2>
          <p className="text-sm text-muted-foreground">
            This event may have been deleted by the host or never existed.
          </p>
          <Button onClick={() => navigate("/launchpad")} className="gap-2 rounded-xl">
            <ArrowLeft className="w-4 h-4" />
            Back to Launchpad
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (eventQuery.loading || !event || !cfg) {
    return <EventDetailSkeleton />;
  }

  const joined = stats?.totalJoined ?? event.interestedCount ?? 0;
  const spotsTotal = event.spotsTotal ?? stats?.spotsTotal ?? null;
  const pct = spotsTotal && spotsTotal > 0 ? clamp(Math.round((joined / spotsTotal) * 100), 0, 100) : null;
  const isFull = pct !== null && pct >= 100;
  const isClosed = dl?.tone === "muted" || !event.isOpen;
  const canJoin = !!user && !isHost && !event.interestedByMe && !isFull && !isClosed;
  const canLeave = !!user && !isHost && event.interestedByMe;
  const canChat = isHost || event.interestedByMe;

  function handleJoin(email: string, note: string) {
    markInterested({
      variables: { launchpadEventId: id, commitmentEmail: email, commitmentNote: note || undefined },
    });
    setJoinOpen(false);
    toast.success("You're in! 🚀", { description: "Welcome to the event." });
  }

  function handleLeave() {
    markNotInterested({ variables: { launchpadEventId: id } });
    toast("You've left the event.", { description: "You can re-join anytime." });
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
              "linear-gradient(hsl(var(--border) / 0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.35) 1px, transparent 1px), radial-gradient(circle, hsl(var(--foreground) / 0.18) 1.2px, transparent 1.2px)",
            backgroundSize: "48px 48px, 48px 48px, 24px 24px",
          }}
        />
      </div>

      {/* ── Banner hero ────────────────────────────────────────────── */}
      <div className={cn("relative z-10 overflow-hidden border-b border-border/50", cfg.bg)}>
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", cfg.gradient)} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-8">
          {/* Top breadcrumb / actions row */}
          <div className="flex items-center justify-between gap-2 mb-6">
            <Button
              variant="ghost" size="sm"
              onClick={() => navigate("/launchpad")}
              className="gap-1.5 rounded-xl bg-background/60 backdrop-blur-sm border border-border/40"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Launchpad
            </Button>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost" size="sm"
                onClick={copyLink}
                className="gap-1.5 rounded-xl bg-background/60 backdrop-blur-sm border border-border/40"
              >
                {copied
                  ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</>
                  : <><Share2 className="w-3.5 h-3.5" /> Share</>}
              </Button>
              {isHost && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => navigate(`/launchpad/${id}/manage`)}
                  className="gap-1.5 rounded-xl bg-background/60 backdrop-blur-sm border border-border/40"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Manage
                </Button>
              )}
            </div>
          </div>

          {/* Project hero */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-stretch">
            <div className="min-w-0 rounded-2xl border border-border/50 bg-background/70 p-4 sm:p-5 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-start gap-5">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-background border-2 border-background shadow-lg flex items-center justify-center flex-shrink-0">
                  {event.iconUrl
                    ? <img src={event.iconUrl} alt={event.projectName} className="w-full h-full object-cover" />
                    : <cfg.icon className={cn("w-10 h-10", cfg.accent)} strokeWidth={1.5} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge className={cn("gap-1.5 border", cfg.bg, cfg.accent, cfg.border)}>
                      <cfg.icon className="w-3 h-3" strokeWidth={2.5} />
                      {cfg.label}
                    </Badge>
                    <Badge variant={event.isOpen && !isFull && !isClosed ? "default" : "secondary"} className="bg-background/80 backdrop-blur-sm">
                      {isFull ? "Full" : isClosed ? "Closed" : "Open"}
                    </Badge>
                    {isHost && (
                      <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                        Host view
                      </Badge>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-bold leading-tight tracking-tight">
                    {event.title}
                  </h1>
                  {event.projectName && event.title !== event.projectName && (
                    <p className="text-base text-foreground/75 mt-2 font-semibold">
                      {event.projectName}
                    </p>
                  )}
                  {event.projectTagline && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      {event.projectTagline}
                    </p>
                  )}

                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <HeroMetric icon={Users} label="Joined" value={`${joined}${spotsTotal ? `/${spotsTotal}` : ""}`} />
                    <HeroMetric icon={Calendar} label="Deadline" value={dl?.text ?? "No deadline"} tone={dl?.tone} />
                    <HeroMetric icon={MessageSquare} label="Chat" value={canChat ? "Unlocked" : "Join first"} />
                    <HeroMetric icon={Sparkles} label="Created" value={`${formatDistanceToNowStrict(new Date(event.createdAt))} ago`} />
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/50 bg-background/75 backdrop-blur-sm">
              <div className="relative aspect-[16/10] bg-muted">
                {event.screenshotUrl ? (
                  <img
                    src={event.screenshotUrl}
                    alt={`${event.projectName} preview`}
                    className="absolute inset-0 h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className={cn("absolute inset-0 bg-gradient-to-br", cfg.gradient)}>
                    <cfg.icon className={cn("absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 opacity-35", cfg.accent)} strokeWidth={1.3} />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 to-transparent p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">Launch preview</p>
                      <p className="truncate text-sm font-semibold">{event.projectName || event.title}</p>
                    </div>
                    {event.link && (
                      <a href={event.link} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <Button size="sm" variant="secondary" className="h-8 gap-1.5 rounded-md">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Visit
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
              {spotsTotal !== null && (
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Capacity</span>
                    <span className={cn("font-semibold", pct === 100 ? "text-emerald-600" : cfg.accent)}>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500", cfg.bar)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick meta strip */}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <Link
              to={`/profile/${event.author.username}`}
              className="flex items-center gap-2 group"
            >
              <Avatar className="w-7 h-7 border-2 border-background">
                {event.author.avatarUrl && <AvatarImage src={event.author.avatarUrl} />}
                <AvatarFallback className="text-[10px]">
                  {event.author.name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="leading-tight">
                <p className="text-xs text-muted-foreground">Hosted by</p>
                <p className="font-semibold text-foreground group-hover:underline flex items-center gap-1">
                  @{event.author.username}
                  {event.author.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500" />}
                </p>
              </div>
            </Link>

            <div className="h-8 w-px bg-border/60 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-background/60 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-foreground/70" />
              </div>
              <div className="leading-tight">
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="font-semibold">{joined}{spotsTotal ? ` / ${spotsTotal}` : ""}</p>
              </div>
            </div>

            {dl && (
              <>
                <div className="h-8 w-px bg-border/60 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-background/60 flex items-center justify-center">
                    <Calendar className={cn("w-3.5 h-3.5", deadlineToneClasses(dl.tone))} />
                  </div>
                  <div className="leading-tight">
                    <p className="text-xs text-muted-foreground">Deadline</p>
                    <p className={cn("font-semibold", deadlineToneClasses(dl.tone))}>
                      {dl.text === "Closed" ? "Closed" : format(new Date(event.deadline!), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="h-8 w-px bg-border/60 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-background/60 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-foreground/70" />
              </div>
              <div className="leading-tight">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-semibold">{event.projectStatus || "Active"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
        {/* ── Left column ─────────────────────────────────────────── */}
        <div className="min-w-0 space-y-6">
          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-border/50 bg-background/75 p-1 backdrop-blur-sm">
              <TabsTrigger value="about" className="h-10 min-w-0 gap-1.5 rounded-lg px-2 text-xs sm:text-sm">
                <Rocket className="w-3.5 h-3.5" /> About
              </TabsTrigger>
              <TabsTrigger value="participants" className="h-10 min-w-0 gap-1.5 rounded-lg px-2 text-xs sm:text-sm">
                <Users className="w-3.5 h-3.5" />
                <span className="truncate">{isHost ? "Participants" : "Joined"}</span>
                <span className="text-[10px] text-muted-foreground">({joined})</span>
              </TabsTrigger>
              <TabsTrigger value="announcements" className="h-10 min-w-0 gap-1.5 rounded-lg px-2 text-xs sm:text-sm">
                <Megaphone className="w-3.5 h-3.5" />
                <span className="truncate">Updates</span>
                <span className="text-[10px] text-muted-foreground">({announcements.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* ── About tab ── */}
            <TabsContent value="about" className="space-y-6 mt-5">
              <Card className="overflow-hidden border-border/50 bg-background/85 backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className={cn("border-b border-border/50 px-5 py-4", cfg.bg)}>
                    <h2 className="font-semibold text-base flex items-center gap-2">
                      <cfg.icon className={cn("w-4 h-4", cfg.accent)} />
                      Event brief
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      What participants should know before joining.
                    </p>
                  </div>
                  <div className="p-5 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                    {event.description || "No description provided."}
                  </div>
                </CardContent>
              </Card>

              {/* Project info card */}
              {(event.projectCategory || event.projectStatus || event.projectTagline || event.link) && (
                <Card className="border-border/50 bg-background/85 backdrop-blur-sm">
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <h2 className="font-semibold text-base flex items-center gap-2">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      Project details
                    </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Core project metadata and external launch links.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {event.projectCategory && (
                        <DetailTile label="Category" icon={Hash} value={event.projectCategory} />
                      )}
                      {event.projectStatus && (
                        <DetailTile label="Status" icon={Sparkles} value={<span className="capitalize">{event.projectStatus}</span>} />
                      )}
                      {event.projectTagline && (
                        <DetailTile
                          label="Tagline"
                          icon={Rocket}
                          className="sm:col-span-2"
                          value={<span className="block truncate">{event.projectTagline}</span>}
                        />
                      )}
                      {event.link && (
                        <DetailTile
                          label="Project link"
                          icon={Globe}
                          className="sm:col-span-2"
                          value={(
                          <a
                            href={event.link}
                            target="_blank" rel="noopener noreferrer"
                              className={cn("inline-flex max-w-full items-center gap-1 hover:underline", cfg.accent)}
                          >
                              <span className="truncate">{event.link}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                          )}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-background/75 p-5 backdrop-blur-sm">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Tags
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((t: any) => (
                      <span
                        key={t.name}
                        className="text-xs font-medium px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70 transition-colors"
                      >
                        #{t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Commitment prompt */}
              <div className={cn("rounded-2xl border p-5 backdrop-blur-sm", cfg.bg, cfg.border)}>
                <div className="flex items-start gap-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", cfg.solidBg)}>
                    <ClipboardCheck className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-1">
                      What we ask of {cfg.label.toLowerCase()}
                    </h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {cfg.commitment}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ── Participants tab ── */}
            <TabsContent value="participants" className="mt-5">
              <Card className="border-border/50">
                <CardContent className="p-0">
                  {!isHost ? (
                    <div className="p-10 text-center text-muted-foreground">
                      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                        <Lock className="w-5 h-5 opacity-60" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Participant roster is private</p>
                      <p className="text-xs mt-1 max-w-sm mx-auto">
                        Hosts can review joined users, notes, and contact emails from the chat dashboard.
                      </p>
                    </div>
                  ) : participantsQuery.loading ? (
                    <div className="p-6 space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 rounded-xl" />
                      ))}
                    </div>
                  ) : participants.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No one's joined yet. Be the first!</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/40">
                      {participants.map((p: any, idx: number) => (
                        <li key={p.id}>
                          <Link
                            to={`/profile/${p.profile.username}`}
                            className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors"
                          >
                            <span className="text-xs text-muted-foreground w-6 text-right font-mono">
                              {idx + 1}
                            </span>
                            <Avatar className="w-10 h-10">
                              {p.profile.avatarUrl && <AvatarImage src={p.profile.avatarUrl} />}
                              <AvatarFallback>{p.profile.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-sm truncate">{p.profile.name}</p>
                                {p.profile.isVerified && (
                                  <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">@{p.profile.username}</p>
                            </div>
                            <p className="text-[11px] text-muted-foreground hidden sm:block">
                              {timeAgo(p.joinedAt)}
                            </p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Announcements tab ── */}
            <TabsContent value="announcements" className="mt-5">
              {!canChat && announcements.length === 0 ? (
                <Card className="border-border/50">
                  <CardContent className="p-10 text-center text-muted-foreground">
                    <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No updates have been posted yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {announcementsQuery.loading
                    ? Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
                    : announcements.length === 0
                      ? (
                        <Card className="border-border/50">
                          <CardContent className="p-10 text-center text-muted-foreground">
                            <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No updates yet — check back later.</p>
                          </CardContent>
                        </Card>
                      )
                      : announcements.map((a: any) => (
                        <AnnouncementCard key={a.id} announcement={a} />
                      ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right column: sticky action panel ────────────────── */}
        <div className="space-y-4">
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* Action card */}
            <Card className="overflow-hidden border-border/50 bg-background/85 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className={cn("border-b border-border/50 px-5 py-4", cfg.bg)}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                        Event status
                      </p>
                      <p className="mt-1 text-lg font-bold">
                        {isHost ? "Host view" : isFull ? "Full" : isClosed ? "Closed" : event.interestedByMe ? "You're joined" : "Open now"}
                      </p>
                    </div>
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", cfg.solidBg)}>
                      {canChat ? <MessageSquare className="h-5 w-5 text-white" /> : <cfg.icon className="h-5 w-5 text-white" />}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                {/* Progress */}
                {spotsTotal !== null && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Capacity</span>
                      <span className={cn("font-semibold", pct === 100 ? "text-emerald-600" : cfg.accent)}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", cfg.bar)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {joined} of {spotsTotal} {cfg.spotsLabel.toLowerCase()}
                    </p>
                  </div>
                )}

                <Separator />

                {/* CTAs */}
                {isHost ? (
                  <div className="space-y-2">
                    <Button
                      className="w-full gap-2 rounded-xl"
                      onClick={() => navigate(`/launchpad/${id}/chat`)}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Open Chat Dashboard
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2 rounded-xl"
                      onClick={() => navigate(`/launchpad/${id}/manage`)}
                    >
                      <TrendingUp className="w-4 h-4" />
                      Manage Event
                    </Button>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      The chat dashboard includes messages, joined users, broadcast updates, and host metrics.
                    </p>
                  </div>
                ) : event.interestedByMe ? (
                  <div className="space-y-2">
                    <Button
                      className={cn("w-full gap-2 rounded-xl", cfg.bg, cfg.accent, "hover:opacity-90")}
                      onClick={() => navigate(`/launchpad/${id}/chat`)}
                      disabled={isClosed}
                    >
                      <MessageSquare className="w-4 h-4" />
                      {isClosed ? "Chat (closed)" : "Open Chat"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full gap-2 rounded-xl text-muted-foreground hover:text-destructive"
                      onClick={handleLeave}
                      disabled={leaving}
                    >
                      {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      Leave event
                    </Button>
                  </div>
                ) : user ? (
                  <Button
                    className="w-full gap-2 rounded-xl"
                    onClick={() => setJoinOpen(true)}
                    disabled={!canJoin && !isClosed && !isFull}
                  >
                    {isClosed
                      ? <><Lock className="w-4 h-4" /> Event closed</>
                      : isFull
                        ? <><Lock className="w-4 h-4" /> Event full</>
                        : <><cfg.icon className="w-4 h-4" /> Join Event</>}
                  </Button>
                ) : (
                  <Button
                    className="w-full gap-2 rounded-xl"
                    onClick={() => navigate("/login", { state: { from: `/launchpad/${id}` } })}
                  >
                    Sign in to join
                  </Button>
                )}

                {/* Inline link */}
                {event.link && (
                  <a
                    href={event.link}
                    target="_blank" rel="noopener noreferrer"
                    className={cn(
                      "flex items-center justify-center gap-1.5 w-full text-xs font-medium",
                      cfg.accent, "hover:underline"
                    )}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Visit project
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                </div>
              </CardContent>
            </Card>

            {/* Host card */}
            <Card className="border-border/50">
              <CardContent className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Hosted by
                </p>
                <Link
                  to={`/profile/${event.author.username}`}
                  className="flex items-center gap-3 group"
                >
                  <Avatar className="w-12 h-12 ring-2 ring-background">
                    {event.author.avatarUrl && <AvatarImage src={event.author.avatarUrl} />}
                    <AvatarFallback>{event.author.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate group-hover:underline">
                        {event.author.name}
                      </p>
                      {event.author.isVerified && (
                        <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">@{event.author.username}</p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <JoinEventModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onConfirm={handleJoin}
        event={event}
        eventType={event.eventType as LaunchpadEventType}
        loading={joining}
      />
    </div>
  );
}

// ─── Announcement card ──────────────────────────────────────────────────────

function AnnouncementCard({ announcement }: { announcement: any }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            {announcement.creator.avatarUrl && (
              <AvatarImage src={announcement.creator.avatarUrl} />
            )}
            <AvatarFallback>{announcement.creator.name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{announcement.creator.name}</p>
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                <Megaphone className="w-2.5 h-2.5 inline mr-0.5" />
                Announcement
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground" title={timeShort(announcement.createdAt)}>
              {timeAgo(announcement.createdAt)}
            </p>
            <p className="text-sm leading-relaxed mt-2 whitespace-pre-wrap break-words">
              {announcement.message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function EventDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/50 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <Skeleton className="h-8 w-24 mb-6" />
          <div className="flex items-start gap-5">
            <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <div className="mt-6 flex gap-5">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-32" />
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
