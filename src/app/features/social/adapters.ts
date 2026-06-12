import { avatarSrc } from "../../../lib/defaults";
import { timeAgo } from "./time";
import type { CommentData, OriginalPost, Post } from "./types";

type RawUser = {
  id?: string;
  name?: string | null;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
};

type RawComment = {
  id: string;
  content: string;
  likesCount?: number | null;
  likedByMe?: boolean | null;
  myReaction?: string | null;
  parentId?: string | null;
  rootPostId?: string | null;
  depth?: number | null;
  feedVisibility?: string | null;
  mentions?: string[] | null;
  isEdited?: boolean | null;
  editHistory?: { id: string; previousContent: string; editedAt: string }[] | null;
  createdAt: string;
  replies?: RawComment[] | null;
  repliesCount?: number | null;
  author?: RawUser | null;
};

type RawPost = {
  id: string;
  content: string;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  videoUrl?: string | null;
  projectName?: string | null;
  likesCount?: number | null;
  commentsCount?: number | null;
  sharesCount?: number | null;
  likedByMe?: boolean | null;
  myReaction?: string | null;
  postType?: "post" | "roast" | string | null;
  tags?: { id: string | number; name: string }[] | null;
  createdAt: string;
  commentsPreview?: RawComment[] | null;
  comments?: RawComment[] | null;
  originalPost?: RawOriginalPost | null;
  author?: RawUser & { isVerified?: boolean; rank?: { name: string } | null } | null;
  roastReactedByMe?: boolean | null;
  roastReactionCount?: number | null;
  isPinnedToFeed?: boolean | null;
};

type RawOriginalPost = {
  id: string;
  content: string;
  imageUrl?: string | null;
  imageUrls?: string[] | null;
  videoUrl?: string | null;
  projectName?: string | null;
  postType?: "post" | "roast" | string | null;
  tags?: { id: string | number; name: string }[] | null;
  createdAt?: string | null;
  author?: RawUser & { isVerified?: boolean; rank?: { name: string } | null } | null;
  roastReactedByMe?: boolean | null;
  roastReactionCount?: number | null;
};

export function displayNameForUser(user?: RawUser | null, fallback = "Unknown"): string {
  return user?.displayName ?? user?.username ?? user?.name ?? fallback;
}

export function usernameForUser(user?: RawUser | null, fallback = ""): string {
  return user?.username ?? fallback;
}

export function adaptComment(raw: RawComment): CommentData {
  const replies = (raw.replies ?? []).map(adaptComment);

  return {
    id: raw.id,
    content: raw.content,
    likesCount: raw.likesCount ?? 0,
    likedByMe: raw.likedByMe ?? false,
    myReaction: raw.myReaction ?? null,
    parentId: raw.parentId ?? null,
    rootPostId: raw.rootPostId ?? null,
    depth: raw.depth ?? (raw.parentId ? 2 : 1),
    feedVisibility: raw.feedVisibility ?? "THREAD_ONLY",
    mentions: raw.mentions ?? [],
    isEdited: raw.isEdited ?? false,
    editHistory: (raw.editHistory ?? []).map((entry) => ({
      id: entry.id,
      previousContent: entry.previousContent,
      editedAt: entry.editedAt,
    })),
    createdAt: raw.createdAt,
    repliesCount: raw.repliesCount ?? replies.length,
    replies,
    author: {
      id: raw.author?.id,
      name: displayNameForUser(raw.author),
      username: usernameForUser(raw.author),
      avatarUrl: raw.author?.avatarUrl ?? undefined,
    },
  };
}

export function makeOptimisticComment({
  id,
  content,
  parentId = null,
  rootPostId = null,
  depth = parentId ? 2 : 1,
  mentions = [],
  user,
}: {
  id: string;
  content: string;
  parentId?: string | null;
  rootPostId?: string | null;
  depth?: number;
  mentions?: string[];
  user: RawUser;
}): CommentData {
  return {
    id,
    content,
    likesCount: 0,
    likedByMe: false,
    myReaction: null,
    parentId,
    rootPostId,
    depth,
    feedVisibility: "THREAD_ONLY",
    mentions,
    isEdited: false,
    editHistory: [],
    createdAt: new Date().toISOString(),
    replies: [],
    repliesCount: 0,
    author: {
      id: user.id,
      name: displayNameForUser(user, user.email?.split("@")[0] ?? "You"),
      username: usernameForUser(user, "you"),
      avatarUrl: user.avatarUrl ?? undefined,
    },
  };
}

export function adaptOriginalPost(raw: RawOriginalPost): OriginalPost {
  return {
    id: raw.id,
    content: raw.content,
    imageUrl: raw.imageUrl ?? undefined,
    imageUrls: raw.imageUrls ?? [],
    videoUrl: raw.videoUrl ?? undefined,
    projectName: raw.projectName ?? undefined,
    postType: (raw.postType ?? "post") as "post" | "roast",
    tags: raw.tags ?? [],
    createdAt: raw.createdAt ?? undefined,
    roastReactedByMe: raw.roastReactedByMe ?? false,
    roastReactionCount: raw.roastReactionCount ?? 0,
    author: {
      id: raw.author?.id,
      name: displayNameForUser(raw.author),
      username: usernameForUser(raw.author),
      avatarUrl: raw.author?.avatarUrl ?? undefined,
      isVerified: raw.author?.isVerified,
      rank: raw.author?.rank ?? null,
    },
  };
}

export function adaptPost(raw: RawPost): Post {
  const imageUrl = raw.imageUrl ?? undefined;
  const imageUrls = raw.imageUrls ?? (imageUrl ? [imageUrl] : []);

  return {
    id: raw.id,
    author: {
      id: raw.author?.id,
      name: displayNameForUser(raw.author),
      username: `@${usernameForUser(raw.author, "?")}`,
      avatar: avatarSrc(raw.author?.avatarUrl),
      isVerified: raw.author?.isVerified,
      rank: raw.author?.rank ?? null,
    },
    content: raw.content,
    image: imageUrl,
    images: imageUrls,
    videoUrl: raw.videoUrl ?? undefined,
    likes: raw.likesCount ?? 0,
    comments: raw.commentsCount ?? 0,
    shares: raw.sharesCount ?? 0,
    timestamp: timeAgo(raw.createdAt),
    projectName: raw.projectName ?? undefined,
    likedByMe: raw.likedByMe ?? false,
    myReaction: raw.myReaction ?? null,
    postType: (raw.postType ?? "post") as "post" | "roast",
    tags: raw.tags ?? [],
    initialComments: (raw.commentsPreview ?? raw.comments ?? []).map(adaptComment),
    originalPost: raw.originalPost ? adaptOriginalPost(raw.originalPost) : null,
    roastReactedByMe: raw.roastReactedByMe ?? false,
    roastReactionCount: raw.roastReactionCount ?? 0,
    isPinnedToFeed: raw.isPinnedToFeed ?? false,
  };
}
