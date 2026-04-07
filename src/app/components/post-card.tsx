import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { gql } from "@apollo/client/core";
import { useMutation } from "@apollo/client/react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import {
  ThumbsUp, MessageCircle, Share2, MoreHorizontal,
  UserPlus, UserCheck, Bookmark, BookmarkCheck,
  Send, Trash2, Check, Link, Image as ImageIcon,
  Video, X as XIcon, ChevronLeft, ChevronRight,
  Pencil, History, AtSign,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "../../contexts/AuthContext";

/* ─── GraphQL ─────────────────────────────────────────────────────────────── */
const COMMENT_ON_POST = gql`
  mutation CommentOnPost($input: CommentInput!) {
    commentOnPost(input: $input) {
      id content likesCount likedByMe myReaction parentId createdAt isEdited
      mentions
      editHistory { id previousContent editedAt }
      author { id name username avatarUrl }
    }
  }
`;
const REPLY_TO_COMMENT = gql`
  mutation ReplyToComment($input: ReplyInput!) {
    replyToComment(input: $input) {
      id content likesCount likedByMe myReaction parentId createdAt isEdited
      mentions
      editHistory { id previousContent editedAt }
      author { id name username avatarUrl }
    }
  }
`;
const LIKE_COMMENT = gql`
  mutation LikeComment($commentId: ID!, $reaction: String) {
    likeComment(commentId: $commentId, reaction: $reaction) { id likesCount likedByMe myReaction }
  }
`;
const UNLIKE_COMMENT = gql`
  mutation UnlikeComment($commentId: ID!) {
    unlikeComment(commentId: $commentId) { id likesCount likedByMe myReaction }
  }
`;
const EDIT_COMMENT = gql`
  mutation EditComment($commentId: ID!, $content: String!) {
    editComment(commentId: $commentId, content: $content) {
      id content likesCount likedByMe myReaction parentId createdAt isEdited
      editHistory { id previousContent editedAt }
      author { id name username avatarUrl }
    }
  }
`;
const DELETE_COMMENT = gql`
  mutation DeleteComment($commentId: ID!) { deleteComment(commentId: $commentId) }
`;
const DELETE_POST = gql`
  mutation DeletePost($id: ID!) { deletePost(id: $id) }
`;

/* ─── Types ───────────────────────────────────────────────────────────────── */
export interface Post {
  id: string;
  author: { id?: string; name: string; avatar: string; username: string };
  content: string;
  image?: string;
  images?: string[];
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  projectName?: string;
  likedByMe?: boolean;
  myReaction?: string | null;
  tags?: { id: string | number; name: string }[];
  initialComments?: CommentData[];
}

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onDelete?: () => void;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
}

/* ─── Reactions ───────────────────────────────────────────────────────────── */
const REACTIONS = [
  { emoji: "❤️", label: "Love",      color: "text-red-500"    },
  { emoji: "👍", label: "Like",      color: "text-blue-500"   },
  { emoji: "🔥", label: "Fire",      color: "text-orange-500" },
  { emoji: "🚀", label: "Rocket",    color: "text-purple-500" },
  { emoji: "😮", label: "Wow",       color: "text-yellow-500" },
  { emoji: "🎉", label: "Celebrate", color: "text-green-500"  },
];

// Same set used for comment reactions
const COMMENT_REACTIONS = REACTIONS;

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60_000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const URL_REGEX = /https?:\/\/[^\s\)\]>"']+/gi;
function extractFirstUrl(text: string): string | null {
  const m = text.match(URL_REGEX);
  return m ? m[0] : null;
}

/* ─── LinkPreviewCard ─────────────────────────────────────────────────────── */
const OG_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

interface OgData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  domain: string;
}

function LinkPreviewCard({ url }: { url: string }) {
  const [og, setOg]       = useState<OgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed,  setFailed]  = useState(false);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    setOg(null);
    const ctrl = new AbortController();
    fetch(`${OG_BASE}/og?url=${encodeURIComponent(url)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: OgData) => {
        // Only render if we got at least a title or image
        if (!data.title && !data.image) { setFailed(true); return; }
        setOg(data);
      })
      .catch((e) => { if (e?.name !== "AbortError") setFailed(true); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [url]);

  if (failed) return null;

  if (loading) {
    return (
      <div className="mx-4 mb-3 rounded-xl border bg-muted/40 h-24 animate-pulse" />
    );
  }

  if (!og) return null;

  return (
    <a
      href={og.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mx-4 mb-3 flex overflow-hidden rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
    >
      {og.image && (
        <div className="w-28 flex-shrink-0 bg-muted">
          <img
            src={og.image}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="flex flex-col justify-center px-3 py-2.5 min-w-0 gap-0.5">
        {(og.siteName || og.domain) && (
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">
            {og.siteName ?? og.domain}
          </span>
        )}
        {og.title && (
          <span className="text-sm font-semibold leading-snug text-foreground line-clamp-2 group-hover:underline">
            {og.title}
          </span>
        )}
        {og.description && (
          <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
            {og.description}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground truncate mt-0.5">{og.domain}</span>
      </div>
    </a>
  );
}

/* ─── Lightbox ────────────────────────────────────────────────────────────── */
function Lightbox({ imgs, startIndex, onClose }: {
  imgs: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const prev = useCallback(() => setIdx((i) => (i - 1 + imgs.length) % imgs.length), [imgs.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % imgs.length), [imgs.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowLeft")   prev();
      if (e.key === "ArrowRight")  next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
      >
        <XIcon className="w-5 h-5" />
      </button>

      {/* Counter */}
      {imgs.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium z-10">
          {idx + 1} / {imgs.length}
        </div>
      )}

      {/* Prev */}
      {imgs.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Image */}
      <img
        src={imgs[idx]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-[90vw] max-h-[90vh] object-contain select-none"
        draggable={false}
      />

      {/* Next */}
      {imgs.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Thumbnail strip (3+ images) */}
      {imgs.length > 2 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {imgs.map((src, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              className={`w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                i === idx ? "border-white scale-110" : "border-white/30 opacity-60 hover:opacity-90"
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── MediaGrid ───────────────────────────────────────────────────────────── */
// Facebook-style photo grid with lightbox on click
function MediaGrid({ imgs }: { imgs: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  if (!imgs.length) return null;
  const total = imgs.length;
  const extra = total - 5;

  const Img = ({
    src, index, className, overlay,
  }: { src: string; index: number; className?: string; overlay?: number }) => (
    <div
      className={`relative overflow-hidden bg-muted cursor-pointer ${className ?? ""}`}
      onClick={() => setLightboxIdx(index)}
    >
      <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 hover:scale-105" />
      {overlay !== undefined && overlay > 0 && (
        <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
          <span className="text-white text-2xl font-bold">+{overlay}</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox imgs={imgs} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      {/* ── 1 image ──────────────────────────────────────────────────── */}
      {total === 1 && (
        <div className="px-4 py-2">
          <div
            className="relative overflow-hidden cursor-pointer"
            style={{ maxHeight: 500 }}
            onClick={() => setLightboxIdx(0)}
          >
            <img
              src={imgs[0]}
              alt=""
              className="w-full object-cover transition-transform duration-200 hover:scale-105"
              style={{ maxHeight: 500 }}
            />
          </div>
        </div>
      )}

      {/* ── 2 images ─────────────────────────────────────────────────── */}
      {total === 2 && (
        <div className="px-4 py-2">
          <div className="flex gap-1.5" style={{ height: 280 }}>
            <Img src={imgs[0]} index={0} className="flex-1" />
            <Img src={imgs[1]} index={1} className="flex-1" />
          </div>
        </div>
      )}

      {/* ── 3 images ─────────────────────────────────────────────────── */}
      {total === 3 && (
        <div className="px-4 py-2">
          <div className="flex gap-1.5" style={{ height: 320 }}>
            <Img src={imgs[0]} index={0} className="flex-1" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Img src={imgs[1]} index={1} className="flex-1" />
              <Img src={imgs[2]} index={2} className="flex-1" />
            </div>
          </div>
        </div>
      )}

      {/* ── 4 images ─────────────────────────────────────────────────── */}
      {total === 4 && (
        <div className="px-4 py-2">
          <div className="flex flex-col gap-1.5" style={{ height: 360 }}>
            <div className="flex gap-1.5 flex-1">
              <Img src={imgs[0]} index={0} className="flex-1" />
              <Img src={imgs[1]} index={1} className="flex-1" />
            </div>
            <div className="flex gap-1.5 flex-1">
              <Img src={imgs[2]} index={2} className="flex-1" />
              <Img src={imgs[3]} index={3} className="flex-1" />
            </div>
          </div>
        </div>
      )}

      {/* ── 5+ images ────────────────────────────────────────────────── */}
      {total >= 5 && (
        <div className="px-4 py-2">
          <div className="flex gap-1.5" style={{ height: 360 }}>
            <div className="flex flex-col gap-1.5 flex-1">
              <Img src={imgs[0]} index={0} className="flex-1" />
              <Img src={imgs[1]} index={1} className="flex-1" />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Img src={imgs[2]} index={2} className="flex-1" />
              <Img src={imgs[3]} index={3} className="flex-1" />
              <Img src={imgs[4]} index={4} className="flex-1" overlay={extra > 0 ? extra : undefined} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Internal comment shape ──────────────────────────────────────────────── */
interface CommentEditEntry {
  id: string;
  previousContent: string;
  editedAt: string;
}

interface CommentData {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  likesCount: number;
  likedByMe: boolean;
  myReaction?: string | null;
  parentId: string | null;
  mentions?: string[];
  isEdited?: boolean;
  editHistory?: CommentEditEntry[];
  createdAt: string;
  author: { id?: string; name: string; username: string; avatarUrl?: string };
  replies: CommentData[];
}

/* ─── CommentItem ─────────────────────────────────────────────────────────── */
function CommentItem({
  comment,
  currentUserId,
  postId,
  onDelete,
  onReply,
  onLikeToggle,
  onEdit,
  depth = 0,
  topLevelParentId,
}: {
  comment: CommentData;
  currentUserId?: string;
  postId: string;
  onDelete: (id: string) => void;
  onReply: (parentId: string, parentName: string) => void;
  onLikeToggle: (commentId: string, wasLiked: boolean, reaction?: string) => void;
  onEdit: (commentId: string, newContent: string) => void;
  depth?: number;
  topLevelParentId?: string; // id of the root comment this thread belongs to
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

  function pickCommentReaction(r: typeof COMMENT_REACTIONS[0]) {
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

  return (
    <>
      <div className={`flex gap-2 group relative ${depth > 0 ? "ml-8" : ""}`}>
        {/* Vertical connector line for replies */}
        {depth > 0 && (
          <div className="absolute -left-4 top-0 bottom-0 flex flex-col items-center" aria-hidden>
            <div className="w-px flex-1 bg-border/60" />
          </div>
        )}

        <Link to={profileHref} className="flex-shrink-0 mt-0.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Avatar className="w-7 h-7">
            <AvatarImage src={comment.author?.avatarUrl} />
            <AvatarFallback className="text-[10px]">
              {comment.author?.name?.[0]}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
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
                <button
                  onClick={submitEdit}
                  className="text-[10px] font-semibold text-primary hover:underline"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="text-[10px] text-muted-foreground hover:underline"
                >
                  Cancel
                </button>
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
                  <video
                    src={comment.mediaUrl}
                    controls
                    className="mt-1 rounded-xl max-h-48 max-w-full"
                  />
                ) : (
                  <img
                    src={comment.mediaUrl}
                    alt=""
                    className="mt-1 rounded-xl max-h-48 max-w-full object-cover"
                  />
                )
              )}

              {comment.content && (
                <p className="text-sm leading-snug text-foreground break-words">
                  {comment.content}
                </p>
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
                  title="This comment was edited"
                >
                  <History className="w-2.5 h-2.5" />
                  Edited
                </button>
              )}

              {/* Like with reaction picker */}
              <Popover open={commentReactionOpen} onOpenChange={setCommentReactionOpen}>
                <PopoverTrigger asChild>
                  <button
                    onClick={handleLike}
                    onMouseEnter={handleCommentReactMouseEnter}
                    onMouseLeave={handleCommentReactMouseLeave}
                    className={`text-[10px] font-semibold transition-colors hover:underline flex items-center gap-0.5 ${
                      localLiked ? likeColor : "text-muted-foreground"
                    }`}
                  >
                    {selectedReaction ? (
                      <span className="text-xs leading-none">{selectedReaction.emoji}</span>
                    ) : null}
                    {likeLabel}{localLikes > 0 ? ` · ${localLikes}` : ""}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="start"
                  className="w-auto p-1.5 rounded-full shadow-xl border bg-popover"
                  onMouseLeave={handleCommentPickerMouseLeave}
                >
                  <div className="flex gap-0.5 items-center">
                    {COMMENT_REACTIONS.map((r) => (
                      <button
                        key={r.label}
                        title={r.label}
                        onClick={() => pickCommentReaction(r)}
                        className={`text-xl p-1 rounded-full transition-all duration-150 hover:scale-150 hover:-translate-y-2 ${
                          selectedReaction?.label === r.label
                            ? "scale-125 -translate-y-1"
                            : "scale-100"
                        }`}
                      >
                        {r.emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <button
                onClick={() => {
                  // Replies to depth-1 comments attach to the same top-level parent
                  const targetId   = depth === 0 ? comment.id : (topLevelParentId ?? comment.id);
                  const targetName = comment.author?.name ?? "";
                  onReply(targetId, targetName);
                }}
                className="text-[10px] font-semibold text-muted-foreground hover:underline"
              >
                Reply{depth === 0 && comment.replies.length > 0 ? ` · ${comment.replies.length}` : ""}
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
                    <DropdownMenuItem
                      onClick={startEdit}
                      className="gap-2 cursor-pointer text-sm"
                    >
                      <Pencil className="w-3.5 h-3.5" />Edit
                    </DropdownMenuItem>
                    {(comment.editHistory?.length ?? 0) > 0 && (
                      <DropdownMenuItem
                        onClick={() => setShowHistory(true)}
                        className="gap-2 cursor-pointer text-sm"
                      >
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

          {/* Nested replies */}
          {comment.replies.length > 0 && (
            <div className="mt-2 relative pl-4">
              {/* Left border line connecting all replies to parent */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center" aria-hidden>
                <div className="w-px flex-1 bg-border/60" />
              </div>
              <div className="flex flex-col gap-2">
                {(depth === 0
                  ? (showAllSubReplies ? comment.replies : comment.replies.slice(0, SUB_REPLY_LIMIT))
                  : comment.replies
                ).map((reply) => (
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
                  />
                ))}
                {depth === 0 && comment.replies.length > SUB_REPLY_LIMIT && (
                  <button
                    onClick={() => setShowAllSubReplies((v) => !v)}
                    className="text-[11px] font-semibold text-primary hover:underline self-start ml-9 mt-0.5"
                  >
                    {showAllSubReplies
                      ? "Show less"
                      : `View ${comment.replies.length - SUB_REPLY_LIMIT} more repl${comment.replies.length - SUB_REPLY_LIMIT === 1 ? "y" : "ies"}`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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

/* ─── CommentInput (shared by card + modal) ───────────────────────────────── */
interface MentionUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

function CommentInput({
  user,
  onSubmit,
  inputRef,
  autoFocus = false,
  placeholder = "Write a comment…",
  initialText = "",
  mentionUsers = [],
}: {
  user: { id: string; email?: string } | null;
  onSubmit: (text: string, mediaUrl?: string, mediaType?: string, mentions?: string[]) => Promise<void>;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
  autoFocus?: boolean;
  placeholder?: string;
  initialText?: string;
  mentionUsers?: MentionUser[];
}) {
  const [text, setText]      = useState(initialText);
  const [media, setMedia]    = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [submitting, setSub] = useState(false);
  const fileRef              = useRef<HTMLInputElement>(null);
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

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url  = URL.createObjectURL(file);
    const type = file.type.startsWith("video") ? "video" : "image";
    setMedia({ url, type });
    e.target.value = "";
  }

  async function submit() {
    if (!text.trim() && !media) return;
    setSub(true);
    const mentionIds = trackedMentions
      .filter((mu) => text.includes(`@${mu.username}`))
      .map((mu) => mu.id);
    try {
      await onSubmit(text, media?.url, media?.type, mentionIds);
      setText("");
      setMedia(null);
      setTrackedMentions([]);
    } finally {
      setSub(false);
    }
  }

  if (!user) {
    return (
      <p className="text-xs text-muted-foreground text-center py-2">
        <a href="/login" className="underline font-medium">Sign in</a> to comment
      </p>
    );
  }

  const canSend = !submitting && (!!text.trim() || !!media);

  return (
    <div className="flex gap-2 items-end">
      <Avatar className="w-7 h-7 flex-shrink-0 mb-1">
        <AvatarFallback className="text-[10px]">
          {user.email?.[0]?.toUpperCase() ?? "?"}
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
                  <AvatarImage src={mu.avatarUrl} />
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

        {/* Media preview */}
        {media && (
          <div className="relative inline-block mb-1.5">
            {media.type === "video" ? (
              <video
                src={media.url}
                className="rounded-xl max-h-24 max-w-[160px] object-cover"
              />
            ) : (
              <img
                src={media.url}
                alt=""
                className="rounded-xl max-h-24 max-w-[160px] object-cover"
              />
            )}
            <button
              onClick={() => setMedia(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-foreground text-background rounded-full flex items-center justify-center shadow-sm hover:bg-foreground/80"
            >
              <XIcon className="w-3 h-3" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Input pill */}
        <div className="flex items-end gap-1.5 bg-muted rounded-2xl px-3 py-1.5">
          <textarea
            ref={taRef as React.RefObject<HTMLTextAreaElement>}
            value={text}
            autoFocus={autoFocus}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground min-h-[22px] max-h-28 leading-snug"
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
              onClick={() => {
                const cur = taRef.current;
                const pos = cur?.selectionStart ?? text.length;
                const newText = text.slice(0, pos) + "@" + text.slice(pos);
                setText(newText);
                setMentionQuery("");
                setMentionAnchor(pos);
                setTimeout(() => cur?.focus(), 10);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
            >
              <AtSign className="w-4 h-4" strokeWidth={2} />
            </button>

            {/* Photo attach */}
            <button
              title="Add photo"
              onClick={() => {
                if (fileRef.current) {
                  fileRef.current.accept = "image/*";
                  fileRef.current.click();
                }
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
            >
              <ImageIcon className="w-4 h-4" strokeWidth={2} />
            </button>

            {/* Video attach */}
            <button
              title="Add video"
              onClick={() => {
                if (fileRef.current) {
                  fileRef.current.accept = "video/*";
                  fileRef.current.click();
                }
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
            >
              <Video className="w-4 h-4" strokeWidth={2} />
            </button>

            {/* Send (visible only when content exists) */}
            {canSend && (
              <button
                title="Post comment"
                onClick={submit}
                disabled={submitting}
                className="w-7 h-7 flex items-center justify-center rounded-full text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>

        {text.trim() && (
          <p className="text-[10px] text-muted-foreground mt-0.5 ml-1">
            Enter to post · Shift+Enter for new line
          </p>
        )}

        <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

/* ─── PostCard ────────────────────────────────────────────────────────────── */
export function PostCard({
  post,
  onLike,
  onDelete,
  isFollowing = false,
  onFollowToggle,
}: PostCardProps) {
  const { user } = useAuth();

  // Like / reaction
  const [localLiked,       setLocalLiked]       = useState(post.likedByMe ?? false);
  const [localLikes,       setLocalLikes]        = useState(post.likes);
  const [selectedReaction, setSelectedReaction]  = useState<typeof REACTIONS[0] | null>(
    post.myReaction ? (REACTIONS.find(r => r.label === post.myReaction) ?? null) : null
  );
  const [reactionOpen,     setReactionOpen]      = useState(false);

  // Comments
  const [localComments,     setLocalComments]     = useState<CommentData[]>(post.initialComments ?? []);
  const [localCommentCount, setLocalCommentCount] = useState(post.comments);
  const [showComments,      setShowComments]      = useState(false);

  // Reply state — which comment are we replying to?
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  // UI
  const [bookmarked, setBookmarked] = useState(false);
  const [copied,     setCopied]     = useState(false);

  const hoverTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardInputRef = useRef<HTMLTextAreaElement>(null);

  const [commentOnPost]         = useMutation(COMMENT_ON_POST);
  const [replyToComment]        = useMutation(REPLY_TO_COMMENT);
  const [likeCommentMutation]   = useMutation(LIKE_COMMENT);
  const [unlikeCommentMutation] = useMutation(UNLIKE_COMMENT);
  const [editCommentMutation]   = useMutation(EDIT_COMMENT);
  const [deleteCommentMutation] = useMutation(DELETE_COMMENT);
  const [deletePostMutation]    = useMutation(DELETE_POST);

  useEffect(() => {
    setLocalLiked(post.likedByMe ?? false);
    setLocalLikes(post.likes);
    setSelectedReaction(post.myReaction ? (REACTIONS.find(r => r.label === post.myReaction) ?? null) : null);
  }, [post.likedByMe, post.likes, post.myReaction]);

  useEffect(() => {
    setLocalCommentCount(post.comments);
  }, [post.comments]);

  // Seed comments from server whenever they change (e.g. after refetch)
  useEffect(() => {
    if (post.initialComments && post.initialComments.length > 0) {
      setLocalComments(post.initialComments);
    }
  }, [post.initialComments]);

  /* Reaction hover */
  function onReactMouseEnter() {
    hoverTimer.current = setTimeout(() => setReactionOpen(true), 400);
  }
  function onReactMouseLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }
  function onPickerMouseLeave() {
    setReactionOpen(false);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }

  function toggleLike() {
    const next = !localLiked;
    setLocalLiked(next);
    setLocalLikes((v) => (next ? v + 1 : Math.max(0, v - 1)));
    setSelectedReaction(next ? (REACTIONS.find((r) => r.label === "Like") ?? null) : null);
    onLike(next, next ? "Like" : undefined);
  }

  function pickReaction(r: typeof REACTIONS[0]) {
    setReactionOpen(false);
    if (selectedReaction?.label === r.label) {
      setSelectedReaction(null);
      setLocalLiked(false);
      setLocalLikes((v) => Math.max(0, v - 1));
      onLike(false);
    } else {
      setSelectedReaction(r);
      if (!localLiked) {
        setLocalLiked(true);
        setLocalLikes((v) => v + 1);
      }
      onLike(true, r.label);
    }
  }

  function openCommentBox() {
    setShowComments(true);
    setReplyingTo(null);
    setTimeout(() => cardInputRef.current?.focus(), 50);
  }

  function startReply(parentId: string, parentName: string) {
    setShowComments(true);
    setReplyingTo({ id: parentId, name: parentName });
    setTimeout(() => replyInputRef.current?.focus(), 50);
  }

  async function handleComment(text: string, mediaUrl?: string, mediaType?: string, mentions?: string[]) {
    if (!text.trim() && !mediaUrl) return;

    const temp: CommentData = {
      id:        `temp-${Date.now()}`,
      content:   text,
      mediaUrl,
      mediaType,
      likesCount: 0,
      likedByMe:  false,
      myReaction: null,
      parentId:   null,
      mentions:   mentions ?? [],
      isEdited:   false,
      editHistory: [],
      createdAt:  new Date().toISOString(),
      replies:    [],
      author: {
        id:        user!.id,
        name:      user!.email?.split("@")[0] ?? "You",
        username:  "you",
        avatarUrl: undefined,
      },
    };

    setLocalComments((prev) => [...prev, temp]);
    setLocalCommentCount((v) => v + 1);

    try {
      const { data } = await commentOnPost({
        variables: { input: { postId: post.id, content: text, mentions: mentions ?? [] } },
      });
      if (data?.commentOnPost) {
        setLocalComments((prev) =>
          prev.map((c) =>
            c.id === temp.id
              ? { ...data.commentOnPost, mediaUrl, mediaType, replies: [] }
              : c
          )
        );
      }
    } catch {
      setLocalComments((prev) => prev.filter((c) => c.id !== temp.id));
      setLocalCommentCount((v) => Math.max(0, v - 1));
    }
  }

  async function handleReply(text: string, _mediaUrl?: string, _mediaType?: string, mentions?: string[]) {
    if (!text.trim() || !replyingTo) return;

    const parentId = replyingTo.id;
    const temp: CommentData = {
      id:         `temp-reply-${Date.now()}`,
      content:    text,
      likesCount: 0,
      likedByMe:  false,
      myReaction: null,
      parentId:   parentId,
      mentions:   mentions ?? [],
      isEdited:   false,
      editHistory: [],
      createdAt:  new Date().toISOString(),
      replies:    [],
      author: {
        id:        user!.id,
        name:      user!.email?.split("@")[0] ?? "You",
        username:  "you",
        avatarUrl: undefined,
      },
    };

    // Optimistically add to parent's replies
    setLocalComments((prev) =>
      prev.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...c.replies, temp] }
          : c
      )
    );
    setLocalCommentCount((v) => v + 1);
    setReplyingTo(null);

    try {
      const { data } = await replyToComment({
        variables: { input: { postId: post.id, parentId, content: text, mentions: mentions ?? [] } },
      });
      if (data?.replyToComment) {
        setLocalComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? {
                  ...c,
                  replies: c.replies.map((r) =>
                    r.id === temp.id ? { ...data.replyToComment, replies: [] } : r
                  ),
                }
              : c
          )
        );
      }
    } catch {
      setLocalComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: c.replies.filter((r) => r.id !== temp.id) }
            : c
        )
      );
      setLocalCommentCount((v) => Math.max(0, v - 1));
    }
  }

  async function handleLikeComment(commentId: string, wasLiked: boolean, reaction?: string) {
    try {
      if (wasLiked) {
        await unlikeCommentMutation({ variables: { commentId } });
      } else {
        await likeCommentMutation({ variables: { commentId, reaction: reaction ?? "Like" } });
      }
    } catch { /* optimistic already applied */ }
  }

  async function handleEditComment(commentId: string, newContent: string) {
    // Optimistically update content
    const updateComment = (c: CommentData): CommentData => {
      if (c.id === commentId) {
        return {
          ...c,
          content: newContent,
          isEdited: true,
          editHistory: [{
            id: `temp-edit-${Date.now()}`,
            previousContent: c.content,
            editedAt: new Date().toISOString(),
          }, ...(c.editHistory ?? [])],
        };
      }
      return { ...c, replies: c.replies.map(updateComment) };
    };
    setLocalComments((prev) => prev.map(updateComment));

    try {
      await editCommentMutation({ variables: { commentId, content: newContent } });
    } catch { /* revert not strictly needed since text is still visible */ }
  }

  async function handleDeleteComment(id: string) {
    // Check if it's a top-level or reply
    const isTop = localComments.some((c) => c.id === id);
    if (isTop) {
      const comment = localComments.find((c) => c.id === id);
      setLocalComments((prev) => prev.filter((c) => c.id !== id));
      setLocalCommentCount((v) => Math.max(0, v - 1 - (comment?.replies.length ?? 0)));
    } else {
      setLocalComments((prev) =>
        prev.map((c) => ({
          ...c,
          replies: c.replies.filter((r) => r.id !== id),
        }))
      );
      setLocalCommentCount((v) => Math.max(0, v - 1));
    }
    try { await deleteCommentMutation({ variables: { commentId: id } }); } catch {}
  }

  async function handleDeletePost() {
    try {
      await deletePostMutation({ variables: { id: post.id } });
      onDelete?.();
    } catch (e) {
      console.error(e);
    }
  }

  function copyLink() {
    navigator.clipboard
      .writeText(`${window.location.origin}/posts/${post.id}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const isOwnPost  = !!user && user.id === post.author.id;
  const reactLabel = selectedReaction?.label ?? "Like";
  const reactColor = selectedReaction
    ? selectedReaction.color
    : "text-muted-foreground hover:text-foreground";

  return (
      <Card className="overflow-hidden border bg-card shadow-sm rounded-xl gap-0">
        <CardContent className="p-0 [&:last-child]:pb-0">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Link to={post.author.username ? `/profile/${post.author.username.replace(/^@/, "")}` : "/profile"} className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0">
              <Avatar className="w-10 h-10 border-2 border-border">
                <AvatarImage src={post.author.avatar} />
                <AvatarFallback>{post.author.name[0]}</AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={post.author.username ? `/profile/${post.author.username.replace(/^@/, "")}` : "/profile"}
                  className="font-semibold text-sm hover:underline cursor-pointer leading-tight"
                >
                  {post.author.name}
                </Link>
                {post.projectName && (
                  <Badge variant="secondary" className="text-xs rounded-md font-normal px-2 py-0 h-4">
                    {post.projectName}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <span>{post.timestamp}</span>
                <span>·</span>
                <span className="text-[10px]">🌐</span>
              </div>
            </div>

            <div className="flex items-center gap-0.5 flex-shrink-0">
              {onFollowToggle && !isOwnPost && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onFollowToggle}
                  className="gap-1.5 h-8 text-xs rounded-md px-2 text-primary hover:bg-primary/10"
                >
                  {isFollowing ? (
                    <><UserCheck className="w-3.5 h-3.5" strokeWidth={2} />Following</>
                  ) : (
                    <><UserPlus className="w-3.5 h-3.5" strokeWidth={2} />Follow</>
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setBookmarked((v) => !v)}
                className="rounded-full h-8 w-8 hover:bg-muted"
                title={bookmarked ? "Remove bookmark" : "Save"}
              >
                {bookmarked
                  ? <BookmarkCheck className="w-4 h-4 fill-primary text-primary" strokeWidth={2} />
                  : <Bookmark className="w-4 h-4" strokeWidth={2} />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-muted">
                    <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isOwnPost && (
                    <DropdownMenuItem
                      onClick={handleDeletePost}
                      className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />Delete post
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* ── Content ─────────────────────────────────────────────────── */}
          <div className="px-4 pb-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>
          </div>

          {/* ── Tags ────────────────────────────────────────────────────── */}
          {post.tags && post.tags.length > 0 && (
            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="text-xs text-primary hover:underline cursor-pointer font-medium"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}

          {/* ── Link preview card (shown only when no images) ───────────── */}
          {(() => {
            const hasMedia = (post.images && post.images.length > 0) || !!post.image;
            const detectedUrl = !hasMedia ? extractFirstUrl(post.content) : null;
            return detectedUrl ? <LinkPreviewCard url={detectedUrl} /> : null;
          })()}

          {/* ── Post media grid ────────────────────────────────────────── */}
          {(() => {
            const imgs = post.images && post.images.length > 0
              ? post.images
              : post.image ? [post.image] : [];
            return imgs.length > 0 ? <MediaGrid imgs={imgs} /> : null;
          })()}

          {/* ── Reaction / comment / share count bar ────────────────────── */}
          {(localLikes > 0 || localCommentCount > 0 || post.shares > 0) && (
            <div className="px-4 py-2 flex items-center justify-between">
              {localLikes > 0 ? (
                <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                  <span className="text-sm leading-none">
                    {selectedReaction ? selectedReaction.emoji : "👍"}
                  </span>
                  <span>{localLikes.toLocaleString()}</span>
                </span>
              ) : <span />}

              <div className="flex items-center gap-3">
                {localCommentCount > 0 && (
                  <button
                    onClick={() => setShowComments((v) => !v)}
                    className="text-[12px] text-muted-foreground hover:underline"
                  >
                    {localCommentCount.toLocaleString()}{" "}
                    {localCommentCount === 1 ? "comment" : "comments"}
                  </button>
                )}
                {post.shares > 0 && (
                  <span className="text-[12px] text-muted-foreground">
                    {post.shares} {post.shares === 1 ? "share" : "shares"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Action bar ──────────────────────────────────────────────── */}
          <Separator />
          <div className="flex items-stretch">
            {/* Like / React */}
            <Popover open={reactionOpen} onOpenChange={setReactionOpen}>
              <PopoverTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={toggleLike}
                  onMouseEnter={onReactMouseEnter}
                  onMouseLeave={onReactMouseLeave}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") toggleLike();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 cursor-pointer select-none rounded-none hover:bg-muted transition-colors font-medium text-[13px] ${reactColor}`}
                >
                  {selectedReaction ? (
                    <span className="text-base leading-none">{selectedReaction.emoji}</span>
                  ) : (
                    <ThumbsUp className="w-[18px] h-[18px]" strokeWidth={2} />
                  )}
                  <span>{reactLabel}</span>
                </div>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                className="w-auto p-2 rounded-full shadow-xl border bg-popover"
                onMouseLeave={onPickerMouseLeave}
              >
                <div className="flex gap-1 items-center">
                  {REACTIONS.map((r) => (
                    <button
                      key={r.label}
                      title={r.label}
                      onClick={() => pickReaction(r)}
                      className={`text-2xl p-1 rounded-full transition-all duration-150 hover:scale-150 hover:-translate-y-2 ${
                        selectedReaction?.label === r.label
                          ? "scale-125 -translate-y-1"
                          : "scale-100"
                      }`}
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <div className="w-px bg-border self-stretch" />

            {/* Comment — focuses inline input */}
            <button
              onClick={openCommentBox}
              className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-medium text-[13px] rounded-none"
            >
              <MessageCircle className="w-[18px] h-[18px]" strokeWidth={2} />
              <span>Comment</span>
            </button>

            <div className="w-px bg-border self-stretch" />

            {/* Share */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-medium text-[13px] rounded-none">
                  <Share2 className="w-[18px] h-[18px]" strokeWidth={2} />
                  <span>Share</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" side="top" className="w-52">
                <DropdownMenuItem
                  onClick={copyLink}
                  className="gap-2.5 cursor-pointer py-2.5"
                >
                  {copied
                    ? <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    : <Link className="w-4 h-4 flex-shrink-0" />}
                  <div>
                    <div className="text-sm font-medium">
                      {copied ? "Link copied!" : "Copy link"}
                    </div>
                    <div className="text-xs text-muted-foreground">Share anywhere</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    window.open(
                      `https://twitter.com/intent/tweet?url=${encodeURIComponent(
                        `${window.location.origin}/posts/${post.id}`
                      )}`,
                      "_blank"
                    )
                  }
                  className="gap-2.5 cursor-pointer py-2.5"
                >
                  <Share2 className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium">Share to X</div>
                    <div className="text-xs text-muted-foreground">Post on X / Twitter</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ── Comment section (collapsible) ────────────────────────────── */}
          {showComments && (
            <div className="border-t bg-muted/10 px-4 py-3 space-y-3">
              {/* Existing comments */}
              {localComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={user?.id}
                  postId={post.id}
                  onDelete={handleDeleteComment}
                  onReply={startReply}
                  onLikeToggle={handleLikeComment}
                  onEdit={handleEditComment}
                />
              ))}

              {/* Reply banner */}
              {replyingTo && (
                <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted rounded-lg px-3 py-1.5">
                  <span>Replying to <span className="font-semibold text-foreground">{replyingTo.name}</span></span>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="hover:text-foreground ml-2"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Input: reply mode or normal comment mode */}
              {replyingTo ? (
                <CommentInput
                  user={user}
                  onSubmit={handleReply}
                  inputRef={replyInputRef}
                  autoFocus
                  placeholder={`Reply to ${replyingTo.name}…`}
                  initialText={`@${replyingTo.name.replace(/\s+/g, "")} `}
                />
              ) : (
                <CommentInput
                  user={user}
                  onSubmit={handleComment}
                  inputRef={cardInputRef}
                />
              )}
            </div>
          )}

        </CardContent>
      </Card>
  );
}
