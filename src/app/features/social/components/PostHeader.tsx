import { Link } from "react-router";
import { Pin, Bookmark, BookmarkCheck, MoreHorizontal, Trash2, EyeOff, PinOff, Flame } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { avatarSrc } from "../../../../lib/defaults";
import { FollowButton } from "./FollowButton";
import { VerifiedBadge } from "./VerifiedBadge";
import type { ReactionOption } from "../reactions";

type HeaderVariant = "card" | "modal" | "preview";

/**
 * Minimal author shape PostHeader needs. Compatible with the existing
 * `Post`, `OriginalPost`, and raw GraphQL `author` objects.
 */
export interface PostAuthor {
  id?: string;
  name: string;
  username: string;
  avatar?: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

interface PostHeaderProps {
  author: PostAuthor;
  timestamp: string;
  isPinnedToFeed?: boolean;
  isOwnPost: boolean;
  isRoastPost?: boolean;
  variant: HeaderVariant;
  /** When set, renders a `Shared from @user` badge instead of the project/roast badge. */
  sharedFromAuthor?: PostAuthor | null;
  /** Hide the right-side action cluster (bookmark, menu, follow). */
  hideActions?: boolean;
  /** Follow button state — modal + roast cards. */
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  /** Dropdown menu handlers. Pass only the ones you want to expose. */
  onDelete?: () => void;
  onNotInterested?: () => void;
  onPinToggle?: () => void;
  /** Bookmark state — only rendered in `card` variant. */
  bookmarked?: boolean;
  onBookmarkToggle?: () => void;
}

/**
 * Pure presentational post header. Avatar + name + badge + timestamp +
 * follow + bookmark + dropdown menu, parameterized by `variant`.
 *
 * The parent owns all state (useFollowToggle, usePostMutations, etc.) and
 * passes the resulting handlers as props. This keeps PostHeader a leaf
 * component and prevents duplicate hook calls.
 */
export function PostHeader({
  author,
  timestamp,
  isPinnedToFeed = false,
  isOwnPost,
  isRoastPost = false,
  variant,
  sharedFromAuthor = null,
  hideActions = false,
  isFollowing,
  onFollowToggle,
  onDelete,
  onNotInterested,
  onPinToggle,
  bookmarked = false,
  onBookmarkToggle,
}: PostHeaderProps) {
  const isModal = variant === "modal";
  const isPreview = variant === "preview";

  const authorName     = author.name;
  const authorUsername = (author.username ?? "").replace(/^@/, "");
  const authorAvatar   = avatarSrc(author.avatar ?? author.avatarUrl);
  const profileHref    = authorUsername ? `/profile/${authorUsername}` : "/profile";

  const wrapperClass = isModal
    ? "flex items-center gap-3 px-4 pt-4 pb-2"
    : "flex items-center gap-3 px-4 py-3";

  const stopBubble = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      {/* Pinned indicator banner — only on the `card` variant. */}
      {isPinnedToFeed && variant === "card" && (
        <div className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-4 py-1 bg-primary/10 border-b border-primary/20 text-[11px] font-medium text-primary rounded-t-xl">
          <Pin className="w-3 h-3" strokeWidth={2.5} />
          Pinned by Lokalhost
        </div>
      )}

      <div className={wrapperClass}>
        {/* Avatar → profile */}
        <Link
          to={profileHref}
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
          onClick={isModal ? undefined : stopBubble}
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={authorAvatar} />
            <AvatarFallback>{authorName?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={profileHref}
              className="font-semibold text-sm hover:underline cursor-pointer leading-tight"
              onClick={isModal ? undefined : stopBubble}
            >
              {authorName}
            </Link>
            {author.isVerified && <VerifiedBadge />}

            {isRoastPost ? (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 h-4 gap-1">
                <Flame className="w-2.5 h-2.5" strokeWidth={2.5} />
                Got Roasted
              </Badge>
            ) : sharedFromAuthor ? (
              <Badge variant="secondary" className="text-xs rounded-md font-normal px-2 py-0 h-4">
                Shared from {sharedFromAuthor.name}
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <span>{timestamp}</span>
            <span>·</span>
            <span className="text-[10px]">🌐</span>
          </div>
        </div>

        {/* Right-side action cluster — skipped in preview mode and when hideActions. */}
        {!isPreview && !hideActions && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Follow button — modal + roast cards; never for own post. */}
            {onFollowToggle && !isOwnPost && (
              isModal ? (
                <FollowButton
                  isFollowing={!!isFollowing}
                  onClick={onFollowToggle}
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full border transition-colors flex-shrink-0 ${
                    isFollowing
                      ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                      : "border-primary text-primary hover:bg-primary/10"
                  }`}
                />
              ) : (
                <FollowButton
                  isFollowing={!!isFollowing}
                  onClick={onFollowToggle}
                  className="gap-1.5 h-8 text-xs rounded-md px-2 text-primary hover:bg-primary/10"
                  labelClassName="hidden sm:inline"
                />
              )
            )}

            {/* Bookmark — card variant only. */}
            {variant === "card" && onBookmarkToggle && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBookmarkToggle}
                className="rounded-full h-8 w-8 hover:bg-muted"
                title={bookmarked ? "Remove bookmark" : "Save"}
              >
                {bookmarked
                  ? <BookmarkCheck className="w-4 h-4 fill-primary text-primary" strokeWidth={2} />
                  : <Bookmark className="w-4 h-4" strokeWidth={2} />}
              </Button>
            )}

            {/* Dropdown menu — only when at least one menu item is enabled. */}
            {(onDelete || onNotInterested || onPinToggle) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-muted">
                    <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {onDelete && isOwnPost && (
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />Delete post
                    </DropdownMenuItem>
                  )}
                  {onNotInterested && !isOwnPost && (
                    <DropdownMenuItem
                      onClick={onNotInterested}
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
                      {isPinnedToFeed ? (
                        <><PinOff className="w-4 h-4" />Unpin from feed</>
                      ) : (
                        <><Pin className="w-4 h-4" />Pin to feed</>
                      )}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// Re-export the ReactionOption type so call sites don't have to chase
// the import through the reactions module when they only consume it via
// PostHeader's children.
export type { ReactionOption };
