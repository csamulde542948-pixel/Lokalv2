/**
 * PostModal — Facebook-style post detail modal
 *
 * Layout (wide screen):
 *  ┌────────────────────────────────────────────────────────────┐
 *  │  Author's post                                        [X]  │
 *  ├──────────────────────────┬─────────────────────────────────┤
 *  │                          │  Avatar  Name  · time  [Follow] │
 *  │   Post media (dark bg)   │  Post text content              │
 *  │   image carousel         │  Tags                           │
 *  │                          │  ─────────────────────────────  │
 *  │                          │  👍 124   8 comments  2 shares  │
 *  │                          │  ─────────────────────────────  │
 *  │                          │  [Like]  [Comment]  [Share]     │
 *  │                          │  ─────────────────────────────  │
 *  │                          │  Comment thread  (scrollable)   │
 *  │                          │                                 │
 *  │                          │  [Comment input pinned bottom]  │
 *  └──────────────────────────┴─────────────────────────────────┘
 */
import { createPortal } from "react-dom";
import { useState, useEffect, useRef } from "react";
import type React from "react";
import { Link } from "react-router";
import { gql } from "@apollo/client/core";
import { useLazyQuery, useMutation, useQuery } from "@apollo/client/react";
import {
  X as XIcon, Loader2, ThumbsUp, MessageCircle, Share2,
  UserPlus, UserCheck, ChevronLeft, ChevronRight, Flame,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  CommentItem, CommentInput, CommentData,
  COMMENT_ON_POST, REPLY_TO_COMMENT,
  LIKE_COMMENT, UNLIKE_COMMENT, EDIT_COMMENT, DELETE_COMMENT,
  REACTIONS,
} from "./post-card";
import { SharePostDialog } from "./share-post-dialog";
import { avatarSrc } from "../../lib/defaults";
import { useAuth } from "../../contexts/AuthContext";

/* ─── GQL ───────────────────────────────────────────────────────────────────── */
const GET_POST_MODAL = gql`
  query GetPostModalFull($id: ID!) {
    post(id: $id) {
      id content imageUrl imageUrls projectName
      likesCount commentsCount sharesCount
      likedByMe myReaction postType createdAt
      roastReactedByMe roastReactionCount
      author { id name displayName username avatarUrl isFollowedByMe }
      tags { id name }
      originalPost {
        id content imageUrl imageUrls projectName postType
        tags { id name }
        createdAt
        author { id name displayName username avatarUrl }
      }
      comments(limit: 50, offset: 0) {
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

const LIKE_POST_M   = gql`mutation LikePostMdl($postId: ID!, $reaction: String) { likePost(postId: $postId, reaction: $reaction) { id likesCount likedByMe myReaction } }`;
const UNLIKE_POST_M = gql`mutation UnlikePostMdl($postId: ID!) { unlikePost(postId: $postId) { id likesCount likedByMe myReaction } }`;
const FOLLOW_M      = gql`mutation FollowMdl($userId: ID!) { followUser(userId: $userId) { id isFollowedByMe } }`;
const UNFOLLOW_M    = gql`mutation UnfollowMdl($userId: ID!) { unfollowUser(userId: $userId) { id isFollowedByMe } }`;
const ROAST_REACT_M = gql`mutation RoastReactMdl($postId: ID!) { roastReact(postId: $postId) { id roastReactionCount roastReactedByMe } }`;
const MY_ROAST_TOKENS_Q = gql`query MyRoastTokensMdl { myRoastTokens { used allowance remaining resetsAt } }`;
const GET_ME_AVATAR = gql`query PostModalGetMeAvatar { me { id avatarUrl } }`;

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "Just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function adaptComment(c: any): CommentData {
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
    replies: (c.replies ?? []).map(adaptComment),
    author: {
      id: c.author?.id,
      name: c.author?.displayName ?? c.author?.username ?? c.author?.name ?? "Unknown",
      username: c.author?.username ?? "",
      avatarUrl: c.author?.avatarUrl,
    },
  };
}

/* ─── Image carousel (left panel) ──────────────────────────────────────────── */
function ImagePanel({ imgs }: { imgs: string[] }) {
  const [idx, setIdx] = useState(0);
  const prev = () => setIdx((i) => (i - 1 + imgs.length) % imgs.length);
  const next = () => setIdx((i) => (i + 1) % imgs.length);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft")  prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  });

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black select-none overflow-hidden">
      <img
        key={idx}
        src={imgs[idx]}
        alt=""
        className="max-w-full max-h-full object-contain"
        draggable={false}
      />

      {imgs.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {imgs.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? "bg-white scale-125" : "bg-white/40 hover:bg-white/70"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── PostModal ─────────────────────────────────────────────────────────────── */
interface PostModalProps { postId: string; onClose: () => void; notifType?: string; }

export function PostModal({ postId, onClose, notifType }: PostModalProps) {
  const { user } = useAuth();
  const { data: meAvatarData } = useQuery<{ me: { id: string; avatarUrl?: string } }>(GET_ME_AVATAR, {
    skip: !user,
    fetchPolicy: "cache-first",
  });
  const myAvatarUrl = meAvatarData?.me?.avatarUrl;

  const [fetchPost, { data: rawData, loading, error }] = useLazyQuery(GET_POST_MODAL, {
    fetchPolicy: "network-only",
  });
  const p: any = (rawData as any)?.post ?? null;

  /* ── mutations ── */
  const [likePostM]    = useMutation(LIKE_POST_M);
  const [unlikePostM]  = useMutation(UNLIKE_POST_M);
  const [followM]      = useMutation(FOLLOW_M);
  const [unfollowM]    = useMutation(UNFOLLOW_M);
  const [roastReactM]  = useMutation(ROAST_REACT_M);
  const [commentOnPost]  = useMutation(COMMENT_ON_POST);
  const [replyToComment] = useMutation(REPLY_TO_COMMENT);
  const [likeCommentM]   = useMutation(LIKE_COMMENT);
  const [unlikeCommentM] = useMutation(UNLIKE_COMMENT);
  const [editCommentM]   = useMutation(EDIT_COMMENT);
  const [deleteCommentM] = useMutation(DELETE_COMMENT);

  /* ── roast token query (only fires for roast posts) ── */
  const isRoastPostEarly = !!(
    notifType === "PROJECT_ROAST" ||
    p?.postType === "roast" ||
    (p?.tags ?? []).some((t: any) => t.name === "roast")
  );
  const { data: tokenData, refetch: refetchTokens } = useQuery(MY_ROAST_TOKENS_Q, {
    skip: !user || !isRoastPostEarly,
    fetchPolicy: "network-only",
  });
  const tokenDataLoaded: boolean = !!(tokenData as any)?.myRoastTokens;
  const tokensRemaining: number  = (tokenData as any)?.myRoastTokens?.remaining ?? 999;
  const tokenAllowance: number   = (tokenData as any)?.myRoastTokens?.allowance  ?? 1;

  /* ── local state ── */
  const [localLiked,       setLocalLiked]      = useState(false);
  const [localLikes,       setLocalLikes]      = useState(0);
  const [localShares,      setLocalShares]     = useState(0);
  const [selectedReaction, setSelectedReaction] = useState<typeof REACTIONS[0] | null>(null);
  const [reactionOpen,     setReactionOpen]    = useState(false);
  const [comments,         setComments]        = useState<CommentData[]>([]);
  const [commentCount,     setCommentCount]    = useState(0);
  const [replyingTo,       setReplyingTo]      = useState<{ id: string; name: string; visualParentId?: string; topLevelId?: string } | null>(null);
  const [isFollowing,      setIsFollowing]     = useState(false);
  const [shareOpen,        setShareOpen]       = useState(false);
  const [roastReacted,     setRoastReacted]    = useState(false);
  const [roastReactCount,  setRoastReactCount] = useState(0);
  const [roastReactError,  setRoastReactError] = useState<string | null>(null);
  const [roastReactLoading, setRoastReactLoading] = useState(false);
  const [flameHovered,     setFlameHovered]    = useState(false);

  const hoverTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null) as React.RefObject<HTMLTextAreaElement>;
  const replyInputRef   = useRef<HTMLTextAreaElement>(null) as React.RefObject<HTMLTextAreaElement>;
  const commentListRef  = useRef<HTMLDivElement>(null);

  /* seed local state on post load */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!p) return;
    setLocalLiked(p.likedByMe ?? false);
    setLocalLikes(p.likesCount ?? 0);
    setLocalShares(p.sharesCount ?? 0);
    setSelectedReaction(p.myReaction ? (REACTIONS.find((r: any) => r.label === p.myReaction) ?? null) : null);
    setComments((p.comments ?? []).map(adaptComment));
    setCommentCount(p.commentsCount ?? 0);
    setIsFollowing(p.author?.isFollowedByMe ?? false);
    setRoastReacted(p.roastReactedByMe ?? false);
    setRoastReactCount(p.roastReactionCount ?? 0);
  }, [p?.id]);

  useEffect(() => {
    // Skip fetching for the sentinel value used when PROJECT_ROAST has no postId
    if (postId && postId !== "__roast_no_post__") {
      fetchPost({ variables: { id: postId } });
    }
  }, [postId]);

  /* Escape */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  /* scroll lock */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* ── like ── */
  function toggleLike() {
    const next = !localLiked;
    setLocalLiked(next);
    setLocalLikes((v) => (next ? v + 1 : Math.max(0, v - 1)));
    setSelectedReaction(next ? (REACTIONS.find((r: any) => r.label === "Like") ?? null) : null);
    if (next) likePostM({ variables: { postId: p.id, reaction: "Like" } }).catch(console.error);
    else       unlikePostM({ variables: { postId: p.id } }).catch(console.error);
  }

  function pickReaction(r: typeof REACTIONS[0]) {
    setReactionOpen(false);
    if (selectedReaction?.label === r.label) {
      setSelectedReaction(null); setLocalLiked(false);
      setLocalLikes((v) => Math.max(0, v - 1));
      unlikePostM({ variables: { postId: p.id } }).catch(console.error);
    } else {
      setSelectedReaction(r);
      if (!localLiked) { setLocalLiked(true); setLocalLikes((v) => v + 1); }
      likePostM({ variables: { postId: p.id, reaction: r.label } }).catch(console.error);
    }
  }

  /* ── follow ── */
  async function handleFollowToggle() {
    const next = !isFollowing;
    setIsFollowing(next);
    try {
      if (next) await followM({ variables: { userId: p.author.id } });
      else      await unfollowM({ variables: { userId: p.author.id } });
    } catch { setIsFollowing(!next); }
  }

  /* ── roast react ── */
  async function handleRoastReact() {
    if (!user || isOwnPost || roastReacted) return;
    if (tokenDataLoaded && tokensRemaining === 0) {
      setRoastReactError(`No 🔥 tokens left today. Balik bukas! 🕛`);
      return;
    }
    setRoastReactLoading(true);
    setRoastReactError(null);
    setRoastReacted(true);
    setRoastReactCount((n) => n + 1);
    try {
      await roastReactM({ variables: { postId: p.id } });
      refetchTokens();
    } catch (err: any) {
      setRoastReacted(false);
      setRoastReactCount((n) => Math.max(0, n - 1));
      const msg: string = err?.message ?? "";
      if (msg.startsWith("ROAST_TOKEN_EXHAUSTED:")) {
        const limit = msg.split(":")[1];
        setRoastReactError(`No 🔥 tokens left today (${limit}/${limit} used). Balik bukas! 🕛`);
      } else if (msg.includes("already gave")) {
        setRoastReacted(true);
        setRoastReactError(null);
      } else {
        setRoastReactError("Failed to send 🔥 react. Try again.");
      }
    } finally {
      setRoastReactLoading(false);
    }
  }

  /* ── comment ── */
  async function handleComment(text: string, _m?: string, _mt?: string, mentions?: string[]) {
    if (!text.trim()) return;
    const temp: CommentData = {
      id: `temp-${Date.now()}`, content: text, likesCount: 0,
      likedByMe: false, myReaction: null, parentId: null,
      mentions: mentions ?? [], isEdited: false, editHistory: [],
      createdAt: new Date().toISOString(), repliesCount: 0, replies: [],
      author: {
        id: user!.id,
        name: (user as any)?.displayName ?? (user as any)?.username ?? user!.email?.split("@")[0] ?? "You",
        username: (user as any)?.username ?? "you", avatarUrl: undefined,
      },
    };
    setComments((prev) => [...prev, temp]);
    setCommentCount((v) => v + 1);
    try {
      await commentOnPost({ variables: { input: { postId: p.id, content: text, mentions: mentions ?? [] } } });
      const res = await fetchPost({ variables: { id: postId } });
      const fresh = (res.data as any)?.post?.comments ?? [];
      setComments(fresh.map(adaptComment));
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== temp.id));
      setCommentCount((v) => Math.max(0, v - 1));
    }
  }

  /* ── reply ── */
  async function handleReply(text: string, _m?: string, _mt?: string, mentions?: string[]) {
    if (!text.trim() || !replyingTo) return;
    const { id: parentId, visualParentId, topLevelId } = replyingTo;
    const topId = topLevelId ?? parentId;
    const temp: CommentData = {
      id: `temp-reply-${Date.now()}`, content: text, likesCount: 0,
      likedByMe: false, myReaction: null, parentId,
      mentions: mentions ?? [], isEdited: false, editHistory: [],
      createdAt: new Date().toISOString(), repliesCount: 0, replies: [],
      author: {
        id: user!.id,
        name: (user as any)?.displayName ?? (user as any)?.username ?? user!.email?.split("@")[0] ?? "You",
        username: (user as any)?.username ?? "you", avatarUrl: undefined,
      },
    };
    setComments((prev) =>
      prev.map((c) => {
        if (!visualParentId) return c.id === parentId ? { ...c, replies: [...c.replies, temp] } : c;
        if (c.id !== topId) return c;
        return { ...c, replies: c.replies.map((r) => r.id === visualParentId ? { ...r, replies: [...r.replies, temp] } : r) };
      })
    );
    setCommentCount((v) => v + 1);
    setReplyingTo(null);
    try {
      await replyToComment({ variables: { input: { postId: p.id, parentId, content: text, mentions: mentions ?? [] } } });
      const res = await fetchPost({ variables: { id: postId } });
      const fresh = (res.data as any)?.post?.comments ?? [];
      setComments(fresh.map(adaptComment));
    } catch { /* keep optimistic */ }
  }

  /* ── comment like ── */
  async function handleLikeComment(commentId: string, wasLiked: boolean, reaction?: string) {
    try {
      if (wasLiked) await unlikeCommentM({ variables: { commentId } });
      else          await likeCommentM({ variables: { commentId, reaction: reaction ?? "Like" } });
    } catch { /* optimistic in CommentItem */ }
  }

  /* ── comment edit ── */
  async function handleEditComment(commentId: string, newContent: string) {
    const update = (c: CommentData): CommentData => {
      if (c.id === commentId) return { ...c, content: newContent, isEdited: true, editHistory: [{ id: `tmp-${Date.now()}`, previousContent: c.content, editedAt: new Date().toISOString() }, ...(c.editHistory ?? [])] };
      return { ...c, replies: c.replies.map(update) };
    };
    setComments((prev) => prev.map(update));
    await editCommentM({ variables: { commentId, content: newContent } }).catch(console.error);
  }

  /* ── comment delete ── */
  async function handleDeleteComment(id: string) {
    const isTop = comments.some((c) => c.id === id);
    if (isTop) {
      const c = comments.find((cc) => cc.id === id);
      const sub = (c?.replies ?? []).reduce((n, r) => n + 1 + r.replies.length, 0);
      setComments((prev) => prev.filter((cc) => cc.id !== id));
      setCommentCount((v) => Math.max(0, v - 1 - sub));
    } else {
      setComments((prev) => prev.map((c) => ({
        ...c,
        replies: c.replies.filter((r) => r.id !== id).map((r) => ({ ...r, replies: r.replies.filter((sr) => sr.id !== id) })),
      })));
      setCommentCount((v) => Math.max(0, v - 1));
    }
    await deleteCommentM({ variables: { commentId: id } }).catch(console.error);
  }

  /* ── start reply ── */
  function startReply(parentId: string, parentName: string, visualParentId?: string, topLevelId?: string) {
    setReplyingTo({ id: parentId, name: parentName, visualParentId, topLevelId });
    setTimeout(() => replyInputRef.current?.focus(), 50);
  }

  /* ── focus comment input ── */
  function focusCommentInput() {
    setReplyingTo(null);
    setTimeout(() => commentInputRef.current?.focus(), 50);
    commentListRef.current?.scrollTo({ top: commentListRef.current.scrollHeight, behavior: "smooth" });
  }

  /* ── derived ── */
  const reactLabel = selectedReaction?.label ?? "Like";
  const reactColor = selectedReaction ? selectedReaction.color : "text-muted-foreground hover:text-foreground";
  const isOwnPost  = !!user && user.id === p?.author?.id;
  const imgs = p ? (p.imageUrls?.length > 0 ? p.imageUrls : p.imageUrl ? [p.imageUrl] : []) : [];
  const profileHref = p?.author?.username ? `/profile/${p.author.username}` : "/profile";
  const cleanContent = (p?.content ?? "").replace(/\[shared:[^\]]+\]/g, "").trim();
  const isRoastPost = p?.postType === "roast" || (p?.tags ?? []).some((t: any) => t.name === "roast") || notifType === "PROJECT_ROAST";
  const hasMedia = imgs.length > 0 && !isRoastPost; // roast posts embed their cover inside the card

  /* ── roast-specific derived ── */
  const roastProjectName = p?.projectName ?? "Unknown Project";
  const roastProjectUrl  = (() => { const m = cleanContent.match(/https?:\/\/[^\s\)\]>"']+/i); return m?.[0] ?? null; })();
  const roastProjectDomain = roastProjectUrl
    ? (() => { try { return new URL(roastProjectUrl).hostname.replace(/^www\./, ""); } catch { return null; } })()
    : null;
  const roastFaviconUrl = roastProjectUrl
    ? (() => { try { return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(roastProjectUrl).origin)}&sz=64`; } catch { return null; } })()
    : null;
  const roastCoverImage = (p?.imageUrls?.length > 0 ? p.imageUrls[0] : p?.imageUrl) ?? null;
  const roastDisplayTags = (p?.tags ?? []).filter((t: any) => !["roast", "ai", "lokal"].includes(t.name));

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9000] bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog container */}
      <div className="fixed inset-0 z-[9001] flex items-center justify-center p-2 sm:p-4 pointer-events-none">
        <div
          className={`relative w-full pointer-events-auto flex flex-col rounded-2xl overflow-hidden shadow-2xl border bg-card ${isRoastPost ? "border-primary/20 bg-gradient-to-br from-card via-card to-primary/5" : "border-border"}`}
          style={{ maxWidth: hasMedia ? 1280 : isRoastPost ? 620 : 560, maxHeight: "calc(100vh - 2rem)", height: "calc(100vh - 2rem)" }}
          onClick={(e) => e.stopPropagation()}
        >

          {/* ── Title bar ── */}
          <div className="flex items-center justify-between px-4 h-14 border-b flex-shrink-0 bg-card z-10">
            <h2 className="font-bold text-base truncate pr-4 flex items-center gap-2">
              {isRoastPost && <Flame className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2.5} />}
              {p?.author?.displayName ?? p?.author?.name ?? "Post"}'s {isRoastPost ? "roast" : "post"}
            </h2>
            <button
              onClick={onClose}
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <XIcon className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex flex-1 min-h-0">

            {/* LEFT: media (hidden on mobile / when no images) */}
            {hasMedia && (
              <div className="hidden md:flex flex-1 bg-black min-w-0 items-center justify-center">
                <ImagePanel imgs={imgs} />
              </div>
            )}

            {/* RIGHT: info + comments panel */}
            <div
              className={`flex flex-col bg-card overflow-hidden ${
                hasMedia ? "flex-shrink-0 w-full md:w-[360px] border-l border-border" : "flex-1"
              }`}
            >
              {/* Loading */}
              {loading && !p && (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}

              {/* Error / no-post-found */}
              {(error || (!loading && !p && postId !== "__roast_no_post__")) && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-sm text-destructive font-medium">Could not load post</p>
                  <button
                    onClick={() => fetchPost({ variables: { id: postId } })}
                    className="text-xs text-primary underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* PROJECT_ROAST with no linked feed post */}
              {!p && postId === "__roast_no_post__" && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <Flame className="w-10 h-10 text-primary opacity-60" strokeWidth={2} />
                  <p className="text-sm font-semibold">Someone roasted your project!</p>
                  <p className="text-xs text-muted-foreground">The roast post couldn't be found — it may have been deleted.</p>
                </div>
              )}

              {p && (
                <>
                  {/* ── Scrollable top section: author + content ── */}
                  <div className="flex-shrink-0 overflow-y-auto max-h-[50%]" style={{ scrollbarWidth: "none" }}>

                    {/* ── Author header (shared by both layouts) ── */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                      <Link to={profileHref} className="flex-shrink-0" onClick={onClose}>
                        <Avatar className="w-10 h-10 border-2 border-border">
                          <AvatarImage src={avatarSrc(p.author?.avatarUrl)} />
                          <AvatarFallback>{p.author?.name?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to={profileHref} onClick={onClose} className="font-semibold text-sm hover:underline leading-tight">
                            {p.author?.displayName ?? p.author?.name}
                          </Link>
                          {isRoastPost ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 h-4 gap-1">
                              <Flame className="w-2.5 h-2.5" strokeWidth={2.5} />Got Roasted
                            </Badge>
                          ) : (
                            p.projectName && (
                              <Badge variant="secondary" className="text-xs rounded-md font-normal px-2 py-0 h-4">
                                {p.projectName}
                              </Badge>
                            )
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <span>{timeAgo(p.createdAt)}</span>
                          <span>·</span>
                          <span className="text-[10px]">🌐</span>
                        </div>
                      </div>
                      {!isOwnPost && (
                        <button
                          onClick={handleFollowToggle}
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors flex-shrink-0 ${
                            isFollowing
                              ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                              : "border-primary text-primary hover:bg-primary/10"
                          }`}
                        >
                          {isFollowing ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                          {isFollowing ? "Following" : "Follow"}
                        </button>
                      )}
                    </div>

                    {/* ── Roast layout ── */}
                    {isRoastPost ? (
                      <div className="mx-4 mb-3 border-2 border-primary/25 rounded-xl overflow-hidden bg-card shadow-sm">

                        {/* Project header */}
                        <div className="bg-gradient-to-r from-primary/12 via-primary/8 to-primary/4 border-b border-primary/20 px-4 py-3">
                          <div className="flex items-center gap-3">

                            {/* Favicon / brand logo */}
                            <div className="relative w-8 h-8 flex-shrink-0">
                              {roastFaviconUrl && (
                                <img
                                  src={roastFaviconUrl}
                                  alt=""
                                  className="w-8 h-8 rounded-md object-contain bg-muted/30 p-0.5 absolute inset-0"
                                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                />
                              )}
                              <div className={`w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center ${roastFaviconUrl ? "opacity-0" : "opacity-100"}`}>
                                <Flame className="w-4 h-4 text-primary" strokeWidth={2.5} />
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              {roastProjectUrl ? (
                                <a
                                  href={roastProjectUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-sm truncate hover:underline text-foreground block"
                                >
                                  {roastProjectName}
                                </a>
                              ) : (
                                <span className="font-bold text-sm truncate block">{roastProjectName}</span>
                              )}
                              {roastProjectDomain && (
                                <span className="text-[11px] text-muted-foreground truncate block">{roastProjectDomain}</span>
                              )}
                            </div>

                            {/* 🔥 Roast it! button — visible to all logged-in users; disabled for own post */}
                            {user && (
                              <div className="relative ml-auto flex-shrink-0">
                                <button
                                  onClick={handleRoastReact}
                                  onMouseEnter={() => setFlameHovered(true)}
                                  onMouseLeave={() => setFlameHovered(false)}
                                  disabled={isOwnPost || roastReacted || roastReactLoading || (tokenDataLoaded && tokensRemaining === 0)}
                                  title={
                                    isOwnPost
                                      ? "This is your roast"
                                      : roastReacted
                                      ? "Already roasted!"
                                      : tokenDataLoaded && tokensRemaining === 0
                                      ? "No tokens left — resets midnight Manila 🕛"
                                      : tokenDataLoaded
                                      ? `${tokensRemaining}/${tokenAllowance} token${tokenAllowance === 1 ? "" : "s"} left today`
                                      : "Roast it!"
                                  }
                                  className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all duration-200 disabled:cursor-not-allowed ${
                                    roastReacted
                                      ? "bg-orange-500/15 border-orange-500/40 text-orange-400 opacity-80 shadow-[0_0_8px_2px_rgba(249,115,22,0.25)]"
                                      : isOwnPost || (tokenDataLoaded && tokensRemaining === 0)
                                      ? "bg-muted/50 border-border text-muted-foreground opacity-50"
                                      : "roast-btn-glow bg-primary/10 border-primary/30 text-primary hover:bg-orange-500/15 hover:border-orange-500/50 hover:text-orange-400 hover:shadow-[0_0_14px_4px_rgba(249,115,22,0.38)] active:scale-95"
                                  }`}
                                >
                                  <span
                                    className={`text-[13px] leading-none select-none ${
                                      roastReacted
                                        ? "roast-flame-done"
                                        : flameHovered && !isOwnPost && (!tokenDataLoaded || tokensRemaining > 0)
                                        ? "roast-flame-hover"
                                        : !isOwnPost && (!tokenDataLoaded || tokensRemaining > 0)
                                        ? "roast-flame-idle"
                                        : ""
                                    }`}
                                  >
                                    🔥
                                  </span>
                                  <span>
                                    {roastReactLoading ? "…" : roastReacted ? "Roasted!" : "Roast it!"}
                                  </span>
                                  {!roastReacted && tokenDataLoaded && tokensRemaining > 0 && (
                                    <span className="text-[9px] font-mono bg-orange-500/20 text-orange-400 px-1 rounded leading-none">
                                      {tokensRemaining}/{tokenAllowance}
                                    </span>
                                  )}
                                </button>
                                {roastReactError && (
                                  <p className="absolute top-full mt-1 left-0 right-0 text-center text-[9px] text-destructive font-mono leading-tight pointer-events-none whitespace-nowrap">
                                    {roastReactError}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Cover image */}
                        {roastCoverImage && (
                          <img
                            src={roastCoverImage}
                            alt={roastProjectName}
                            className="w-full aspect-[2/1] object-cover"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          />
                        )}

                        {/* Roast body */}
                        <div className="p-4 bg-gradient-to-b from-transparent to-primary/5">
                          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                            {cleanContent}
                          </p>
                          {/* Tags (excluding meta tags) */}
                          {roastDisplayTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {roastDisplayTags.map((t: any) => (
                                <Badge
                                  key={t.id}
                                  variant="outline"
                                  className="text-[10px] px-2 py-0.5 bg-muted/50 border-primary/20 hover:border-primary/40 transition-colors"
                                >
                                  {t.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* ── Standard layout ── */
                      <>
                        {/* Post text */}
                        {cleanContent && (
                          <div className="px-4 pb-3">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{cleanContent}</p>
                          </div>
                        )}

                        {/* Tags */}
                        {(p.tags ?? []).length > 0 && (
                          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                            {p.tags.map((t: any) => (
                              <span key={t.id} className="text-xs text-primary font-medium cursor-pointer hover:underline">#{t.name}</span>
                            ))}
                          </div>
                        )}

                        {/* Mobile images (desktop shows in left panel) */}
                        {hasMedia && (
                          <div className="md:hidden px-4 pb-3">
                            <img src={imgs[0]} alt="" className="rounded-xl w-full object-cover max-h-56" />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* ── Stats bar ── */}
                  <div className="px-4 py-2 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      {localLikes > 0 && (
                        <>
                          {/* Reaction emoji stack */}
                          <span className="text-base leading-none">
                            {selectedReaction ? selectedReaction.emoji : "👍"}
                          </span>
                          <span className="text-[13px] font-medium text-foreground">
                            {localLikes.toLocaleString()}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
                      {commentCount > 0 && (
                        <button onClick={focusCommentInput} className="hover:underline hover:text-foreground transition-colors">
                          {commentCount} {commentCount === 1 ? "comment" : "comments"}
                        </button>
                      )}
                      {localShares > 0 && (
                        <span>{localShares} {localShares === 1 ? "share" : "shares"}</span>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* ── Action bar ── */}
                  <div className="flex items-stretch flex-shrink-0">
                    {/* Like */}
                    <Popover open={reactionOpen} onOpenChange={setReactionOpen}>
                      <PopoverTrigger asChild>
                        <div
                          role="button" tabIndex={0}
                          onClick={toggleLike}
                          onMouseEnter={() => { hoverTimer.current = setTimeout(() => setReactionOpen(true), 400); }}
                          onMouseLeave={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }}
                          onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") toggleLike(); }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 cursor-pointer select-none hover:bg-muted transition-colors font-semibold text-[13px] ${reactColor}`}
                        >
                          {selectedReaction
                            ? <span className="text-lg leading-none">{selectedReaction.emoji}</span>
                            : <ThumbsUp className="w-[18px] h-[18px]" strokeWidth={2} />}
                          <span>{reactLabel}</span>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        side="top" align="start"
                        className="w-auto p-2 rounded-full shadow-xl border bg-popover"
                        onMouseLeave={() => { setReactionOpen(false); if (hoverTimer.current) clearTimeout(hoverTimer.current); }}
                      >
                        <div className="flex gap-1 items-center">
                          {(REACTIONS as Array<{ emoji: string; label: string; color: string }>).map((r) => (
                            <button
                              key={r.label} title={r.label}
                              onClick={() => pickReaction(r)}
                              className={`text-2xl p-1 rounded-full transition-all duration-150 hover:scale-150 hover:-translate-y-2 ${selectedReaction?.label === r.label ? "scale-125 -translate-y-1" : "scale-100"}`}
                            >
                              {r.emoji}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>

                    <div className="w-px bg-border self-stretch" />

                    {/* Comment */}
                    <button
                      onClick={focusCommentInput}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-semibold text-[13px]"
                    >
                      <MessageCircle className="w-[18px] h-[18px]" strokeWidth={2} />
                      <span>Comment</span>
                    </button>

                    <div className="w-px bg-border self-stretch" />

                    {/* Share */}
                    <button
                      onClick={() => setShareOpen(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-semibold text-[13px]"
                    >
                      <Share2 className="w-[18px] h-[18px]" strokeWidth={2} />
                      <span>Share</span>
                    </button>
                  </div>

                  <Separator />

                  {/* ── Comment thread ── */}
                  <div ref={commentListRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" style={{ scrollbarWidth: "none" }}>
                    {comments.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                        <MessageCircle className="w-8 h-8 opacity-20" strokeWidth={1.5} />
                        <p className="text-xs">No comments yet. Be the first!</p>
                      </div>
                    )}
                    {comments.map((c) => (
                      <CommentItem
                        key={c.id}
                        comment={c}
                        currentUserId={user?.id}
                        postId={p.id}
                        onDelete={handleDeleteComment}
                        onReply={startReply}
                        onLikeToggle={handleLikeComment}
                        onEdit={handleEditComment}
                      />
                    ))}
                  </div>

                  {/* ── Comment input pinned to bottom ── */}
                  <div className="px-4 py-3 border-t bg-card flex-shrink-0 space-y-2">
                    {replyingTo && (
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted rounded-lg px-3 py-1.5">
                        <span>
                          Replying to{" "}
                          <span className="font-semibold text-foreground">{replyingTo.name}</span>
                        </span>
                        <button onClick={() => setReplyingTo(null)} className="hover:text-foreground">
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    )}
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
                        inputRef={commentInputRef}
                        placeholder="Write a comment…"
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share dialog */}
      {p && (
        <SharePostDialog
          post={{
            id: p.id,
            author: {
              name: p.author?.displayName ?? p.author?.name ?? "Unknown",
              avatar: avatarSrc(p.author?.avatarUrl),
              username: p.author?.username ?? "",
            },
            content: p.content ?? "",
            images: imgs,
            image: imgs[0],
            projectName: p.projectName,
            timestamp: timeAgo(p.createdAt),
          }}
          open={shareOpen}
          onOpenChange={setShareOpen}
          onShared={() => setLocalShares((v) => v + 1)}
        />
      )}
    </>,
    document.body
  );
}
