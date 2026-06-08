import { PostCard as PolymorphicPostCard } from "../features/social/components/PostCard";
import type { CommentData, Post } from "../features/social/components/PostCard";

export type { CommentData, Post } from "../features/social/components/PostCard";

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onDelete?: () => void;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  onNotInterested?: (postId: string) => void;
  onOpenPostModal?: (postId: string) => void;
  onPinToggle?: () => void;
}

export function PostCard(props: PostCardProps) {
  return <PolymorphicPostCard kind="normal" {...props} />;
}
