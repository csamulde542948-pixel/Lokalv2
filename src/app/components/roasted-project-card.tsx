import { PostCard as PolymorphicPostCard } from "../features/social/components/PostCard";
import type { Post } from "../features/social/components/PostCard";

/** Public Post shape used by feed/profile pages. */
export type FeedPost = Post;
export type { Post };

interface RoastedProjectCardProps {
  post: Post;
  onLike?: (wantsLike: boolean, reaction?: string) => void;
  onDelete?: () => void;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
}

export function RoastedProjectCard(props: RoastedProjectCardProps) {
  return <PolymorphicPostCard kind="roast" {...props} />;
}
