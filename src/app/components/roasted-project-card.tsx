import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { gql } from "@apollo/client/core";
import { useMutation, useLazyQuery, useQuery } from "@apollo/client/react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { avatarSrc } from "../../lib/defaults";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  ThumbsUp, MessageCircle, Share2, Flame, X as XIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useAuth } from "../../contexts/AuthContext";
import {
  CommentData, CommentItem, CommentInput,
  COMMENT_ON_POST, REPLY_TO_COMMENT, LIKE_COMMENT, UNLIKE_COMMENT,
  EDIT_COMMENT, DELETE_COMMENT,
  SharedPostPreview, OriginalPost,
} from "./post-card";
import { SharePostDialog } from "./share-post-dialog";

const GET_POST_COMMENTS = gql`
  query GetRoastedPostComments($postId: ID!, $limit: Int, $offset: Int) {
    post(id: $postId) {
      id
      comments(limit: $limit, offset: $offset) {
        id content likesCount likedByMe myReaction parentId createdAt isEdited mentions
        editHistory { id previousContent editedAt }
        author { id name displayName username avatarUrl }
        replies {
          id content likesCount likedByMe myReaction parentId createdAt isEdited mentions
          editHistory { id previousContent editedAt }
          author { id name displayName username avatarUrl }
          replies {
            id content likesCount likedByMe myReaction parentId createdAt isEdited mentions
            editHistory { id previousContent editedAt }
            author { id name displayName username avatarUrl }
          }
        }
      }
    }
  }
`;

const FOLLOW_USER = gql`
  mutation RoastFollowUser($userId: ID!) {
    followUser(userId: $userId) { id isFollowedByMe followersCount }
  }
`;
const UNFOLLOW_USER = gql`
  mutation RoastUnfollowUser($userId: ID!) {
    unfollowUser(userId: $userId) { id isFollowedByMe followersCount }
  }
`;

const ROAST_REACT = gql`
  mutation RoastReact($postId: ID!) {
    roastReact(postId: $postId) {
      id
      roastReactionCount
      roastReactedByMe
    }
  }
`;

const MY_ROAST_TOKENS = gql`
  query MyRoastTokensCard {
    myRoastTokens {
      used
      allowance
      remaining
      resetsAt
    }
  }
`;

const ROAST_REACTORS_Q = gql`
  query RoastReactorsCard($postId: ID!) {
    roastReactors(postId: $postId) {
      id name username avatarUrl
    }
  }
`;

// ─── Public Post shape (what the feed gives us) ───────────────────────────────
export interface FeedPost {
  id: string;
  author: {
    id?: string;
    name: string;
    username: string;
    avatar?: string;
    avatarUrl?: string;
  };
  content: string;
  projectName?: string;
  tags?: { id: number | string; name: string }[];
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  timestamp?: string;
  likedByMe?: boolean;
  myReaction?: string | null;
  images?: string[];
  image?: string;
  initialComments?: CommentData[];
  originalPost?: OriginalPost | null;
  roastReactedByMe?:   boolean;
  roastReactionCount?: number;
}

// ─── Legacy static interface kept for backwards compatibility ─────────────────
export interface RoastedProject {
  id: string;
  author: { name: string; username: string; avatar: string };
  project: { name: string; description: string; url?: string; image: string; tags: string[] };
  roast: { rating: number; text: string; strengths: string[]; improvements: string[] };
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
}

function legacyToFeedPost(p: RoastedProject): FeedPost {
  return {
    id: p.id,
    author: { name: p.author.name, username: p.author.username, avatar: p.author.avatar },
    content: p.roast.text,
    projectName: p.project.name,
    tags: p.project.tags.map((t, i) => ({ id: i, name: t })),
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    timestamp: p.timestamp,
    image: p.project.image,
  };
}

interface RoastedProjectCardProps {
  post: FeedPost | RoastedProject;
  onLike?: (wantsLike: boolean, reaction?: string) => void;
  onDelete?: () => void;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
}

function isFeedPost(p: FeedPost | RoastedProject): p is FeedPost {
  return "content" in p;
}

function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s\)\]>"']+/i);
  return m ? m[0] : null;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function getFaviconUrl(url: string): string {
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=64`;
  } catch {
    return "";
  }
}

const REACTIONS = [
  { emoji: "\uD83D\uDC4D", label: "Like",  color: "text-blue-500"   },
  { emoji: "\u2764\uFE0F", label: "Love",  color: "text-red-500"    },
  { emoji: "\uD83D\uDE04", label: "Haha",  color: "text-yellow-500" },
  { emoji: "\uD83D\uDE2E", label: "Wow",   color: "text-yellow-500" },
  { emoji: "\uD83D\uDE22", label: "Sad",   color: "text-blue-400"   },
  { emoji: "\uD83D\uDE21", label: "Angry", color: "text-orange-600" },
  { emoji: "\uD83D\uDD25", label: "Fire",  color: "text-orange-500" },
];

const READ_MORE_THRESHOLD = 280;

export function RoastedProjectCard({ post, onLike, isFollowing: isFollowingProp = false, onFollowToggle }: RoastedProjectCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const p: FeedPost = isFeedPost(post) ? post : legacyToFeedPost(post as RoastedProject);

  const authorId       = p.author.id;
  const isOwnPost      = !!user && !!authorId && user.id === authorId;
  const isRoastPost    = (p.tags ?? []).some((t) => t.name === "roast");

  // ── Follow state ────────────────────────────────────────────────────────
  const [localFollowing, setLocalFollowing] = useState(isFollowingProp);
  useEffect(() => { setLocalFollowing(isFollowingProp); }, [isFollowingProp]);

  const [followUser]   = useMutation(FOLLOW_USER);
  const [unfollowUser] = useMutation(UNFOLLOW_USER);

  // ── 🔥 Roast React state ──────────────────────────────────────────────────
  const [roastReacted,      setRoastReacted]      = useState(p.roastReactedByMe   ?? false);
  const [roastReactCount,   setRoastReactCount]   = useState(p.roastReactionCount ?? 0);
  const [roastReactError,   setRoastReactError]   = useState<string | null>(null);
  const [roastReactLoading, setRoastReactLoading] = useState(false);
  const [flameHovered,      setFlameHovered]      = useState(false);
  const [showReactors,      setShowReactors]      = useState(false);

  const [fetchReactors, { data: reactorsData, loading: reactorsLoading }] = useLazyQuery(ROAST_REACTORS_Q, {
    fetchPolicy: "network-only",
  });

  const { data: tokenData, refetch: refetchTokens } = useQuery(MY_ROAST_TOKENS, {
    skip: !user || !isRoastPost,
    fetchPolicy: "network-only",
  });
  const tokensRemaining: number = (tokenData as any)?.myRoastTokens?.remaining ?? 999;
  const tokenDataLoaded: boolean = !!(tokenData as any)?.myRoastTokens;
  const tokenAllowance: number  = (tokenData as any)?.myRoastTokens?.allowance  ?? 1;

  const [doRoastReact] = useMutation(ROAST_REACT);

  async function handleFollow() {
    if (!authorId) return;
    const nowFollowing = !localFollowing;
    setLocalFollowing(nowFollowing); // optimistic
    try {
      if (nowFollowing) {
        await followUser({ variables: { userId: authorId } });
      } else {
        await unfollowUser({ variables: { userId: authorId } });
      }
      onFollowToggle?.();
    } catch {
      setLocalFollowing(!nowFollowing); // revert on error
    }
  }

  // ── 🔥 Roast React handler ─────────────────────────────────────────────────
  async function handleRoastReact() {
    if (!user) return; // shouldn't happen — button hidden for anon
    if (isOwnPost)    return; // shouldn't happen — button disabled
    if (roastReacted) return; // one-way spend — already reacted

    setRoastReactLoading(true);
    setRoastReactError(null);

    // Optimistic update
    setRoastReacted(true);
    setRoastReactCount((n: number) => n + 1);

    try {
      await doRoastReact({ variables: { postId: p.id } });
      refetchTokens(); // refresh token count after spend
    } catch (err: any) {
      // Revert optimistic update on error
      setRoastReacted(false);
      setRoastReactCount((n: number) => Math.max(0, n - 1));

      const msg: string = err?.message ?? "";
      if (msg.startsWith("ROAST_TOKEN_EXHAUSTED:")) {
        const limit = msg.split(":")[1];
        setRoastReactError(
          `No 🔥 tokens left today (${limit}/${limit} used). Balik bukas! 🕛`
        );
      } else if (msg.includes("already gave")) {
        setRoastReacted(true); // was already reacted — keep optimistic
        setRoastReactCount((n: number) => n); // count stays
        setRoastReactError(null);
      } else {
        setRoastReactError("Failed to send 🔥 react. Try again.");
      }
    } finally {
      setRoastReactLoading(false);
    }
  }

  const authorName     = p.author.name;
  const authorUsername = p.author.username.startsWith("@") ? p.author.username : `@${p.author.username}`;
  const authorAvatar   = avatarSrc(p.author.avatar ?? (p.author as any).avatarUrl);
  const projectName    = p.projectName ?? "Unknown Project";
  const roastText      = p.content.replace(/\[shared:[^\]]+\]/g, "").trim();
  const timestamp      = p.timestamp ?? "";
  const coverImage     = p.images?.[0] ?? p.image;
  const projectUrl     = extractUrl(roastText) ?? undefined;
  const displayTags    = (p.tags ?? []).filter((t) => !["roast", "ai", "lokal"].includes(t.name));
  const faviconUrl     = projectUrl ? getFaviconUrl(projectUrl) : "";
  const projectDomain  = projectUrl ? getDomain(projectUrl) : "";

  const [expanded, setExpanded] = useState(false);
  const needsReadMore = roastText.length > READ_MORE_THRESHOLD;
  const displayText   = !expanded && needsReadMore
    ? roastText.slice(0, READ_MORE_THRESHOLD).trimEnd() + "…"
    : roastText;

  const [optimisticLiked,  setOptimisticLiked]  = useState(p.likedByMe ?? false);
  const [optimisticLikes,  setOptimisticLikes]  = useState(p.likesCount ?? p.likes ?? 0);

  useEffect(() => {
    setOptimisticLiked(p.likedByMe ?? false);
    setOptimisticLikes(p.likesCount ?? p.likes ?? 0);
    setSelectedReaction(p.myReaction ? (REACTIONS.find(r => r.label === p.myReaction) ?? null) : null);
  }, [p.likedByMe, p.likesCount, p.likes, p.myReaction]);
  const [selectedReaction, setSelectedReaction] = useState<typeof REACTIONS[0] | null>(
    p.myReaction ? (REACTIONS.find(r => r.label === p.myReaction) ?? null) : null
  );
  const [reactionOpen,     setReactionOpen]     = useState(false);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentsCount = p.commentsCount ?? p.comments ?? 0;
  const sharesCount   = p.sharesCount  ?? p.shares  ?? 0;
  const [shareOpen,   setShareOpen]   = useState(false);
  const [localShares, setLocalShares] = useState(sharesCount);

  // ── Comment state ──────────────────────────────────────────────────────────
  const [localComments,     setLocalComments]     = useState<CommentData[]>(p.initialComments ?? []);
  const [localCommentCount, setLocalCommentCount] = useState(commentsCount);
  const [showComments,      setShowComments]      = useState(false);
  const commentsFetchedRef = useRef(false);
  const [replyingTo, setReplyingTo] = useState<{
    id: string; name: string; visualParentId?: string; topLevelId?: string;
  } | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const cardInputRef  = useRef<HTMLTextAreaElement>(null);

  const [fetchComments, { loading: commentsLoading }] = useLazyQuery(GET_POST_COMMENTS, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      const fetched: any[] = data?.post?.comments ?? [];
      setLocalComments(fetched.map(adaptFetchedComment));
      if (fetched.length > 0) setLocalCommentCount(fetched.length);
    },
  });

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
      replies: (c.replies ?? []).map(adaptFetchedComment),
      author: {
        id: c.author?.id,
        name: c.author?.displayName ?? c.author?.username ?? c.author?.name ?? "Unknown",
        username: c.author?.username ?? "",
        avatarUrl: c.author?.avatarUrl,
      },
    };
  }

  function doFetchComments() {
    commentsFetchedRef.current = true;
    fetchComments({ variables: { postId: p.id, limit: 50, offset: 0 } });
  }

  const [commentOnPost]         = useMutation(COMMENT_ON_POST);
  const [replyToComment]        = useMutation(REPLY_TO_COMMENT);
  const [likeCommentMutation]   = useMutation(LIKE_COMMENT);
  const [unlikeCommentMutation] = useMutation(UNLIKE_COMMENT);
  const [editCommentMutation]   = useMutation(EDIT_COMMENT);
  const [deleteCommentMutation] = useMutation(DELETE_COMMENT);

  useEffect(() => {
    setLocalCommentCount(p.commentsCount ?? p.comments ?? 0);
  }, [p.commentsCount, p.comments]);

  function toggleLike() {
    if (selectedReaction) {
      setSelectedReaction(null);
      setOptimisticLiked(false);
      setOptimisticLikes((n) => Math.max(0, n - 1));
      onLike?.(false);
    } else {
      const next = !optimisticLiked;
      setOptimisticLiked(next);
      setOptimisticLikes((n) => next ? n + 1 : Math.max(0, n - 1));
      onLike?.(next, next ? "Like" : undefined);
    }
  }

  function pickReaction(r: typeof REACTIONS[0]) {
    const switching = selectedReaction?.label !== r.label;
    setSelectedReaction(switching ? r : null);
    setOptimisticLiked(switching);
    if (!optimisticLiked && switching) setOptimisticLikes((n) => n + 1);
    if (!switching) setOptimisticLikes((n) => Math.max(0, n - 1));
    setReactionOpen(false);
    onLike?.(switching, switching ? r.label : undefined);
  }

  function onReactMouseEnter() {
    reactionTimer.current = setTimeout(() => setReactionOpen(true), 500);
  }
  function onReactMouseLeave() {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
  }
  function onPickerMouseLeave() { setReactionOpen(false); }

  // ── Comment handlers ───────────────────────────────────────────────────────
  function openCommentBox() {
    setShowComments(true);
    if (!commentsFetchedRef.current) doFetchComments();
    setReplyingTo(null);
    setTimeout(() => cardInputRef.current?.focus(), 50);
  }

  function startReply(parentId: string, parentName: string, visualParentId?: string, topLevelId?: string) {
    setShowComments(true);
    setReplyingTo({ id: parentId, name: parentName, visualParentId, topLevelId });
    setTimeout(() => replyInputRef.current?.focus(), 50);
  }

  async function handleComment(text: string, mediaUrl?: string, mediaType?: string, mentions?: string[]) {
    if (!text.trim() && !mediaUrl) return;
    const temp: CommentData = {
      id:          `temp-${Date.now()}`,
      content:     text,
      mediaUrl,
      mediaType,
      likesCount:  0,
      likedByMe:   false,
      myReaction:  null,
      parentId:    null,
      mentions:    mentions ?? [],
      isEdited:    false,
      editHistory: [],
      createdAt:   new Date().toISOString(),
      replies:     [],
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
        variables: { input: { postId: p.id, content: text, mentions: mentions ?? [] } },
      });
      if (data?.commentOnPost) {
        // Re-fetch full thread so everyone sees the new comment
        commentsFetchedRef.current = false;
        doFetchComments();
      }
    } catch {
      setLocalComments((prev) => prev.filter((c) => c.id !== temp.id));
      setLocalCommentCount((v) => Math.max(0, v - 1));
    }
  }

  async function handleReply(text: string, _mediaUrl?: string, _mediaType?: string, mentions?: string[]) {
    if (!text.trim() || !replyingTo) return;
    const parentId      = replyingTo.id;
    const visualParentId = replyingTo.visualParentId;
    const topId          = replyingTo.topLevelId ?? parentId;
    const temp: CommentData = {
      id:          `temp-reply-${Date.now()}`,
      content:     text,
      likesCount:  0,
      likedByMe:   false,
      myReaction:  null,
      parentId,
      mentions:    mentions ?? [],
      isEdited:    false,
      editHistory: [],
      createdAt:   new Date().toISOString(),
      replies:     [],
      author: {
        id:        user!.id,
        name:      (user as any)?.displayName ?? (user as any)?.username ?? user!.email?.split("@")[0] ?? "You",
        username:  (user as any)?.username ?? "you",
        avatarUrl: undefined,
      },
    };
    setLocalComments((prev) =>
      prev.map((c) => {
        if (!visualParentId) {
          return c.id === parentId ? { ...c, replies: [...c.replies, temp] } : c;
        }
        if (c.id !== topId) return c;
        return {
          ...c,
          replies: c.replies.map((r) =>
            r.id === visualParentId ? { ...r, replies: [...r.replies, temp] } : r
          ),
        };
      })
    );
    setLocalCommentCount((v) => v + 1);
    setReplyingTo(null);
    try {
      const { data } = await replyToComment({
        variables: { input: { postId: p.id, parentId, content: text, mentions: mentions ?? [] } },
      });
      if (data?.replyToComment) {
        // Re-fetch full thread so all reply levels stay in sync
        commentsFetchedRef.current = false;
        doFetchComments();
      }
    } catch {
      setLocalComments((prev) =>
        prev.map((c) => {
          if (!visualParentId) {
            return c.id === parentId ? { ...c, replies: c.replies.filter((r) => r.id !== temp.id) } : c;
          }
          if (c.id !== topId) return c;
          return {
            ...c,
            replies: c.replies.map((r) =>
              r.id === visualParentId ? { ...r, replies: r.replies.filter((sr) => sr.id !== temp.id) } : r
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
    } catch {}
  }

  async function handleDeleteComment(id: string) {
    const isTop = localComments.some((c) => c.id === id);
    if (isTop) {
      const comment = localComments.find((c) => c.id === id);
      const replyCount = (comment?.replies ?? []).reduce((n, r) => n + 1 + r.replies.length, 0);
      setLocalComments((prev) => prev.filter((c) => c.id !== id));
      setLocalCommentCount((v) => Math.max(0, v - 1 - replyCount));
    } else {
      const isDepth1 = localComments.some((c) => c.replies.some((r) => r.id === id));
      setLocalComments((prev) =>
        prev.map((c) => ({
          ...c,
          replies: isDepth1
            ? c.replies.filter((r) => r.id !== id)
            : c.replies.map((r) => ({ ...r, replies: r.replies.filter((sr) => sr.id !== id) })),
        }))
      );
      setLocalCommentCount((v) => Math.max(0, v - 1));
    }
    try { await deleteCommentMutation({ variables: { commentId: id } }); } catch {}
  }
  // ── End comment handlers ───────────────────────────────────────────────────

  const reactLabel = selectedReaction?.label ?? "Like";
  const reactColor = selectedReaction
    ? selectedReaction.color
    : "text-muted-foreground hover:text-foreground";

  return (
    <Card className="overflow-hidden border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm rounded-xl gap-0">
      <CardContent className="p-0 [&:last-child]:pb-0">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(`/profile/${authorUsername.replace("@", "")}`)}
            className="flex-shrink-0"
          >
            <Avatar className="w-10 h-10 border-2 border-border">
              <AvatarImage src={authorAvatar} />
              <AvatarFallback>{authorName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate(`/profile/${authorUsername.replace("@", "")}`)}
                className="font-semibold text-sm hover:underline leading-tight text-left"
              >
                {authorName}
              </button>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 h-4 gap-1">
                <Flame className="w-2.5 h-2.5" strokeWidth={2.5} />
                Got Roasted
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <span>{timestamp}</span>
              <span>·</span>
              <span className="text-[10px]">🌐</span>
            </div>
          </div>

          {/* Follow button — only for other users' posts */}
          {!isOwnPost && (
            <button
              onClick={handleFollow}
              className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                localFollowing
                  ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                  : "border-primary text-primary hover:bg-primary/10"
              }`}
            >
              {localFollowing ? (
                <><svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm10.854-9.646a.5.5 0 010 .707l-3 3a.5.5 0 01-.708 0l-1.5-1.5a.5.5 0 11.708-.707L10.5 7.793l2.646-2.647a.5.5 0 01.708.002z"/></svg>Following</>
              ) : (
                <><svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zM14 5a.5.5 0 01.5.5v2h2a.5.5 0 010 1h-2v2a.5.5 0 01-1 0v-2h-2a.5.5 0 010-1h2v-2A.5.5 0 0114 5z"/></svg>Follow</>
              )}
            </button>
          )}
        </div>

        {/* ── Roast card ──────────────────────────────────────────────────── */}
        <div className="mx-2 sm:mx-4 mb-3 border-2 border-primary/25 rounded-xl overflow-hidden bg-card shadow-sm">

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

              {/* 🔥 Roast it! button — visible to all logged-in users; disabled for own post */}
              {user && (
                <div className="relative ml-auto flex-shrink-0">
                  {isOwnPost ? (
                    /* Own post: show clickable "🔥 N Roasted" that opens reactor list */
                    <Popover
                      open={showReactors}
                      onOpenChange={(open) => {
                        setShowReactors(open);
                        if (open && roastReactCount > 0) {
                          fetchReactors({ variables: { postId: p.id } });
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
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
                        <PopoverContent align="end" className="w-56 p-2">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">🔥 Roasted by</p>
                          {reactorsLoading ? (
                            <p className="text-xs text-muted-foreground text-center py-2">Loading…</p>
                          ) : (
                            <ul className="space-y-1 max-h-48 overflow-y-auto">
                              {((reactorsData as any)?.roastReactors ?? []).map((r: any) => (
                                <li key={r.id}>
                                  <a
                                    href={`/profile/${r.username}`}
                                    className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 transition-colors"
                                    onClick={() => setShowReactors(false)}
                                  >
                                    <img
                                      src={avatarSrc(r.avatarUrl)}
                                      alt={r.name}
                                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium truncate leading-tight">{r.name}</p>
                                      <p className="text-[10px] text-muted-foreground truncate leading-tight">@{r.username}</p>
                                    </div>
                                  </a>
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
                          roastReacted
                            ? "Already roasted!"
                            : tokenDataLoaded && tokensRemaining === 0
                            ? `No tokens left — resets midnight Manila 🕛`
                            : tokenDataLoaded
                            ? `${tokensRemaining}/${tokenAllowance} token${tokenAllowance === 1 ? "" : "s"} left today`
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
                        {/* Animated flame emoji */}
                        <span
                          className={`text-[13px] leading-none select-none ${
                            roastReacted
                              ? "roast-flame-done"
                              : flameHovered && (!tokenDataLoaded || tokensRemaining > 0)
                              ? "roast-flame-hover"
                              : (!tokenDataLoaded || tokensRemaining > 0)
                              ? "roast-flame-idle"
                              : ""
                          }`}
                        >
                          🔥
                        </span>
                        <span>
                          {roastReactLoading ? "…" : roastReacted ? "Roasted!" : "Roast it!"}
                        </span>
                        {/* Token counter pill */}
                        {!roastReacted && (tokenData as any) && tokensRemaining > 0 && (
                          <span className="text-[9px] font-mono bg-orange-500/20 text-orange-400 px-1 rounded leading-none">
                            {tokensRemaining}/{tokenAllowance}
                          </span>
                        )}
                      </button>
                      {/* Inline error */}
                      {roastReactError && (
                        <p className="absolute top-full mt-1 left-0 right-0 text-center text-[9px] text-destructive font-mono leading-tight pointer-events-none whitespace-nowrap">
                          {roastReactError}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Cover image */}
          {coverImage && (
            <img
              src={coverImage}
              alt={projectName}
              className="w-full aspect-[2/1] object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}

          {/* Roast body */}
          <div className="p-4 bg-gradient-to-b from-transparent to-primary/5">
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
              {displayText}
            </p>
            {needsReadMore && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs font-semibold text-primary hover:underline mt-1 block"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
            {/* Nested original post preview for shared roast posts */}
            {p.originalPost && (
              <div className="mt-3">
                <SharedPostPreview post={p.originalPost} />
              </div>
            )}
            {displayTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {displayTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 bg-muted/50 border-primary/20 hover:border-primary/40 transition-colors"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        {(optimisticLikes > 0 || localCommentCount > 0 || localShares > 0) && (
          <div className="px-4 py-2 flex items-center justify-between">
            {optimisticLikes > 0 ? (
              <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <span className="text-sm leading-none">
                  {selectedReaction ? selectedReaction.emoji : "👍"}
                </span>
                <span>{optimisticLikes.toLocaleString()}</span>
              </span>
            ) : <span />}
            <div className="flex items-center gap-3">
              {localCommentCount > 0 && (
                <button
                  onClick={openCommentBox}
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

        {/* ── Action bar ──────────────────────────────────────────────────── */}
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
                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") toggleLike(); }}
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
                      selectedReaction?.label === r.label ? "scale-125 -translate-y-1" : "scale-100"
                    }`}
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

        {/* ── Share dialog ───────────────────────────────────────────────── */}
        <SharePostDialog
          post={{
            id: p.id,
            author: p.author,
            content: p.content,
            images: p.images,
            image: p.image,
            projectName: p.projectName,
            timestamp: p.timestamp,
          }}
          open={shareOpen}
          onOpenChange={setShareOpen}
          onShared={() => setLocalShares((v) => v + 1)}
        />

        {/* ── Comment section ──────────────────────────────────────────────── */}
        {showComments && (
          <div className="border-t bg-muted/10 px-4 py-3 space-y-3">
            {commentsLoading && localComments.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-2">Loading comments…</div>
            )}
            {localComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUserId={user?.id}
                postId={p.id}
                onDelete={handleDeleteComment}
                onReply={startReply}
                onLikeToggle={handleLikeComment}
                onEdit={handleEditComment}
              />
            ))}

            {replyingTo && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-muted rounded-lg px-3 py-1.5">
                <span>
                  Replying to{" "}
                  <span className="font-semibold text-foreground">{replyingTo.name}</span>
                </span>
                <button onClick={() => setReplyingTo(null)} className="hover:text-foreground ml-2">
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            )}

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
