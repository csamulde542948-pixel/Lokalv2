import { useEffect, useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { ImageIcon, Share2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useAuth } from "../../contexts/AuthContext";
import { RECORD_POST_SHARE } from "../features/social/graphql";

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
  onShared?: () => void;
}

const PREVIEW_LIMIT = 180;

function truncate(text: string) {
  return text.length > PREVIEW_LIMIT ? `${text.slice(0, PREVIEW_LIMIT).trimEnd()}...` : text;
}

export function SharePostDialog({ post, open, onOpenChange, onShared }: SharePostDialogProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [recordShare, { loading }] = useMutation(RECORD_POST_SHARE);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, [open]);

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  async function handleShare() {
    try {
      const shareUrl = `${window.location.origin}/post/${post.id}`;
      const authorName = post.author.name || `@${post.author.username}`;
      const composedText = [message.trim(), `${authorName} posted on lokalhost.club`, truncate(post.content)]
        .filter(Boolean)
        .join("\n\n");
      const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(composedText)}&url=${encodeURIComponent(shareUrl)}`;

      await recordShare({ variables: { postId: post.id } });
      onShared?.();
      window.open(intent, "_blank", "noopener,noreferrer");
      onOpenChange(false);
    } catch (error) {
      console.error("Share failed:", error);
    }
  }

  const userName = user?.email?.split("@")[0] ?? "You";
  const coverImage = post.images?.[0] ?? post.image;
  const postAuthor = post.author.name;
  const postContent = truncate(post.content.replace(/\[shared:[^\]]+\]/g, "").trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-xl gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle className="text-center text-base font-semibold">Share to X</DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-2.5">
            <Avatar className="w-10 h-10 border-2 border-border flex-shrink-0">
              <AvatarImage src={(user as any)?.user_metadata?.avatar_url} />
              <AvatarFallback>{userName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm leading-tight">{userName}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Open an X share with a link back to this post</p>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              handleInput();
            }}
            onInput={handleInput}
            placeholder="Add a caption for X..."
            rows={2}
            className="w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground/60 outline-none border-none focus:ring-0 min-h-[48px]"
          />

          <div className="border rounded-xl overflow-hidden bg-muted/30">
            {coverImage ? (
              <img
                src={coverImage}
                alt=""
                className="w-full aspect-[2/1] object-cover"
                onError={(event) => {
                  (event.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-24 bg-muted/50 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
              </div>
            )}
            <div className="px-3 py-2">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                {postAuthor}
                {post.projectName ? ` - ${post.projectName}` : ""}
              </p>
              <p className="text-sm text-foreground leading-snug">{postContent}</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t">
          <Button onClick={handleShare} disabled={loading} className="w-full font-semibold">
            <Share2 className="w-4 h-4" />
            {loading ? "Opening X..." : "Share to X"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
