import { useState, useRef, useEffect } from "react";
import { gql } from "@apollo/client/core";
import { useMutation } from "@apollo/client/react";
import { Globe, ChevronDown, Smile, X as XIcon, ImageIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from "./ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "../../contexts/AuthContext";

/* ─── GQL ────────────────────────────────────────────────────────────────── */
const SHARE_POST = gql`
  mutation SharePost($postId: ID!, $message: String) {
    sharePost(postId: $postId, message: $message) {
      id sharesCount
    }
  }
`;

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface ShareablePost {
  id: string;
  author: { name: string; username: string; avatar?: string; avatarUrl?: string };
  content: string;
  images?: string[];
  image?: string;
  projectName?: string;
  timestamp?: string;
}

interface SharePostDialogProps {
  post: ShareablePost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShared?: () => void;   // called after successful share so parent can bump count
}

const AUDIENCES = [
  { value: "public", label: "Public", icon: Globe },
  { value: "friends", label: "Friends", icon: Globe },
];

const QUICK_EMOJIS = ["😊", "🔥", "🚀", "👏", "💯", "❤️", "😂", "🎉"];

/* ─── Truncate helpers ───────────────────────────────────────────────────── */
const PREVIEW_LIMIT = 180;
function truncate(text: string) {
  return text.length > PREVIEW_LIMIT ? text.slice(0, PREVIEW_LIMIT).trimEnd() + "…" : text;
}

/* ─── Component ──────────────────────────────────────────────────────────── */
export function SharePostDialog({ post, open, onOpenChange, onShared }: SharePostDialogProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState(AUDIENCES[0]);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [sharePost, { loading }] = useMutation(SHARE_POST);

  // Reset message when dialog opens
  useEffect(() => {
    if (open) {
      setMessage("");
      setShowEmoji(false);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [open]);

  // Auto-grow textarea
  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    if (!el) { setMessage((v) => v + emoji); return; }
    const start = el.selectionStart ?? message.length;
    const end   = el.selectionEnd   ?? message.length;
    const next  = message.slice(0, start) + emoji + message.slice(end);
    setMessage(next);
    setShowEmoji(false);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  }

  async function handleShare() {
    try {
      await sharePost({ variables: { postId: post.id, message: message.trim() || undefined } });
      onShared?.();
      onOpenChange(false);
    } catch (e) {
      console.error("Share failed:", e);
    }
  }

  const userName    = user?.email?.split("@")[0] ?? "You";
  const coverImage  = post.images?.[0] ?? post.image;
  const postAuthor  = post.author.name;
  const postContent = truncate(post.content.replace(/\[shared:[^\]]+\]/g, "").trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-xl gap-0">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <DialogHeader className="px-4 pt-4 pb-3 border-b relative">
          <DialogTitle className="text-center text-base font-semibold">Share</DialogTitle>
          <DialogClose className="absolute right-3 top-3 rounded-full w-8 h-8 flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors">
            <XIcon className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </DialogHeader>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="px-4 py-3 space-y-3 max-h-[70vh] overflow-y-auto">

          {/* Author row */}
          <div className="flex items-center gap-2.5">
            <Avatar className="w-10 h-10 border-2 border-border flex-shrink-0">
              <AvatarImage src={(user as any)?.user_metadata?.avatar_url} />
              <AvatarFallback>{userName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm leading-tight">{userName}</p>
              {/* Audience selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 mt-0.5 text-[11px] font-medium bg-muted rounded px-1.5 py-0.5 hover:bg-muted/80 transition-colors">
                    <audience.icon className="w-3 h-3" />
                    {audience.label}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  {AUDIENCES.map((a) => (
                    <DropdownMenuItem
                      key={a.value}
                      onClick={() => setAudience(a)}
                      className="gap-2 text-sm"
                    >
                      <a.icon className="w-4 h-4" />
                      {a.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Message textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => { setMessage(e.target.value); handleInput(); }}
            onInput={handleInput}
            placeholder="Say something about this..."
            rows={2}
            className="w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground/60 outline-none border-none focus:ring-0 min-h-[48px]"
          />

          {/* Emoji row */}
          <div className="flex items-center gap-1 relative">
            <button
              onClick={() => setShowEmoji((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Add emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            {showEmoji && (
              <div className="absolute bottom-7 left-0 z-50 flex gap-1.5 bg-popover border rounded-full px-3 py-2 shadow-lg">
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => insertEmoji(e)}
                    className="text-xl hover:scale-125 transition-transform"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Original post preview ────────────────────────────────── */}
          <div className="border rounded-xl overflow-hidden bg-muted/30">
            {coverImage && (
              <img
                src={coverImage}
                alt=""
                className="w-full aspect-[2/1] object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
            {!coverImage && (
              <div className="w-full h-24 bg-muted/50 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
              </div>
            )}
            <div className="px-3 py-2">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                {postAuthor}
                {post.projectName ? ` · ${post.projectName}` : ""}
              </p>
              <p className="text-sm text-foreground leading-snug">{postContent}</p>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="px-4 py-3 border-t">
          <Button
            onClick={handleShare}
            disabled={loading}
            className="w-full font-semibold"
          >
            {loading ? "Sharing…" : "Share now"}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
