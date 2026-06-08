import { useEffect, useRef, useState } from "react";
import type React from "react";
import { Link } from "react-router";
import { AtSign, Send, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { avatarSrc } from "../../../../lib/defaults";

export interface MentionUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export function CommentInput({
  user,
  displayName,
  avatarUrl,
  onSubmit,
  inputRef,
  autoFocus = false,
  placeholder = "Write a comment…",
  initialText = "",
  mentionUsers = [],
  submitting: submittingOverride,
}: {
  user: { id: string; email?: string } | null;
  /** When the user has a real profile loaded (from useMeProfile), pass the
   * display name so the avatar fallback shows their real initial. */
  displayName?: string | null;
  avatarUrl?: string;
  onSubmit: (text: string, mentions?: string[]) => Promise<void>;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  autoFocus?: boolean;
  placeholder?: string;
  initialText?: string;
  mentionUsers?: MentionUser[];
  /** When provided, the parent owns the loading state and overrides the
   * internal one. Used so the submit button shows a spinner from the
   * moment the user hits send until the mutation fully completes. */
  submitting?: boolean;
}) {
  const [text, setText]      = useState(initialText);
  const [internalSub, setSub] = useState(false);
  // The actual "is anything in flight" flag — either parent's or our own.
  const submitting = submittingOverride ?? internalSub;
  const internalRef          = useRef<HTMLTextAreaElement>(null);
  const taRef                = inputRef ?? internalRef;

  // @mention state
  const [mentionQuery, setMentionQuery]   = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState(0);
  const [trackedMentions, setTrackedMentions] = useState<MentionUser[]>([]);

  useEffect(() => {
    setText(initialText);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialText]);

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart ?? val.length;
    const slice  = val.slice(0, cursor);
    const match  = slice.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1].toLowerCase());
      setMentionAnchor(cursor - match[0].length);
    } else {
      setMentionQuery(null);
    }
  }

  function insertMention(mu: MentionUser) {
    const cursor  = taRef.current?.selectionStart ?? text.length;
    const before  = text.slice(0, mentionAnchor);
    const after   = text.slice(cursor);
    const newText = `${before}@${mu.username} ${after}`;
    setText(newText);
    setMentionQuery(null);
    setTrackedMentions((prev) => {
      if (prev.find((m) => m.id === mu.id)) return prev;
      return [...prev, mu];
    });
    setTimeout(() => {
      if (taRef.current) {
        const pos = before.length + mu.username.length + 2;
        taRef.current.focus();
        taRef.current.setSelectionRange(pos, pos);
        taRef.current.style.height = "auto";
        taRef.current.style.height = `${taRef.current.scrollHeight}px`;
      }
    }, 10);
  }

  const filteredMentions = mentionQuery !== null
    ? mentionUsers
        .filter(
          (mu) =>
            mu.username.toLowerCase().includes(mentionQuery) ||
            mu.name.toLowerCase().includes(mentionQuery)
        )
        .slice(0, 6)
    : [];

  async function submit() {
    if (!text.trim() || submitting) return;
    setSub(true);
    const mentionIds = trackedMentions
      .filter((mu) => text.includes(`@${mu.username}`))
      .map((mu) => mu.id);
    try {
      await onSubmit(text, mentionIds);
      setText("");
      setTrackedMentions([]);
    } finally {
      setSub(false);
    }
  }

  if (!user) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        <Link to="/login" className="underline font-medium">Sign in</Link> to comment
      </p>
    );
  }

  const canSend = !submitting && !!text.trim();
  // Pick the best available initial for the avatar fallback:
  //   1. Real display name (when the profile is loaded)
  //   2. Email's first character (when only the auth user is present)
  //   3. "?" as a last resort
  const avatarFallback = (displayName?.[0] ?? user.email?.[0] ?? "?").toUpperCase();

  return (
    <div className="flex gap-2 items-end">
      <Avatar className="w-7 h-7 flex-shrink-0 mb-1">
        <AvatarImage src={avatarSrc(avatarUrl)} />
        <AvatarFallback className="text-[10px]">
          {avatarFallback}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {/* Mention suggestions dropdown */}
        {filteredMentions.length > 0 && (
          <div className="mb-1 rounded-xl border bg-card shadow-lg overflow-hidden">
            {filteredMentions.map((mu) => (
              <button
                key={mu.id}
                onMouseDown={(e) => { e.preventDefault(); insertMention(mu); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-muted transition-colors"
              >
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarImage src={avatarSrc(mu.avatarUrl)} />
                  <AvatarFallback className="text-[9px]">{mu.name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-xs font-semibold leading-tight truncate">{mu.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">@{mu.username}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Input pill */}
        <div className="flex items-end gap-1.5 bg-muted rounded-2xl px-3 py-1.5">
          <textarea
            ref={taRef as React.RefObject<HTMLTextAreaElement>}
            value={text}
            autoFocus={autoFocus}
            placeholder={placeholder}
            disabled={submitting}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground min-h-[22px] max-h-28 leading-snug disabled:opacity-60"
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${t.scrollHeight}px`;
            }}
          />

          <div className="flex items-center gap-0.5 flex-shrink-0 mb-0.5">
            {/* @ Mention button */}
            <button
              title="Mention someone"
              disabled={submitting}
              onClick={() => {
                const cur = taRef.current;
                const pos = cur?.selectionStart ?? text.length;
                const newText = text.slice(0, pos) + "@" + text.slice(pos);
                setText(newText);
                setMentionQuery("");
                setMentionAnchor(pos);
                setTimeout(() => cur?.focus(), 10);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors disabled:opacity-40"
            >
              <AtSign className="w-4 h-4" strokeWidth={2} />
            </button>

            {/* Send / spinner — visible whenever there's content OR a submit is in flight */}
            {(canSend || submitting) && (
              <button
                title={submitting ? "Posting…" : "Post comment"}
                onClick={submit}
                disabled={submitting || !text.trim()}
                className="w-7 h-7 flex items-center justify-center rounded-full text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
              >
                {submitting
                  ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
                  : <Send className="w-4 h-4" strokeWidth={2} />}
              </button>
            )}
          </div>
        </div>

        {submitting ? (
          <p className="text-[10px] text-primary mt-0.5 ml-1">Posting…</p>
        ) : text.trim() ? (
          <p className="text-[10px] text-muted-foreground mt-0.5 ml-1">
            Enter to post · Shift+Enter for new line
          </p>
        ) : null}

      </div>
    </div>
  );
}


