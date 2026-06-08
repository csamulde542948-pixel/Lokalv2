import { useState } from "react";
import { Link } from "react-router";
import { Flame } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { avatarSrc } from "../../../../lib/defaults";
import { useAuth } from "../../../../contexts/AuthContext";
import { useRoastReaction } from "../hooks/useRoastReaction";
import { extractRoastProjectMeta, filterDisplayTags } from "../roastMeta";
import { timeAgo } from "../time";
import type { OriginalPost, Post } from "../types";

const READ_MORE_THRESHOLD = 280;

interface RoastCardBodyProps {
  /** The full post (must have a project URL embedded in `content`). */
  post: Post | OriginalPost;
  /** Optional override for the cover image; defaults to `post.imageUrls[0] ?? post.imageUrl`. */
  coverImage?: string;
  /** Hide the cover image (used by post-modal when it shows media in the left panel). */
  hideCover?: boolean;
  /** Show a ROASTED watermark + scanline texture over the cover. */
  showWatermark?: boolean;
  /** Hide the tags row entirely (post-modal doesn't render it). */
  hideTags?: boolean;
  /** Hide the read-more toggle. */
  hideReadMore?: boolean;
  /** Click handler so the parent card can stop propagation. */
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * The inner "roast card" — project header (favicon + name + domain),
 * optional cover image, body text with read-more, and tags. Renders the
 * `Roast it!` button (token-gated) for logged-in users via `useRoastReaction`.
 *
 * Shared by `PostCard` (roast kind), `PostModal` (roast layout).
 */
export function RoastCardBody({
  post,
  coverImage,
  hideCover = false,
  showWatermark = false,
  hideTags = false,
  hideReadMore = false,
  onClick,
}: RoastCardBodyProps) {
  const { user } = useAuth();

  const content = (post.content ?? "").replace(/\[shared:[^\]]+\]/g, "").trim();
  const projectName = post.projectName ?? "Unknown Project";
  const projectMeta = extractRoastProjectMeta(content);

  const inferredCover = coverImage
    ?? (post.imageUrls && post.imageUrls.length > 0 ? post.imageUrls[0] : undefined)
    ?? (post as Post).image
    ?? (post as OriginalPost).imageUrl;
  const displayTags = filterDisplayTags(post.tags);

  // Roast-reaction hook is only useful for non-own posts; the hook itself
  // disables actions for own posts internally.
  const {
    flameHovered,
    fetchReactors,
    handleRoastReact,
    isOwnPost,
    reactorsData,
    reactorsLoading,
    roastReactCount,
    roastReactError,
    roastReactLoading,
    roastReacted,
    setFlameHovered,
    setShowReactors,
    showReactors,
    tokenAllowance,
    tokenDataLoaded,
    tokensRemaining,
  } = useRoastReaction({
    postId: post.id,
    userId: user?.id,
    authorId: post.author.id,
    isRoast: true,
    initialReacted: post.roastReactedByMe,
    initialCount: post.roastReactionCount,
  });

  const [expanded, setExpanded] = useState(false);
  const needsReadMore = !hideReadMore && content.length > READ_MORE_THRESHOLD;
  const displayText   = !expanded && needsReadMore
    ? content.slice(0, READ_MORE_THRESHOLD).trimEnd() + "…"
    : content;

  return (
    <div className="mx-2 sm:mx-4 mb-3 border-2 border-primary/25 rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Project header */}
      <div className="bg-gradient-to-r from-primary/12 via-primary/8 to-primary/4 border-b border-primary/20 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Favicon / brand logo */}
          <div className="relative w-8 h-8 flex-shrink-0">
            {projectMeta.faviconUrl && (
              <img
                src={projectMeta.faviconUrl}
                alt=""
                className="w-8 h-8 rounded-md object-contain bg-muted/30 p-0.5 absolute inset-0"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className={`w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center ${projectMeta.faviconUrl ? "opacity-0" : "opacity-100"}`}>
              <Flame className="w-4 h-4 text-primary" strokeWidth={2.5} />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {projectMeta.projectUrl ? (
              <a
                href={projectMeta.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-sm truncate hover:underline text-foreground block"
                onClick={(e) => { onClick?.(e); e.stopPropagation(); }}
              >
                {projectName}
              </a>
            ) : (
              <span className="font-bold text-sm truncate block">{projectName}</span>
            )}
            {projectMeta.projectDomain && (
              <span className="text-[11px] text-muted-foreground truncate block">{projectMeta.projectDomain}</span>
            )}
          </div>

          {/* 🔥 Roast it! button — visible to all logged-in users; disabled for own post. */}
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
                      onClick={onClick}
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
                    <PopoverContent align="end" className="w-56 p-2" onClick={onClick}>
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
                                <img
                                  src={avatarSrc(r.avatarUrl)}
                                  alt={r.name}
                                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                />
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
                    onClick={(e) => { onClick?.(e); handleRoastReact(e); }}
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
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cover image */}
      {!hideCover && inferredCover && (
        showWatermark ? (
          <div className="relative w-full overflow-hidden bg-muted/20" style={{ aspectRatio: "16/9" }}>
            <img
              src={inferredCover}
              alt={projectName}
              className="w-full h-full object-cover object-top"
              onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none"; }}
            />
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)" }}
            />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
            <div
              className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
              style={{ background: "rgba(234,88,12,0.85)", color: "#fff", backdropFilter: "blur(4px)" }}
            >
              <span>🔥</span> ROASTED
            </div>
          </div>
        ) : (
          <img
            src={inferredCover}
            alt={projectName}
            className="w-full aspect-[2/1] object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )
      )}

      {/* Roast body */}
      <div className="p-4 bg-gradient-to-b from-transparent to-primary/5">
        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
          {displayText}
        </p>
        {needsReadMore && (
          <button
            onClick={(e) => { onClick?.(e); setExpanded((v) => !v); }}
            className="text-xs font-semibold text-primary hover:underline mt-1 block"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
        {!hideTags && displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {displayTags.map((tag) => (
              <Badge
                key={String(tag.id)}
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
  );
}

// Re-export so consumers can keep using `timeAgo` for the "· time" line in
// the parent header without having to import from the time module too.
export { timeAgo };
