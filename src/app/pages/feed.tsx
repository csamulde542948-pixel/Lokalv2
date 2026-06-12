import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { gql } from "@apollo/client/core";
import { useMutation, useQuery } from "@apollo/client/react";
import { ImageIcon, Loader2 } from "lucide-react";
import { CreatePost } from "../components/create-post";
import { LeftSidebar } from "../components/left-sidebar";
import { RightSidebar } from "../components/right-sidebar";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { CommentModal } from "../features/social/components/CommentModal";
import { TimelinePost, type TimelinePostData } from "../features/social/components/TimelinePost";

const GET_SOCIAL_FEED = gql`
  query GetSocialFeed($tab: SocialFeedTab!, $limit: Int, $cursor: String, $recommId: String) {
    socialFeed(tab: $tab, limit: $limit, cursor: $cursor, recommId: $recommId) {
      posts {
        id
        content
        imageUrl
        imageUrls
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

type FeedTab = "FOR_YOU" | "FOLLOWING";

interface SocialFeedData {
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
  const navigate = useNavigate();
  const [tab, setTab] = useState<FeedTab>("FOR_YOU");
  const [posts, setPosts] = useState<TimelinePostData[]>([]);
  const [recommId, setRecommId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [commentPost, setCommentPost] = useState<TimelinePostData | null>(null);

  const { data, loading, error, refetch, fetchMore } = useQuery<SocialFeedData>(GET_SOCIAL_FEED, {
    variables: { tab, limit: 10, cursor: null, recommId: null },
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });

  const [createPostMutation] = useMutation(CREATE_POST_MUTATION);

  useEffect(() => {
    setPosts([]);
    setRecommId(null);
    setNextCursor(null);
    setHasMore(false);
  }, [tab]);

  useEffect(() => {
    const page = data?.socialFeed;
    if (!page) return;
    setPosts(page.posts);
    setRecommId(page.recommId ?? null);
    setNextCursor(page.nextCursor ?? null);
    setHasMore(page.hasMore);
  }, [data]);

  async function handleNewPost(content: string, images?: string[]) {
    await createPostMutation({
      variables: {
        input: {
          content,
          imageUrl: images?.[0],
          imageUrls: images ?? [],
        },
      },
    });
    await refetch({ tab, limit: 10, cursor: null, recommId: null });
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
      return [...current, ...nextPage.posts.filter((post) => !known.has(post.id))];
    });
    setRecommId(nextPage.recommId ?? null);
    setNextCursor(nextPage.nextCursor ?? null);
    setHasMore(nextPage.hasMore);
  }

  return (
    <div className="min-h-screen bg-background">
      <LeftSidebar className="hidden xl:block fixed top-16 left-0 h-[calc(100vh-4rem)] overflow-hidden border-r" />

      <main className="min-h-screen lg:mr-80 xl:ml-64">
        <div className="mx-auto min-h-screen max-w-[640px] border-x bg-background">
          <FeedTabs value={tab} onChange={setTab} />

          <section className="border-b bg-background">
            <CreatePost onPost={handleNewPost} variant="timeline" />
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

          {!loading && posts.length === 0 && !error && (
            <div className="px-8 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ImageIcon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Nothing here yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {tab === "FOR_YOU"
                  ? "We need a little more signal before recommendations fill in."
                  : "Follow a few builders and this tab will start to move."}
              </p>
            </div>
          )}

          {posts.map((post) => (
            <TimelinePost
              key={post.id}
              post={post}
              onOpenPost={(nextPost) => navigate(`/post/${nextPost.id}`)}
              onOpenComments={setCommentPost}
              onDeleted={(postId) => setPosts((current) => current.filter((item) => item.id !== postId))}
            />
          ))}

          {hasMore && posts.length > 0 && (
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
