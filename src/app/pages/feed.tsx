import { useState, useCallback } from "react";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { CreatePost } from "../components/create-post";
import { PostCard } from "../components/post-card";
// import { RoastedPostCard } from "../components/roasted-post-card";
import { RoastedProjectCard, FeedPost } from "../components/roasted-project-card";
import { LeftSidebar } from "../components/left-sidebar";
import { RightSidebar } from "../components/right-sidebar";
import { FeaturedProjects } from "../components/featured-projects";
import { FeaturedProjectCard, FeaturedProject } from "../components/featured-project-card";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { Fragment } from "react";

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_FEED = gql`
  query GetFeed($limit: Int, $offset: Int) {
    exploreFeed(limit: $limit, offset: $offset) {
      posts {
        id
        content
        imageUrl
        imageUrls
        projectName
        likesCount
        commentsCount
        sharesCount
        likedByMe
        myReaction
        postType
        createdAt
        author {
          id
          name
          username
          avatarUrl
        }
        tags {
          id
          name
        }
        comments(limit: 10) {
          id
          content
          likesCount
          likedByMe
          myReaction
          parentId
          mentions
          isEdited
          editHistory { id previousContent editedAt }
          createdAt
          author {
            id
            name
            username
            avatarUrl
          }
          replies {
            id
            content
            likesCount
            likedByMe
            myReaction
            parentId
            mentions
            isEdited
            editHistory { id previousContent editedAt }
            createdAt
            author {
              id
              name
              username
              avatarUrl
            }
            replies {
              id
              content
              likesCount
              likedByMe
              myReaction
              parentId
              mentions
              isEdited
              editHistory { id previousContent editedAt }
              createdAt
              author {
                id
                name
                username
                avatarUrl
              }
            }
          }
        }
      }
      hasMore
      nextOffset
    }
  }
`;

const CREATE_POST_MUTATION = gql`
  mutation CreateFeedPost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      content
      imageUrl
      imageUrls
      projectName
      likesCount
      commentsCount
      sharesCount
      likedByMe
      postType
      createdAt
      author {
        id
        name
        username
        avatarUrl
      }
      tags {
        id
        name
      }
      comments(limit: 10) {
        id
        content
        likesCount
        likedByMe
        myReaction
        parentId
        mentions
        isEdited
        editHistory { id previousContent editedAt }
        createdAt
        author {
          id
          name
          username
          avatarUrl
        }
        replies {
          id
          content
          likesCount
          likedByMe
          myReaction
          parentId
          mentions
          isEdited
          editHistory { id previousContent editedAt }
          createdAt
          author {
            id
            name
            username
            avatarUrl
          }
          replies {
            id
            content
            likesCount
            likedByMe
            myReaction
            parentId
            mentions
            isEdited
            editHistory { id previousContent editedAt }
            createdAt
            author {
              id
              name
              username
              avatarUrl
            }
          }
        }
      }
    }
  }
`;

const LIKE_POST_MUTATION = gql`
  mutation LikeFeedPost($postId: ID!, $reaction: String) {
    likePost(postId: $postId, reaction: $reaction) {
      id
      likesCount
      likedByMe
      myReaction
    }
  }
`;

const UNLIKE_POST_MUTATION = gql`
  mutation UnlikeFeedPost($postId: ID!) {
    unlikePost(postId: $postId) {
      id
      likesCount
      likedByMe
    }
  }
`;

// ─── Post skeleton loader ─────────────────────────────────────────────────────

/**
 * Variant A — Standard text post (avatar + 3 lines + action bar)
 */
function PostSkeletonA() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <Skeleton className="h-2.5 w-20" />
        </div>
        <Skeleton className="h-7 w-20 rounded-md flex-shrink-0" />
      </div>

      {/* Body — 3 lines of text */}
      <div className="px-4 pb-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[90%]" />
        <Skeleton className="h-3 w-[65%]" />
      </div>

      {/* Stats row */}
      <div className="px-4 py-2 flex items-center justify-between">
        <Skeleton className="h-2.5 w-12" />
        <div className="flex gap-3">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-2.5 w-12" />
        </div>
      </div>

      {/* Action bar */}
      <div className="border-t flex">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex-1 flex items-center justify-center gap-2 py-2.5 border-r last:border-r-0">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-2.5 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Variant B — Post with image banner (like a project share with cover photo)
 */
function PostSkeletonB() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="h-7 w-7 rounded-md flex-shrink-0" />
      </div>

      {/* 2 lines of text before image */}
      <div className="px-4 pb-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>

      {/* Image banner */}
      <Skeleton className="w-full h-48 rounded-none" />

      {/* Stats + actions */}
      <div className="px-4 py-2 flex items-center justify-between">
        <Skeleton className="h-2.5 w-14" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <div className="border-t flex">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex-1 flex items-center justify-center gap-2 py-2.5 border-r last:border-r-0">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-2.5 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Variant C — Compact card (no image, tighter layout, badge pill, longer excerpt)
 */
function PostSkeletonC() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header with follow button */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        {/* Square avatar */}
        <Skeleton className="w-10 h-10 rounded-md flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-2.5 w-10" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-14 rounded-full" />
            <Skeleton className="h-4 w-14 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-7 w-24 rounded-md flex-shrink-0" />
      </div>

      {/* 4-line body */}
      <div className="px-4 py-2 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[95%]" />
        <Skeleton className="h-3 w-[80%]" />
        <Skeleton className="h-3 w-[55%]" />
      </div>

      {/* Tags row */}
      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>

      {/* Stats + actions */}
      <div className="px-4 py-2 flex items-center justify-between border-t">
        <div className="flex items-center gap-3">
          <Skeleton className="h-2.5 w-10" />
          <Skeleton className="h-2.5 w-10" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Cycles through A → B → C → A … based on index */
function PostSkeleton({ index = 0 }: { index?: number }) {
  const variant = index % 3;
  if (variant === 1) return <PostSkeletonB />;
  if (variant === 2) return <PostSkeletonC />;
  return <PostSkeletonA />;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Static placeholders (shown when feed is empty / for featured cards) ───────
// Note: roast posts from the real feed are detected via postType === "roast" and
// rendered with RoastedProjectCard automatically — no static placeholders needed.

const featuredProjects: FeaturedProject[] = [
  {
    id: "featured-1",
    name: "CodeCollab PH",
    description: "Real-time collaborative coding platform built for Filipino developers. Features include live code editing, video chat, and project management tools all in one place.",
    author: {
      name: "TeamSync Studios",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
      username: "@teamsync",
    },
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop",
    category: "SaaS",
    stars: 2847,
    forks: 342,
    url: "https://codecollab.ph",
    tags: ["TypeScript", "WebRTC", "Next.js", "Collaboration"],
    isSponsored: true,
  },
  {
    id: "featured-2",
    name: "Pinoy DevTools",
    description: "Essential development tools and utilities designed for Filipino developers.",
    author: {
      name: "DevTools Team",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
      username: "@devtools",
    },
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop",
    category: "Tools",
    stars: 1923,
    forks: 156,
    url: "https://pinoydevtools.com",
    tags: ["CLI", "Productivity", "Open Source"],
    isSponsored: false,
  },
  {
    id: "featured-3",
    name: "Manila Jobs Board",
    description: "Job marketplace connecting Filipino developers with local and international companies.",
    author: {
      name: "CareerHub",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      username: "@careerhub",
    },
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=400&fit=crop",
    category: "Career",
    stars: 3421,
    url: "https://manilajobs.dev",
    tags: ["Jobs", "Remote Work", "Careers"],
    isSponsored: true,
  },
];

// ─── Feed Component ───────────────────────────────────────────────────────────

// Adapter: map GraphQL post shape → PostCard shape
function adaptComment(c: any): any {
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
      id: e.id,
      previousContent: e.previousContent,
      editedAt: e.editedAt,
    })),
    createdAt: c.createdAt,
    author: {
      id: c.author?.id,
      name: c.author?.name ?? "Unknown",
      username: c.author?.username ?? "",
      avatarUrl: c.author?.avatarUrl,
    },
    replies: (c.replies ?? []).map(adaptComment),
  };
}

function adaptPost(p: any) {
  return {
    id: p.id,
    author: {
      id: p.author.id,
      name: p.author.name,
      avatar: p.author.avatarUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(p.author.name)}`,
      username: `@${p.author.username}`,
    },
    content: p.content,
    image: p.imageUrl,
    images: p.imageUrls ?? (p.imageUrl ? [p.imageUrl] : []),
    likes: p.likesCount,
    comments: p.commentsCount,
    shares: p.sharesCount,
    timestamp: timeAgo(p.createdAt),
    projectName: p.projectName ?? undefined,
    likedByMe: p.likedByMe,
    myReaction: p.myReaction ?? null,
    postType: (p.postType ?? "post") as "post" | "roast",
    tags: p.tags ?? [],
    initialComments: (p.comments ?? []).map(adaptComment),
  };
}

const DUMMY: never[] = []; // empty fallback so TS stays happy

export function Feed() {
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  // Optimistic local posts prepended before the server list
  const [localPosts, setLocalPosts] = useState<ReturnType<typeof adaptPost>[]>([]);

  const [offset, setOffset] = useState(0);
  const { data, loading: feedLoading, error: feedError, refetch, fetchMore } = useQuery(GET_FEED, {
    variables: { limit: 20, offset: 0 },
    fetchPolicy: "cache-and-network",
  });

  const [createPostMutation] = useMutation(CREATE_POST_MUTATION);
  const [likePost] = useMutation(LIKE_POST_MUTATION);
  const [unlikePost] = useMutation(UNLIKE_POST_MUTATION);

  const serverPosts: ReturnType<typeof adaptPost>[] = (data?.exploreFeed?.posts ?? DUMMY).map(adaptPost);
  // Merge: local (optimistic) first, then server (deduped by id)
  const serverIds = new Set(serverPosts.map((p) => p.id));
  const allPosts = [
    ...localPosts.filter((p) => !serverIds.has(p.id)),
    ...serverPosts,
  ];

  const handleNewPost = useCallback(async (content: string, images?: string[], videoUrl?: string) => {
    // Optimistic: add to local list immediately
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      author: { name: "You", avatar: "", username: "@you" },
      content,
      image: images?.[0],
      images: images ?? [],
      likes: 0,
      comments: 0,
      shares: 0,
      timestamp: "Just now",
      projectName: undefined,
      likedByMe: false,
      tags: [],
      initialComments: [],
    };
    setLocalPosts((prev) => [optimistic, ...prev]);

    try {
      await createPostMutation({
        variables: { input: { content, imageUrl: images?.[0], imageUrls: images ?? [] } },
      });
      // On success, refetch to get the real post from server
      refetch();
      // Remove the optimistic post
      setLocalPosts((prev) => prev.filter((p) => p.id !== tempId));
    } catch (err) {
      console.error("createPost failed:", err);
      // Keep optimistic post but mark it somehow (for now just leave it)
    }
  }, [createPostMutation, refetch]);

  const handleLike = useCallback(async (postId: string, wantsLike: boolean, reaction?: string) => {
    try {
      if (wantsLike) {
        await likePost({ variables: { postId, reaction: reaction ?? "Like" } });
      } else {
        await unlikePost({ variables: { postId } });
      }
    } catch (err) {
      console.error("like/unlike failed:", err);
    }
  }, [likePost, unlikePost]);

  const handleLoadMore = useCallback(async () => {
    const next = data?.exploreFeed?.nextOffset ?? offset + 20;
    setOffset(next);
    await fetchMore({ variables: { limit: 20, offset: next }, updateQuery: (prev, { fetchMoreResult }) => {
      if (!fetchMoreResult) return prev;
      return { exploreFeed: { ...fetchMoreResult.exploreFeed, posts: [...(prev.exploreFeed?.posts ?? []), ...fetchMoreResult.exploreFeed.posts] } };
    }});
  }, [fetchMore, data, offset]);

  const handleFollowToggle = (username: string) => {
    setFollowedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(username)) {
        newSet.delete(username);
      } else {
        newSet.add(username);
      }
      return newSet;
    });
  };

  const showSkeletons = feedLoading && allPosts.length === 0;

  return (
    <div className="flex min-h-screen">
      {/* Left Sidebar */}
      <LeftSidebar className="hidden xl:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto" />

      {/* Center Feed */}
      <div className="flex-1 border-x">
        <div className="max-w-[680px] mx-auto px-4 py-4 space-y-4">
          {/* Featured Projects Stories */}
          <FeaturedProjects />

          {/* Create Post */}
          <CreatePost onPost={handleNewPost} />

          <Separator />

          {/* Error banner */}
          {feedError && !feedLoading && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive font-mono">
              ⚠ Could not load feed — {feedError.message}
            </div>
          )}

          {/* Skeletons while loading */}
          {showSkeletons && (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => <PostSkeleton key={i} index={i} />)}
            </div>
          )}

          {/* Posts Feed */}
          {!showSkeletons && (
            <div className="space-y-4">
              {allPosts.map((post, index) => (
                <Fragment key={post.id}>
                  {post.postType === "roast" ? (
                    <RoastedProjectCard
                      post={post as unknown as FeedPost}
                      onLike={(wantsLike, reaction) => handleLike(post.id, wantsLike, reaction)}
                    />
                  ) : (
                    <PostCard
                      post={post}
                      onLike={(wantsLike, reaction) => handleLike(post.id, wantsLike, reaction)}
                      onDelete={() => {
                        setLocalPosts((prev) => prev.filter((p) => p.id !== post.id));
                        refetch();
                      }}
                      isFollowing={followedUsers.has(post.author.username)}
                      onFollowToggle={() => handleFollowToggle(post.author.username)}
                    />
                  )}
                  {/* Featured project after every 3rd post */}
                  {(index + 1) % 3 === 0 && featuredProjects[(Math.floor(index / 3)) % featuredProjects.length] && (
                    <FeaturedProjectCard project={featuredProjects[(Math.floor(index / 3)) % featuredProjects.length]} />
                  )}
                </Fragment>
              ))}

              {/* Empty state */}
              {allPosts.length === 0 && !feedLoading && (
                <div className="text-center py-16 text-muted-foreground font-mono text-sm">
                  <p className="text-2xl mb-2">📭</p>
                  <p>No posts yet. Be the first to share something!</p>
                </div>
              )}

              {/* Load more */}
              {data?.exploreFeed?.hasMore && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={feedLoading}
                    className="px-6 py-2 rounded-full border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {feedLoading ? "Loading…" : "Load more posts"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <RightSidebar category="home" className="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto" />
    </div>
  );
}

// ─── (end of file) ─────────────────────────────────────────────────────────