import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
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
import { avatarSrc } from "../../lib/defaults";

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_FEED = gql`
  query GetFeed($first: Int, $after: String, $seenIds: [ID!], $feedVariant: String, $sessionId: String) {
    feed(first: $first, after: $after, seenIds: $seenIds, feedVariant: $feedVariant, sessionId: $sessionId) {
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
          displayName
          username
          avatarUrl
          isFollowedByMe
        }
        tags {
          id
          name
        }
        originalPost {
          id
          content
          imageUrl
          imageUrls
          projectName
          postType
          tags { id name }
          createdAt
          author {
            id
            name
            displayName
            username
            avatarUrl
          }
        }
        commentsPreview(limit: 3) {
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
          author {
            id
            name
            displayName
            username
            avatarUrl
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
      hasMore
      feedVariant
      sessionId
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
        displayName
        username
        avatarUrl
      }
      tags {
        id
        name
      }
      originalPost {
        id
        content
        imageUrl
        imageUrls
        projectName
        postType
        tags { id name }
        createdAt
        author {
          id
          name
          displayName
          username
          avatarUrl
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

const RECORD_POST_VIEW = gql`
  mutation RecordPostView($postId: ID!, $dwellMs: Int!, $source: String, $feedVariant: String, $position: Int, $sessionId: String) {
    recordPostView(postId: $postId, dwellMs: $dwellMs, source: $source, feedVariant: $feedVariant, position: $position, sessionId: $sessionId)
  }
`;

const FOLLOW_USER_MUTATION = gql`
  mutation FeedFollowUser($userId: ID!) {
    followUser(userId: $userId) { id isFollowedByMe followersCount }
  }
`;

const UNFOLLOW_USER_MUTATION = gql`
  mutation FeedUnfollowUser($userId: ID!) {
    unfollowUser(userId: $userId) { id isFollowedByMe followersCount }
  }
`;

const MARK_NOT_INTERESTED = gql`
  mutation MarkNotInterested($postId: ID!) {
    markNotInterestedInPost(postId: $postId)
  }
`;

// ─── Post view tracking ──────────────────────────────────────────────────────

/**
 * Wraps a post element and fires `recordPostView` when the post has been
 * in the viewport for ≥ 1 second. Only fires once per session per post.
 */
function PostViewTracker({
  postId,
  position,
  children,
  recordView,
}: {
  postId: string;
  position: number;
  children: React.ReactNode;
  recordView: (postId: string, dwellMs: number, position: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const enteredAt = useRef<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || firedRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          enteredAt.current = Date.now();
        } else if (enteredAt.current) {
          const dwellMs = Date.now() - enteredAt.current;
          enteredAt.current = null;
          if (dwellMs >= 1000 && !firedRef.current) {
            firedRef.current = true;
            recordView(postId, dwellMs, position);
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);

    // P1 #4: Pause dwell when tab is hidden, resume when visible
    // Prevents inflated dwell times when users switch tabs
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden — flush accumulated dwell time
        if (enteredAt.current && !firedRef.current) {
          const dwellMs = Date.now() - enteredAt.current;
          enteredAt.current = null;
          if (dwellMs >= 1000) {
            firedRef.current = true;
            recordView(postId, dwellMs, position);
          }
        }
      } else {
        // Tab visible again — restart tracking if post is still intersecting
        if (!firedRef.current && el) {
          const rect = el.getBoundingClientRect();
          const viewportH = window.innerHeight;
          const visibleRatio = Math.max(0, Math.min(rect.bottom, viewportH) - Math.max(rect.top, 0)) / rect.height;
          if (visibleRatio >= 0.5) {
            enteredAt.current = Date.now();
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [postId, position, recordView]);

  return <div ref={ref}>{children}</div>;
}

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
      name: c.author?.displayName ?? c.author?.username ?? c.author?.name ?? "Unknown",
      username: c.author?.username ?? "",
      avatarUrl: c.author?.avatarUrl,
    },
    replies: (c.replies ?? []).map(adaptComment),
    repliesCount: c.repliesCount ?? (c.replies?.length ?? 0),
  };
}

function adaptPost(p: any) {
  return {
    id: p.id,
    author: {
      id: p.author.id,
      // Prefer displayName (human readable), fall back to username, never raw `name` which
      // Supabase OAuth sometimes populates with the user's email address.
      name: p.author.displayName ?? p.author.username ?? p.author.name,
      avatar: avatarSrc(p.author.avatarUrl),
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
    initialComments: (p.commentsPreview ?? p.comments ?? []).map(adaptComment),
    originalPost: p.originalPost
      ? {
          id: p.originalPost.id,
          content: p.originalPost.content,
          imageUrl: p.originalPost.imageUrl,
          imageUrls: p.originalPost.imageUrls ?? [],
          projectName: p.originalPost.projectName ?? undefined,
          postType: (p.originalPost.postType ?? "post") as "post" | "roast",
          tags: p.originalPost.tags ?? [],
          createdAt: p.originalPost.createdAt,
          author: {
            id: p.originalPost.author?.id,
            name: p.originalPost.author?.displayName ?? p.originalPost.author?.username ?? p.originalPost.author?.name ?? "Unknown",
            username: p.originalPost.author?.username ?? "",
            avatarUrl: p.originalPost.author?.avatarUrl,
          },
        }
      : null,
  };
}

const DUMMY: never[] = []; // empty fallback so TS stays happy

export function Feed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightPostId = searchParams.get("post");
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  // Optimistic local posts prepended before the server list
  const [localPosts, setLocalPosts] = useState<ReturnType<typeof adaptPost>[]>([]);

  const seenIdsRef = useRef<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Ref map for scrolling to a highlighted post
  const postElRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { data, loading: feedLoading, error: feedError, refetch, fetchMore } = useQuery(GET_FEED, {
    variables: { first: 20 },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const [createPostMutation] = useMutation(CREATE_POST_MUTATION);
  const [likePost] = useMutation(LIKE_POST_MUTATION);
  const [unlikePost] = useMutation(UNLIKE_POST_MUTATION);
  const [recordPostViewMutation] = useMutation(RECORD_POST_VIEW);
  const [notInterestedMutation] = useMutation(MARK_NOT_INTERESTED);
  const [followUserMutation] = useMutation(FOLLOW_USER_MUTATION);
  const [unfollowUserMutation] = useMutation(UNFOLLOW_USER_MUTATION);

  const recordView = useCallback((postId: string, dwellMs: number, position?: number) => {
    seenIdsRef.current.add(postId);
    const variant = data?.feed?.feedVariant ?? undefined;
    const session = data?.feed?.sessionId ?? undefined;
    recordPostViewMutation({ variables: { postId, dwellMs, source: "feed", feedVariant: variant, position, sessionId: session } }).catch(console.error);
  }, [recordPostViewMutation, data?.feed?.feedVariant, data?.feed?.sessionId]);

  const serverPosts: ReturnType<typeof adaptPost>[] = (data?.feed?.posts ?? DUMMY).map(adaptPost);
  // Merge: local (optimistic) first, then server (deduped by id)
  const serverIds = new Set(serverPosts.map((p) => p.id));
  const allPosts = [
    ...localPosts.filter((p) => !serverIds.has(p.id)),
    ...serverPosts,
  ];

  // Read current user from Apollo cache (GET_ME_AVATAR is fetched by CreatePost on mount)
  const { data: meData } = useQuery(gql`query FeedGetMe { me { id name username displayName avatarUrl } }`, {
    fetchPolicy: "cache-only",
  });
  const meUser = meData?.me;

  const handleNewPost = useCallback(async (content: string, images?: string[], videoUrl?: string) => {
    // Optimistic: add to local list immediately with real user data
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      author: {
        id: meUser?.id ?? "",
        name: meUser?.displayName ?? meUser?.username ?? meUser?.name ?? "You",
        avatar: avatarSrc(meUser?.avatarUrl),
        username: `@${meUser?.username ?? "you"}`,
      },
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
    const endCursor = data?.feed?.pageInfo?.endCursor;
    if (!endCursor) return;
    // S4 #12: Cap seenIds to last 200 to prevent unbounded growth
    const seen = Array.from(seenIdsRef.current).slice(-200);
    const currentSessionId = data?.feed?.sessionId ?? undefined;
    try {
      await fetchMore({
        variables: { first: 20, after: endCursor, seenIds: seen, sessionId: currentSessionId },
        // Apollo merge function in apollo.ts handles concatenation
      });
    } catch (err) {
      console.error("[feed] fetchMore failed:", err);
    }
  }, [fetchMore, data]);

  // Seed followedUsers from server data on first load
  const serverPostsForSeed = data?.feed?.posts ?? DUMMY;

  // Scroll to + briefly highlight the post linked from a notification
  useEffect(() => {
    if (!highlightPostId || allPosts.length === 0) return;
    const el = postElRefs.current.get(highlightPostId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Auto-clear the query param after 3 s so back-button works cleanly
      const timer = setTimeout(() => {
        setSearchParams((p) => { p.delete("post"); return p; }, { replace: true });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightPostId, allPosts.length, setSearchParams]);

  useEffect(() => {
    if (!serverPostsForSeed.length) return;
    setFollowedUsers(prev => {
      const next = new Set(prev);
      (serverPostsForSeed as any[]).forEach((p: any) => {
        if (p.author?.isFollowedByMe && p.author?.username) {
          next.add(`@${p.author.username}`);
        }
      });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPostsForSeed]);

  const handleFollowToggle = useCallback(async (username: string, authorId: string) => {
    const isCurrentlyFollowing = followedUsers.has(username);
    // Optimistic update
    setFollowedUsers(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyFollowing) {
        newSet.delete(username);
      } else {
        newSet.add(username);
      }
      return newSet;
    });
    try {
      if (isCurrentlyFollowing) {
        await unfollowUserMutation({ variables: { userId: authorId } });
      } else {
        await followUserMutation({ variables: { userId: authorId } });
      }
    } catch (err) {
      console.error("follow/unfollow failed:", err);
      // Revert on error
      setFollowedUsers(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyFollowing) {
          newSet.add(username);
        } else {
          newSet.delete(username);
        }
        return newSet;
      });
    }
  }, [followedUsers, followUserMutation, unfollowUserMutation]);

  const showSkeletons = feedLoading && allPosts.length === 0;

  // ── Derive items: interleave FeaturedProjectCards every 3 posts ──
  const feedItems = useMemo(() => {
    const items: Array<{ type: "post"; post: ReturnType<typeof adaptPost>; index: number } | { type: "featured"; project: FeaturedProject }> = [];
    allPosts.forEach((post, i) => {
      items.push({ type: "post", post, index: i });
      if ((i + 1) % 3 === 0) {
        const project = featuredProjects[Math.floor(i / 3) % featuredProjects.length];
        if (project) items.push({ type: "featured", project });
      }
    });
    return items;
  }, [allPosts]);

  // ── TanStack Virtual — virtualise the post list ──
  const virtualizer = useWindowVirtualizer({
    count: feedItems.length,
    estimateSize: () => 420, // avg post card height in px
    overscan: 4,
  });

  // ── Infinite-scroll sentinel via IntersectionObserver ──
  const hasNextPage = data?.feed?.pageInfo?.hasNextPage ?? false;
  const loadingMore = feedLoading && allPosts.length > 0;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !feedLoading) {
          handleLoadMore();
        }
      },
      { rootMargin: "600px" } // trigger 600px before it scrolls into view
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, feedLoading, handleLoadMore]);

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

          {/* Error banner with retry */}
          {feedError && !feedLoading && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive font-mono">
              <p>⚠ Could not load feed — {feedError.message}</p>
              <button
                onClick={() => refetch()}
                className="mt-2 px-4 py-1.5 rounded-md border border-destructive/30 text-xs font-medium hover:bg-destructive/10 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Skeletons while loading */}
          {showSkeletons && (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => <PostSkeleton key={i} index={i} />)}
            </div>
          )}

          {/* Virtualised Posts Feed */}
          {!showSkeletons && feedItems.length > 0 && (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const item = feedItems[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className="pb-4">
                      {item.type === "featured" ? (
                        <FeaturedProjectCard project={item.project} />
                      ) : (
                        <div
                          ref={(el) => {
                            if (el) postElRefs.current.set(item.post.id, el);
                            else postElRefs.current.delete(item.post.id);
                          }}
                          className={
                            highlightPostId === item.post.id
                              ? "rounded-xl ring-2 ring-primary ring-offset-2 transition-all"
                              : ""
                          }
                        >
                        <PostViewTracker postId={item.post.id} position={item.index} recordView={recordView}>
                          {item.post.postType === "roast" ? (
                            <RoastedProjectCard
                              post={item.post as unknown as FeedPost}
                              onLike={(wantsLike, reaction) => handleLike(item.post.id, wantsLike, reaction)}
                              isFollowing={followedUsers.has(item.post.author.username)}
                              onFollowToggle={() => handleFollowToggle(item.post.author.username, item.post.author.id)}
                            />
                          ) : (
                            <PostCard
                              post={item.post}
                              onLike={(wantsLike, reaction) => handleLike(item.post.id, wantsLike, reaction)}
                              onDelete={() => {
                                setLocalPosts((prev) => prev.filter((p) => p.id !== item.post.id));
                                refetch();
                              }}
                              isFollowing={followedUsers.has(item.post.author.username)}
                              onFollowToggle={() => handleFollowToggle(item.post.author.username, item.post.author.id)}
                              onNotInterested={() => {
                                notInterestedMutation({ variables: { postId: item.post.id } }).catch(console.error);
                              }}
                            />
                          )}
                        </PostViewTracker>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {allPosts.length === 0 && !feedLoading && !showSkeletons && (
            <div className="text-center py-16 text-muted-foreground font-mono text-sm">
              <p className="text-2xl mb-2">📭</p>
              <p>No posts yet. Be the first to share something!</p>
            </div>
          )}

          {/* Infinite-scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />

          {/* Loading indicator for next page */}
          {loadingMore && (
            <div className="space-y-4 pb-4">
              {[...Array(2)].map((_, i) => <PostSkeleton key={`more-${i}`} index={i} />)}
            </div>
          )}

          {/* End of feed */}
          {!hasNextPage && allPosts.length > 0 && !feedLoading && (
            <div className="text-center py-6 text-muted-foreground text-xs font-mono">
              You're all caught up! 🎉
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