import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { gql } from "@apollo/client/core";
import { useMutation, useQuery } from "@apollo/client/react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { CreatePost } from "../components/create-post";
import { LeftSidebar } from "../components/left-sidebar";
import { RightSidebar } from "../components/right-sidebar";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "../../contexts/AuthContext";
import { CommentModal } from "../features/social/components/CommentModal";
import { TimelinePost, type TimelinePostData } from "../features/social/components/TimelinePost";

const GET_SOCIAL_FEED = gql`
  query GetSocialFeed($tab: SocialFeedTab!, $limit: Int, $cursor: String, $recommId: String) {
    pinnedPost {
      id
      content
      imageUrl
      imageUrls
      videoUrl
      projectName
      postType
      isPinnedToFeed
      tags {
        id
        name
      }
      likesCount
      commentsCount
      sharesCount
      viewsCount
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
        isFollowedByMe
      }
    }
    socialFeed(tab: $tab, limit: $limit, cursor: $cursor, recommId: $recommId) {
      posts {
        id
        content
        imageUrl
        imageUrls
        videoUrl
        projectName
        postType
        isPinnedToFeed
        tags {
          id
          name
        }
        likesCount
        commentsCount
        sharesCount
        viewsCount
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
          isFollowedByMe
        }
      }
      hasMore
      nextCursor
      recommId
    }
  }
`;

const CREATE_POST_MUTATION = gql`
  mutation CreateFeedPostV2($input: CreatePostInput!) {
    createPost(input: $input) {
      id
    }
  }
`;

const GET_FEED_ME = gql`
  query GetFeedMe {
    me {
      id
      postsCount
    }
  }
`;

type FeedTab = "FOR_YOU" | "FOLLOWING";

interface SocialFeedData {
  pinnedPost: TimelinePostData | null;
  socialFeed: {
    posts: TimelinePostData[];
    hasMore: boolean;
    nextCursor: string | null;
    recommId: string | null;
  };
}

function FeedTabs({ value, onChange }: { value: FeedTab; onChange: (tab: FeedTab) => void }) {
  return (
    <div className="sticky top-16 z-20 border-b bg-background/90 backdrop-blur">
      <div className="grid grid-cols-2">
        {[
          ["FOR_YOU", "For You"],
          ["FOLLOWING", "Following"],
        ].map(([tab, label]) => {
          const selected = value === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onChange(tab as FeedTab)}
              className="relative h-13 text-sm font-semibold transition-colors hover:bg-muted/60"
            >
              <span className={selected ? "text-foreground" : "text-muted-foreground"}>{label}</span>
              {selected && (
                <span className="absolute bottom-0 left-1/2 h-1 w-14 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FeedSkeletonPost() {
  return (
    <article className="border-b px-4 py-4">
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[84%]" />
            <Skeleton className="h-3 w-[56%]" />
          </div>
          <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
        </div>
      </div>
    </article>
  );
}

export function Feed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<FeedTab>("FOR_YOU");
  const [pinnedPost, setPinnedPost] = useState<TimelinePostData | null>(null);
  const [posts, setPosts] = useState<TimelinePostData[]>([]);
  const [recommId, setRecommId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [commentPost, setCommentPost] = useState<TimelinePostData | null>(null);
  const [composerFocusSignal, setComposerFocusSignal] = useState(0);
  const [firstPostNudgeDismissed, setFirstPostNudgeDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("lokal:first-post-nudge-dismissed") === "true";
  });

  const { data, loading, error, refetch, fetchMore } = useQuery<SocialFeedData>(GET_SOCIAL_FEED, {
    variables: { tab, limit: 10, cursor: null, recommId: null },
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });

  const [createPostMutation] = useMutation(CREATE_POST_MUTATION);
  const { data: meData, refetch: refetchMe } = useQuery(GET_FEED_ME, {
    skip: !user,
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    setPinnedPost(null);
    setPosts([]);
    setRecommId(null);
    setNextCursor(null);
    setHasMore(false);
  }, [tab]);

  useEffect(() => {
    const page = data?.socialFeed;
    if (!page) return;
    const nextPinnedPost = data?.pinnedPost ?? null;
    setPinnedPost(nextPinnedPost);
    setPosts(page.posts.filter((post) => post.id !== nextPinnedPost?.id));
    setRecommId(page.recommId ?? null);
    setNextCursor(page.nextCursor ?? null);
    setHasMore(page.hasMore);
  }, [data]);

  async function handleNewPost(content: string, images?: string[], videoUrl?: string, tags?: string[]) {
    await createPostMutation({
      variables: {
        input: {
          content,
          imageUrl: images?.[0],
          imageUrls: images ?? [],
          videoUrl,
          tags: tags ?? [],
        },
      },
    });
    await refetch({ tab, limit: 10, cursor: null, recommId: null });
    await refetchMe().catch(() => null);
    toast.success("Posted. Give another builder feedback to keep the feed moving.");
  }

  async function handleLoadMore() {
    const response = await fetchMore({
      variables: {
        tab,
        limit: 10,
        cursor: recommId ? null : nextCursor,
        recommId: tab === "FOR_YOU" ? recommId : null,
      },
    });

    const nextPage = response.data?.socialFeed;
    if (!nextPage) return;

    setPosts((current) => {
      const known = new Set(current.map((post) => post.id));
      return [
        ...current,
        ...nextPage.posts.filter((post) => !known.has(post.id) && post.id !== pinnedPost?.id),
      ];
    });
    setRecommId(nextPage.recommId ?? null);
    setNextCursor(nextPage.nextCursor ?? null);
    setHasMore(nextPage.hasMore);
  }

  const visiblePosts = pinnedPost ? posts.filter((post) => post.id !== pinnedPost.id) : posts;
  const totalVisiblePosts = visiblePosts.length + (pinnedPost ? 1 : 0);
  const showFirstPostNudge = !!user && !!meData?.me && meData.me.postsCount === 0 && !firstPostNudgeDismissed;

  return (
    <div className="min-h-screen bg-background">
      <LeftSidebar className="hidden xl:block fixed top-16 left-0 h-[calc(100vh-4rem)] overflow-hidden border-r" />

      <main className="min-h-screen lg:mr-80 xl:ml-64">
        <div className="mx-auto min-h-screen max-w-[640px] border-x bg-background">
          <FeedTabs value={tab} onChange={setTab} />

          {showFirstPostNudge && (
            <section className="border-b bg-primary/5 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">Welcome to Lokalhost.</h2>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    Post your project, idea, bug, or roast request so people know you exist.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3 rounded-full"
                    onClick={() => setComposerFocusSignal((value) => value + 1)}
                  >
                    Write first post
                  </Button>
                </div>
                <button
                  type="button"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  aria-label="Dismiss welcome prompt"
                  onClick={() => {
                    setFirstPostNudgeDismissed(true);
                    window.sessionStorage.setItem("lokal:first-post-nudge-dismissed", "true");
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}

          <section className="bg-background">
            <CreatePost onPost={handleNewPost} variant="timeline" focusSignal={composerFocusSignal} />
          </section>

          {loading && posts.length === 0 && (
            <div>
              {[0, 1, 2].map((index) => (
                <FeedSkeletonPost key={index} />
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="border-b px-4 py-5">
              <p className="text-sm font-medium text-destructive">Could not load the social feed.</p>
              <Button
                className="mt-3 rounded-full"
                size="sm"
                onClick={() => refetch({ tab, limit: 10, cursor: null, recommId: null })}
              >
                Retry
              </Button>
            </div>
          )}

          {!loading && totalVisiblePosts === 0 && !error && (
            <div className="px-8 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ImageIcon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Nothing here yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {tab === "FOR_YOU"
                  ? "The feed gets better when builders post. Start with a build update, bug, or feedback ask."
                  : "Follow builders or post your own update so people can find you."}
              </p>
            </div>
          )}

          {pinnedPost && (
            <TimelinePost
              key={`pinned-${pinnedPost.id}`}
              post={pinnedPost}
              onOpenPost={(nextPost) => navigate(`/post/${nextPost.id}`)}
              onOpenComments={setCommentPost}
              onDeleted={(postId) => {
                setPinnedPost((current) => (current?.id === postId ? null : current));
                setPosts((current) => current.filter((item) => item.id !== postId));
              }}
              onPinStateChange={() => refetch({ tab, limit: 10, cursor: null, recommId: null })}
            />
          )}

          {visiblePosts.map((post) => (
            <TimelinePost
              key={post.id}
              post={post}
              onOpenPost={(nextPost) => navigate(`/post/${nextPost.id}`)}
              onOpenComments={setCommentPost}
              onDeleted={(postId) => setPosts((current) => current.filter((item) => item.id !== postId))}
              onPinStateChange={() => refetch({ tab, limit: 10, cursor: null, recommId: null })}
            />
          ))}

          {hasMore && totalVisiblePosts > 0 && (
            <div className="flex justify-center px-4 py-5">
              <Button variant="outline" className="rounded-full px-6" onClick={handleLoadMore}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Load more
              </Button>
            </div>
          )}
        </div>
      </main>

      <RightSidebar
        category="home"
        className="hidden lg:block fixed top-16 right-0 h-[calc(100vh-4rem)] overflow-hidden border-l"
      />

      {commentPost && (
        <CommentModal
          postId={commentPost.id}
          authorName={commentPost.author.displayName ?? commentPost.author.name ?? commentPost.author.username}
          authorUsername={commentPost.author.username}
          authorAvatarUrl={commentPost.author.avatarUrl}
          content={commentPost.content}
          initialCount={commentPost.commentsCount}
          onClose={() => setCommentPost(null)}
          onCountChange={(count) => {
            setPosts((current) =>
              current.map((post) => (post.id === commentPost.id ? { ...post, commentsCount: count } : post)),
            );
          }}
        />
      )}
    </div>
  );
}
