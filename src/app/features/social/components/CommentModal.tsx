import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X as XIcon } from "lucide-react";
import { CommentSection } from "./CommentSection";

interface CommentModalProps {
  postId: string;
  authorName: string;
  content?: string | null;
  initialCount: number;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export function CommentModal({
  postId,
  authorName,
  content,
  initialCount,
  onClose,
  onCountChange,
}: CommentModalProps) {
  const [focusSignal, setFocusSignal] = useState(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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

  useEffect(() => {
    setFocusSignal((value) => value + 1);
  }, [postId]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9100] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[9101] flex items-start justify-center px-3 py-10 pointer-events-none sm:py-16">
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Comment on post"
          className="pointer-events-auto flex h-[min(720px,calc(100vh-5rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <XIcon className="h-5 w-5" />
            </button>
            <h2 className="text-base font-semibold">Reply</h2>
          </header>

          <div className="shrink-0 border-b px-4 py-3">
            <p className="text-sm font-semibold">{authorName}</p>
            {content && (
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-5 text-muted-foreground">
                {content}
              </p>
            )}
          </div>

          <CommentSection
            postId={postId}
            initialCount={initialCount}
            initialComments={[]}
            mode="always"
            focusInputOnMount
            focusSignal={focusSignal}
            onCountChange={onCountChange}
          />
        </section>
      </div>
    </>,
    document.body,
  );
}
