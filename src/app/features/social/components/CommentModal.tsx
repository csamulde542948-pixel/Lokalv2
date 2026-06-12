import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { gql } from "@apollo/client/core";
import { useMutation } from "@apollo/client/react";
import { CalendarClock, Flag, ImageIcon, Loader2, List, MapPin, Smile, X as XIcon, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { avatarSrc } from "../../../../lib/defaults";
import { useAuth } from "../../../../contexts/AuthContext";
import { useMeProfile } from "../hooks/useMeProfile";

const COMMENT_ON_POST_MODAL = gql`
  mutation CommentModalCommentOnPost($input: CommentInput!) {
    commentOnPost(input: $input) {
      id
    }
  }
`;

interface CommentModalProps {
  postId: string;
  authorName: string;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  content?: string | null;
  initialCount: number;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export function CommentModal({
  postId,
  authorName,
  authorUsername,
  authorAvatarUrl,
  content,
  initialCount,
  onClose,
  onCountChange,
}: CommentModalProps) {
  const { user } = useAuth();
  const { me } = useMeProfile();
  const [text, setText] = useState("");
  const [localCount, setLocalCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [commentOnPost, { loading }] = useMutation(COMMENT_ON_POST_MODAL);

  const displayUsername = authorUsername?.replace(/^@/, "");
  const myName = me?.displayName ?? me?.name ?? me?.username ?? user?.email ?? "You";
  const myFallback = myName.charAt(0).toUpperCase();

  useEffect(() => {
    setLocalCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => textareaRef.current?.focus(), 30);
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function submitReply() {
    const contentText = text.trim();
    if (!contentText || loading || !user) return;

    setError(null);
    const nextCount = localCount + 1;
    setLocalCount(nextCount);
    onCountChange?.(nextCount);

    try {
      await commentOnPost({
        variables: {
          input: {
            postId,
            content: contentText,
            mentions: [],
          },
        },
      });
      onClose();
    } catch {
      setLocalCount((count) => Math.max(0, count - 1));
      onCountChange?.(localCount);
      setError("Could not post reply. Please try again.");
    }
  }

  const canReply = !!user && !!text.trim() && !loading;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9100] bg-black/70" onClick={onClose} />
      <div className="fixed inset-0 z-[9101] flex items-start justify-center px-3 py-6 pointer-events-none sm:py-10">
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Reply to post"
          className="pointer-events-auto w-full max-w-[600px] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex h-14 items-center justify-between px-4">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <XIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="text-sm font-medium text-sky-500 transition-colors hover:text-sky-400"
            >
              Drafts
            </button>
          </header>

          <div className="px-5 pb-5">
            <div className="grid grid-cols-[40px_1fr] gap-3">
              <div className="flex flex-col items-center">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatarSrc(authorAvatarUrl)} />
                  <AvatarFallback>{authorName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="mt-2 h-full min-h-10 w-px bg-border" />
              </div>

              <div className="min-w-0 pb-4">
                <div className="flex min-w-0 items-center gap-1.5 text-sm leading-5">
                  <span className="truncate font-semibold">{authorName}</span>
                  {displayUsername && (
                    <span className="truncate text-muted-foreground">@{displayUsername}</span>
                  )}
                </div>
                {content && (
                  <p className="mt-1 line-clamp-4 whitespace-pre-wrap break-words text-[15px] leading-5 text-foreground">
                    {content}
                  </p>
                )}
              </div>

              <Avatar className="h-10 w-10">
                <AvatarImage src={avatarSrc(me?.avatarUrl)} />
                <AvatarFallback>{myFallback}</AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                {displayUsername && (
                  <p className="mb-2 text-sm text-muted-foreground">
                    Replying to <span className="text-sky-500">@{displayUsername}</span>
                  </p>
                )}

                {user ? (
                  <textarea
                    ref={textareaRef}
                    value={text}
                    rows={4}
                    disabled={loading}
                    placeholder="Post your reply"
                    className="min-h-[120px] w-full resize-none bg-transparent text-xl leading-7 outline-none placeholder:text-muted-foreground disabled:opacity-60"
                    onChange={(event) => setText(event.target.value)}
                  />
                ) : (
                  <p className="py-8 text-sm text-muted-foreground">
                    <Link to="/login" className="font-semibold text-sky-500 hover:underline">Sign in</Link> to reply.
                  </p>
                )}

                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-1 text-sky-500">
                {[
                  { icon: ImageIcon, label: "Add image" },
                  { icon: Zap, label: "Enhance" },
                  { icon: List, label: "Add poll" },
                  { icon: Smile, label: "Add emoji" },
                  { icon: CalendarClock, label: "Schedule" },
                  { icon: MapPin, label: "Add location" },
                  { icon: Flag, label: "Flag" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    title={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-sky-500/10"
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={submitReply}
                disabled={!canReply}
                className="inline-flex h-10 min-w-20 items-center justify-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reply"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </>,
    document.body,
  );
}
