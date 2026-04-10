import { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Search, Send, MoreHorizontal, X, ExternalLink, Archive, Flag, Loader2, MessageSquarePlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useNavigate } from "react-router";
import { useChat, useChannelMessages, type ChannelPreview } from "../../contexts/ChatContext";
import { avatarSrc } from "../../lib/defaults";
import type { Channel } from "stream-chat";

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatTs(date?: Date): string {
  if (!date) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  return `${Math.floor(diffHrs / 24)}d`;
}

// ─── Inline mini chat window ─────────────────────────────────────────────────

interface MiniChatProps {
  preview: ChannelPreview;
  currentUserId: string;
  onBack: () => void;
  onOpenFull: () => void;
}

function MiniChat({ preview, currentUserId, onBack, onOpenFull }: MiniChatProps) {
  const { markChannelRead } = useChat();
  const { messages, typingUsers, loading } = useChannelMessages(preview.channel, currentUserId);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { otherUser } = preview;

  // Auto-scroll + mark read on open
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (preview.channel) {
      markChannelRead(preview.channel.id!);
    }
  }, [preview.channel?.id]);

  const send = useCallback(async () => {
    if (!text.trim() || sending) return;
    const msg = text.trim();
    setText("");
    setSending(true);
    try {
      await preview.channel.sendMessage({ text: msg });
    } catch (err) {
      console.error("[MiniChat] send error:", err);
    } finally {
      setSending(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      preview.channel.stopTyping();
    }
  }, [text, sending, preview.channel]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    preview.channel.keystroke();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => preview.channel.stopTyping(), 2000);
  };

  return (
    <>
      {/* Chat Header */}
      <div className="p-3 border-b flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full flex-shrink-0" onClick={onBack}>
          <X className="w-3.5 h-3.5" strokeWidth={2} />
        </Button>
        <div className="relative flex-shrink-0">
          <Avatar className="w-8 h-8 border-2 border-border">
            <AvatarImage src={avatarSrc(otherUser?.image)} />
            <AvatarFallback>{(otherUser?.name ?? "?")[0]}</AvatarFallback>
          </Avatar>
          {otherUser?.online && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate leading-tight">{otherUser?.name ?? "Unknown"}</p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            {otherUser?.online ? "Active now" : "Offline"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full flex-shrink-0 text-muted-foreground hover:text-foreground"
          title="Open full messages"
          onClick={onOpenFull}
        >
          <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
        </Button>
      </div>

      {/* Messages area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {loading && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.userId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-2xl px-3 py-1.5 max-w-[80%] text-sm ${
                  isMine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-3 py-2 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Aa"
            className="flex-1 border rounded-full h-9 px-4 text-sm"
          />
          <Button
            size="icon"
            className="h-9 w-9 rounded-full flex-shrink-0"
            disabled={!text.trim() || sending}
            onClick={send}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" strokeWidth={2} />
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

// ─── Main popover ─────────────────────────────────────────────────────────────

interface MessagesPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MessagesPopover({ isOpen, onClose }: MessagesPopoverProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPreview, setSelectedPreview] = useState<ChannelPreview | null>(null);
  const navigate = useNavigate();
  const { channels, connected, currentUserId, connectChat } = useChat();

  // S3 #7: Lazy connect — initialise Stream Chat when popover opens
  useEffect(() => {
    if (isOpen) connectChat();
  }, [isOpen, connectChat]);

  // Reset selected chat when popover closes
  useEffect(() => {
    if (!isOpen) setSelectedPreview(null);
  }, [isOpen]);

  const filtered = channels.filter((p) => {
    if (!searchQuery.trim()) return true;
    const name = p.otherUser?.name?.toLowerCase() ?? "";
    return name.includes(searchQuery.toLowerCase());
  });

  if (!isOpen) return null;

  const openFull = () => {
    navigate("/messages");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed bottom-0 right-20 z-50 w-80 h-[32rem] bg-card border rounded-t-lg shadow-2xl flex flex-col overflow-hidden">
        {selectedPreview && currentUserId ? (
          <MiniChat
            preview={selectedPreview}
            currentUserId={currentUserId}
            onBack={() => setSelectedPreview(null)}
            onOpenFull={openFull}
          />
        ) : (
          <>
            {/* Header */}
            <div className="p-3 border-b flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-base">Messages</h2>
                  {!connected && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                      connecting…
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                    title="Open full messages"
                    onClick={openFull}
                  >
                    <MessageSquarePlus className="w-4 h-4" strokeWidth={2} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={openFull}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Full View
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Archive className="w-4 h-4 mr-2" />
                        Archived Messages
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Flag className="w-4 h-4 mr-2" />
                        Message Requests
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
                <Input
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border rounded-full h-8 text-sm"
                />
              </div>
            </div>

            {/* Channel list */}
            <div className="flex-1 overflow-y-auto">
              {!connected && channels.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <p className="text-xs">Connecting…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground px-6 text-center">
                  <p className="text-xs">No conversations yet. Start one from someone's profile.</p>
                </div>
              ) : (
                filtered.map((preview) => {
                  const { otherUser, lastMessage, lastMessageAt, unreadCount } = preview;
                  const hasUnread = unreadCount > 0;
                  return (
                    <div
                      key={preview.channel.id}
                      className="p-3 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => setSelectedPreview(preview)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-11 h-11 border-2 border-border">
                            <AvatarImage src={avatarSrc(otherUser?.image)} />
                            <AvatarFallback>{(otherUser?.name ?? "?")[0]}</AvatarFallback>
                          </Avatar>
                          {otherUser?.online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h3 className={`text-sm truncate ${hasUnread ? "font-semibold" : "font-medium"}`}>
                              {otherUser?.name ?? "Unknown"}
                            </h3>
                            <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-1">
                              {formatTs(lastMessageAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <p className={`text-xs truncate flex-1 ${hasUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                              {lastMessage ?? "No messages yet"}
                            </p>
                            {hasUnread && (
                              <Badge
                                variant="destructive"
                                className="h-4 min-w-4 px-1 flex items-center justify-center text-[10px] rounded-full flex-shrink-0"
                              >
                                {unreadCount > 9 ? "9+" : unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}