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
import { useState, useEffect } from "react";
import { gql } from "@apollo/client/core";
import { useLazyQuery, useMutation } from "@apollo/client/react";
import { X as XIcon, Loader2, Flame, ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "./ui/separator";
import { SharePostDialog } from "./share-post-dialog";
import { PostHeader } from "../features/social/components/PostHeader";
import { PostStatsRow } from "../features/social/components/PostStatsRow";
import { PostActionBar } from "../features/social/components/PostActionBar";
import { RoastCardBody } from "../features/social/components/RoastCardBody";
import { CommentModal } from "../features/social/components/CommentModal";
import { CommentSection } from "../features/social/components/CommentSection";
import { avatarSrc } from "../../lib/defaults";
import { useAuth } from "../../contexts/AuthContext";
import { useFollowToggle } from "../features/social/hooks/useFollowToggle";
import { usePostReaction } from "../features/social/hooks/usePostReaction";
import { ALL_FRAGMENTS, RECORD_POST_IMPRESSION } from "../features/social/graphql";

/* ─── GQL ───────────────────────────────────────────────────────────────────── */
const GET_POST_MODAL = gql`
  query GetPostModalFull($id: ID!) {
    post(id: $id) { ...PostCardFields }
  }
  ${ALL_FRAGMENTS}
`;

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return "Just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
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

  const [fetchPost, { data: rawData, loading, error }] = useLazyQuery(GET_POST_MODAL, {
    fetchPolicy: "network-only",
  });
  const p: any = (rawData as any)?.post ?? null;

  // Phase 0: track modal-open impressions. Fired once per postId mount
  // (idempotent server-side). This is the strongest intent signal the
  // user gives — they actively chose to see the full content.
  const [recordImpression] = useMutation(RECORD_POST_IMPRESSION);
  useEffect(() => {
    if (!user || !postId || postId === "__roast_no_post__") return;
    recordImpression({
      variables: { postId, source: "MODAL_OPEN", dwellMs: 0, engaged: false },
    }).catch(console.error);
    // Only fire on postId change; the postId is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, !!user]);

  // ── Follow state (drives the modal's follow button) ────────────────────
  const { localFollowing: isFollowing, toggleFollow: handleFollowToggle } = useFollowToggle({
    userId: p?.author?.id,
    isFollowing: p?.author?.isFollowedByMe ?? false,
  });

  // ── Post reaction (likes) ──────────────────────────────────────────────
  const {
    localLikes,
    selectedReaction,
    reactionOpen,
    setReactionOpen,
    reactionLabel: reactLabel,
    reactionColor: reactColor,
    reactions,
    toggleReaction,
    pickReaction,
    onReactionMouseEnter,
    onReactionMouseLeave,
    onReactionPickerMouseLeave,
  } = usePostReaction({
    postId: p?.id,
    liked: p?.likedByMe ?? false,
    likes: p?.likesCount ?? 0,
    reaction: p?.myReaction,
  });

  // ── Local UI state ────────────────────────────────────────────────────
  const [shareOpen, setShareOpen] = useState(false);
  const [localShares, setLocalShares] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [commentFocusSignal, setCommentFocusSignal] = useState(0);
  const [commentModalOpen, setCommentModalOpen] = useState(false);

  // Seed counts from post on first load
  useEffect(() => {
    if (!p) return;
    setLocalShares(p.sharesCount ?? 0);
    setCommentCount(p.commentsCount ?? 0);
  }, [p?.id]);

  useEffect(() => {
    if (postId && postId !== "__roast_no_post__") {
      fetchPost({ variables: { id: postId } });
    }
  }, [postId]);

  // Escape closes the modal
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  // Scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────
  const isOwnPost     = !!user && user.id === p?.author?.id;
  const imgs          = p ? (p.imageUrls?.length > 0 ? p.imageUrls : p.imageUrl ? [p.imageUrl] : []) : [];
  const isRoastPost   = (p?.postType === "roast" || p?.tags?.some((t: { name?: string }) => t.name === "roast")) || notifType === "PROJECT_ROAST";
  const hasMedia      = imgs.length > 0 && !isRoastPost; // roast posts embed their cover inside the card
  const cleanContent  = (p?.content ?? "").replace(/\[shared:[^\]]+\]/g, "").trim();

  const authorShape = p?.author ? {
    id: p.author.id,
    name: p.author.displayName ?? p.author.name ?? "Unknown",
    username: p.author.username ?? "",
    avatarUrl: p.author.avatarUrl,
    isVerified: (p.author as any).isVerified,
  } : null;

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

              {p && authorShape && (
                <>
                  {/* ── Scrollable top section: author + content ── */}
                  <div className="flex-shrink-0 overflow-y-auto max-h-[50%]" style={{ scrollbarWidth: "none" }}>

                    {/* ── Author header (shared atom) ── */}
                    <PostHeader
                      variant="modal"
                      author={authorShape}
                      timestamp={p.createdAt ? timeAgo(p.createdAt) : ""}
                      isOwnPost={isOwnPost}
                      isRoastPost={isRoastPost}
                      isFollowing={isFollowing}
                      onFollowToggle={handleFollowToggle}
                    />

                    {/* ── Roast layout ── */}
                    {isRoastPost ? (
                      <RoastCardBody post={p} hideCover={hasMedia} hideTags />
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

                  {/* ── Stats bar (shared atom) ── */}
                  <PostStatsRow
                    likes={localLikes}
                    comments={commentCount}
                    shares={localShares}
                    selectedReaction={selectedReaction}
                    variant="modal"
                    onCommentClick={() => setCommentModalOpen(true)}
                  />

                  <Separator />

                  {/* ── Action bar ── */}
                  <PostActionBar
                    variant="modal"
                    reactionOpen={reactionOpen}
                    onReactionOpenChange={setReactionOpen}
                    selectedReaction={selectedReaction}
                    reactionLabel={reactLabel}
                    reactionColorClassName={reactColor}
                    reactions={reactions}
                    onReactionToggle={toggleReaction}
                    onReactionPick={pickReaction}
                    onReactionMouseEnter={onReactionMouseEnter}
                    onReactionMouseLeave={onReactionMouseLeave}
                    onReactionPickerMouseLeave={onReactionPickerMouseLeave}
                    onComment={() => setCommentModalOpen(true)}
                    onShare={() => setShareOpen(true)}
                  />

                  <Separator />

                  {/* ── Comment thread + input (shared atom, always-on) ── */}
                  <CommentSection
                    postId={p.id}
                    initialCount={p.commentsCount ?? 0}
                    initialComments={[]}
                    mode="always"
                    onCountChange={setCommentCount}
                    focusSignal={commentFocusSignal}
                  />
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

      {p && commentModalOpen && (
        <CommentModal
          postId={p.id}
          authorName={p.author?.displayName ?? p.author?.name ?? p.author?.username ?? "Post"}
          authorUsername={p.author?.username}
          authorAvatarUrl={p.author?.avatarUrl}
          content={p.content}
          initialCount={commentCount}
          onClose={() => setCommentModalOpen(false)}
          onCountChange={setCommentCount}
        />
      )}
    </>,
    document.body
  );
}
