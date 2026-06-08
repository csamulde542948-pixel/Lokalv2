import { useState, useEffect } from "react";
import { Card, CardContent } from "../../../components/ui/card";
import { EyeOff } from "lucide-react";
import { Separator } from "../../../components/ui/separator";
import { SharePostDialog } from "../../../components/share-post-dialog";
import { PostHeader } from "./PostHeader";
import { PostStatsRow } from "./PostStatsRow";
import { PostActionBar } from "./PostActionBar";
import { PostContentBody } from "./PostContentBody";
import { RoastCardBody } from "./RoastCardBody";
import { CommentSection } from "./CommentSection";
import { usePostReaction } from "../hooks/usePostReaction";
import { usePostMutations } from "../hooks/usePostMutations";
import { useFollowToggle } from "../hooks/useFollowToggle";
import { useAuth } from "../../../../contexts/AuthContext";
import type { CommentData, Post, OriginalPost } from "../types";

export type { CommentData, Post, OriginalPost } from "../types";

/**
 * Polymorphic base card. Renders the right chrome, header, body, stats,
 * action bar, share dialog, and comment section for each kind:
 *
 *   • `kind="normal"`  — plain border, full Post data, pin/delete/not-interested.
 *   • `kind="roast"`   — gradient border, RoastCardBody, follow toggle, no pin/delete/not-interested.
 *   • `kind="shared"`  — like `normal` plus a "Shared from @user" header badge
 *                        and a fully interactive nested PostCard for the original post.
 *
 * `kind` is auto-detected from the post shape when omitted.
 *
 * Used by `components/post-card.tsx` (normal) and `components/roasted-project-card.tsx` (roast).
 * `PostModal` uses the leaf atoms directly because of its image-carousel left panel.
 */

export type PostCardKind = "normal" | "roast" | "shared";

interface PostCardProps {
  post: Post | OriginalPost;
  kind?: PostCardKind;
  onDelete?: () => void;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  onNotInterested?: (postId: string) => void;
  onOpenPostModal?: (postId: string) => void;
  onPinToggle?: () => void;
  /** When true (default), the nested originalPost is rendered as a full PostCard. */
  renderNested?: boolean;
}

function inferKind(post: Post | OriginalPost): PostCardKind {
  if ((post as Post).originalPost) return "shared";
  if ((post as any)?.postType === "roast" || (post as any)?.tags?.some((t: { name?: string }) => t.name === "roast")) return "roast";
  return "normal";
}

function isFullPost(p: Post | OriginalPost): p is Post {
  return "shares" in p || "isPinnedToFeed" in p;
}

function authorOf(p: Post | OriginalPost) {
  const a = p.author as any;
  return {
    id: a.id,
    name: a.name,
    username: a.username,
    avatar: a.avatar ?? a.avatarUrl,
    avatarUrl: a.avatarUrl ?? a.avatar,
    isVerified: a.isVerified,
  };
}

export function PostCard({
  post,
  kind,
  onDelete,
  isFollowing = false,
  onFollowToggle,
  onNotInterested,
  onOpenPostModal,
  onPinToggle,
  renderNested = true,
}: PostCardProps) {
  const { user } = useAuth();

  const detectedKind: PostCardKind = kind ?? inferKind(post);
  const isRoast   = detectedKind === "roast";
  const isShared  = detectedKind === "shared";
  const full      = isFullPost(post) ? post : null;
  const origPost  = post as OriginalPost;

  const postId    = post.id;
  const author    = authorOf(post);
  const isOwnPost = !!user && !!author.id && user.id === author.id;

  // ── Follow state ────────────────────────────────────────────────────────
  const { localFollowing, toggleFollow } = useFollowToggle({
    userId: author.id,
    isFollowing,
    onChange: () => onFollowToggle?.(),
  });

  // ── Post reaction (likes) ──────────────────────────────────────────────
  const {
    localLikes, selectedReaction, reactionOpen, setReactionOpen,
    reactionLabel: reactLabel, reactionColor: reactColor, reactions,
    toggleReaction, pickReaction,
    onReactionMouseEnter: onReactMouseEnter,
    onReactionMouseLeave: onReactMouseLeave,
    onReactionPickerMouseLeave: onPickerMouseLeave,
  } = usePostReaction({
    postId,
    liked: full?.likedByMe ?? false,
    likes: full?.likes ?? 0,
    reaction: full?.myReaction ?? null,
    hoverDelayMs: 500,
  });

  // ── UI state ────────────────────────────────────────────────────────────
  const initialLikes    = full?.likes ?? 0;
  const initialComments = full?.comments ?? 0;
  const initialShares   = full?.shares ?? 0;

  const [shareOpen,     setShareOpen]     = useState(false);
  const [localShares,   setLocalShares]   = useState(initialShares);
  const [commentCount,  setCommentCount]  = useState(initialComments);
  const [showComments,  setShowComments]  = useState(false);
  const [bookmarked,    setBookmarked]    = useState(false);

  useEffect(() => { setCommentCount(initialComments); }, [initialComments]);

  // ── Post mutations (delete / not-interested / pin) ──────────────────────
  const { hidden, handleDelete, handleNotInterested, handlePinToggle } =
    usePostMutations({
      postId,
      onDeleted: onDelete,
      onHidden: () => onNotInterested?.(postId),
    });

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

  // ── Card chrome ─────────────────────────────────────────────────────────
  const cardClass = isRoast
    ? "overflow-hidden border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm rounded-xl gap-0"
    : `overflow-hidden border bg-card shadow-sm rounded-xl gap-0 relative ${full?.isPinnedToFeed ? "pt-6" : ""}`;

  // Roast never showed pin/delete/not-interested in the original implementation.
  const menuHandlers = isRoast
    ? { onDelete: undefined, onNotInterested: undefined, onPinToggle: undefined }
    : { onDelete: handleDelete, onNotInterested: handleNotInterested,
        onPinToggle: () => { onPinToggle?.(); handlePinToggle(!!full?.isPinnedToFeed); } };

  const sharedFromAuthor = isShared && full?.originalPost ? authorOf(full.originalPost) : null;
  const nestedOriginal   = isShared && full?.originalPost ? full.originalPost : null;

  return (
    <Card className={cardClass}>
      <CardContent className="p-0 [&:last-child]:pb-0">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <PostHeader
          variant="card"
          author={author}
          timestamp={(full?.timestamp ?? origPost.createdAt) ?? ""}
          isPinnedToFeed={!!full?.isPinnedToFeed}
          isOwnPost={isOwnPost}
          isRoastPost={isRoast}
          isFollowing={localFollowing}
          onFollowToggle={toggleFollow}
          sharedFromAuthor={sharedFromAuthor}
          {...menuHandlers}
          bookmarked={bookmarked}
          onBookmarkToggle={() => setBookmarked((v) => !v)}
        />

        {/* ── Body ────────────────────────────────────────────────────────── */}
        {isRoast ? (
          <RoastCardBody post={post as any} />
        ) : (
          <>
            <PostContentBody
              content={post.content}
              tags={post.tags}
              image={(post as Post).image}
              images={(post as Post).images}
            />

            {/* ── Nested original post (fully interactive) ──────────────────── */}
            {renderNested && nestedOriginal && (
              <div className="px-4 pb-3">
                <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 p-2 bg-muted/20">
                  <PostCard
                    post={nestedOriginal}
                    kind={inferKind(nestedOriginal)}
                    onOpenPostModal={onOpenPostModal}
                    renderNested={false}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <PostStatsRow
          likes={localLikes}
          comments={commentCount}
          shares={localShares}
          selectedReaction={selectedReaction}
          variant="card"
          onCommentClick={() => setShowComments((v) => !v)}
        />

        {/* ── Action bar ─────────────────────────────────────────────────── */}
        <Separator />
        <PostActionBar
          reactionOpen={reactionOpen}
          onReactionOpenChange={setReactionOpen}
          selectedReaction={selectedReaction}
          reactionLabel={reactLabel}
          reactionColorClassName={reactColor}
          reactions={reactions}
          onReactionToggle={toggleReaction}
          onReactionPick={pickReaction}
          onReactionMouseEnter={onReactMouseEnter}
          onReactionMouseLeave={onReactMouseLeave}
          onReactionPickerMouseLeave={onPickerMouseLeave}
          onComment={() => setShowComments((v) => !v)}
          onShare={() => setShareOpen(true)}
        />

        {/* ── Share dialog ──────────────────────────────────────────────── */}
        <SharePostDialog
          post={{
            id: postId,
            author: author as any,
            content: post.content,
            images: (post as Post).images,
            image: (post as Post).image,
            projectName: (post as Post).projectName ?? origPost.projectName,
            timestamp: full?.timestamp ?? origPost.createdAt,
          }}
          open={shareOpen}
          onOpenChange={setShareOpen}
          onShared={() => setLocalShares((v) => v + 1)}
        />

        {/* ── Comment section (collapsible, only for full posts) ─────────── */}
        {showComments && full && (
          <CommentSection
            postId={postId}
            initialCount={full.comments ?? 0}
            initialComments={full.initialComments ?? []}
            mode="collapsed"
            defaultOpen
            onCountChange={setCommentCount}
          />
        )}

      </CardContent>
    </Card>
  );
}
