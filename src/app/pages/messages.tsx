import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { type Channel } from "stream-chat";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Search, Send, MoreHorizontal, Video, Phone, Info,
  Archive, VolumeX, Trash2, Flag, Smile, Paperclip,
  ChevronDown, Check, CheckCheck, Edit2, X as XIcon,
  Plus, Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { useChat, useChannelMessages, type ChannelPreview } from "../../contexts/ChatContext";
import { cn } from "../components/ui/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "👏", "🚀", "💯"];
const MESSAGE_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - msgDay.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function getAvatarFallback(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ─── New Conversation Modal ───────────────────────────────────────────────────

function NewConversationModal({
  onClose,
  onStart,
}: {
  onClose: () => void;
  onStart: (userId: string, name: string, image?: string) => void;
}) {
  const [query, setQuery] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border rounded-xl w-full max-w-md shadow-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base">New Message</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search people..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 rounded-full h-9"
          />
        </div>
        <p className="text-xs text-muted-foreground text-center py-6">
          Search for a user to start a conversation
        </p>
      </div>
    </div>
  );
}

// ─── Channel List Item ────────────────────────────────────────────────────────

function ChannelListItem({
  preview,
  isActive,
  onClick,
}: {
  preview: ChannelPreview;
  isActive: boolean;
  onClick: () => void;
  currentUserId: string;
}) {
  const other = preview.otherUser;
  const name = other?.name ?? (preview.channel.data as any)?.name ?? "Chat";
  const image = other?.image;
  const online = other?.online;
  const isUnread = preview.unreadCount > 0;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-l-4",
        isActive ? "bg-muted border-l-primary" : "border-l-transparent hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12 border-2 border-border">
          <AvatarImage src={image} />
          <AvatarFallback className="text-sm">{getAvatarFallback(name)}</AvatarFallback>
        </Avatar>
        {online && (
          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={cn("text-sm truncate", isUnread ? "font-bold" : "font-semibold")}>{name}</span>
          {preview.lastMessageAt && (
            <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-1">
              {timeAgo(preview.lastMessageAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className={cn("text-sm truncate flex-1", isUnread ? "font-medium text-foreground" : "text-muted-foreground")}>
            {preview.lastMessage ?? "No messages yet"}
          </p>
          {preview.unreadCount > 0 && (
            <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px] rounded-full flex-shrink-0">
              {preview.unreadCount > 99 ? "99+" : preview.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isMe,
  showAvatar,
  avatarUrl,
  authorName,
  channel,
  onEdit,
}: {
  msg: ReturnType<typeof useChannelMessages>["messages"][number];
  isMe: boolean;
  showAvatar: boolean;
  avatarUrl?: string;
  authorName: string;
  channel: Channel;
  myId: string;
  onEdit: (id: string, text: string) => void;
}) {
  const sendReaction = async (emoji: string) => {
    try {
      if (msg.reactions?.[emoji]?.reacted) {
        await channel.deleteReaction(msg.id, emoji);
      } else {
        await channel.sendReaction(msg.id, { type: emoji });
      }
    } catch (err) {
      console.error("reaction error:", err);
    }
  };

  const deleteMessage = async () => {
    try {
      await channel.getClient().deleteMessage(msg.id);
    } catch (err) {
      console.error("delete error:", err);
    }
  };

  const hasReactions = msg.reactionCounts && Object.values(msg.reactionCounts).some((c) => c > 0);

  return (
    <div className={cn("flex gap-2 group", isMe ? "justify-end" : "justify-start")}>
      {!isMe && (
        <div className="w-8 flex-shrink-0 flex items-end">
          {showAvatar ? (
            <Avatar className="w-8 h-8">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback className="text-[10px]">{getAvatarFallback(authorName)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-8" />
          )}
        </div>
      )}

      <div className={cn("flex flex-col max-w-[70%]", isMe && "items-end")}>
        {!isMe && showAvatar && (
          <span className="text-[11px] font-medium text-muted-foreground mb-1 ml-1">{authorName}</span>
        )}

        <div className="relative">
          {/* Hover reaction / action bar */}
          <div
            className={cn(
              "absolute -top-8 z-10 hidden group-hover:flex items-center gap-1 bg-card border shadow-lg rounded-full px-2 py-1",
              isMe ? "right-0" : "left-0"
            )}
          >
            {MESSAGE_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className={cn(
                  "text-sm hover:scale-125 transition-transform",
                  msg.reactions?.[emoji]?.reacted && "ring-1 ring-primary rounded-full"
                )}
              >
                {emoji}
              </button>
            ))}
            {isMe && (
              <>
                <div className="w-px h-4 bg-border mx-0.5" />
                <button onClick={() => onEdit(msg.id, msg.text)} className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={deleteMessage} className="text-muted-foreground hover:text-destructive transition-colors p-0.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Bubble */}
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5",
              isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm"
            )}
          >
            {/* Image/file attachments */}
            {(msg.attachments ?? []).map((att, i) => {
              const imgSrc = att.image_url ?? att.thumb_url;
              if (imgSrc) return (
                <img key={i} src={imgSrc} alt={att.title ?? "img"} className="rounded-lg max-w-full max-h-64 object-cover mb-2 cursor-pointer" onClick={() => window.open(imgSrc, "_blank")} />
              );
              if (att.file_url) return (
                <a key={i} href={att.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm underline mb-2">
                  <Paperclip className="w-3.5 h-3.5" />{att.title ?? "File"}
                </a>
              );
              return null;
            })}

            {msg.text && (
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                {msg.text}
                {msg.isEdited && (
                  <span className={cn("text-[11px] ml-1 opacity-60")}>(edited)</span>
                )}
              </p>
            )}
          </div>

          {/* Reaction pills */}
          {hasReactions && (
            <div className={cn("flex flex-wrap gap-1 mt-1", isMe && "justify-end")}>
              {Object.entries(msg.reactionCounts ?? {}).map(([emoji, count]) =>
                count > 0 ? (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className={cn(
                      "flex items-center gap-0.5 text-xs bg-muted border rounded-full px-1.5 py-0.5 hover:bg-muted/80 transition-colors",
                      msg.reactions?.[emoji]?.reacted && "border-primary bg-primary/10"
                    )}
                  >
                    <span>{emoji}</span><span className="font-medium">{count}</span>
                  </button>
                ) : null
              )}
            </div>
          )}
        </div>

        <div className={cn("flex items-center gap-1 mt-0.5 px-1", isMe && "justify-end")}>
          <span className="text-[11px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
          {isMe && <CheckCheck className="w-3 h-3 text-primary" />}
        </div>
      </div>
    </div>
  );
}

// ─── Chat Window ──────────────────────────────────────────────────────────────

function ChatWindow({
  channel,
  otherUser,
  currentUserId,
}: {
  channel: Channel;
  otherUser?: ChannelPreview["otherUser"];
  currentUserId: string;
}) {
  const { messages, typingUsers, loading, hasMore, loadMore } = useChannelMessages(channel, currentUserId);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const name = otherUser?.name ?? (channel.data as any)?.name ?? "Chat";
  const image = otherUser?.image;
  const online = otherUser?.online;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    channel.markRead().catch(() => {});
  }, [channel.id]);

  const handleTyping = (val: string) => {
    setText(val);
    if (!isTyping) { setIsTyping(true); channel.keystroke().catch(() => {}); }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
      channel.stopTyping().catch(() => {});
    }, 2000);
  };

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    setIsTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    channel.stopTyping().catch(() => {});
    try { await channel.sendMessage({ text: trimmed }); }
    catch (err) { console.error("sendMessage error:", err); setText(trimmed); }
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    try { await channel.getClient().updateMessage({ id: editingId, text: editText.trim() }); }
    catch (err) { console.error("edit error:", err); }
    setEditingId(null); setEditText("");
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const isImage = file.type.startsWith("image/");
      const { file: uploaded } = isImage ? await channel.sendImage(file) : await channel.sendFile(file);
      await channel.sendMessage({
        text: "",
        attachments: isImage
          ? [{ type: "image", image_url: uploaded, title: file.name }]
          : [{ type: "file", file_url: uploaded, title: file.name }],
      });
    } catch (err) { console.error("upload error:", err); }
    e.target.value = "";
  };

  // Group messages by date
  const grouped: { date: string; msgs: typeof messages }[] = [];
  for (const msg of messages) {
    const label = formatDate(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last?.date === label) { last.msgs.push(msg); }
    else { grouped.push({ date: label, msgs: [msg] }); }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-card flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10 border-2 border-border">
              <AvatarImage src={image} />
              <AvatarFallback>{getAvatarFallback(name)}</AvatarFallback>
            </Avatar>
            {online && <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />}
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">{name}</h3>
            <p className="text-xs text-muted-foreground">
              {online ? <span className="text-green-500 font-medium">● Active now</span>
                : otherUser?.last_active ? `Last seen ${timeAgo(new Date(otherUser.last_active))}` : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-primary" title="Voice call"><Phone className="w-5 h-5" strokeWidth={2} /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-primary" title="Video call"><Video className="w-5 h-5" strokeWidth={2} /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full"><MoreHorizontal className="w-5 h-5" strokeWidth={2} /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem><Info className="w-4 h-4 mr-2" />View Profile</DropdownMenuItem>
              <DropdownMenuItem><Search className="w-4 h-4 mr-2" />Search in Conversation</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem><VolumeX className="w-4 h-4 mr-2" />Mute Notifications</DropdownMenuItem>
              <DropdownMenuItem><Archive className="w-4 h-4 mr-2" />Archive Chat</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => channel.delete().catch(() => {})}>
                <Trash2 className="w-4 h-4 mr-2" />Delete Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-muted/20 space-y-1">
        {hasMore && (
          <div className="flex justify-center mb-4">
            <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={loadMore} disabled={loading}>
              {loading ? "Loading…" : "Load older messages"}<ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </div>
        )}

        {loading && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Avatar className="w-20 h-20 border-4 border-border">
              <AvatarImage src={image} />
              <AvatarFallback className="text-2xl">{getAvatarFallback(name)}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-bold text-lg">{name}</p>
              <p className="text-sm text-muted-foreground">Say hello! 👋</p>
            </div>
          </div>
        )}

        {grouped.map(({ date, msgs }) => (
          <div key={date} className="space-y-1">
            <div className="flex items-center justify-center my-3">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{date}</span>
            </div>
            {msgs.map((msg, i) => {
              const isMe = msg.userId === currentUserId;
              const prev = i > 0 ? msgs[i - 1] : null;
              return (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMe={isMe}
                  showAvatar={!prev || prev.userId !== msg.userId}
                  avatarUrl={isMe ? undefined : image}
                  authorName={msg.userName}
                  channel={channel}
                  myId={currentUserId}
                  onEdit={(id, t) => { setEditingId(id); setEditText(t); }}
                />
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 pl-10">
            <div className="bg-card border rounded-2xl px-4 py-2 flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Edit banner */}
      {editingId && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-t text-sm flex-shrink-0">
          <Edit2 className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="flex-1 truncate text-muted-foreground">Editing message</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(null); setEditText(""); }}>
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t bg-card flex-shrink-0">
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.txt" onChange={handleFileUpload} />
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-muted-foreground hover:text-primary flex-shrink-0" onClick={() => fileInputRef.current?.click()} title="Attach file">
            <Paperclip className="w-5 h-5" strokeWidth={2} />
          </Button>
          <div className="flex-1 flex items-center bg-muted rounded-3xl px-4 py-2 gap-2">
            <input
              value={editingId ? editText : text}
              onChange={(e) => editingId ? setEditText(e.target.value) : handleTyping(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground min-w-0"
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); editingId ? saveEdit() : sendMessage(); }
                if (e.key === "Escape" && editingId) { setEditingId(null); setEditText(""); }
              }}
            />
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                  <Smile className="w-5 h-5" strokeWidth={2} />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="end" side="top">
                <div className="flex gap-1">
                  {QUICK_EMOJIS.map((e) => (
                    <button key={e} onClick={() => editingId ? setEditText((t) => t + e) : setText((t) => t + e)} className="text-xl hover:scale-125 transition-transform p-1">{e}</button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Button
            size="icon"
            className="h-10 w-10 rounded-full flex-shrink-0"
            disabled={editingId ? !editText.trim() : !text.trim()}
            onClick={editingId ? saveEdit : sendMessage}
          >
            {editingId ? <Check className="w-5 h-5" strokeWidth={2.5} /> : <Send className="w-5 h-5" strokeWidth={2} />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Messages Page ────────────────────────────────────────────────────────────

export function Messages() {
  const { channels, connected, loadChannels, startDM, markChannelRead, currentUserId } = useChat();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activePreview, setActivePreview] = useState<ChannelPreview | null>(null);
  const [showNewConvo, setShowNewConvo] = useState(false);

  const filteredChannels = channels.filter((p) => {
    const name = p.otherUser?.name ?? (p.channel.data as any)?.name ?? "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSelectChannel = async (preview: ChannelPreview) => {
    setActiveChannel(preview.channel);
    setActivePreview(preview);
    if (preview.channel.id) await markChannelRead(preview.channel.id);
  };

  const handleStartDM = async (userId: string, name: string, image?: string) => {
    const ch = await startDM(userId, name, image);
    if (ch) {
      const preview = channels.find((p) => p.channel.id === ch.id);
      setActiveChannel(ch);
      setActivePreview(preview ?? null);
    }
    setShowNewConvo(false);
  };

  if (!currentUserId) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <p className="text-muted-foreground text-sm">Sign in to view messages</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] border-t">
      {showNewConvo && (
        <NewConversationModal onClose={() => setShowNewConvo(false)} onStart={handleStartDM} />
      )}

      {/* Sidebar */}
      <div className="w-80 border-r bg-card flex flex-col flex-shrink-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">Messages</h1>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setShowNewConvo(true)} title="New message">
                <Plus className="w-5 h-5" strokeWidth={2} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                    <MoreHorizontal className="w-5 h-5" strokeWidth={2} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem><Archive className="w-4 h-4 mr-2" />Archived Messages</DropdownMenuItem>
                  <DropdownMenuItem><Flag className="w-4 h-4 mr-2" />Message Requests</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={loadChannels}>Refresh</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {!connected && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-md px-3 py-1.5 mb-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              Connecting to chat…
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search conversations…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 rounded-full h-9" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-12 px-4 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start a new message to connect</p>
              </div>
              <Button size="sm" className="rounded-full" onClick={() => setShowNewConvo(true)}>
                <Plus className="w-4 h-4 mr-1" /> New Message
              </Button>
            </div>
          ) : (
            filteredChannels.map((preview) => (
              <ChannelListItem
                key={preview.channel.id}
                preview={preview}
                isActive={activeChannel?.id === preview.channel.id}
                onClick={() => handleSelectChannel(preview)}
                currentUserId={currentUserId}
              />
            ))
          )}
        </div>
      </div>

      {/* Main area */}
      {activeChannel ? (
        <ChatWindow channel={activeChannel} otherUser={activePreview?.otherUser} currentUserId={currentUserId} />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-muted/20">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Send className="w-12 h-12 text-primary" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your Messages</h2>
            <p className="text-muted-foreground mb-4">Select a conversation or start a new one</p>
            <Button className="rounded-full" onClick={() => setShowNewConvo(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Message
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
