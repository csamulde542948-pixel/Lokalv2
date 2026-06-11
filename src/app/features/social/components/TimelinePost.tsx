import { useEffect, useState } from "react";
import { Link } from "react-router";
import { gql } from "@apollo/client/core";
import { useMutation } from "@apollo/client/react";
import { BadgeCheck, Flame, MessageCircle, Repeat2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { extractRoastProjectMeta } from "../roastMeta";

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

const RECORD_POST_SHARE = gql`
  mutation TimelineRecordPostShare($postId: ID!) {
    recordPostShare(postId: $postId) {
      id
      sharesCount
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
}

export interface TimelinePostData {
  id: string;
  content: string;
  imageUrl: string | null;
  imageUrls: string[];
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
  detail?: boolean;
}

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
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

export function TimelinePost({ post, className = "", onOpenPost, onOpenComments, detail = false }: TimelinePostProps) {
  const [fireCount, setFireCount] = useState(post.likesCount);
  const [sharedCount, setSharedCount] = useState(post.sharesCount);
  const [commentCount, setCommentCount] = useState(post.commentsCount);
  const [fired, setFired] = useState(post.likedByMe && post.myReaction === "Fire");
  const [expanded, setExpanded] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const [firePost] = useMutation(LIKE_POST);
  const [unfirePost] = useMutation(UNLIKE_POST);
  const [recordShare] = useMutation(RECORD_POST_SHARE);

  useEffect(() => {
    setFireCount(post.likesCount);
    setSharedCount(post.sharesCount);
    setCommentCount(post.commentsCount);
    setFired(post.likedByMe && post.myReaction === "Fire");
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

  async function handleShare() {
    const shareUrl = `${window.location.origin}/?post=${post.id}`;
    const authorName = post.author.displayName ?? post.author.name ?? `@${post.author.username}`;
    const text = `${authorName} posted on lokalhost.club\n\n${post.content.slice(0, 220)}`;
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;

    setSharedCount((value) => value + 1);
    recordShare({ variables: { postId: post.id } }).catch((error) => {
      setSharedCount((value) => Math.max(0, value - 1));
      console.error(error);
    });
    window.open(intent, "_blank", "noopener,noreferrer");
  }

  const displayName = post.author.displayName ?? post.author.name ?? post.author.username;
  const isRoastPost = post.postType === "roast" || post.tags?.some((tag) => tag.name === "roast");
  const roastMeta = isRoastPost ? extractRoastProjectMeta(post.content) : null;
  const images = (post.imageUrls?.length ? post.imageUrls : post.imageUrl ? [post.imageUrl] : []).filter(
    (image) => image && !failedImages.has(image),
  );
  const contentLimit = isRoastPost ? 460 : 720;
  const maxLines = isRoastPost ? 8 : 14;
  const shouldTruncate =
    post.content.length > contentLimit || post.content.split("\n").length > maxLines;
  const visibleContent =
    !expanded && shouldTruncate ? truncateContent(post.content, contentLimit, maxLines) : post.content;
  const postSurfaceClass = isRoastPost
    ? "relative roast-feed-flame-card ring-1 ring-inset ring-red-500/25 hover:bg-red-500/[0.04]"
    : "hover:bg-muted/25";

  return (
    <article
      className={`border-b px-4 py-4 transition-colors ${onOpenPost ? "cursor-pointer" : ""} ${postSurfaceClass} ${className}`}
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
          <div className="min-w-0 text-sm">
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
              <span className="text-muted-foreground">.</span>
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

          {images.length > 0 && (
            <div className={`mt-3 grid overflow-hidden rounded-2xl border bg-muted ${images.length > 1 ? "grid-cols-2 gap-px" : ""}`}>
              {images.slice(0, 4).map((image, index) => (
                <div
                  key={`${post.id}-${index}`}
                  className={images.length === 3 && index === 0 ? "col-span-2" : ""}
                >
                  <img
                    src={image}
                    alt=""
                    className="aspect-[16/10] h-full w-full object-cover"
                    onError={() => setFailedImages((current) => new Set(current).add(image))}
                  />
                </div>
              ))}
            </div>
          )}

          {isRoastPost && images.length === 0 && (
            <RoastProjectFallback
              domain={roastMeta?.projectDomain}
              faviconUrl={roastMeta?.faviconUrl}
              projectName={post.projectName}
            />
          )}

          <div className="mt-3 grid max-w-md grid-cols-3 text-muted-foreground">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenComments?.(post);
              }}
              className="group inline-flex h-9 items-center gap-2 text-sm transition-colors hover:text-sky-500"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full group-hover:bg-sky-500/10">
                <MessageCircle className="h-4 w-4" />
              </span>
              <span className="tabular-nums">{commentCount}</span>
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleFire();
              }}
              className={`group inline-flex h-9 items-center gap-2 text-sm transition-colors hover:text-primary ${
                fired ? "text-primary" : ""
              }`}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full group-hover:bg-primary/10">
                <Flame className={`h-4 w-4 ${fired ? "fill-current" : ""}`} />
              </span>
              <span className="tabular-nums">{fireCount}</span>
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleShare();
              }}
              className="group inline-flex h-9 items-center gap-2 text-sm transition-colors hover:text-green-500"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full group-hover:bg-green-500/10">
                <Repeat2 className="h-4 w-4" />
              </span>
              <span className="tabular-nums">{sharedCount}</span>
            </button>
          </div>

        </div>
      </div>
    </article>
  );
}
