import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { gql } from "@apollo/client/core";
import { useMutation } from "@apollo/client/react";
import { BadgeCheck, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Flame, MessageSquare, MoreHorizontal, Repeat2, Trash2, UserCheck, UserPlus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { useAuth } from "../../../../contexts/AuthContext";
import { extractRoastProjectMeta } from "../roastMeta";
import { timeAgo } from "../time";

const LIKE_POST = gql`
  mutation TimelineFirePost($postId: ID!, $reaction: String) {
    likePost(postId: $postId, reaction: $reaction) {
      id
      likesCount
      likedByMe
      myReaction
    }
  }
`;

const UNLIKE_POST = gql`
  mutation TimelineUnfirePost($postId: ID!) {
    unlikePost(postId: $postId) {
      id
      likesCount
      likedByMe
      myReaction
    }
  }
`;

const DELETE_POST = gql`
  mutation TimelineDeletePost($id: ID!) {
    deletePost(id: $id)
  }
`;

const FOLLOW_USER = gql`
  mutation TimelineFollowUser($userId: ID!) {
    followUser(userId: $userId) {
      id
      isFollowedByMe
      followersCount
    }
  }
`;

const UNFOLLOW_USER = gql`
  mutation TimelineUnfollowUser($userId: ID!) {
    unfollowUser(userId: $userId) {
      id
      isFollowedByMe
      followersCount
    }
  }
`;

export interface TimelinePostAuthor {
  id: string;
  name: string | null;
  displayName: string | null;
  username: string;
  avatarUrl: string | null;
  isVerified: boolean;
  isFollowedByMe?: boolean | null;
}

export interface TimelinePostData {
  id: string;
  content: string;
  imageUrl: string | null;
  imageUrls: string[];
  videoUrl?: string | null;
  projectName?: string | null;
  postType?: string | null;
  tags?: { id: string; name: string }[] | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  likedByMe: boolean;
  myReaction: string | null;
  createdAt: string;
  author: TimelinePostAuthor;
}

interface TimelinePostProps {
  post: TimelinePostData;
  className?: string;
  onOpenPost?: (post: TimelinePostData) => void;
  onOpenComments?: (post: TimelinePostData) => void;
  onDeleted?: (postId: string) => void;
  detail?: boolean;
}

function truncateContent(content: string, limit: number, maxLines: number) {
  const lines = content.split("\n");
  const lineLimited = lines.length > maxLines ? lines.slice(0, maxLines).join("\n") : content;
  const candidate = lineLimited.length > limit ? lineLimited.slice(0, limit).trimEnd() : lineLimited;
  return candidate.length < content.length ? `${candidate}...` : candidate;
}

function RoastProjectFallback({
  domain,
  faviconUrl,
  projectName,
}: {
  domain?: string;
  faviconUrl?: string;
  projectName?: string | null;
}) {
  if (!domain && !projectName) return null;

  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border bg-muted/35 px-3 py-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background">
        {faviconUrl ? (
          <img src={faviconUrl} alt="" className="h-7 w-7 object-contain" />
        ) : (
          <span className="text-sm font-semibold text-muted-foreground">
            {(projectName ?? domain ?? "R").charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{projectName ?? domain}</p>
        {domain && <p className="truncate text-xs text-muted-foreground">{domain}</p>}
      </div>
    </div>
  );
}

function TimelineImageLightbox({
  images,
  startIndex,
  onClose,
}: {
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const previous = useCallback(() => setIndex((value) => (value - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIndex((value) => (value + 1) % images.length), [images.length]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && images.length > 1) previous();
      if (event.key === "ArrowRight" && images.length > 1) next();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [images.length, next, onClose, previous]);

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 z-[100001] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
      >
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 && (
        <div className="absolute left-1/2 top-4 z-[100001] -translate-x-1/2 text-sm font-medium text-white/80">
          {index + 1} / {images.length}
        </div>
      )}

      {images.length > 1 && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            previous();
          }}
          className="absolute left-4 top-1/2 z-[100001] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}

      <img
        key={images[index]}
        src={images[index]}
        alt=""
        draggable={false}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[calc(100vh-96px)] max-w-[calc(100vw-96px)] select-none object-contain"
      />

      {images.length > 1 && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            next();
          }}
          className="absolute right-4 top-1/2 z-[100001] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      )}
    </div>,
    document.body,
  );
}

function TimelineMedia({
  images,
  videoUrl,
  postId,
  onImageError,
}: {
  images: string[];
  videoUrl?: string | null;
  postId: string;
  onImageError: (image: string) => void;
}) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (images.length === 0 && !videoUrl) return null;

  return (
    <>
      {previewIndex !== null && (
        <TimelineImageLightbox
          images={images}
          startIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}

      {images.length > 0 ? (
        <div
          className={`mt-3 overflow-hidden rounded-2xl border bg-muted/40 ${
            images.length > 1 ? "grid grid-cols-2 gap-px" : ""
          }`}
        >
          {images.slice(0, 4).map((image, index) => (
            <button
              key={`${postId}-${index}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setPreviewIndex(index);
              }}
              className={`group block min-w-0 bg-background/70 ${
                images.length === 3 && index === 0 ? "col-span-2" : ""
              }`}
            >
              <img
                src={image}
                alt=""
                className="block h-auto max-h-[560px] w-full object-contain transition-opacity group-hover:opacity-95"
                onError={() => onImageError(image)}
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-2xl border bg-black">
          <video
            src={videoUrl ?? undefined}
            controls
            className="max-h-[560px] w-full"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export function TimelinePost({ post, className = "", onOpenPost, onOpenComments, onDeleted, detail = false }: TimelinePostProps) {
  const { user } = useAuth();
  const [fireCount, setFireCount] = useState(post.likesCount);
  const [sharedCount, setSharedCount] = useState(post.sharesCount);
  const [commentCount, setCommentCount] = useState(post.commentsCount);
  const [fired, setFired] = useState(post.likedByMe && post.myReaction === "Fire");
  const [bookmarked, setBookmarked] = useState(false);
  const [following, setFollowing] = useState(!!post.author.isFollowedByMe);
  const [expanded, setExpanded] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const [firePost] = useMutation(LIKE_POST);
  const [unfirePost] = useMutation(UNLIKE_POST);
  const [deletePost] = useMutation(DELETE_POST);
  const [followUser] = useMutation(FOLLOW_USER);
  const [unfollowUser] = useMutation(UNFOLLOW_USER);

  useEffect(() => {
    setFireCount(post.likesCount);
    setSharedCount(post.sharesCount);
    setCommentCount(post.commentsCount);
    setFired(post.likedByMe && post.myReaction === "Fire");
    setFollowing(!!post.author.isFollowedByMe);
    setExpanded(false);
    setFailedImages(new Set());
  }, [post]);

  async function handleFire() {
    const next = !fired;
    setFired(next);
    setFireCount((value) => Math.max(0, value + (next ? 1 : -1)));

    try {
      if (next) {
        await firePost({ variables: { postId: post.id, reaction: "Fire" } });
      } else {
        await unfirePost({ variables: { postId: post.id } });
      }
    } catch (error) {
      setFired(!next);
      setFireCount((value) => Math.max(0, value + (next ? -1 : 1)));
      console.error(error);
    }
  }

  async function handleFollow() {
    if (!post.author.id) return;
    const next = !following;
    setFollowing(next);
    try {
      if (next) {
        await followUser({ variables: { userId: post.author.id } });
      } else {
        await unfollowUser({ variables: { userId: post.author.id } });
      }
    } catch (error) {
      setFollowing(!next);
      console.error(error);
    }
  }

  async function handleDelete() {
    try {
      await deletePost({ variables: { id: post.id } });
      onDeleted?.(post.id);
    } catch (error) {
      console.error(error);
    }
  }

  const displayName = post.author.displayName ?? post.author.name ?? post.author.username;
  const isOwnPost = !!user?.id && user.id === post.author.id;
  const isRoastPost = post.postType === "roast" || post.tags?.some((tag) => tag.name === "roast");
  const roastMeta = isRoastPost ? extractRoastProjectMeta(post.content) : null;
  const images = (post.imageUrls?.length ? post.imageUrls : post.imageUrl ? [post.imageUrl] : []).filter(
    (image) => image && !failedImages.has(image),
  );
  const contentLimit = 150;
  const maxLines = 10;
  const shouldTruncate =
    post.content.length > contentLimit || post.content.split("\n").length > maxLines;
  const visibleContent =
    !expanded && shouldTruncate ? truncateContent(post.content, contentLimit, maxLines) : post.content;
  const postSurfaceClass = isRoastPost
    ? "relative roast-feed-flame-card ring-1 ring-inset ring-red-500/25 hover:bg-red-500/[0.04]"
    : "hover:bg-muted/25";

  return (
    <article
      className={`relative border-b px-4 py-4 transition-colors ${onOpenPost ? "cursor-pointer" : ""} ${postSurfaceClass} ${className}`}
      onClick={() => onOpenPost?.(post)}
    >
      <div className="flex items-start gap-3">
        <Link
          to={`/profile/${post.author.username}`}
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={(event) => event.stopPropagation()}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author.avatarUrl ?? undefined} />
            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="min-w-0 pr-24 text-sm sm:pr-32">
            <div className="flex min-w-0 items-center gap-1.5">
              <Link
                to={`/profile/${post.author.username}`}
                className="inline-block max-w-full truncate font-semibold hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {displayName}
              </Link>
              {post.author.isVerified && (
                <BadgeCheck
                  aria-label="Verified"
                  className="h-4 w-4 shrink-0 fill-amber-400 text-amber-700"
                />
              )}
              <span className="text-muted-foreground">{"\u00B7"}</span>
              <span className="shrink-0 text-muted-foreground">{timeAgo(post.createdAt)}</span>
            </div>
            <Link
              to={`/profile/${post.author.username}`}
              className="inline-block max-w-full truncate text-xs leading-5 text-muted-foreground hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              @{post.author.username}
            </Link>
          </div>

          <div className="absolute right-3 top-3 flex items-center gap-1">
            {!isOwnPost && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleFollow();
                }}
                className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors ${
                  following
                    ? "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
                    : "border-primary/35 text-primary hover:bg-primary/10"
                }`}
              >
                {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{following ? "Following" : "Follow"}</span>
              </button>
            )}

            {isOwnPost && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive"
                    onSelect={(event) => {
                      event.stopPropagation();
                      handleDelete();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete post
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {post.content && (
            <div className="mt-1">
              <p className="whitespace-pre-wrap break-words text-[15px] leading-6 text-foreground/95">
                {visibleContent}
              </p>
              {shouldTruncate && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpanded((value) => !value);
                  }}
                  className="mt-1 text-sm font-semibold text-primary hover:underline"
                >
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}

          <TimelineMedia
            images={images}
            videoUrl={post.videoUrl}
            postId={post.id}
            onImageError={(image) => setFailedImages((current) => new Set(current).add(image))}
          />

          {isRoastPost && images.length === 0 && (
            <RoastProjectFallback
              domain={roastMeta?.projectDomain}
              faviconUrl={roastMeta?.faviconUrl}
              projectName={post.projectName}
            />
          )}

          <div className="mt-3 grid max-w-lg grid-cols-4 text-muted-foreground">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenComments?.(post);
              }}
              className="inline-flex h-9 items-center gap-2 text-sm transition-colors hover:text-sky-500"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="tabular-nums">{commentCount}</span>
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleFire();
              }}
              className={`inline-flex h-9 items-center gap-2 text-sm transition-colors hover:text-primary ${
                fired ? "text-primary" : ""
              }`}
            >
              <Flame className={`h-4 w-4 ${fired ? "fill-current" : ""}`} />
              <span className="tabular-nums">{fireCount}</span>
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
              }}
              disabled
              aria-disabled="true"
              title="Repost coming soon"
              className="inline-flex h-9 cursor-not-allowed items-center gap-2 text-sm text-muted-foreground/45"
            >
              <Repeat2 className="h-4 w-4" />
              <span className="tabular-nums">{sharedCount}</span>
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setBookmarked((value) => !value);
              }}
              className={`inline-flex h-9 items-center gap-2 text-sm transition-colors hover:text-primary ${
                bookmarked ? "text-primary" : ""
              }`}
            >
              {bookmarked ? (
                <BookmarkCheck className="h-4 w-4 fill-current" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{bookmarked ? "Saved" : "Bookmark"}</span>
            </button>
          </div>

        </div>
      </div>
    </article>
  );
}
