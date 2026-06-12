export interface CommentEditEntry {
  id: string;
  previousContent: string;
  editedAt: string;
}

export interface CommentData {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  likesCount: number;
  likedByMe: boolean;
  myReaction?: string | null;
  parentId: string | null;
  rootPostId?: string | null;
  depth?: number;
  feedVisibility?: "THREAD_ONLY" | "MAIN_FEED" | "PROFILE_ONLY" | string;
  mentions?: string[];
  isEdited?: boolean;
  editHistory?: CommentEditEntry[];
  createdAt: string;
  author: { id?: string; name: string; username: string; avatarUrl?: string };
  replies: CommentData[];
  repliesCount: number;
}

export interface OriginalPost {
  id: string;
  author: {
    id?: string;
    name: string;
    username: string;
    avatarUrl?: string;
    isVerified?: boolean;
    rank?: { name: string } | null;
  };
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  videoUrl?: string;
  projectName?: string;
  postType?: "post" | "roast";
  tags?: { id: string | number; name: string }[];
  createdAt?: string;
  roastReactedByMe?: boolean;
  roastReactionCount?: number;
}

export interface Post {
  id: string;
  author: {
    id?: string;
    name: string;
    avatar: string;
    username: string;
    isVerified?: boolean;
    rank?: { name: string } | null;
  };
  content: string;
  image?: string;
  images?: string[];
  videoUrl?: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  projectName?: string;
  likedByMe?: boolean;
  myReaction?: string | null;
  postType?: "post" | "roast";
  tags?: { id: string | number; name: string }[];
  initialComments?: CommentData[];
  originalPost?: OriginalPost | null;
  roastReactedByMe?: boolean;
  roastReactionCount?: number;
  isPinnedToFeed?: boolean;
}
