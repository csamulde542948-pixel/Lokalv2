import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { avatarSrc, DEFAULT_AVATAR } from "../../lib/defaults";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import {
  ThumbsUp, MessageCircle, Share2, MoreHorizontal,
  UserPlus, UserCheck, Bookmark, BookmarkCheck,
  Send, Trash2, Image as ImageIcon,
  Video, X as XIcon, ChevronLeft, ChevronRight,
  Pencil, History, AtSign, Flame, EyeOff, Pin, PinOff, BadgeCheck,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "../../contexts/AuthContext";
import { SharePostDialog } from "./share-post-dialog";

/* ─── Verified Badge ──────────────────────────────────────────────────────── */
/**
 * Facebook-style blue verified checkmark shown next to the Lokalhost account name.
 * isVerified comes from profiles.isVerified in the DB.
 */
export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <BadgeCheck
      className={`w-4 h-4 fill-[#1877F2] text-white flex-shrink-0 ${className}`}
      aria-label="Verified account"
    />
  );
}


/* ─── GraphQL ─────────────────────────────────────────────────────────────── */
const GET_ME_AVATAR = gql`
  query PostCardGetMeAvatar {
    me { id avatarUrl }
  }
`;

export const COMMENT_ON_POST = gql`
  mutation CommentOnPost($input: CommentInput!) {
    commentOnPost(input: $input) {
      id content likesCount likedByMe myReaction parentId createdAt isEdited
      mentions repliesCount
      editHistory { id previousContent editedAt }
      author { id name displayName username avatarUrl }
    }
  }
`;
export const REPLY_TO_COMMENT = gql`
  mutation ReplyToComment($input: ReplyInput!) {
    replyToComment(input: $input) {
      id content likesCount likedByMe myReaction parentId createdAt isEdited
      mentions
      editHistory { id previousContent editedAt }
      author { id name displayName username avatarUrl }
    }
  }
`;
export const LIKE_COMMENT = gql`
  mutation LikeComment($commentId: ID!, $reaction: String) {
    likeComment(commentId: $commentId, reaction: $reaction) { id likesCount likedByMe myReaction }
  }
`;
export const UNLIKE_COMMENT = gql`
  mutation UnlikeComment($commentId: ID!) {
    unlikeComment(commentId: $commentId) { id likesCount likedByMe myReaction }
  }
`;
export const EDIT_COMMENT = gql`
  mutation EditComment($commentId: ID!, $content: String!) {
    editComment(commentId: $commentId, content: $content) {
      id content likesCount likedByMe myReaction parentId createdAt isEdited
      editHistory { id previousContent editedAt }
      author { id name username avatarUrl }
    }
  }
`;
export const DELETE_COMMENT = gql`
  mutation DeleteComment($commentId: ID!) { deleteComment(commentId: $commentId) }
`;
const DELETE_POST = gql`
  mutation DeletePost($id: ID!) { deletePost(id: $id) }
`;

const GET_COMMENT_REPLIES = gql`
  query GetCommentReplies($commentId: ID!, $limit: Int, $offset: Int) {
    commentReplies(commentId: $commentId, limit: $limit, offset: $offset) {
      id content likesCount likedByMe myReaction parentId createdAt isEdited mentions repliesCount
      editHistory { id previousContent editedAt }
      author { id name displayName username avatarUrl }
      replies {
        id content likesCount likedByMe myReaction parentId createdAt isEdited mentions repliesCount
        editHistory { id previousContent editedAt }
        author { id name displayName username avatarUrl }
      }
    }
  }
`;
const MARK_NOT_INTERESTED = gql`
  mutation MarkNotInterested($postId: ID!) { markNotInterestedInPost(postId: $postId) }
`;

const ROAST_REACT_PC = gql`
  mutation RoastReactShared($postId: ID!) {
    roastReact(postId: $postId) { id roastReactionCount roastReactedByMe }
  }
`;
const MY_ROAST_TOKENS_PC = gql`
  query MyRoastTokensShared { myRoastTokens { used allowance remaining resetsAt } }
`;
const ROAST_REACTORS_PC = gql`
  query RoastReactorsShared($postId: ID!) { roastReactors(postId: $postId) { id name username avatarUrl } }
`;

const GET_POST_COMMENTS = gql`
  query GetPostComments($postId: ID!, $limit: Int, $offset: Int) {
    post(id: $postId) {
      id
      comments(limit: $limit, offset: $offset) {
        id content likesCount likedByMe myReaction parentId createdAt isEdited mentions repliesCount
        editHistory { id previousContent editedAt }
        author { id name displayName username avatarUrl }
        replies {
          id content likesCount likedByMe myReaction parentId createdAt isEdited mentions repliesCount
          editHistory { id previousContent editedAt }
          author { id name displayName username avatarUrl }
          replies {
            id content likesCount likedByMe myReaction parentId createdAt isEdited mentions repliesCount
            editHistory { id previousContent editedAt }
            author { id name displayName username avatarUrl }
          }
        }
      }
    }
  }
`;

/* ─── Types ───────────────────────────────────────────────────────────────── */
export interface OriginalPost {
  id: string;
  author: { id?: string; name: string; username: string; avatarUrl?: string; isVerified?: boolean; rank?: { name: string } | null };
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  projectName?: string;
  postType?: "post" | "roast";
  tags?: { id: string | number; name: string }[];
  createdAt?: string;
  roastReactedByMe?: boolean;
  roastReactionCount?: number;
}

export interface Post {
  id: string;
  author: { id?: string; name: string; avatar: string; username: string; isVerified?: boolean; rank?: { name: string } | null };
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
  originalPost?: OriginalPost | null;
  isPinnedToFeed?: boolean;
}

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onDelete?: () => void;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  onNotInterested?: (postId: string) => void;
  onOpenPostModal?: (postId: string) => void;
  onPinToggle?: () => void;
}

/* ─── Reactions (Facebook-style + Fire) ────────────────────────────────────── */
export const REACTIONS = [
  { emoji: "👍", label: "Like",  color: "text-blue-500"   },
  { emoji: "❤️", label: "Love",  color: "text-red-500"    },
  { emoji: "😂", label: "Haha",  color: "text-yellow-500" },
  { emoji: "😮", label: "Wow",   color: "text-yellow-500" },
  { emoji: "😢", label: "Sad",   color: "text-blue-400"   },
  { emoji: "😡", label: "Angry", color: "text-orange-600" },
  { emoji: "🔥", label: "Fire",  color: "text-orange-500" },
];

// Same set used for comment reactions
export const COMMENT_REACTIONS = REACTIONS;

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
const OG_BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";

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

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowLeft")   prev();
      if (e.key === "ArrowRight")  next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black"
      style={{ zIndex: 99999 }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
        style={{ zIndex: 100001 }}
      >
        <XIcon className="w-5 h-5" />
      </button>

      {/* Counter */}
      {imgs.length > 1 && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium select-none"
          style={{ zIndex: 100001 }}
        >
          {idx + 1} / {imgs.length}
        </div>
      )}

      {/* Prev arrow */}
      {imgs.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
          style={{ zIndex: 100001 }}
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
      )}

      {/* Main image — fills as much of the viewport as possible */}
      <img
        key={idx}
        src={imgs[idx]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        draggable={false}
        className="select-none object-contain"
        style={{
          maxWidth: "calc(100vw - 120px)",
          maxHeight: "calc(100vh - 120px)",
          width: "auto",
          height: "auto",
          zIndex: 100000,
        }}
      />

      {/* Next arrow */}
      {imgs.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
          style={{ zIndex: 100001 }}
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      )}

      {/* Thumbnail strip (2+ images) */}
      {imgs.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
          style={{ zIndex: 100001 }}
          onClick={(e) => e.stopPropagation()}
        >
          {imgs.map((src, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-12 h-12 rounded overflow-hidden border-2 flex-shrink-0 transition-all duration-150 ${
                i === idx ? "border-white scale-110" : "border-white/30 opacity-50 hover:opacity-90"
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
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
        <div className="px-2 sm:px-4 py-2">
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
        <div className="px-2 sm:px-4 py-2">
          <div className="flex gap-1.5" style={{ height: 280 }}>
            <Img src={imgs[0]} index={0} className="flex-1" />
            <Img src={imgs[1]} index={1} className="flex-1" />
          </div>
        </div>
      )}

      {/* ── 3 images ─────────────────────────────────────────────────── */}
      {total === 3 && (
        <div className="px-2 sm:px-4 py-2">
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
        <div className="px-2 sm:px-4 py-2">
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
        <div className="px-2 sm:px-4 py-2">
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

/* ─── SharedPostPreview ──────────────────────────────────────────────────── */
// Renders the original post as a nested card — roast or standard layout.
// Pixel-perfect match of the real card inner layouts. Not recursive.
export function SharedPostPreview({ post, onOpenPost }: { post: OriginalPost; onOpenPost?: (postId: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();

  // ── 🔥 Roast React state (only active when isRoast) ───────────────
  const isRoast = (post.postType === "roast" ||
    (post.tags ?? []).some((t) => t.name === "roast"));
  const isOwnPost = !!user && !!post.author.id && user.id === post.author.id;

  const [roastReacted,      setRoastReacted]      = useState(post.roastReactedByMe ?? false);
  const [roastReactCount,   setRoastReactCount]   = useState(post.roastReactionCount ?? 0);
  const [roastReactError,   setRoastReactError]   = useState<string | null>(null);
  const [roastReactLoading, setRoastReactLoading] = useState(false);
  const [flameHovered,      setFlameHovered]      = useState(false);
  const [showReactors,      setShowReactors]      = useState(false);

  const [doRoastReact] = useMutation(ROAST_REACT_PC);
  const { data: tokenData, refetch: refetchTokens } = useQuery(MY_ROAST_TOKENS_PC, {
    skip: !user || !isRoast || isOwnPost,
    fetchPolicy: "network-only",
  });
  const tokensRemaining: number  = (tokenData as any)?.myRoastTokens?.remaining ?? 999;
  const tokenDataLoaded: boolean = !!(tokenData as any)?.myRoastTokens;
  const tokenAllowance: number   = (tokenData as any)?.myRoastTokens?.allowance  ?? 1;

  const [fetchReactors, { data: reactorsData, loading: reactorsLoading }] = useLazyQuery(ROAST_REACTORS_PC, {
    fetchPolicy: "network-only",
  });

  async function handleRoastReact(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user || isOwnPost || roastReacted) return;
    if (tokenDataLoaded && tokensRemaining === 0) { setRoastReactError("No 🔥 tokens left today. Balik bukas! 🕛"); return; }
    setRoastReactLoading(true);
    setRoastReactError(null);
    setRoastReacted(true);
    setRoastReactCount((n) => n + 1);
    try {
      await doRoastReact({ variables: { postId: post.id } });
      refetchTokens();
    } catch (err: any) {
      setRoastReacted(false);
      setRoastReactCount((n) => Math.max(0, n - 1));
      const msg: string = err?.message ?? "";
      if (msg.startsWith("ROAST_TOKEN_EXHAUSTED:")) {
        const limit = msg.split(":")[1];
        setRoastReactError(`No 🔥 tokens left today (${limit}/${limit} used). Balik bukas! 🕛`);
      } else if (msg.includes("already gave")) {
        setRoastReacted(true); setRoastReactError(null);
      } else {
        setRoastReactError("Failed to send 🔥 react. Try again.");
      }
    } finally {
      setRoastReactLoading(false);
    }
  }

  const imgs = (post.imageUrls && post.imageUrls.length > 0)
    ? post.imageUrls
    : post.imageUrl ? [post.imageUrl] : [];
  const coverImage = imgs[0];

  const profileHref = post.author.username
    ? `/profile/${post.author.username.replace(/^@/, "")}`
    : "/profile";

  const cleanContent = post.content.replace(/\[shared:[^\]]+\]/g, "").trim();
  const projectName = post.projectName ?? "Unknown Project";
  const avatarFallbackUrl = DEFAULT_AVATAR;

  /* ── Roast-style card ─────────────────────────────────────────────── */
  if (isRoast) {
    // Extract URL/domain from content for favicon
    const urlMatch = cleanContent.match(/https?:\/\/[^\s\)\]>"']+/i);
    const projectUrl = urlMatch?.[0] ?? null;
    const projectDomain = projectUrl
      ? (() => { try { return new URL(projectUrl).hostname.replace(/^www\./, ""); } catch { return null; } })()
      : null;
    const faviconUrl = projectUrl
      ? (() => { try { return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(projectUrl).origin)}&sz=64`; } catch { return null; } })()
      : null;

    const COLLAPSE_LIMIT = 280;
    const needsReadMore = cleanContent.length > COLLAPSE_LIMIT;
    const displayText = needsReadMore && !expanded
      ? cleanContent.slice(0, COLLAPSE_LIMIT).trimEnd() + "…"
      : cleanContent;

    const authorAvatar = post.author.avatarUrl
      ?? avatarFallbackUrl;

    return (
      <Card
        className={`overflow-hidden border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm rounded-xl gap-0 ${onOpenPost ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}
        onClick={onOpenPost ? () => onOpenPost(post.id) : undefined}
      >
        <CardContent className="p-0 [&:last-child]:pb-0">

          {/* Author header — matches RoastedProjectCard header exactly */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Link to={profileHref} className="flex-shrink-0 focus:outline-none" onClick={(e) => e.stopPropagation()}>
              <Avatar className="w-10 h-10">
                <AvatarImage src={authorAvatar} />
                <AvatarFallback>{post.author.name[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={profileHref} className="font-semibold text-sm hover:underline leading-tight" onClick={(e) => e.stopPropagation()}>
                  {post.author.name}
                </Link>
                {post.author.isVerified && <VerifiedBadge />}
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 h-4 gap-1">
                  <Flame className="w-2.5 h-2.5" strokeWidth={2.5} />
                  Got Roasted
                </Badge>
              </div>
              {post.createdAt && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <span>{timeAgo(post.createdAt)}</span>
                  <span>·</span>
                  <span className="text-[10px]">🌐</span>
                </div>
              )}
            </div>
          </div>

          {/* Inner roast card — matches the mx-4 mb-3 inner card exactly */}
          <div className="mx-4 mb-3 border-2 border-primary/25 rounded-xl overflow-hidden bg-card shadow-sm">

            {/* Project header */}
            <div className="bg-gradient-to-r from-primary/12 via-primary/8 to-primary/4 border-b border-primary/20 px-4 py-3">
              <div className="flex items-center gap-3">

                {/* Favicon / brand logo */}
                <div className="relative w-8 h-8 flex-shrink-0">
                  {faviconUrl && (
                    <img
                      src={faviconUrl}
                      alt=""
                      className="w-8 h-8 rounded-md object-contain bg-muted/30 p-0.5 absolute inset-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <div className={`w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center ${faviconUrl ? "opacity-0" : "opacity-100"}`}>
                    <Flame className="w-4 h-4 text-primary" strokeWidth={2.5} />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  {projectUrl ? (
                    <a
                      href={projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-sm truncate hover:underline text-foreground block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {projectName}
                    </a>
                  ) : (
                    <span className="font-bold text-sm truncate block">{projectName}</span>
                  )}
                  {projectDomain && (
                    <span className="text-[11px] text-muted-foreground truncate block">{projectDomain}</span>
                  )}
                </div>

                {/* 🔥 Roast it! button for shared roast posts */}
                {user && (
                  <div className="relative ml-auto flex-shrink-0">
                    {isOwnPost ? (
                      <Popover
                        open={showReactors}
                        onOpenChange={(open) => {
                          setShowReactors(open);
                          if (open && roastReactCount > 0) {
                            fetchReactors({ variables: { postId: post.id } });
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            title={roastReactCount > 0 ? "See who roasted this" : "No roast reacts yet"}
                            className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all duration-200 ${
                              roastReactCount > 0
                                ? "bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/50 cursor-pointer active:scale-95"
                                : "bg-muted/50 border-border text-muted-foreground opacity-50 cursor-default"
                            }`}
                          >
                            <span className={`text-[13px] leading-none select-none ${roastReactCount > 0 ? "roast-flame-idle" : ""}`}>🔥</span>
                            <span>{roastReactCount > 0 ? `${roastReactCount} Roasted` : "0 Roasted"}</span>
                          </button>
                        </PopoverTrigger>
                        {roastReactCount > 0 && (
                          <PopoverContent align="end" className="w-56 p-2" onClick={(e) => e.stopPropagation()}>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">🔥 Roasted by</p>
                            {reactorsLoading ? (
                              <p className="text-xs text-muted-foreground text-center py-2">Loading…</p>
                            ) : (
                              <ul className="space-y-1 max-h-48 overflow-y-auto">
                                {((reactorsData as any)?.roastReactors ?? []).map((r: any) => (
                                  <li key={r.id}>
                                    <Link
                                      to={`/profile/${r.username}`}
                                      className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 transition-colors"
                                      onClick={(e) => { e.stopPropagation(); setShowReactors(false); }}
                                    >
                                      <img src={avatarSrc(r.avatarUrl)} alt={r.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium truncate leading-tight">{r.name}</p>
                                        <p className="text-[10px] text-muted-foreground truncate leading-tight">@{r.username}</p>
                                      </div>
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </PopoverContent>
                        )}
                      </Popover>
                    ) : (
                      <>
                        <button
                          onClick={handleRoastReact}
                          onMouseEnter={() => setFlameHovered(true)}
                          onMouseLeave={() => setFlameHovered(false)}
                          disabled={roastReacted || roastReactLoading || (tokenDataLoaded && tokensRemaining === 0)}
                          title={
                            roastReacted ? "Already roasted!"
                              : tokenDataLoaded && tokensRemaining === 0 ? `No tokens left — resets midnight Manila 🕛`
                              : tokenDataLoaded ? `${tokensRemaining}/${tokenAllowance} token${tokenAllowance === 1 ? "" : "s"} left today`
                              : "Roast it!"
                          }
                          className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all duration-200 disabled:cursor-not-allowed ${
                            roastReacted
                              ? "bg-orange-500/15 border-orange-500/40 text-orange-400 opacity-80 shadow-[0_0_8px_2px_rgba(249,115,22,0.25)]"
                              : (tokenDataLoaded && tokensRemaining === 0)
                              ? "bg-muted/50 border-border text-muted-foreground opacity-50"
                              : "roast-btn-glow bg-primary/10 border-primary/30 text-primary hover:bg-orange-500/15 hover:border-orange-500/50 hover:text-orange-400 hover:shadow-[0_0_14px_4px_rgba(249,115,22,0.38)] active:scale-95"
                          }`}
                        >
                          <span className={`text-[13px] leading-none select-none ${
                            roastReacted ? "roast-flame-done"
                              : flameHovered && (!tokenDataLoaded || tokensRemaining > 0) ? "roast-flame-hover"
                              : (!tokenDataLoaded || tokensRemaining > 0) ? "roast-flame-idle"
                              : ""
                          }`}>🔥</span>
                          <span>{roastReactLoading ? "…" : roastReacted ? "Roasted!" : "Roast it!"}</span>
                          {!roastReacted && tokenDataLoaded && tokensRemaining > 0 && (
                            <span className="text-[9px] font-mono bg-orange-500/20 text-orange-400 px-1 rounded leading-none">
                              {tokensRemaining}/{tokenAllowance}
                            </span>
                          )}
                        </button>
                        {roastReactError && (
                          <p className="absolute top-full mt-1 right-0 text-[9px] text-destructive font-mono leading-tight pointer-events-none whitespace-nowrap">
                            {roastReactError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Screenshot banner */}
            {coverImage && (
              <div className="relative w-full overflow-hidden bg-muted/20" style={{ aspectRatio: "16/9" }}>
                <img
                  src={coverImage}
                  alt={projectName}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }}
                />
                {/* Scanline texture overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-20"
                  style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)" }} />
                {/* Bottom fade */}
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
                {/* 🔥 ROASTED watermark */}
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
                  style={{ background: "rgba(234,88,12,0.85)", color: "#fff", backdropFilter: "blur(4px)" }}>
                  <span>🔥</span> ROASTED
                </div>
              </div>
            )}

            {/* Roast body */}
            <div className="p-4 bg-gradient-to-b from-transparent to-primary/5">
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                {displayText}
              </p>
              {needsReadMore && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                  className="text-xs font-semibold text-primary hover:underline mt-1 block"
                >
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          </div>

        </CardContent>
      </Card>
    );
  }

  /* ── Standard post card ───────────────────────────────────────────── */
  const detectedUrl = imgs.length === 0 ? extractFirstUrl(cleanContent) : null;

  return (
    <Card
      className={`overflow-hidden border bg-card shadow-sm rounded-xl gap-0 ${onOpenPost ? "cursor-pointer hover:border-primary/30 transition-colors" : ""}`}
      onClick={onOpenPost ? () => onOpenPost(post.id) : undefined}
    >
      <CardContent className="p-0 [&:last-child]:pb-0">

        {/* Header — matches PostCard header exactly */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to={profileHref} className="rounded-full flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={(e) => e.stopPropagation()}>
            <Avatar className="w-10 h-10">
              <AvatarImage src={post.author.avatarUrl ?? avatarFallbackUrl} />
              <AvatarFallback>{post.author.name?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link to={profileHref} className="font-semibold text-sm hover:underline leading-tight">
                {post.author.name}
              </Link>
              {post.author.isVerified && <VerifiedBadge />}
              {post.projectName && (
                <Badge variant="secondary" className="text-xs rounded-md font-normal px-2 py-0 h-4">
                  {post.projectName}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              {post.createdAt && <span>{timeAgo(post.createdAt)}</span>}
              {post.createdAt && <span>·</span>}
              <span className="text-[10px]">🌐</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {cleanContent && (
          <div className="px-4 pb-3">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words line-clamp-5">
              {cleanContent}
            </p>
          </div>
        )}

        {/* Link preview (only when no images) */}
        {detectedUrl && <LinkPreviewCard url={detectedUrl} />}

        {/* Media grid */}
        {imgs.length > 0 && <MediaGrid imgs={imgs} />}

      </CardContent>
    </Card>
  );
}

/* ─── Internal comment shape ──────────────────────────────────────────────── */
export interface CommentEditEntry {
  id: string;
  previousContent: string;
  editedAt: string;
}

export interface CommentData {
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
  repliesCount: number;
}

/* ─── CommentItem ─────────────────────────────────────────────────────────── */
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
  const fetchedReplies: CommentData[] = (repliesData?.commentReplies ?? []).map((c: any): CommentData => ({
    id: c.id,
    content: c.content,
    likesCount: c.likesCount ?? 0,
    likedByMe: c.likedByMe ?? false,
    myReaction: c.myReaction ?? null,
    parentId: c.parentId ?? null,
    mentions: c.mentions ?? [],
    isEdited: c.isEdited ?? false,
    editHistory: (c.editHistory ?? []).map((e: any) => ({
      id: e.id, previousContent: e.previousContent, editedAt: e.editedAt,
    })),
    createdAt: c.createdAt,
    repliesCount: c.repliesCount ?? (c.replies?.length ?? 0),
    replies: (c.replies ?? []).map((r: any): CommentData => ({
      id: r.id, content: r.content, likesCount: r.likesCount ?? 0,
      likedByMe: r.likedByMe ?? false, myReaction: r.myReaction ?? null,
      parentId: r.parentId ?? null, mentions: r.mentions ?? [],
      isEdited: r.isEdited ?? false,
      editHistory: (r.editHistory ?? []).map((e: any) => ({
        id: e.id, previousContent: e.previousContent, editedAt: e.editedAt,
      })),
      createdAt: r.createdAt, repliesCount: r.repliesCount ?? 0, replies: [],
      author: {
        id: r.author?.id, name: r.author?.displayName ?? r.author?.username ?? r.author?.name ?? "Unknown",
        username: r.author?.username ?? "", avatarUrl: r.author?.avatarUrl,
      },
    })),
    author: {
      id: c.author?.id, name: c.author?.displayName ?? c.author?.username ?? c.author?.name ?? "Unknown",
      username: c.author?.username ?? "", avatarUrl: c.author?.avatarUrl,
    },
  }));

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
                    {selectedReaction && <span className="text-xs leading-none">{selectedReaction.emoji}</span>}
                    {likeLabel}{localLikes > 0 ? ` · ${localLikes}` : ""}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top" align="start"
                  className="w-auto p-1.5 rounded-full shadow-xl border bg-popover"
                  onMouseLeave={handleCommentPickerMouseLeave}
                >
                  <div className="flex gap-0.5 items-center">
                    {COMMENT_REACTIONS.map((r) => (
                      <button
                        key={r.label} title={r.label}
                        onClick={() => pickCommentReaction(r)}
                        className={`text-xl p-1 rounded-full transition-all duration-150 hover:scale-150 hover:-translate-y-2 ${
                          selectedReaction?.label === r.label ? "scale-125 -translate-y-1" : "scale-100"
                        }`}
                      >
                        {r.emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

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
      {depth < 3 && hasReplies && (
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

/* ─── CommentInput (shared by card + modal) ───────────────────────────────── */
export interface MentionUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export function CommentInput({
  user,
  avatarUrl,
  onSubmit,
  inputRef,
  autoFocus = false,
  placeholder = "Write a comment…",
  initialText = "",
  mentionUsers = [],
}: {
  user: { id: string; email?: string } | null;
  avatarUrl?: string;
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
        <Link to="/login" className="underline font-medium">Sign in</Link> to comment
      </p>
    );
  }

  const canSend = !submitting && (!!text.trim() || !!media);

  return (
    <div className="flex gap-2 items-end">
      <Avatar className="w-7 h-7 flex-shrink-0 mb-1">
        <AvatarImage src={avatarSrc(avatarUrl)} />
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
  onNotInterested,
  onOpenPostModal,
  onPinToggle,
}: PostCardProps) {
  const { user } = useAuth();
  const { data: meData } = useQuery(GET_ME_AVATAR, {
    skip: !user,
    fetchPolicy: "cache-first",
  });
  const myAvatarUrl = meData?.me?.avatarUrl;

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
  const commentsFetchedRef = useRef(false);

  const [commentsError, setCommentsError] = useState(false);

  // Lazy query — fires to load full comment thread
  // NOTE: Apollo Client v4 removed onCompleted/onError from useLazyQuery options.
  // We watch the result reactively via useEffect instead.
  const [fetchComments, { loading: commentsLoading, data: commentsQueryData, error: commentsQueryError }] = useLazyQuery(GET_POST_COMMENTS, {
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (!commentsQueryData) return;
    const fetched: any[] = (commentsQueryData as any)?.post?.comments ?? [];
    setLocalComments(fetched.map(adaptFetchedComment));
    if (fetched.length > 0) setLocalCommentCount(fetched.length);
    commentsFetchedRef.current = true;
    setCommentsError(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentsQueryData]);

  useEffect(() => {
    if (!commentsQueryError) return;
    commentsFetchedRef.current = false;
    setCommentsError(true);
  }, [commentsQueryError]);

  function doFetchComments() {
    commentsFetchedRef.current = false;
    setCommentsError(false);
    fetchComments({ variables: { postId: post.id, limit: 50, offset: 0 } });
  }

  // Map a fetched comment (raw GQL shape) into CommentData
  function adaptFetchedComment(c: any): CommentData {
    return {
      id: c.id,
      content: c.content,
      likesCount: c.likesCount ?? 0,
      likedByMe: c.likedByMe ?? false,
      myReaction: c.myReaction ?? null,
      parentId: c.parentId ?? null,
      mentions: c.mentions ?? [],
      isEdited: c.isEdited ?? false,
      editHistory: (c.editHistory ?? []).map((e: any) => ({
        id: e.id, previousContent: e.previousContent, editedAt: e.editedAt,
      })),
      createdAt: c.createdAt,
      repliesCount: c.repliesCount ?? (c.replies?.length ?? 0),
      replies: (c.replies ?? []).map(adaptFetchedComment),
      author: {
        id: c.author?.id,
        name: c.author?.displayName ?? c.author?.username ?? c.author?.name ?? "Unknown",
        username: c.author?.username ?? "",
        avatarUrl: c.author?.avatarUrl,
      },
    };
  }

  // Reply state — which comment are we replying to?
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string; visualParentId?: string; topLevelId?: string } | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  // UI
  const [bookmarked,  setBookmarked]  = useState(false);
  const [shareOpen,   setShareOpen]   = useState(false);
  const [localShares, setLocalShares] = useState(post.shares);

  const hoverTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardInputRef = useRef<HTMLTextAreaElement>(null);

  const [commentOnPost]         = useMutation(COMMENT_ON_POST);
  const [replyToComment]        = useMutation(REPLY_TO_COMMENT);
  const [likeCommentMutation]   = useMutation(LIKE_COMMENT);
  const [unlikeCommentMutation] = useMutation(UNLIKE_COMMENT);
  const [editCommentMutation]   = useMutation(EDIT_COMMENT);
  const [deleteCommentMutation] = useMutation(DELETE_COMMENT);
  const [deletePostMutation]    = useMutation(DELETE_POST);
  const [notInterestedMutation]  = useMutation(MARK_NOT_INTERESTED);
  const [hidden, setHidden]      = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);

  useEffect(() => {
    setLocalLiked(post.likedByMe ?? false);
    setLocalLikes(post.likes);
    setSelectedReaction(post.myReaction ? (REACTIONS.find(r => r.label === post.myReaction) ?? null) : null);
  }, [post.likedByMe, post.likes, post.myReaction]);

  useEffect(() => {
    setLocalCommentCount(post.comments);
  }, [post.comments]);

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
    if (!commentsFetchedRef.current) {
      doFetchComments();
    }
    setReplyingTo(null);
    setTimeout(() => cardInputRef.current?.focus(), 50);
  }

  function startReply(parentId: string, parentName: string, visualParentId?: string, topLevelId?: string) {
    setShowComments(true);
    if (!commentsFetchedRef.current) doFetchComments();
    setReplyingTo({ id: parentId, name: parentName, visualParentId, topLevelId });
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
      repliesCount: 0,
      replies:    [],
      author: {
        id:        user!.id,
        name:      (user as any)?.displayName ?? (user as any)?.username ?? user!.email?.split("@")[0] ?? "You",
        username:  (user as any)?.username ?? "you",
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
        const raw = data.commentOnPost;
        setLocalComments((prev) =>
          prev.map((c) =>
            c.id === temp.id
              ? {
                  ...raw,
                  mediaUrl, mediaType, replies: [],
                  author: {
                    id: raw.author?.id,
                    name: raw.author?.displayName ?? raw.author?.username ?? raw.author?.name ?? "Unknown",
                    username: raw.author?.username ?? "",
                    avatarUrl: raw.author?.avatarUrl,
                  },
                }
              : c
          )
        );
        // Re-fetch full comment thread so count + replies stay in sync for everyone
        doFetchComments();
      }
    } catch {
      setLocalComments((prev) => prev.filter((c) => c.id !== temp.id));
      setLocalCommentCount((v) => Math.max(0, v - 1));
    }
  }

  async function handleReply(text: string, _mediaUrl?: string, _mediaType?: string, mentions?: string[]) {
    if (!text.trim() || !replyingTo) return;

    const parentId = replyingTo.id;           // direct parent (stored in DB)
    const visualParentId = replyingTo.visualParentId; // depth-1 item to nest under visually
    // Top-level ID: walk up to find it for optimistic update (top-level = no visualParentId chain)
    // When visualParentId is set we must find the top-level comment to update its nested structure
    const topId = replyingTo.topLevelId ?? parentId;
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
      repliesCount: 0,
      replies:    [],
      author: {
        id:        user!.id,
        name:      (user as any)?.displayName ?? (user as any)?.username ?? user!.email?.split("@")[0] ?? "You",
        username:  (user as any)?.username ?? "you",
        avatarUrl: undefined,
      },
    };

    // Optimistically add to local state:
    // - depth-0 reply: add to top-level comment's replies[]
    // - depth-1 reply: add to the depth-1 comment's replies[] (nested under it)
    // - depth-2 reply: add to the depth-1 ancestor's replies[] (same thread, depth-2)
    setLocalComments((prev) =>
      prev.map((c) => {
        if (!visualParentId) {
          // Replying to a top-level comment → add directly
          return c.id === parentId ? { ...c, replies: [...c.replies, temp] } : c;
        }
        // Replying to a depth-1 or depth-2 comment → find top-level, then nest under visualParentId
        if (c.id !== topId) return c;
        return {
          ...c,
          replies: c.replies.map((r) =>
            r.id === visualParentId
              ? { ...r, replies: [...r.replies, temp] }
              : r
          ),
        };
      })
    );
    setLocalCommentCount((v) => v + 1);
    setReplyingTo(null);

    try {
      const { data } = await replyToComment({
        variables: { input: { postId: post.id, parentId, content: text, mentions: mentions ?? [] } },
      });
      if (data?.replyToComment) {
        // Re-fetch full comment thread so all reply levels stay in sync
        commentsFetchedRef.current = false;
        doFetchComments();
        setLocalComments((prev) =>
          prev.map((c) => {
            if (!visualParentId) {
              return c.id === parentId
                ? {
                    ...c,
                    replies: c.replies.map((r) =>
                      r.id === temp.id ? { ...data.replyToComment, replies: [] } : r
                    ),
                  }
                : c;
            }
            if (c.id !== topId) return c;
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === visualParentId
                  ? {
                      ...r,
                      replies: r.replies.map((sr) =>
                        sr.id === temp.id ? { ...data.replyToComment, replies: [] } : sr
                      ),
                    }
                  : r
              ),
            };
          })
        );
      }
    } catch {
      setLocalComments((prev) =>
        prev.map((c) => {
          if (!visualParentId) {
            return c.id === parentId
              ? { ...c, replies: c.replies.filter((r) => r.id !== temp.id) }
              : c;
          }
          if (c.id !== topId) return c;
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === visualParentId
                ? { ...r, replies: r.replies.filter((sr) => sr.id !== temp.id) }
                : r
            ),
          };
        })
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
      const replyCount = (comment?.replies ?? []).reduce((n, r) => n + 1 + r.replies.length, 0);
      setLocalComments((prev) => prev.filter((c) => c.id !== id));
      setLocalCommentCount((v) => Math.max(0, v - 1 - replyCount));
    } else {
      // Could be depth-1 or depth-2 — recurse through replies
      const isDepth1 = localComments.some((c) => c.replies.some((r) => r.id === id));
      setLocalComments((prev) =>
        prev.map((c) => ({
          ...c,
          replies: isDepth1
            ? c.replies.filter((r) => r.id !== id)
            : c.replies.map((r) => ({
                ...r,
                replies: r.replies.filter((sr) => sr.id !== id),
              })),
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

  async function handleNotInterested() {
    try {
      await notInterestedMutation({ variables: { postId: post.id } });
      setHidden(true);
      onNotInterested?.(post.id);
    } catch (e) {
      console.error(e);
    }
  }

  const isOwnPost  = !!user && user.id === post.author.id;
  const reactLabel = selectedReaction?.label ?? "Like";
  const reactColor = selectedReaction
    ? selectedReaction.color
    : "text-muted-foreground hover:text-foreground";

  if (hidden) {
    return (
      <Card className="overflow-hidden border bg-card shadow-sm rounded-xl opacity-50 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          <EyeOff className="w-4 h-4 inline mr-1 -mt-0.5" />
          This post has been hidden. We'll show you less like this.
        </p>
      </Card>
    );
  }

  return (
      <Card className={`overflow-hidden border bg-card shadow-sm rounded-xl gap-0 relative ${post.isPinnedToFeed ? "pt-6" : ""}`}>
        <CardContent className="p-0 [&:last-child]:pb-0">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Pinned indicator banner */}
            {post.isPinnedToFeed && (
              <div className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-4 py-1 bg-primary/10 border-b border-primary/20 text-[11px] font-medium text-primary rounded-t-xl">
                <Pin className="w-3 h-3" strokeWidth={2.5} />
                Pinned by Lokalhost
              </div>
            )}
            <Link to={post.author.username ? `/profile/${post.author.username.replace(/^@/, "")}` : "/profile"} className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0">
              <Avatar className="w-10 h-10">
                <AvatarImage src={avatarSrc(post.author.avatar)} />
                <AvatarFallback>{post.author.name[0]}</AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  to={post.author.username ? `/profile/${post.author.username.replace(/^@/, "")}` : "/profile"}
                  className="font-semibold text-sm hover:underline cursor-pointer leading-tight"
                >
                  {post.author.name}
                </Link>
                {post.author.isVerified && <VerifiedBadge />}
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
                    <><UserCheck className="w-3.5 h-3.5" strokeWidth={2} /><span className="hidden sm:inline">Following</span></>
                  ) : (
                    <><UserPlus className="w-3.5 h-3.5" strokeWidth={2} /><span className="hidden sm:inline">Follow</span></>
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
                  {!isOwnPost && (
                    <DropdownMenuItem
                      onClick={() => handleNotInterested()}
                      className="gap-2 cursor-pointer"
                    >
                      <EyeOff className="w-4 h-4" />Not interested
                    </DropdownMenuItem>
                  )}
                  {onPinToggle && (
                    <DropdownMenuItem
                      onClick={onPinToggle}
                      className="gap-2 cursor-pointer"
                    >
                      {post.isPinnedToFeed ? (
                        <><PinOff className="w-4 h-4" />Unpin from feed</>
                      ) : (
                        <><Pin className="w-4 h-4" />Pin to feed</>
                      )}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* ── Content ─────────────────────────────────────────────────── */}
          <div className="px-4 pb-3 space-y-2.5">
            {/* Strip any legacy [shared:...] markers from the visible text */}
            {(() => {
              const clean = post.content.replace(/\[shared:[^\]]+\]/g, "").trim();
              if (!clean) return null;
              const COLLAPSE_LIMIT = 300;
              const needsReadMore = clean.length > COLLAPSE_LIMIT;
              const displayText = needsReadMore && !contentExpanded
                ? clean.slice(0, COLLAPSE_LIMIT).trimEnd() + "…"
                : clean;
              return (
                <div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed break-words">{displayText}</p>
                  {needsReadMore && (
                    <button
                      onClick={() => setContentExpanded((v) => !v)}
                      className="text-xs font-semibold text-primary hover:underline mt-1 block"
                    >
                      {contentExpanded ? "See less" : "Read more"}
                    </button>
                  )}
                </div>
              );
            })()}
            {/* Nested original post preview (Facebook-style share) */}
            {post.originalPost && (
              <SharedPostPreview post={post.originalPost} onOpenPost={onOpenPostModal} />
            )}
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
          {(localLikes > 0 || localCommentCount > 0 || localShares > 0) && (
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
                    onClick={() => {
                      const next = !showComments;
                      setShowComments(next);
                      if (next && !commentsFetchedRef.current) {
                        doFetchComments();
                      }
                    }}
                    className="text-[12px] text-muted-foreground hover:underline"
                  >
                    {localCommentCount.toLocaleString()}{" "}
                    {localCommentCount === 1 ? "comment" : "comments"}
                  </button>
                )}
                {localShares > 0 && (
                  <span className="text-[12px] text-muted-foreground">
                    {localShares} {localShares === 1 ? "share" : "shares"}
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
            <button
              onClick={() => setShareOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-medium text-[13px] rounded-none"
            >
              <Share2 className="w-[18px] h-[18px]" strokeWidth={2} />
              <span>Share</span>
            </button>
          </div>

          {/* ── Share dialog ─────────────────────────────────────────────── */}
          <SharePostDialog
            post={{
              id: post.id,
              author: post.author,
              content: post.content,
              images: post.images,
              image: post.image,
              projectName: post.projectName,
              timestamp: post.timestamp,
            }}
            open={shareOpen}
            onOpenChange={setShareOpen}
            onShared={() => setLocalShares((v) => v + 1)}
          />

          {/* ── Comment section (collapsible) ────────────────────────────── */}
          {showComments && (
            <div className="border-t bg-muted/10 px-4 py-3 space-y-3">
              {/* Existing comments */}
              {commentsLoading && localComments.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-2">Loading comments…</div>
              )}
              {commentsError && (
                <div className="text-xs text-muted-foreground text-center py-2">
                  Couldn't load comments.{" "}
                  <button className="underline hover:text-foreground" onClick={doFetchComments}>Retry</button>
                </div>
              )}
              {!commentsLoading && !commentsError && localComments.length === 0 && commentsFetchedRef.current && (
                <div className="text-xs text-muted-foreground text-center py-2">No comments yet. Be the first!</div>
              )}
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
                  avatarUrl={myAvatarUrl}
                  onSubmit={handleReply}
                  inputRef={replyInputRef}
                  autoFocus
                  placeholder={`Reply to ${replyingTo.name}…`}
                  initialText={`@${replyingTo.name.replace(/\s+/g, "")} `}
                />
              ) : (
                <CommentInput
                  user={user}
                  avatarUrl={myAvatarUrl}
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
