import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { gql } from "@apollo/client/core";
import { useMutation, useQuery } from "@apollo/client/react";
import { ArrowLeft, BadgeCheck, Flame, Loader2, MessageSquare } from "lucide-react";
import { LeftSidebar } from "../components/left-sidebar";
import { RightSidebar } from "../components/right-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { CommentInput } from "../features/social/components/CommentInput";
import { CommentItem } from "../features/social/components/CommentItem";
import { TimelinePost, type TimelinePostData } from "../features/social/components/TimelinePost";
import { adaptComment, makeOptimisticComment } from "../features/social/adapters";
import { LIKE_COMMENT, REPLY_TO_COMMENT, UNLIKE_COMMENT } from "../features/social/graphql";
import { useAuth } from "../../contexts/AuthContext";
import { useMeProfile } from "../features/social/hooks/useMeProfile";
import { useCommentActions } from "../features/social/hooks/useCommentActions";
import { avatarSrc } from "../../lib/defaults";
import type { CommentData } from "../features/social/types";

const COMMENT_FIELDS = gql`
  fragment CommentPageFields on PostComment {
    id
    content
    likesCount
    likedByMe
    myReaction
    parentId
    mentions
    isEdited
    repliesCount
    createdAt
    editHistory {
      id
      previousContent
      editedAt
    }
    author {
      id
      name
      displayName
      username
      avatarUrl
      isVerified
    }
  }
`;

const GET_COMMENT_PAGE = gql`
  ${COMMENT_FIELDS}
  query GetCommentPage($id: ID!) {
    comment(id: $id) {
      ...CommentPageFields
      parent {
        ...CommentPageFields
      }
      post {
        id
        content
        imageUrl
        imageUrls
        videoUrl
        projectName
        postType
        tags {
          id
          name
        }
        likesCount
        commentsCount
        sharesCount
        likedByMe
        myReaction
        createdAt
        author {
          id
          name
          displayName
          username
          avatarUrl
          isVerified
        }
      }
      replies(limit: 30, offset: 0) {
        ...CommentPageFields
      }
    }
  }
`;

interface RawFocusedComment {
  id: string;
  content: string;
  likesCount: number;
  likedByMe: boolean;
  myReaction: string | null;
  parentId: string | null;
  rootPostId?: string | null;
  depth?: number;
  feedVisibility?: string;
  repliesCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    displayName: string | null;
    username: string;
    avatarUrl: string | null;
    isVerified?: boolean;
  };
  post: TimelinePostData;
  parent?: RawFocusedComment | null;
  replies: CommentData[];
}

interface CommentPageData {
  comment: RawFocusedComment | null;
}

function shortTime(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function FocusedCommentCard({
  comment,
  onReplyClick,
}: {
  comment: RawFocusedComment;
  onReplyClick: () => void;
}) {
  const [liked, setLiked] = useState(comment.likedByMe && comment.myReaction === "Fire");
  const [likes, setLikes] = useState(comment.likesCount);
  const [likeComment] = useMutation(LIKE_COMMENT);
  const [unlikeComment] = useMutation(UNLIKE_COMMENT);
  const displayName = comment.author.displayName ?? comment.author.name ?? comment.author.username;

  useEffect(() => {
    setLiked(comment.likedByMe && comment.myReaction === "Fire");
    setLikes(comment.likesCount);
  }, [comment.id, comment.likedByMe, comment.likesCount, comment.myReaction]);

  async function handleFire() {
    const next = !liked;
    setLiked(next);
    setLikes((value) => Math.max(0, value + (next ? 1 : -1)));
    try {
      if (next) {
        await likeComment({ variables: { commentId: comment.id, reaction: "Fire" } });
      } else {
        await unlikeComment({ variables: { commentId: comment.id } });
      }
    } catch {
      setLiked(!next);
      setLikes((value) => Math.max(0, value + (next ? -1 : 1)));
    }
  }

  return (
    <article className="border-b px-4 py-4 transition-colors hover:bg-muted/25">
      <div className="flex items-start gap-3">
        <Link to={`/profile/${comment.author.username}`} className="h-10 w-10 shrink-0 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarSrc(comment.author.avatarUrl)} />
            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            <Link to={`/profile/${comment.author.username}`} className="truncate font-semibold hover:underline">
              {displayName}
            </Link>
            {comment.author.isVerified && (
              <BadgeCheck className="h-4 w-4 shrink-0 fill-amber-400 text-amber-700" aria-label="Verified" />
            )}
            <span className="text-muted-foreground">.</span>
            <span className="shrink-0 text-muted-foreground">{shortTime(comment.createdAt)}</span>
          </div>
          <Link
            to={`/profile/${comment.author.username}`}
            className="inline-block max-w-full truncate text-xs leading-5 text-muted-foreground hover:underline"
          >
            @{comment.author.username}
          </Link>

          <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-foreground/95">
            {comment.content}
          </p>

          <div className="mt-3 grid max-w-xs grid-cols-2 text-muted-foreground">
            <button
              type="button"
              onClick={onReplyClick}
              className="group inline-flex h-9 items-center gap-2 text-sm transition-colors hover:text-sky-500"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full group-hover:bg-sky-500/10">
                <MessageSquare className="h-4 w-4" />
              </span>
              <span className="tabular-nums">{comment.repliesCount}</span>
            </button>
            <button
              type="button"
              onClick={handleFire}
              className={`group inline-flex h-9 items-center gap-2 text-sm transition-colors hover:text-primary ${
                liked ? "text-primary" : ""
              }`}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full group-hover:bg-primary/10">
                <Flame className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              </span>
              <span className="tabular-nums">{likes}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ParentContext({ comment }: { comment: RawFocusedComment }) {
  const displayName = comment.author.displayName ?? comment.author.name ?? comment.author.username;
  return (
    <Link
      to={`/comment/${comment.id}`}
      className="block border-b px-4 py-3 transition-colors hover:bg-muted/30"
    >
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={avatarSrc(comment.author.avatarUrl)} />
          <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="truncate font-semibold">{displayName}</span>
            <span className="truncate text-muted-foreground">@{comment.author.username}</span>
            <span className="text-muted-foreground">.</span>
            <span className="text-muted-foreground">{shortTime(comment.createdAt)}</span>
          </div>
          <p className="mt-1 line-clamp-2 break-words text-sm leading-5 text-muted-foreground">{comment.content}</p>
        </div>
      </div>
    </Link>
  );
}

export function CommentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { me } = useMeProfile();
  const [replies, setReplies] = useState<CommentData[]>([]);
  const [replyCount, setReplyCount] = useState(0);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const [replyToComment] = useMutation(REPLY_TO_COMMENT);
  const { handleLikeComment, handleEditComment, handleDeleteComment } = useCommentActions({
    comments: replies,
    setComments: setReplies,
    setCommentCount: setReplyCount,
  });

  const { data, loading, error, refetch } = useQuery<CommentPageData>(GET_COMMENT_PAGE, {
    variables: { id },
    skip: !id,
    fetchPolicy: "network-only",
  });

  const comment = data?.comment ?? null;

  useEffect(() => {
    if (!comment) return;
    setReplies((comment.replies ?? []).map((reply) => adaptComment({ ...reply, replies: [] } as any)));
    setReplyCount(comment.repliesCount ?? comment.replies?.length ?? 0);
  }, [comment?.id, comment?.repliesCount]);

  async function handleReply(text: string, mentions?: string[]) {
    if (!comment || !text.trim()) return;

    const temp = makeOptimisticComment({
      id: `temp-reply-${Date.now()}`,
      content: text,
      parentId: comment.id,
      rootPostId: comment.rootPostId ?? comment.post.id,
      depth: (comment.depth ?? 1) + 1,
      mentions: mentions ?? [],
      user: me
        ? {
            id: me.id,
            name: me.displayName ?? me.username ?? me.name,
            displayName: me.displayName,
            username: me.username,
            avatarUrl: me.avatarUrl,
          }
        : { id: "anonymous", name: "You", username: "you" },
    });

    setReplies((current) => [...current, temp]);
    setReplyCount((count) => count + 1);

    try {
      const { data: mutationData } = await replyToComment({
        variables: {
          input: {
            postId: comment.post.id,
            parentId: comment.id,
            content: text,
            mentions: mentions ?? [],
          },
        },
      });
      if (mutationData?.replyToComment) {
        const saved = adaptComment({ ...mutationData.replyToComment, replies: [] });
        setReplies((current) => current.map((reply) => (reply.id === temp.id ? saved : reply)));
      }
    } catch {
      setReplies((current) => current.filter((reply) => reply.id !== temp.id));
      setReplyCount((count) => Math.max(0, count - 1));
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <LeftSidebar className="hidden xl:block fixed top-16 left-0 h-[calc(100vh-4rem)] overflow-hidden border-r" />

      <main className="min-h-screen lg:mr-80 xl:ml-64">
        <div className="mx-auto min-h-screen max-w-[640px] border-x bg-background">
          <header className="sticky top-16 z-20 flex h-14 items-center gap-5 border-b bg-background/90 px-4 backdrop-blur">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold leading-5">Post</h1>
              {comment && <p className="text-xs text-muted-foreground">{replyCount} replies</p>}
            </div>
          </header>

          {loading && (
            <div className="flex min-h-[360px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {error && !loading && (
            <div className="border-b px-4 py-8 text-center">
              <p className="text-sm font-medium text-destructive">Could not load this reply.</p>
              <Button className="mt-3 rounded-full" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && !comment && (
            <div className="px-8 py-16 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
              <h2 className="mt-4 text-lg font-semibold">Reply not found</h2>
              <p className="mt-2 text-sm text-muted-foreground">It may have been deleted or moved.</p>
            </div>
          )}

          {comment && (
            <>
              {!comment.parent && (
                <TimelinePost post={comment.post} detail onOpenPost={(post) => navigate(`/post/${post.id}`)} />
              )}
              {comment.parent && <ParentContext comment={comment.parent} />}

              <FocusedCommentCard
                comment={{ ...comment, repliesCount: replyCount }}
                onReplyClick={() => replyInputRef.current?.focus()}
              />

              <div className="border-b px-4 py-3">
                <div>
                  <CommentInput
                    user={user}
                    displayName={me?.displayName ?? me?.name ?? me?.username}
                    avatarUrl={me?.avatarUrl ?? undefined}
                    onSubmit={handleReply}
                    inputRef={replyInputRef}
                    placeholder="Post your reply"
                  />
                </div>
              </div>

              <div>
                {replies.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">No replies yet.</div>
                ) : (
                  <div>
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="border-b px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/25"
                      >
                        <CommentItem
                          comment={reply}
                          currentUserId={user?.id}
                          postId={comment.post.id}
                          onDelete={handleDeleteComment}
                          onReply={() => navigate(`/comment/${reply.id}`)}
                          onLikeToggle={handleLikeComment}
                          onEdit={handleEditComment}
                          onOpenComment={(commentId) => navigate(`/comment/${commentId}`)}
                          showNestedReplies={false}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <RightSidebar
        category="home"
        className="hidden lg:block fixed top-16 right-0 h-[calc(100vh-4rem)] overflow-hidden border-l"
      />
    </div>
  );
}
