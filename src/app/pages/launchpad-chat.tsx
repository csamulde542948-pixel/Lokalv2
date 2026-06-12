// ─── Launchpad Event Chat ──────────────────────────────────────────────────────
// Real-time-style chat thread for a launchpad event. Visible to the event
// host and to any user who has joined the event via markInterested.
//
// Polls for new messages every 4s so the UI feels live without needing
// GraphQL subscriptions. Falls back to a graceful "you're not joined"
// state for users who haven't signed up for the event yet.

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { Textarea } from "../components/ui/textarea";
import {
  ArrowLeft, Send, Trash2, MessageSquare, Users, Rocket, Sparkles,
  AlertTriangle, RefreshCw, Lock, CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { AsciiFireAnimation } from "../components/ascii-fire";
import { useLayoutBottomOffset } from "../features/launchpad";

// ─── GQL ──────────────────────────────────────────────────────────────────────

const GET_EVENT = gql`
  query GetLaunchpadEventForChat($id: ID!) {
    launchpadEvent(id: $id) {
      id projectName iconUrl eventType title description isOpen
      interestedCount interestedByMe
      author { id name username avatarUrl }
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

const POLL_INTERVAL_MS = 4000;
const MAX_BODY = 2000;

// ─── Types ────────────────────────────────────────────────────────────────────

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
  eventType: string;
  title: string;
  description: string;
  isOpen: boolean;
  interestedCount: number;
  interestedByMe: boolean;
  author: ChatAuthor;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return formatDistanceToNow(d, { addSuffix: true });
  return format(d, "MMM d, HH:mm");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LaunchpadChat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bottomOffset = useLayoutBottomOffset();
  const [draft, setDraft] = useState("");
  const [isPollingPaused, setIsPollingPaused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const eventQuery = useQuery<{ launchpadEvent: EventSummary }>(GET_EVENT, {
    variables: { id },
    skip: !id,
  });

  const messagesQuery = useQuery<{ launchpadEventMessages: ChatMessage[] }>(
    GET_MESSAGES,
    {
      variables: { eventId: id, limit: 200, offset: 0 },
      skip: !id,
      pollInterval: isPollingPaused ? 0 : POLL_INTERVAL_MS,
    }
  );

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
    refetchQueries: [{ query: GET_MESSAGES, variables: { eventId: id, limit: 200, offset: 0 } }],
  });

  const [deleteMessage] = useMutation(DELETE_MESSAGE, {
    refetchQueries: [{ query: GET_MESSAGES, variables: { eventId: id, limit: 200, offset: 0 } }],
  });

  const event = eventQuery.data?.launchpadEvent ?? null;
  const messages = messagesQuery.data?.launchpadEventMessages ?? [];
  const isHost = !!(user && event && event.author.id === user.id);
  const canAccess = !!user && !!(event && (event.interestedByMe || isHost));

  // Auto-scroll to the latest message on new ones
  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // Pause polling briefly after the user sends — the refetch covers it,
  // and we don't want a parallel poll overwriting optimistic state.
  useEffect(() => {
    if (!sending) return;
    setIsPollingPaused(true);
    const t = setTimeout(() => setIsPollingPaused(false), POLL_INTERVAL_MS + 500);
    return () => clearTimeout(t);
  }, [sending]);

  const grouped = useMemo(() => groupByDay(messages), [messages]);

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

  // ── Loading state ─────────────────────────────────────────────────────────
  if (eventQuery.loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <ChatHeaderSkeleton />
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3 px-4">
          <AlertTriangle className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="font-mono text-sm text-muted-foreground">Event not found.</p>
          <Button size="sm" onClick={() => navigate(`/launchpad/${id}`)}>View event</Button>
        </div>
      </div>
    );
  }

  // ── Access gate: must be signed in and either host or joined ──────────────
  if (!user || !canAccess) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="max-w-md w-full border border-border/50 bg-card/40 p-6 space-y-4 text-center">
          <Lock className="w-10 h-10 text-muted-foreground/50 mx-auto" />
          <div>
            <h2 className="font-mono font-bold text-lg">Join to access the chat</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {user
                ? "You need to join this launchpad event to see and post in the chat."
                : "Sign in and join the event to access the chat."}
            </p>
          </div>
          {event && !user && (
            <Button onClick={() => navigate("/login", { state: { from: `/launchpad/${id}/chat` } })}>
              Sign in
            </Button>
          )}
          {event && user && (
            <Button onClick={() => navigate(`/launchpad/${id}`)}>
              View event details
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      <div
        className="fixed inset-x-0 top-0 pointer-events-none z-0"
        style={{ bottom: `${bottomOffset}px` }}
      >
        <AsciiFireAnimation className="absolute inset-0" />
        <div className="absolute inset-0 bg-background/82" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border) / 0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.35) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>
      <ChatHeader
        event={event}
        isHost={isHost}
        eventId={id!}
        onBack={() => navigate(`/launchpad/${id}`)}
      />

      {/* Thread */}
      <div className="relative z-10 flex-1 min-h-0 px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto w-full">
        {messagesQuery.loading && messages.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-md" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
            <p className="font-mono text-sm text-muted-foreground/60 uppercase tracking-widest">
              No messages yet
            </p>
            <p className="text-xs text-muted-foreground/40">Be the first to break the silence.</p>
          </div>
        ) : (
          <div className="space-y-5 border border-border/60 bg-background/55 backdrop-blur-sm rounded-lg p-3 sm:p-4">
            {grouped.map((group) => (
              <div key={group.day} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border/40" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">
                    {group.day}
                  </span>
                  <div className="flex-1 h-px bg-border/40" />
                </div>
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

      {/* Composer */}
      {event.isOpen ? (
        <div className="relative z-20 sticky bottom-0 border-t border-border/60 bg-background/95 backdrop-blur-md">
          <form
            onSubmit={handleSend}
            className="px-4 sm:px-6 lg:px-8 py-3 max-w-3xl mx-auto w-full flex items-end gap-2"
          >
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as unknown as React.FormEvent);
                }
              }}
              placeholder={`Message ${event.projectName || event.title}…`}
              className="min-h-[44px] max-h-32 resize-none font-mono text-sm rounded-md bg-background/80"
              rows={1}
              maxLength={MAX_BODY}
              disabled={sending}
            />
            <Button
              type="submit"
              size="sm"
              className="h-11 px-4 gap-1.5 rounded-md font-mono"
              disabled={sending || !draft.trim()}
            >
              {sending
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </div>
      ) : (
        <div className="relative z-20 sticky bottom-0 border-t border-border/60 bg-background/95 backdrop-blur-md">
          <div className="px-4 sm:px-6 lg:px-8 py-3 max-w-3xl mx-auto w-full flex items-center gap-2 text-sm text-muted-foreground/70">
            <Lock className="w-4 h-4" />
            This event is closed. New messages are disabled.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function ChatHeader({ event, isHost, onBack, eventId }: { event: EventSummary; isHost: boolean; onBack: () => void; eventId: string }) {
  return (
    <div className="sticky top-16 z-30 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="px-4 sm:px-6 lg:px-8 py-3 max-w-3xl mx-auto w-full flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground rounded-md font-mono">
          <ArrowLeft className="w-3.5 h-3.5" />
          launchpad
        </Button>
        <span className="text-muted-foreground/30">/</span>
        <Link
          to={`/launchpad/${eventId}`}
          className="text-[11px] font-medium text-muted-foreground hover:text-foreground truncate flex-1 min-w-0 transition-colors"
        >
          {event.title}
        </Link>
        <span className="text-muted-foreground/30">/</span>
        <span className="text-[11px] font-mono font-semibold flex-shrink-0">[chat]</span>
        {isHost && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider text-[9px] flex-shrink-0">
            <Sparkles className="w-2.5 h-2.5" /> host
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
          <Users className="w-3 h-3" />
          {event.interestedCount}
        </span>
      </div>
    </div>
  );
}

function ChatHeaderSkeleton() {
  return (
    <div className="sticky top-16 z-30 border-b border-border/60 bg-background/95 backdrop-blur-md">
      <div className="px-4 sm:px-6 lg:px-8 py-3 max-w-3xl mx-auto w-full flex items-center gap-3">
        <Skeleton className="h-7 w-20 rounded-sm" />
        <span className="text-muted-foreground/30 font-mono">/</span>
        <Skeleton className="h-4 flex-1 rounded-sm" />
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

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
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50 border border-border/40 rounded-sm px-2 py-1">
          {message.body}
        </span>
      </div>
    );
  }

  if (message.isDeleted) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground/40 italic">
        <span className="font-mono">[ message deleted ]</span>
        <span className="text-[10px]">{timeLabel(message.createdAt)}</span>
      </div>
    );
  }

  const canDelete = isMine || isHost;
  const authorIsHost = message.author.id === hostId;

  return (
    <div className={`flex items-start gap-2 group ${isMine ? "flex-row-reverse" : ""}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        {message.author.avatarUrl && <AvatarImage src={message.author.avatarUrl} />}
        <AvatarFallback className="text-[10px]">
          {message.author.name?.[0]?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>

      <div className={`min-w-0 max-w-[80%] ${isMine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
        <div className={`flex items-center gap-1.5 text-[10px] font-mono ${isMine ? "flex-row-reverse" : ""}`}>
          <Link
            to={`/profile/${message.author.username}`}
            className="font-semibold text-foreground/80 hover:text-foreground hover:underline"
          >
            {message.author.username}
          </Link>
          {authorIsHost && (
            <span className="inline-flex items-center px-1 rounded-sm bg-orange-500/15 text-orange-400 font-bold uppercase tracking-wider text-[8px] border border-orange-500/20">
              host
            </span>
          )}
          <span className="text-muted-foreground/50">{timeLabel(message.createdAt)}</span>
          {canDelete && (
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-destructive flex items-center gap-0.5"
              aria-label="Delete message"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        <div
          className={`px-3 py-2 rounded-md text-sm whitespace-pre-wrap break-words ${
            isMine
              ? "bg-orange-500/15 border border-orange-500/30 text-foreground"
              : "bg-card/70 border border-border/50 text-foreground/90"
          }`}
        >
          {message.body}
        </div>
      </div>
    </div>
  );
}

// ─── Group by day ────────────────────────────────────────────────────────────

function groupByDay(messages: ChatMessage[]): { day: string; messages: ChatMessage[] }[] {
  const groups = new Map<string, ChatMessage[]>();
  for (const m of messages) {
    const day = format(new Date(m.createdAt), "EEEE, MMM d");
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(m);
  }
  return Array.from(groups.entries()).map(([day, msgs]) => ({ day, messages: msgs }));
}
