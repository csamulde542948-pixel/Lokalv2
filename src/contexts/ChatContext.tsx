import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { StreamChat, type Channel, type Event } from "stream-chat";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "./AuthContext";

// ─── GQL ───────────────────────────────────────────────────────────────────

const GET_STREAM_TOKEN = gql`
  query GetStreamToken {
    streamToken {
      token
      apiKey
    }
  }
`;

const START_DM = gql`
  mutation StartDM($otherUserId: ID!) {
    startDM(otherUserId: $otherUserId)
  }
`;

interface StreamTokenData {
  streamToken: { token: string; apiKey: string };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatUser {
  id: string;
  name: string;
  image?: string;
  username?: string;
  online?: boolean;
  last_active?: string;
}

export interface ChannelPreview {
  channel: Channel;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount: number;
  otherUser?: ChatUser;
}

interface ChatContextValue {
  client: StreamChat | null;
  connected: boolean;
  channels: ChannelPreview[];
  totalUnread: number;
  /** S3 #7: Lazy connect — call this to initialise Stream Chat on-demand */
  connectChat: () => Promise<void>;
  loadChannels: () => Promise<void>;
  startDM: (otherUserId: string, otherUserName: string, otherUserImage?: string) => Promise<Channel | null>;
  markChannelRead: (channelId: string) => Promise<void>;
  currentUserId: string | null;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const clientRef = useRef<StreamChat | null>(null);
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  const tokenDataRef = useRef<StreamTokenData | undefined>(undefined);
  const connectedUserIdRef = useRef<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [channels, setChannels] = useState<ChannelPreview[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);

  const { data: tokenData, error: tokenError } = useQuery<StreamTokenData>(GET_STREAM_TOKEN, {
    skip: !user?.id,
    fetchPolicy: "network-only",
  });

  // Keep ref in sync with latest tokenData
  useEffect(() => {
    tokenDataRef.current = tokenData;
  }, [tokenData]);

  const [startDMMutation] = useMutation<{ startDM: string }>(START_DM);

  // ── Build ChannelPreview from a Channel object ────────────────────────────
  const buildPreview = useCallback(
    (channel: Channel): ChannelPreview => {
      const messages = channel.state.messages;
      const last = messages[messages.length - 1];
      const unread = channel.countUnread();

      // Find the other participant in a 1-on-1 DM
      const members = Object.values(channel.state.members ?? {});
      const other = members.find((m) => m.user?.id !== user?.id);
      const otherUser: ChatUser | undefined = other?.user
        ? {
            id: other.user.id,
            name: (other.user.name as string) ?? other.user.id,
            image: other.user.image as string | undefined,
            username: other.user.username as string | undefined,
            online: other.user.online,
            last_active: other.user.last_active as string | undefined,
          }
        : undefined;

      return {
        channel,
        lastMessage: last?.text ?? (last?.attachments?.length ? "📎 Attachment" : undefined),
        lastMessageAt: last?.created_at ? new Date(last.created_at as unknown as string) : undefined,
        unreadCount: unread,
        otherUser,
      };
    },
    [user?.id]
  );

  // ── Load all DM channels for the current user ─────────────────────────────
  const loadChannels = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !user) return;

    try {
      const filter = { type: "messaging", members: { $in: [user.id] } };
      const sort = [{ last_message_at: -1 as const }];
      const fetchedChannels = await client.queryChannels(filter, sort, {
        watch: true,
        state: true,
        presence: true,
        limit: 30,
      });

      const previews = fetchedChannels.map(buildPreview);
      setChannels(previews);
      setTotalUnread(previews.reduce((sum, p) => sum + p.unreadCount, 0));
    } catch (err) {
      console.error("[Chat] loadChannels error:", err);
    }
  }, [user, buildPreview]);

  // ── Connect to Stream Chat ────────────────────────────────────────────────
  const connectChat = useCallback(async () => {
    if (!user) return;
    const tokenInfo = tokenDataRef.current?.streamToken;
    if (!tokenInfo) {
      console.log("[Chat] connectChat: no token yet");
      return;
    }

    // Already connected as this user — nothing to do
    if (connectedUserIdRef.current === user.id && clientRef.current?.userID === user.id) {
      if (!connected) setConnected(true);
      return;
    }

    // Reuse the in-flight promise if one exists
    if (connectPromiseRef.current) {
      return connectPromiseRef.current;
    }

    const doConnect = async () => {
      try {
        // Always tear down any existing client first to avoid "No Listener" on the singleton
        if (clientRef.current) {
          try { await clientRef.current.disconnectUser(); } catch (_) {}
          clientRef.current = null;
          connectedUserIdRef.current = null;
        }

        // Prefer the API key returned by the backend (it's a public Stream key, safe to
        // transmit to authenticated clients). Fall back to the optional env var for
        // local-dev overrides.
        const streamApiKey =
          tokenInfo.apiKey ||
          import.meta.env.VITE_GETSTREAM_API_KEY;
        if (!streamApiKey) {
          console.error("[Chat] Stream Chat API key not available — set GETSTREAM_API_KEY on the backend or VITE_GETSTREAM_API_KEY in the frontend env");
          return;
        }
        const client = new StreamChat(streamApiKey, undefined, { enableWSFallback: true });
        clientRef.current = client;

        const displayName =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email?.split("@")[0] ??
          "User";

        console.log("[Chat] calling connectUser for", user.id);
        const res = await client.connectUser(
          {
            id: user.id,
            name: displayName,
            image: user.user_metadata?.avatar_url ?? undefined,
          },
          tokenInfo.token
        );
        console.log("[Chat] connected as:", res?.me?.id);
        connectedUserIdRef.current = user.id;
        setConnected(true);
        await loadChannels();
      } catch (err: any) {
        console.error("[Chat] connectUser failed:", err?.message, err?.code, err?.status);
        clientRef.current = null;
        connectedUserIdRef.current = null;
      } finally {
        connectPromiseRef.current = null;
      }
    };

    connectPromiseRef.current = doConnect();
    return connectPromiseRef.current;
  // deliberately exclude `connected` — we check refs directly
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadChannels]);

  // ── Auto-connect as soon as token is available ──────────────────────────────
  useEffect(() => {
    if (tokenError) {
      console.error("[Chat] streamToken query error:", tokenError.message);
      return;
    }
    if (!tokenData?.streamToken || !user?.id) return;
    connectChat();
  }, [tokenData?.streamToken?.token, connectChat, user?.id, tokenError]);

  // ── Disconnect when user logs out ─────────────────────────────────────────
  useEffect(() => {
    if (!user && clientRef.current?.userID) {
      clientRef.current.disconnectUser().then(() => {
        clientRef.current = null;
        setConnected(false);
        setChannels([]);
        setTotalUnread(0);
      });
    }
  }, [user]);

  // ── S4 #10: Smart real-time channel list updates (no full re-fetch) ────────
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !connected) return;

    // Helper: update a single channel preview in local state
    const updateChannel = (channelOrCid: Channel | string) => {
      const cid = typeof channelOrCid === "string" ? channelOrCid : channelOrCid.cid;
      setChannels((prev) => {
        const idx = prev.findIndex((p) => p.channel.cid === cid);
        if (idx === -1) return prev; // unknown channel — do a full reload
        const updated = [...prev];
        updated[idx] = buildPreview(prev[idx].channel);
        // Re-sort by latest message time
        updated.sort((a, b) => {
          const ta = a.lastMessageAt?.getTime() ?? 0;
          const tb = b.lastMessageAt?.getTime() ?? 0;
          return tb - ta;
        });
        setTotalUnread(updated.reduce((sum, p) => sum + p.unreadCount, 0));
        return updated;
      });
    };

    const onMessageNew = (event: Event) => {
      if (event.cid) {
        updateChannel(event.cid);
        void loadChannels();
      }
    };

    const onMessageRead = (event: Event) => {
      if (event.cid) {
        updateChannel(event.cid);
        // Recalculate total unread from all channels
        setChannels((prev) => {
          const total = prev.reduce((sum, p) => sum + p.channel.countUnread(), 0);
          setTotalUnread(total);
          return prev;
        });
      }
    };

    const onChannelUpdated = (event: Event) => {
      if (event.cid) updateChannel(event.cid);
    };

    // Only do a full reload for truly new channels (added to)
    const onAddedToChannel = () => loadChannels();

    client.on("message.new", onMessageNew);
    client.on("message.read", onMessageRead);
    client.on("channel.updated", onChannelUpdated);
    client.on("notification.message_new", onMessageNew);
    client.on("notification.added_to_channel", onAddedToChannel);

    return () => {
      client.off("message.new", onMessageNew);
      client.off("message.read", onMessageRead);
      client.off("channel.updated", onChannelUpdated);
      client.off("notification.message_new", onMessageNew);
      client.off("notification.added_to_channel", onAddedToChannel);
    };
  }, [connected, loadChannels, buildPreview]);

  // ── Start or resume a DM channel ─────────────────────────────────────────
  const startDM = useCallback(
    async (otherUserId: string, otherUserName: string, otherUserImage?: string): Promise<Channel | null> => {
      if (!user) return null;

      // Wait up to 8s for the token to arrive
      if (!tokenDataRef.current?.streamToken) {
        console.log("[Chat] startDM: waiting for token...");
        await new Promise<void>((resolve) => {
          const start = Date.now();
          const check = () => {
            if (tokenDataRef.current?.streamToken || Date.now() - start > 8000) resolve();
            else setTimeout(check, 150);
          };
          check();
        });
      }

      // Trigger connect (or reuse in-flight promise)
      const p = connectPromiseRef.current ?? connectChat();
      if (p) await p;

      // Wait up to 8s for clientRef.current?.userID to be set
      if (!clientRef.current?.userID) {
        await new Promise<void>((resolve) => {
          const start = Date.now();
          const check = () => {
            if (clientRef.current?.userID || Date.now() - start > 8000) resolve();
            else setTimeout(check, 150);
          };
          check();
        });
      }

      const client = clientRef.current;
      if (!client?.userID) {
        console.error("[Chat] startDM: still not connected after await. Token:", !!tokenDataRef.current?.streamToken);
        return null;
      }

      try {
        // Create the channel server-side first (upserts both users in Stream Chat)
        const { data } = await startDMMutation({ variables: { otherUserId } });
        if (!data?.startDM) throw new Error("startDM mutation returned no cid");

        // cid is "messaging:dm-xxx" — extract just the channel ID after the colon
        const channelId = data.startDM.includes(":") ? data.startDM.split(":")[1] : data.startDM;
        const channel = client.channel("messaging", channelId);
        await channel.watch({ presence: true });
        await loadChannels();
        return channel;
      } catch (err) {
        console.error("[Chat] startDM error:", err);
        return null;
      }
    },
    [user, connectChat, startDMMutation, loadChannels]
  );

  // ── Mark a channel as read ────────────────────────────────────────────────
  const markChannelRead = useCallback(async (channelId: string) => {
    const preview = channels.find((c) => c.channel.id === channelId);
    if (!preview) return;
    try {
      await preview.channel.markRead();
      setChannels((prev) =>
        prev.map((p) =>
          p.channel.id === channelId ? { ...p, unreadCount: 0 } : p
        )
      );
      setTotalUnread((prev) => Math.max(0, prev - (preview.unreadCount ?? 0)));
    } catch (err) {
      console.error("[Chat] markRead error:", err);
    }
  }, [channels]);

  return (
    <ChatContext.Provider
      value={{
        client: clientRef.current,
        connected,
        channels,
        totalUnread,
        connectChat,
        loadChannels,
        startDM,
        markChannelRead,
        currentUserId: user?.id ?? null,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a <ChatProvider>");
  return ctx;
}

// ─── useChannelMessages hook ──────────────────────────────────────────────────
// Use inside an open chat to get real-time messages, typing, reactions, etc.

export interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userImage?: string;
  createdAt: Date;
  updatedAt?: Date;
  isEdited?: boolean;
  attachments?: { type: string; image_url?: string; file_url?: string; title?: string; thumb_url?: string }[];
  reactions?: Record<string, { count: number; reacted: boolean }>;
  reactionCounts?: Record<string, number>;
  isDeleted?: boolean;
  parentId?: string;
}

function streamMsgToChat(msg: any, myId: string): ChatMessage {
  const reactions: Record<string, { count: number; reacted: boolean }> = {};
  const ownReactions: string[] = (msg.own_reactions ?? []).map((r: any) => r.type);
  for (const [type, count] of Object.entries(msg.reaction_counts ?? {})) {
    reactions[type] = { count: count as number, reacted: ownReactions.includes(type) };
  }

  return {
    id: msg.id,
    text: msg.text ?? "",
    userId: msg.user?.id ?? "",
    userName: (msg.user?.name as string) ?? msg.user?.id ?? "Unknown",
    userImage: msg.user?.image as string | undefined,
    createdAt: new Date(msg.created_at),
    updatedAt: msg.updated_at ? new Date(msg.updated_at) : undefined,
    isEdited: msg.message_text_updated_at != null,
    attachments: msg.attachments ?? [],
    reactions,
    reactionCounts: msg.reaction_counts ?? {},
    isDeleted: msg.deleted_at != null || msg.type === "deleted",
    parentId: msg.parent_id,
  };
}

export function useChannelMessages(channel: Channel | null, myId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Initial load
  useEffect(() => {
    if (!channel) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const msgs = channel.state.messages
      .filter((m) => m.type !== "deleted" || (m.reaction_counts && Object.keys(m.reaction_counts).length > 0))
      .map((m) => streamMsgToChat(m, myId));
    setMessages(msgs);
    setHasMore(channel.state.messages.length >= 25);
    setLoading(false);

    // Real-time message events
    const onNew = (event: Event) => {
      if (!event.message) return;
      setMessages((prev) => {
        const exists = prev.find((m) => m.id === event.message!.id);
        if (exists) return prev;
        return [...prev, streamMsgToChat(event.message, myId)];
      });
    };
    const onUpdate = (event: Event) => {
      if (!event.message) return;
      setMessages((prev) =>
        prev.map((m) => m.id === event.message!.id ? streamMsgToChat(event.message, myId) : m)
      );
    };
    const onDelete = (event: Event) => {
      if (!event.message) return;
      setMessages((prev) => prev.filter((m) => m.id !== event.message!.id));
    };
    const onReaction = (event: Event) => {
      if (!event.message) return;
      setMessages((prev) =>
        prev.map((m) => m.id === event.message!.id ? streamMsgToChat(event.message, myId) : m)
      );
    };
    const onTypingStart = (event: Event) => {
      const name = (event.user?.name as string) ?? event.user?.id ?? "";
      if (event.user?.id === myId || !name) return;
      setTypingUsers((prev) => prev.includes(name) ? prev : [...prev, name]);
    };
    const onTypingStop = (event: Event) => {
      const name = (event.user?.name as string) ?? event.user?.id ?? "";
      setTypingUsers((prev) => prev.filter((n) => n !== name));
    };

    channel.on("message.new", onNew);
    channel.on("message.updated", onUpdate);
    channel.on("message.deleted", onDelete);
    channel.on("reaction.new", onReaction);
    channel.on("reaction.deleted", onReaction);
    channel.on("typing.start", onTypingStart);
    channel.on("typing.stop", onTypingStop);

    return () => {
      channel.off("message.new", onNew);
      channel.off("message.updated", onUpdate);
      channel.off("message.deleted", onDelete);
      channel.off("reaction.new", onReaction);
      channel.off("reaction.deleted", onReaction);
      channel.off("typing.start", onTypingStart);
      channel.off("typing.stop", onTypingStop);
    };
  }, [channel?.id, myId]);

  const loadMore = useCallback(async () => {
    if (!channel || !hasMore) return;
    setLoading(true);
    try {
      const oldest = channel.state.messages[0];
      await channel.query({
        messages: { limit: 25, id_lt: oldest?.id },
      });
      const msgs = channel.state.messages.map((m) => streamMsgToChat(m, myId));
      setMessages(msgs);
      setHasMore(channel.state.messages.length % 25 === 0);
    } catch (err) {
      console.error("[Chat] loadMore error:", err);
    } finally {
      setLoading(false);
    }
  }, [channel, hasMore, myId]);

  return { messages, typingUsers, loading, hasMore, loadMore };
}
