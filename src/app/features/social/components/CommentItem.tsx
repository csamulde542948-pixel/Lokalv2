import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useLazyQuery } from "@apollo/client/react";
import { History, MoreHorizontal, Pencil, Trash2, X as XIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { avatarSrc } from "../../../../lib/defaults";
import { GET_COMMENT_REPLIES } from "../graphql";
import { adaptComment } from "../adapters";
import { COMMENT_REACTIONS, type ReactionOption } from "../reactions";
import { timeAgo } from "../time";
import type { CommentData } from "../types";
import { CommentReactionButton } from "./CommentReactionButton";

export function CommentItem({
  comment,
  currentUserId,
  postId,
  onDelete,
  onReply,
  onLikeToggle,
  onEdit,
  depth = 0,
  topLevelParentId,
  depth1ParentId,
}: {
  comment: CommentData;
  currentUserId?: string;
  postId: string;
  onDelete: (id: string) => void;
  onReply: (parentId: string, parentName: string, visualParentId?: string, topLevelId?: string) => void;
  onLikeToggle: (commentId: string, wasLiked: boolean, reaction?: string) => void;
  onEdit: (commentId: string, newContent: string) => void;
  depth?: number;
  topLevelParentId?: string; // id of the root (depth-0) comment this thread belongs to
  depth1ParentId?: string;   // id of the depth-1 ancestor (set when depth === 2)
}) {
  const isOwn = comment.author?.id === currentUserId;
  const [localLiked, setLocalLiked] = useState(comment.likedByMe);
  const [localLikes, setLocalLikes] = useState(comment.likesCount);
  const [selectedReaction, setSelectedReaction] = useState<typeof COMMENT_REACTIONS[0] | null>(
    comment.myReaction ? (COMMENT_REACTIONS.find(r => r.label === comment.myReaction) ?? null) : null
  );
  const [commentReactionOpen, setCommentReactionOpen] = useState(false);
  const commentHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setSelectedReaction(comment.myReaction ? (COMMENT_REACTIONS.find(r => r.label === comment.myReaction) ?? null) : null);
  }, [comment.likedByMe, comment.likesCount, comment.myReaction]);

  function handleCommentReactMouseEnter() {
    commentHoverTimer.current = setTimeout(() => setCommentReactionOpen(true), 400);
  }
  function handleCommentReactMouseLeave() {
    if (commentHoverTimer.current) clearTimeout(commentHoverTimer.current);
  }
  function handleCommentPickerMouseLeave() {
    setCommentReactionOpen(false);
    if (commentHoverTimer.current) clearTimeout(commentHoverTimer.current);
  }

  function handleLike() {
    const next = !localLiked;
    setLocalLiked(next);
    setLocalLikes((v) => (next ? v + 1 : Math.max(0, v - 1)));
    if (next) {
      setSelectedReaction(COMMENT_REACTIONS.find(r => r.label === "Like") ?? null);
    } else {
      setSelectedReaction(null);
    }
    onLikeToggle(comment.id, localLiked, next ? "Like" : undefined);
  }

  function pickCommentReaction(r: ReactionOption) {
    setCommentReactionOpen(false);
    if (selectedReaction?.label === r.label) {
      // Un-pick
      setSelectedReaction(null);
      setLocalLiked(false);
      setLocalLikes((v) => Math.max(0, v - 1));
      onLikeToggle(comment.id, true);
    } else {
      setSelectedReaction(r);
      if (!localLiked) {
        setLocalLiked(true);
        setLocalLikes((v) => v + 1);
      }
      onLikeToggle(comment.id, false, r.label);
    }
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

  const likeLabel = selectedReaction?.label ?? "Like";
  const likeColor = selectedReaction ? selectedReaction.color : "text-muted-foreground";

  const profileHref = comment.author?.username && comment.author.username !== "you"
    ? `/profile/${comment.author.username}`
    : "/profile";

  // API parent: the direct parent comment ID to store in DB
  //   depth-0 reply  → parentId = this comment (depth-1 in DB)
  //   depth-1 reply  → parentId = this comment (depth-2 in DB, nested under depth-1)
  //   depth-2 reply  → parentId = depth1ParentId (stays at depth-2 in DB, appended to same depth-1)
  const replyApiParentId =
    depth === 0 ? comment.id
    : depth === 1 ? comment.id
    : (depth1ParentId ?? topLevelParentId ?? comment.id);
  // Visual parent: ensures the new reply is nested under the correct depth-1 item
  //   depth-0 reply  → no visual parent needed (goes flat into top-level.replies[])
  //   depth-1 reply  → visual parent = this comment (nest under me)
  //   depth-2 reply  → visual parent = my depth-1 ancestor (stay in same thread)
  const replyVisualParentId =
    depth === 1 ? comment.id
    : depth === 2 ? (depth1ParentId ?? undefined)
    : undefined;

  // Visible replies: cap at SUB_REPLY_LIMIT for depth < 2
  // At depth-0, replies are collapsed until user clicks "View replies"
  // At depth 1+, replies are shown immediately (already inside an expanded thread)
  const [repliesExpanded, setRepliesExpanded] = useState(false);

  const [fetchReplies, { data: repliesData, loading: repliesQueryLoading }] = useLazyQuery(GET_COMMENT_REPLIES, {
    fetchPolicy: "network-only",
  });

  // Derive fetched replies from query data
  const fetchedReplies: CommentData[] = (repliesData?.commentReplies ?? []).map(adaptComment);

  // Effective replies: prefer fetched data, fall back to pre-loaded replies on the comment
  const effectiveReplies = fetchedReplies.length > 0 ? fetchedReplies : comment.replies;
  const lazyRepliesLoading = repliesQueryLoading;

  function handleExpandReplies() {
    setRepliesExpanded(true);
    // Only fetch if we don't already have data loaded
    if (fetchedReplies.length === 0 && comment.replies.length === 0 && comment.repliesCount > 0) {
      fetchReplies({ variables: { commentId: comment.id, limit: 20, offset: 0 } });
    }
  }

  const visibleReplies = depth <= 1
    ? (repliesExpanded
        ? (showAllSubReplies ? effectiveReplies : effectiveReplies.slice(0, SUB_REPLY_LIMIT))
        : [])
    : (showAllSubReplies ? effectiveReplies : effectiveReplies.slice(0, SUB_REPLY_LIMIT));

  const hasMoreReplies = effectiveReplies.length > SUB_REPLY_LIMIT;
  const hasReplies = effectiveReplies.length > 0 || comment.repliesCount > 0;

  return (
    <>
      {/* ── Comment row ─────────────────────────────────────────────── */}
      <div className="flex gap-2 group relative">

        {/* Avatar column — contains avatar + optional vertical line below it */}
        <div className="flex flex-col items-center flex-shrink-0">
          <Link to={profileHref} className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Avatar className="w-7 h-7">
              <AvatarImage src={avatarSrc(comment.author?.avatarUrl)} />
              <AvatarFallback className="text-[10px]">{comment.author?.name?.[0]}</AvatarFallback>
            </Avatar>
          </Link>

        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0 pb-1">
          {/* Bubble */}
          {isEditing ? (
            <div className="bg-muted rounded-2xl px-3 py-2">
              <Link to={profileHref} className="font-semibold text-xs block leading-tight mb-1 hover:underline">
                {comment.author?.name}
              </Link>
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
            <div className="inline-block bg-muted rounded-2xl px-3 py-1.5 max-w-full">
              <Link to={profileHref} className="font-semibold text-xs block leading-tight hover:underline">
                {comment.author?.name}
              </Link>
              {comment.mediaUrl && (
                comment.mediaType === "video" ? (
                  <video src={comment.mediaUrl} controls className="mt-1 rounded-xl max-h-48 max-w-full" />
                ) : (
                  <img src={comment.mediaUrl} alt="" className="mt-1 rounded-xl max-h-48 max-w-full object-cover" />
                )
              )}
              {comment.content && (
                <p className="text-sm leading-snug text-foreground break-words">{comment.content}</p>
              )}
            </div>
          )}

          {/* Action row */}
          {!isEditing && (
            <div className="flex items-center gap-3 mt-0.5 ml-3">
              <span className="text-[10px] text-muted-foreground">
                {comment.createdAt ? timeAgo(comment.createdAt) : "Just now"}
              </span>
              {comment.isEdited && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="text-[10px] text-muted-foreground italic hover:underline flex items-center gap-0.5"
                >
                  <History className="w-2.5 h-2.5" />Edited
                </button>
              )}

              {/* Like / reaction */}
              <CommentReactionButton
                open={commentReactionOpen}
                onOpenChange={setCommentReactionOpen}
                selectedReaction={selectedReaction}
                liked={localLiked}
                count={localLikes}
                label={likeLabel}
                colorClassName={likeColor}
                onToggle={handleLike}
                onPick={pickCommentReaction}
                onMouseEnter={handleCommentReactMouseEnter}
                onMouseLeave={handleCommentReactMouseLeave}
                onPickerMouseLeave={handleCommentPickerMouseLeave}
              />

              {/* Reply — direct parent stored in DB; visual/topLevel ids route optimistic update */}
              <button
                onClick={() => onReply(
                  replyApiParentId,
                  comment.author?.name ?? "",
                  replyVisualParentId,
                  depth >= 1 ? topLevelParentId : undefined,
                )}
                className="text-[10px] font-semibold text-muted-foreground hover:underline"
              >
                Reply
              </button>

              {/* 3-dot menu for own comments */}
              {isOwn && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="w-3 h-3" />
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
      {depth < 2 && hasReplies && (
        <div className="flex gap-2">
          <div className="w-7 flex-shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col gap-2 pt-0.5">

            {/* ── Depth-0 and depth-1: collapsed toggle ── */}
            {depth <= 1 && !repliesExpanded && (
              <button
                onClick={handleExpandReplies}
                className="text-[11px] font-semibold text-primary hover:underline self-start flex items-center gap-1"
              >
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 10.25a.75.75 0 01-1.5 0v-4.5a.75.75 0 011.5 0v4.5zm-.75-6a.875.875 0 110-1.75.875.875 0 010 1.75z"/>
                </svg>
                View {comment.repliesCount || effectiveReplies.length} {(comment.repliesCount || effectiveReplies.length) === 1 ? "reply" : "replies"}
              </button>
            )}

            {/* ── Loading indicator for lazy-loaded replies ── */}
            {lazyRepliesLoading && (
              <div className="text-[11px] text-muted-foreground py-1">Loading replies…</div>
            )}

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
                depth={depth + 1}
                topLevelParentId={depth === 0 ? comment.id : topLevelParentId}
                depth1ParentId={depth === 0 ? reply.id : comment.id}
              />
            ))}

            {/* ── Show more / Show less (when expanded) ── */}
            {repliesExpanded && hasMoreReplies && (
              <button
                onClick={() => setShowAllSubReplies((v) => !v)}
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
                onClick={() => { setRepliesExpanded(false); setShowAllSubReplies(false); }}
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

