// Launchpad Event Chat
// Group chat workspace for an event, with host dashboard controls.

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { gql } from "@apollo/client/core";
import { useApolloClient, useQuery, useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Lock,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { Textarea } from "../components/ui/textarea";
import { cn } from "../components/ui/utils";
import {
  deadlineLabel,
  deadlineToneClasses,
  eventTypeConfig,
  type LaunchpadEventType,
} from "../features/launchpad";

const GET_EVENT = gql`
  query GetLaunchpadEventForChat($id: ID!) {
    launchpadEvent(id: $id) {
      id projectName iconUrl screenshotUrl projectTagline eventType title description
      deadline link spotsTotal interestedCount interestedByMe isOpen createdAt
      author { id name username avatarUrl isVerified rank { name color } }
      tags { name }
    }
  }
`;

const GET_MESSAGES = gql`
  query GetLaunchpadEventMessages($eventId: ID!, $limit: Int, $offset: Int) {
    launchpadEventMessages(eventId: $eventId, limit: $limit, offset: $offset) {
      id body isSystem isDeleted createdAt updatedAt
      author { id name username avatarUrl }
    }
  }
`;

const GET_PARTICIPANTS = gql`
  query GetLaunchpadChatParticipants($eventId: ID!) {
    launchpadEventParticipants(eventId: $eventId) {
      id commitmentEmail commitmentNote joinedAt
      profile { id name username avatarUrl isVerified rank { name color } }
    }
  }
`;

const GET_STATS = gql`
  query GetLaunchpadChatStats($eventId: ID!) {
    launchpadEventStats(eventId: $eventId) {
      totalJoined spotsTotal fillRate
      joinsByDay { date count }
    }
  }
`;

const GET_ANNOUNCEMENTS = gql`
  query GetLaunchpadChatAnnouncements($eventId: ID!) {
    launchpadAnnouncements(eventId: $eventId) {
      id message createdAt
      creator { id name username avatarUrl }
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation SendLaunchpadMessage($eventId: ID!, $body: String!) {
    sendLaunchpadMessage(eventId: $eventId, body: $body) {
      id body isSystem isDeleted createdAt updatedAt
      author { id name username avatarUrl }
    }
  }
`;

const DELETE_MESSAGE = gql`
  mutation DeleteLaunchpadMessage($id: ID!) {
    deleteLaunchpadMessage(id: $id)
  }
`;

const CREATE_ANNOUNCEMENT = gql`
  mutation CreateLaunchpadChatAnnouncement($eventId: ID!, $message: String!) {
    createLaunchpadAnnouncement(eventId: $eventId, message: $message) {
      id message createdAt
      creator { id name username avatarUrl }
    }
  }
`;

const MAX_BODY = 2000;

interface ChatAuthor {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

interface ChatMessage {
  id: string;
  body: string;
  isSystem: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  author: ChatAuthor;
}

interface EventSummary {
  id: string;
  projectName: string;
  iconUrl: string | null;
  screenshotUrl: string | null;
  projectTagline: string | null;
  eventType: LaunchpadEventType;
  title: string;
  description: string;
  deadline: string | null;
  link: string | null;
  spotsTotal: number | null;
  interestedCount: number;
  interestedByMe: boolean;
  isOpen: boolean;
  createdAt: string;
  tags: { name: string }[];
  author: ChatAuthor & { isVerified?: boolean; rank?: { name: string; color: string } | null };
}

interface Participant {
  id: string;
  commitmentEmail: string | null;
  commitmentNote: string | null;
  joinedAt: string;
  profile: ChatAuthor & { isVerified?: boolean; rank?: { name: string; color: string } | null };
}

interface EventStats {
  totalJoined: number;
  spotsTotal: number | null;
  fillRate: number;
  joinsByDay: { date: string; count: number }[];
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return formatDistanceToNow(d, { addSuffix: true });
  return format(d, "MMM d, h:mm a");
}

function initials(name?: string | null, username?: string | null) {
  return (name?.[0] ?? username?.[0] ?? "?").toUpperCase();
}

function exportParticipants(participants: Participant[]) {
  const rows = [
    ["Name", "Username", "Email", "Note", "Joined"],
    ...participants.map((p) => [
      p.profile.name,
      p.profile.username,
      p.commitmentEmail ?? "",
      p.commitmentNote ?? "",
      new Date(p.joinedAt).toISOString(),
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = "launchpad-participants.csv";
  a.click();
}

export function LaunchpadChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const apollo = useApolloClient();
  const { user } = useAuth();
  const [draft, setDraft] = useState("");
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const eventQuery = useQuery<{ launchpadEvent: EventSummary }>(GET_EVENT, {
    variables: { id },
    skip: !id,
  });

  const event = eventQuery.data?.launchpadEvent ?? null;
  const isHost = !!(user && event && event.author.id === user.id);
  const canAccess = !!user && !!event && (isHost || event.interestedByMe);
  const messageVariables = useMemo(() => ({ eventId: id, limit: 200, offset: 0 }), [id]);
  const eventVariables = useMemo(() => ({ eventId: id }), [id]);

  const messagesQuery = useQuery<{ launchpadEventMessages: ChatMessage[] }>(GET_MESSAGES, {
    variables: messageVariables,
    skip: !id || !canAccess,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
  });

  const participantsQuery = useQuery<{ launchpadEventParticipants: Participant[] }>(GET_PARTICIPANTS, {
    variables: eventVariables,
    skip: !id || !isHost,
    fetchPolicy: "cache-and-network",
  });

  const statsQuery = useQuery<{ launchpadEventStats: EventStats }>(GET_STATS, {
    variables: eventVariables,
    skip: !id || !isHost,
    fetchPolicy: "cache-and-network",
  });

  const announcementsQuery = useQuery<{ launchpadAnnouncements: any[] }>(GET_ANNOUNCEMENTS, {
    variables: eventVariables,
    skip: !id || !canAccess,
    fetchPolicy: "cache-and-network",
  });

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
    update(cache, { data }) {
      const sent = data?.sendLaunchpadMessage;
      if (!sent || !id) return;
      const existing = cache.readQuery<{ launchpadEventMessages: ChatMessage[] }>({
        query: GET_MESSAGES,
        variables: { eventId: id, limit: 200, offset: 0 },
      });
      if (!existing) return;
      if (existing.launchpadEventMessages.some((m) => m.id === sent.id)) return;
      cache.writeQuery({
        query: GET_MESSAGES,
        variables: { eventId: id, limit: 200, offset: 0 },
        data: { launchpadEventMessages: [...existing.launchpadEventMessages, sent] },
      });
    },
  });

  const [deleteMessage] = useMutation(DELETE_MESSAGE, {
    update(cache, _result, { variables }) {
      if (!id || !variables?.id) return;
      const existing = cache.readQuery<{ launchpadEventMessages: ChatMessage[] }>({
        query: GET_MESSAGES,
        variables: { eventId: id, limit: 200, offset: 0 },
      });
      if (!existing) return;
      cache.writeQuery({
        query: GET_MESSAGES,
        variables: { eventId: id, limit: 200, offset: 0 },
        data: {
          launchpadEventMessages: existing.launchpadEventMessages.map((m) =>
            m.id === variables.id ? { ...m, isDeleted: true, body: "" } : m
          ),
        },
      });
    },
  });

  const [createAnnouncement, { loading: announcing }] = useMutation(CREATE_ANNOUNCEMENT, {
    update(cache, { data }) {
      const announcement = data?.createLaunchpadAnnouncement;
      if (!announcement || !id) return;
      const existing = cache.readQuery<{ launchpadAnnouncements: any[] }>({
        query: GET_ANNOUNCEMENTS,
        variables: { eventId: id },
      });
      if (!existing) return;
      if (existing.launchpadAnnouncements.some((a) => a.id === announcement.id)) return;
      cache.writeQuery({
        query: GET_ANNOUNCEMENTS,
        variables: { eventId: id },
        data: { launchpadAnnouncements: [announcement, ...existing.launchpadAnnouncements] },
      });
    },
  });

  const messages = messagesQuery.data?.launchpadEventMessages ?? [];
  const participants = participantsQuery.data?.launchpadEventParticipants ?? [];
  const announcements = announcementsQuery.data?.launchpadAnnouncements ?? [];
  const stats = statsQuery.data?.launchpadEventStats;
  const grouped = useMemo(() => groupByDay(messages), [messages]);
  const latestMessage = messages.filter((m) => !m.isDeleted && !m.isSystem).at(-1);
  const filteredParticipants = useMemo(() => {
    const q = participantSearch.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((p) =>
      p.profile.name.toLowerCase().includes(q) ||
      p.profile.username.toLowerCase().includes(q) ||
      (p.commitmentEmail ?? "").toLowerCase().includes(q)
    );
  }, [participants, participantSearch]);

  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (!id || !canAccess) return;
    const refreshWhenActive = () => {
      if (document.visibilityState !== "visible") return;
      void messagesQuery.refetch();
      void announcementsQuery.refetch();
      if (isHost) {
        void participantsQuery.refetch();
        void statsQuery.refetch();
      }
    };
    window.addEventListener("focus", refreshWhenActive);
    document.addEventListener("visibilitychange", refreshWhenActive);
    return () => {
      window.removeEventListener("focus", refreshWhenActive);
      document.removeEventListener("visibilitychange", refreshWhenActive);
    };
  }, [id, canAccess, isHost, messagesQuery, announcementsQuery, participantsQuery, statsQuery]);

  function handleRefresh() {
    void apollo.refetchQueries({
      include: [GET_MESSAGES, GET_ANNOUNCEMENTS, ...(isHost ? [GET_PARTICIPANTS, GET_STATS] : [])],
    });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !id || sending) return;
    if (body.length > MAX_BODY) {
      toast.error(`Message too long (max ${MAX_BODY} characters)`);
      return;
    }
    try {
      await sendMessage({ variables: { eventId: id, body } });
      setDraft("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send message");
    }
  }

  async function handleDelete(messageId: string) {
    try {
      await deleteMessage({ variables: { id: messageId } });
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete message");
    }
  }

  async function handleAnnouncement() {
    const message = announcementDraft.trim();
    if (!message || !id || announcing) return;
    try {
      await createAnnouncement({ variables: { eventId: id, message } });
      setAnnouncementDraft("");
      toast.success("Announcement sent");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send announcement");
    }
  }

  if (eventQuery.loading) return <ChatLoading />;

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-3 max-w-sm">
          <MessageSquare className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h1 className="font-semibold">Event not found</h1>
          <p className="text-sm text-muted-foreground">This launch event may have been deleted.</p>
          <Button onClick={() => navigate("/launchpad")} className="rounded-md">
            Back to Launchpad
          </Button>
        </div>
      </div>
    );
  }

  if (!user || !canAccess) {
    return <ChatAccessGate event={event} eventId={id!} signedIn={!!user} />;
  }

  const cfg = eventTypeConfig[event.eventType] ?? eventTypeConfig.FEEDBACK;
  const dl = deadlineLabel(event.deadline);

  return (
    <div className="flex h-[calc(100dvh-4rem-3.5rem)] min-h-0 overflow-hidden border-t bg-background lg:h-[calc(100dvh-4rem-3rem)]">
      <aside className="hidden w-80 min-h-0 flex-col border-r bg-card lg:flex lg:flex-shrink-0">
        <EventInbox event={event} cfg={cfg} latestMessage={latestMessage} onRefresh={handleRefresh} refreshing={messagesQuery.loading} />
        <div className="border-t p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground">Participants</p>
            <Badge variant="secondary" className="rounded-full">{stats?.totalJoined ?? event.interestedCount}</Badge>
          </div>
          {isHost ? (
            <ParticipantRail participants={participants.slice(0, 8)} loading={participantsQuery.loading} />
          ) : (
            <HostMiniCard event={event} />
          )}
        </div>
      </aside>

      <section className="min-h-0 flex-1 flex flex-col">
        <ChatThreadHeader
          event={event}
          cfg={cfg}
          isHost={isHost}
          messagesCount={messages.length}
          participantsCount={stats?.totalJoined ?? event.interestedCount}
          onBack={() => navigate(`/launchpad/${id}`)}
          onManage={isHost ? () => navigate(`/launchpad/${id}/manage`) : undefined}
        />

        <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 bg-muted/20">
          {messagesQuery.loading && messages.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 7 }).map((_, i) => <MessageSkeleton key={i} mine={i % 3 === 0} />)}
            </div>
          ) : messages.length === 0 ? (
            <EmptyThread event={event} />
          ) : (
            <div className="space-y-5">
              {grouped.map((group) => (
                <div key={group.day} className="space-y-2">
                  <DayDivider day={group.day} />
                  {group.messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      isMine={m.author.id === user.id}
                      isHost={isHost}
                      hostId={event.author.id}
                      onDelete={() => handleDelete(m.id)}
                    />
                  ))}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <Composer
          event={event}
          draft={draft}
          setDraft={setDraft}
          sending={sending}
          onSubmit={handleSend}
        />
      </section>

      <aside className="hidden w-96 min-h-0 border-l bg-card xl:block">
        {isHost ? (
          <HostDashboard
            event={event}
            stats={stats}
            statsLoading={statsQuery.loading}
            participants={filteredParticipants}
            allParticipants={participants}
            participantSearch={participantSearch}
            setParticipantSearch={setParticipantSearch}
            announcements={announcements}
            announcementDraft={announcementDraft}
            setAnnouncementDraft={setAnnouncementDraft}
            announcing={announcing}
            onSendAnnouncement={handleAnnouncement}
            onExport={() => exportParticipants(participants)}
          />
        ) : (
          <ParticipantDashboard event={event} cfg={cfg} deadlineText={dl?.text} />
        )}
      </aside>
    </div>
  );
}

function ChatLoading() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-[1500px] grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_340px] gap-4">
        <Skeleton className="hidden lg:block h-[720px] rounded-lg" />
        <Skeleton className="h-[720px] rounded-lg" />
        <Skeleton className="hidden lg:block h-[720px] rounded-lg" />
      </div>
    </div>
  );
}

function ChatAccessGate({ event, eventId, signedIn }: { event: EventSummary; eventId: string; signedIn: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="max-w-md w-full border border-border/60 bg-card p-6 space-y-4 text-center rounded-lg">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Lock className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Join to open the group chat</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {signedIn
              ? "The chat is private to the host and users who joined this launch event."
              : "Sign in, join the event, then you can message the host and participants."}
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/launchpad/${eventId}`)} className="rounded-md">
            View event
          </Button>
          {!signedIn && (
            <Button onClick={() => navigate("/login", { state: { from: `/launchpad/${eventId}/chat` } })} className="rounded-md">
              Sign in
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{event.projectName || event.title}</p>
      </div>
    </div>
  );
}

function EventInbox({
  event,
  cfg,
  latestMessage,
  onRefresh,
  refreshing,
}: {
  event: EventSummary;
  cfg: any;
  latestMessage?: ChatMessage;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold">Launchpad</h1>
          <p className="text-xs text-muted-foreground">Event chat</p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onRefresh} title="Refresh chat">
          <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
        </Button>
      </div>
      <div className="rounded-none border-l-4 border-l-primary bg-muted/55 p-3">
        <div className="flex items-start gap-3">
          <Avatar className="w-12 h-12 border-2 border-border">
            {event.iconUrl && <AvatarImage src={event.iconUrl} />}
            <AvatarFallback className={cn(cfg.bg, cfg.accent)}>
              <cfg.icon className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold truncate">{event.projectName || event.title}</p>
              <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {latestMessage ? `${latestMessage.author.username}: ${latestMessage.body}` : "No messages yet"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HostMiniCard({ event }: { event: EventSummary }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-md bg-muted/40">
      <Avatar className="w-9 h-9">
        {event.author.avatarUrl && <AvatarImage src={event.author.avatarUrl} />}
        <AvatarFallback>{initials(event.author.name, event.author.username)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{event.author.name}</p>
        <p className="text-xs text-muted-foreground truncate">Host @{event.author.username}</p>
      </div>
    </div>
  );
}

function ParticipantRail({ participants, loading }: { participants: Participant[]; loading: boolean }) {
  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}</div>;
  }
  if (participants.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No one has joined yet.</p>;
  }
  return (
    <div className="space-y-1">
      {participants.map((p) => (
        <Link key={p.id} to={`/profile/${p.profile.username}`} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/60">
          <Avatar className="w-8 h-8">
            {p.profile.avatarUrl && <AvatarImage src={p.profile.avatarUrl} />}
            <AvatarFallback className="text-xs">{initials(p.profile.name, p.profile.username)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{p.profile.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">@{p.profile.username}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ChatThreadHeader({
  event,
  cfg,
  isHost,
  messagesCount,
  participantsCount,
  onBack,
  onManage,
}: {
  event: EventSummary;
  cfg: any;
  isHost: boolean;
  messagesCount: number;
  participantsCount: number;
  onBack: () => void;
  onManage?: () => void;
}) {
  return (
    <div className="px-3 sm:px-4 py-3 border-b bg-card flex items-center justify-between flex-shrink-0">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full shrink-0"
          onClick={onBack}
          title="Back to event"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-border">
            {event.iconUrl && <AvatarImage src={event.iconUrl} />}
            <AvatarFallback className={cn(cfg.bg, cfg.accent)}>
              <cfg.icon className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold truncate">Group chat</h2>
              {isHost && <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {participantsCount} joined, {messagesCount} messages
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Badge variant="outline" className="rounded-sm gap-1">
            <Users className="w-3 h-3" />
            {participantsCount}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Badge variant={event.isOpen ? "default" : "secondary"} className="hidden rounded-full sm:inline-flex">
          {event.isOpen ? "Open" : "Closed"}
        </Badge>
        {onManage && (
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onManage} title="Manage event">
            <Settings className="w-5 h-5" />
          </Button>
        )}
        {isHost && <ShieldCheck className="hidden w-4 h-4 text-emerald-500 sm:block" />}
      </div>
    </div>
  );
}

function EmptyThread({ event }: { event: EventSummary }) {
  return (
    <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-background border border-border flex items-center justify-center">
        <MessageSquare className="w-6 h-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-semibold">Start the conversation</h3>
        <p className="text-sm text-muted-foreground max-w-sm mt-1">
          Welcome everyone to {event.projectName || event.title}. Messages here are shared with the host and joined users.
        </p>
      </div>
    </div>
  );
}

function Composer({
  event,
  draft,
  setDraft,
  sending,
  onSubmit,
}: {
  event: EventSummary;
  draft: string;
  setDraft: (value: string) => void;
  sending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!event.isOpen) {
    return (
      <div className="border-t border-border/60 bg-background px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="w-4 h-4" />
        This event is closed. New messages are disabled.
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="border-t border-border/60 bg-background px-3 sm:px-4 py-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e as unknown as React.FormEvent);
            }
          }}
          placeholder={`Message ${event.projectName || event.title}`}
          className="min-h-[44px] max-h-32 resize-none rounded-lg bg-muted/45 text-sm"
          rows={1}
          maxLength={MAX_BODY}
          disabled={sending}
        />
        <Button type="submit" size="icon" className="h-11 w-11 rounded-full shrink-0" disabled={sending || !draft.trim()}>
          {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>Enter to send, Shift+Enter for a new line</span>
        <span>{draft.length}/{MAX_BODY}</span>
      </div>
    </form>
  );
}

function HostDashboard({
  event,
  stats,
  statsLoading,
  participants,
  allParticipants,
  participantSearch,
  setParticipantSearch,
  announcements,
  announcementDraft,
  setAnnouncementDraft,
  announcing,
  onSendAnnouncement,
  onExport,
}: {
  event: EventSummary;
  stats?: EventStats;
  statsLoading: boolean;
  participants: Participant[];
  allParticipants: Participant[];
  participantSearch: string;
  setParticipantSearch: (value: string) => void;
  announcements: any[];
  announcementDraft: string;
  setAnnouncementDraft: (value: string) => void;
  announcing: boolean;
  onSendAnnouncement: () => void;
  onExport: () => void;
}) {
  const joined = stats?.totalJoined ?? event.interestedCount;
  const spots = stats?.spotsTotal ?? event.spotsTotal;
  const fill = spots ? Math.min(100, Math.round((joined / spots) * 100)) : Math.round(stats?.fillRate ?? 0);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border/60">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">Host tools</p>
            <h2 className="font-semibold mt-1">Participants and updates</h2>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          <DashStat label="Joined" value={statsLoading ? "-" : joined} icon={Users} />
          <DashStat label="Fill rate" value={spots ? `${fill}%` : "Open"} icon={BarChart3} />
          <DashStat label="Updates" value={announcements.length} icon={Megaphone} />
          <DashStat label="Status" value={event.isOpen ? "Open" : "Closed"} icon={CheckCircle2} />
        </div>

        {spots && (
          <div className="rounded-lg border border-border/60 p-3 bg-muted/20">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">Capacity</span>
              <span className="font-medium">{joined} / {spots}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${fill}%` }} />
            </div>
          </div>
        )}

        <section className="rounded-lg border border-border/60 p-3 bg-background">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Broadcast update</h3>
          </div>
          <Textarea
            value={announcementDraft}
            onChange={(e) => setAnnouncementDraft(e.target.value)}
            placeholder="Send an announcement to everyone who joined"
            className="min-h-24 resize-none rounded-md text-sm"
            maxLength={1000}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-muted-foreground">{announcementDraft.length}/1000</span>
            <Button size="sm" onClick={onSendAnnouncement} disabled={!announcementDraft.trim() || announcing} className="rounded-md gap-1.5">
              {announcing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-background overflow-hidden">
          <div className="p-3 border-b border-border/60">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold">Joined users</h3>
              <Button variant="outline" size="sm" onClick={onExport} disabled={allParticipants.length === 0} className="h-8 rounded-md gap-1.5">
                <Download className="w-3.5 h-3.5" />
                CSV
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                placeholder="Search users"
                className="h-9 pl-8 rounded-md text-sm"
              />
            </div>
          </div>
          <div className="max-h-[320px] overflow-y-auto divide-y divide-border/50">
            {participants.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No matching participants.</p>
            ) : (
              participants.map((p) => <ParticipantRow key={p.id} participant={p} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function DashStat({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: React.ElementType }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ParticipantRow({ participant }: { participant: Participant }) {
  return (
    <div className="p-3">
      <div className="flex items-start gap-3">
        <Avatar className="w-9 h-9">
          {participant.profile.avatarUrl && <AvatarImage src={participant.profile.avatarUrl} />}
          <AvatarFallback>{initials(participant.profile.name, participant.profile.username)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link to={`/profile/${participant.profile.username}`} className="text-sm font-medium truncate hover:underline">
              {participant.profile.name}
            </Link>
            <span className="text-[10px] text-muted-foreground shrink-0">{timeLabel(participant.joinedAt)}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">@{participant.profile.username}</p>
          {participant.commitmentEmail && (
            <a href={`mailto:${participant.commitmentEmail}`} className="text-xs text-primary hover:underline truncate block mt-1">
              {participant.commitmentEmail}
            </a>
          )}
          {participant.commitmentNote && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{participant.commitmentNote}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ParticipantDashboard({
  event,
  cfg,
  deadlineText,
}: {
  event: EventSummary;
  cfg: any;
  deadlineText?: string;
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/25">
        <div className="aspect-[16/9] bg-muted relative">
          {event.screenshotUrl ? (
            <img src={event.screenshotUrl} alt={`${event.projectName} screenshot`} className="absolute inset-0 w-full h-full object-cover object-top" />
          ) : (
            <div className={cn("absolute inset-0 bg-gradient-to-br", cfg.gradient)} />
          )}
        </div>
        <div className="p-4">
          <Badge className={cn("rounded-sm border mb-3", cfg.bg, cfg.border, cfg.accent)}>{cfg.label}</Badge>
          <h2 className="font-semibold leading-tight">{event.projectName || event.title}</h2>
          <p className="text-sm text-muted-foreground mt-2 line-clamp-4">{event.description}</p>
        </div>
      </div>
      <div className="rounded-lg border border-border/60 bg-background divide-y divide-border/60">
        <InfoLine icon={Users} label="Joined" value={String(event.interestedCount)} />
        <InfoLine icon={Calendar} label="Deadline" value={deadlineText ?? "No deadline"} className={deadlineToneClasses(deadlineLabel(event.deadline)?.tone)} />
        <InfoLine icon={Clock} label="Created" value={format(new Date(event.createdAt), "MMM d, yyyy")} />
      </div>
      {event.link && (
        <a href={event.link} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full rounded-md gap-1.5">
            <ExternalLink className="w-4 h-4" />
            Visit project
          </Button>
        </a>
      )}
      <HostMiniCard event={event} />
    </div>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="p-3 flex items-center justify-between gap-3 text-sm">
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      <span className={cn("font-medium text-right", className)}>{value}</span>
    </div>
  );
}

function MessageBubble({
  message,
  isMine,
  isHost,
  hostId,
  onDelete,
}: {
  message: ChatMessage;
  isMine: boolean;
  isHost: boolean;
  hostId: string;
  onDelete: () => void;
}) {
  if (message.isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-[11px] text-muted-foreground border border-border/60 rounded-full bg-background px-3 py-1">
          {message.body}
        </span>
      </div>
    );
  }

  if (message.isDeleted) {
    return (
      <div className="flex justify-center">
        <span className="text-[11px] text-muted-foreground/60 italic">message deleted</span>
      </div>
    );
  }

  const canDelete = isMine || isHost;
  const authorIsHost = message.author.id === hostId;

  return (
    <div className={cn("flex items-end gap-2 group", isMine && "flex-row-reverse")}>
      {!isMine && (
        <Avatar className="w-8 h-8 shrink-0">
          {message.author.avatarUrl && <AvatarImage src={message.author.avatarUrl} />}
          <AvatarFallback className="text-xs">{initials(message.author.name, message.author.username)}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn("min-w-0 max-w-[82%] sm:max-w-[70%] flex flex-col gap-1", isMine ? "items-end" : "items-start")}>
        {!isMine && (
          <div className="flex items-center gap-1.5 px-1">
            <Link to={`/profile/${message.author.username}`} className="text-xs font-medium hover:underline">
              {message.author.name || message.author.username}
            </Link>
            {authorIsHost && (
              <span className="text-[9px] uppercase tracking-wider rounded-sm bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5">
                host
              </span>
            )}
          </div>
        )}
        <div className={cn("flex items-center gap-2", isMine && "flex-row-reverse")}>
          <div
            className={cn(
              "px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm",
              isMine
                ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
                : "rounded-2xl rounded-bl-md bg-background border border-border/70"
            )}
          >
            {message.body}
          </div>
          {canDelete && (
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              aria-label="Delete message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground px-1">{timeLabel(message.createdAt)}</span>
      </div>
    </div>
  );
}

function DayDivider({ day }: { day: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px bg-border/60 flex-1" />
      <span className="text-[11px] text-muted-foreground bg-background border border-border/60 rounded-full px-3 py-1">
        {day}
      </span>
      <div className="h-px bg-border/60 flex-1" />
    </div>
  );
}

function MessageSkeleton({ mine }: { mine: boolean }) {
  return (
    <div className={cn("flex gap-2", mine && "justify-end")}>
      {!mine && <Skeleton className="w-8 h-8 rounded-full" />}
      <div className={cn("space-y-1", mine && "items-end flex flex-col")}>
        <Skeleton className="h-3 w-24 rounded-sm" />
        <Skeleton className={cn("h-11 rounded-2xl", mine ? "w-52" : "w-64")} />
      </div>
    </div>
  );
}

function groupByDay(messages: ChatMessage[]): { day: string; messages: ChatMessage[] }[] {
  const groups = new Map<string, ChatMessage[]>();
  for (const m of messages) {
    const day = format(new Date(m.createdAt), "EEEE, MMM d");
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(m);
  }
  return Array.from(groups.entries()).map(([day, msgs]) => ({ day, messages: msgs }));
}
