import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Flame, History, MessageSquare, MoreHorizontal, Pencil, Trash2, X as XIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { avatarSrc } from "../../../../lib/defaults";
import { timeAgo } from "../time";
import type { CommentData } from "../types";

export function CommentItem({
  comment,
  currentUserId,
  postId,
  onDelete,
  onReply,
  onLikeToggle,
  onEdit,
  onOpenComment,
  showNestedReplies = true,
  depth = 0,
  topLevelParentId,
}: {
  comment: CommentData;
  currentUserId?: string;
  postId: string;
  onDelete: (id: string) => void;
  onReply: (parentId: string, parentName: string, visualParentId?: string, topLevelId?: string) => void;
  onLikeToggle: (commentId: string, wasLiked: boolean, reaction?: string) => void;
  onEdit: (commentId: string, newContent: string) => void;
  onOpenComment?: (commentId: string) => void;
  showNestedReplies?: boolean;
  depth?: number;
  topLevelParentId?: string; // id of the root (depth-0) comment this thread belongs to
}) {
  const isOwn = comment.author?.id === currentUserId;
  const [localLiked, setLocalLiked] = useState(comment.likedByMe);
  const [localLikes, setLocalLikes] = useState(comment.likesCount);
  const fired = localLiked;

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Edit history modal
  const [showHistory, setShowHistory] = useState(false);

  // Sub-reply expand (only show first 3 at depth 0, rest behind toggle)
  const SUB_REPLY_LIMIT = 3;
  const [showAllSubReplies, setShowAllSubReplies] = useState(false);

  useEffect(() => {
    setLocalLiked(comment.likedByMe);
    setLocalLikes(comment.likesCount);
  }, [comment.likedByMe, comment.likesCount, comment.myReaction]);

  function handleLike() {
    const next = !localLiked;
    setLocalLiked(next);
    setLocalLikes((v) => (next ? v + 1 : Math.max(0, v - 1)));
    onLikeToggle(comment.id, localLiked, next ? "Fire" : undefined);
  }

  function startEdit() {
    setIsEditing(true);
    setEditText(comment.content);
    setTimeout(() => {
      editInputRef.current?.focus();
      if (editInputRef.current) {
        editInputRef.current.style.height = "auto";
        editInputRef.current.style.height = `${editInputRef.current.scrollHeight}px`;
      }
    }, 30);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditText(comment.content);
  }

  async function submitEdit() {
    if (!editText.trim() || editText.trim() === comment.content.trim()) {
      cancelEdit();
      return;
    }
    onEdit(comment.id, editText.trim());
    setIsEditing(false);
  }

  const profileHref = comment.author?.username && comment.author.username !== "you"
    ? `/profile/${comment.author.username}`
    : "/profile";

  // Replies stay flat: replying to a reply still attaches to the top-level
  // comment so the UI can show all replies inside one parent comment card.
  const rootCommentId = topLevelParentId ?? comment.id;
  const replyApiParentId = rootCommentId;
  // Direct replies are collapsed until the user opens them.
  const [repliesExpanded, setRepliesExpanded] = useState(depth === 0 && comment.replies.length > 0);

  const effectiveReplies = comment.replies;

  function handleExpandReplies() {
    setRepliesExpanded(true);
  }

  const visibleReplies = repliesExpanded
    ? (showAllSubReplies ? effectiveReplies : effectiveReplies.slice(0, SUB_REPLY_LIMIT))
    : [];

  const hasMoreReplies = effectiveReplies.length > SUB_REPLY_LIMIT;
  const hasReplies = effectiveReplies.length > 0;

  return (
    <>
      {/* ── Comment row ─────────────────────────────────────────────── */}
      <div
        className="flex gap-3 group relative"
      >

        {/* Avatar column — contains avatar + optional vertical line below it */}
        <div className="flex flex-col items-center flex-shrink-0">
          <Link
            to={profileHref}
            className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={(event) => event.stopPropagation()}
          >
            <Avatar className="w-9 h-9">
              <AvatarImage src={avatarSrc(comment.author?.avatarUrl)} />
              <AvatarFallback className="text-[10px]">{comment.author?.name?.[0]}</AvatarFallback>
            </Avatar>
          </Link>

        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0 pb-3">
          {/* Bubble */}
          {isEditing ? (
            <div className="rounded-2xl border bg-background px-3 py-2" onClick={(event) => event.stopPropagation()}>
              <div className="mb-1 flex min-w-0 items-center gap-1.5 text-sm">
                <Link
                  to={profileHref}
                  className="truncate font-semibold hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {comment.author?.name}
                </Link>
                {comment.author?.username && (
                  <span className="truncate text-muted-foreground">@{comment.author.username}</span>
                )}
              </div>
              <textarea
                ref={editInputRef}
                value={editText}
                rows={1}
                className="w-full resize-none bg-transparent text-sm outline-none min-h-[22px] max-h-32 leading-snug"
                onChange={(e) => setEditText(e.target.value)}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = `${t.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(); }
                  if (e.key === "Escape") cancelEdit();
                }}
              />
              <div className="flex items-center gap-2 mt-1.5">
                <button onClick={submitEdit} className="text-[10px] font-semibold text-primary hover:underline">Save</button>
                <button onClick={cancelEdit} className="text-[10px] text-muted-foreground hover:underline">Cancel</button>
                <span className="text-[10px] text-muted-foreground">Enter to save · Esc to cancel</span>
              </div>
            </div>
          ) : (
            <div className="max-w-full">
              <div className="flex min-w-0 items-center gap-1.5 text-sm leading-5">
                <Link
                  to={profileHref}
                  className="truncate font-semibold hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {comment.author?.name}
                </Link>
                {comment.author?.username && (
                  <span className="truncate text-muted-foreground">@{comment.author.username}</span>
                )}
                <span className="text-muted-foreground">·</span>
                <span className="shrink-0 text-muted-foreground">
                  {comment.createdAt ? timeAgo(comment.createdAt) : "now"}
                </span>
              </div>
              {comment.mediaUrl && (
                comment.mediaType === "video" ? (
                  <video src={comment.mediaUrl} controls className="mt-1 rounded-xl max-h-48 max-w-full" />
                ) : (
                  <img src={comment.mediaUrl} alt="" className="mt-1 rounded-xl max-h-48 max-w-full object-cover" />
                )
              )}
              {comment.content && (
                <p className="whitespace-pre-wrap break-words text-sm leading-5 text-foreground">{comment.content}</p>
              )}
            </div>
          )}

          {/* Action row */}
          {!isEditing && (
            <div className="mt-3 grid max-w-md grid-cols-3 text-muted-foreground">
              {comment.isEdited && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowHistory(true);
                  }}
                  className="inline-flex h-9 items-center gap-1 text-xs italic hover:underline"
                >
                  <History className="w-2.5 h-2.5" />Edited
                </button>
              )}

              <button
                onClick={(event) => {
                  event.stopPropagation();
                  handleLike();
                }}
                className={`group inline-flex h-9 items-center gap-2 text-sm transition-colors hover:text-primary ${
                  fired ? "text-primary" : ""
                }`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full group-hover:bg-primary/10">
                  <Flame className={`h-4 w-4 ${fired ? "fill-current" : ""}`} />
                </span>
                <span className="tabular-nums">{localLikes}</span>
              </button>

              {/* Reply — direct parent stored in DB; visual/topLevel ids route optimistic update */}
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onReply(
                    replyApiParentId,
                    comment.author?.name ?? "",
                    undefined,
                    rootCommentId,
                  );
                }}
                className="group inline-flex h-9 items-center gap-2 text-sm transition-colors hover:text-sky-500"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full group-hover:bg-sky-500/10">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <span className="tabular-nums">{comment.repliesCount}</span>
              </button>

              {/* 3-dot menu for own comments */}
              {isOwn && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem onClick={startEdit} className="gap-2 cursor-pointer text-sm">
                      <Pencil className="w-3.5 h-3.5" />Edit
                    </DropdownMenuItem>
                    {(comment.editHistory?.length ?? 0) > 0 && (
                      <DropdownMenuItem onClick={() => setShowHistory(true)} className="gap-2 cursor-pointer text-sm">
                        <History className="w-3.5 h-3.5" />Edit history
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onDelete(comment.id)}
                      className="gap-2 text-destructive focus:text-destructive cursor-pointer text-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Replies ──────────────────────────────────────────────── */}
      {showNestedReplies && depth < 2 && hasReplies && (
        <div className="flex gap-2">
          <div className="w-7 flex-shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col gap-2 pt-0.5">

            {/* ── Depth-0 and depth-1: collapsed toggle ── */}
            {depth <= 1 && !repliesExpanded && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  handleExpandReplies();
                }}
                className="text-[11px] font-semibold text-primary hover:underline self-start flex items-center gap-1"
              >
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 10.25a.75.75 0 01-1.5 0v-4.5a.75.75 0 011.5 0v4.5zm-.75-6a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
                </svg>
                View {comment.repliesCount || effectiveReplies.length} {(comment.repliesCount || effectiveReplies.length) === 1 ? "reply" : "replies"}
              </button>
            )}

            {/* ── Loading indicator for lazy-loaded replies ── */}
            {/* ── Expanded replies list ── */}
            {visibleReplies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                postId={postId}
                onDelete={onDelete}
                onReply={onReply}
                onLikeToggle={onLikeToggle}
                onEdit={onEdit}
                onOpenComment={undefined}
                showNestedReplies={showNestedReplies}
                depth={depth + 1}
                topLevelParentId={rootCommentId}
              />
            ))}

            {/* ── Show more / Show less (when expanded) ── */}
            {repliesExpanded && hasMoreReplies && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setShowAllSubReplies((v) => !v);
                }}
                className="text-[11px] font-semibold text-primary hover:underline self-start mt-0.5"
              >
                {showAllSubReplies
                  ? "Show less"
                  : `View ${effectiveReplies.length - SUB_REPLY_LIMIT} more repl${
                      effectiveReplies.length - SUB_REPLY_LIMIT === 1 ? "y" : "ies"
                    }`}
              </button>
            )}

            {/* ── Collapse back ── */}
            {depth <= 1 && repliesExpanded && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setRepliesExpanded(false);
                  setShowAllSubReplies(false);
                }}
                className="text-[11px] text-muted-foreground hover:underline self-start"
              >
                Hide replies
              </button>
            )}

          </div>
        </div>
      )}

      {/* Edit History Modal */}
      {showHistory && (comment.editHistory?.length ?? 0) > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="bg-card border rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <History className="w-4 h-4" />Edit history
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {/* Current version */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Current</span>
                  <span className="text-[10px] text-muted-foreground">
                    {comment.editHistory && comment.editHistory.length > 0
                      ? timeAgo(comment.editHistory[0].editedAt)
                      : timeAgo(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm">{comment.content}</p>
              </div>
              {/* Previous versions */}
              {comment.editHistory!.map((entry, i) => (
                <div key={entry.id} className="rounded-lg bg-muted px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      Version {comment.editHistory!.length - i}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(entry.editedAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{entry.previousContent}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

