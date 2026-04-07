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
import { useQuery } from "@apollo/client/react";
import { useAuth } from "./AuthContext";

// ─── GQL ─────────────────────────────────────────────────────────────────────

const GET_STREAM_TOKEN = gql`
  query GetStreamToken {
    streamToken {
      token
      apiKey
    }
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
  const [connected, setConnected] = useState(false);
  const [channels, setChannels] = useState<ChannelPreview[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);

  const { data: tokenData } = useQuery<StreamTokenData>(GET_STREAM_TOKEN, {
    skip: !user,
    fetchPolicy: "network-only",
  });

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
  useEffect(() => {
    if (!user || !tokenData?.streamToken) return;

    const { token, apiKey } = tokenData.streamToken;

    const connect = async () => {
      try {
        // Reuse existing client or create new one
        if (!clientRef.current) {
          clientRef.current = StreamChat.getInstance(apiKey);
        }
        const client = clientRef.current;

        // Already connected as this user
        if (client.userID === user.id) {
          setConnected(true);
          await loadChannels();
          return;
        }

        const displayName =
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email?.split("@")[0] ??
          "User";

        await client.connectUser(
          {
            id: user.id,
            name: displayName,
            image: user.user_metadata?.avatar_url ?? undefined,
          },
          token
        );

        setConnected(true);
        await loadChannels();
      } catch (err) {
        console.error("[Chat] connect error:", err);
      }
    };

    connect();

    return () => {
      // Don't disconnect on every re-render — only when user changes
    };
  }, [user?.id, tokenData]);

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

  // ── Real-time channel list updates ───────────────────────────────────────
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !connected) return;

    const refresh = () => loadChannels();

    client.on("message.new", refresh);
    client.on("channel.updated", refresh);
    client.on("notification.message_new", refresh);
    client.on("notification.added_to_channel", refresh);
    client.on("message.read", refresh);

    return () => {
      client.off("message.new", refresh);
      client.off("channel.updated", refresh);
      client.off("notification.message_new", refresh);
      client.off("notification.added_to_channel", refresh);
      client.off("message.read", refresh);
    };
  }, [connected, loadChannels]);

  // ── Start or resume a DM channel ─────────────────────────────────────────
  const startDM = useCallback(
    async (otherUserId: string, otherUserName: string, otherUserImage?: string): Promise<Channel | null> => {
      const client = clientRef.current;
      if (!client || !user) return null;

      try {
        // Upsert the other user in Stream so they can be added as a member
        await client.upsertUser({
          id: otherUserId,
          name: otherUserName,
          ...(otherUserImage ? { image: otherUserImage } : {}),
        });

        const channel = client.channel("messaging", {
          members: [user.id, otherUserId],
        });
        await channel.watch({ presence: true });
        await loadChannels();
        return channel;
      } catch (err) {
        console.error("[Chat] startDM error:", err);
        return null;
      }
    },
    [user, loadChannels]
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
