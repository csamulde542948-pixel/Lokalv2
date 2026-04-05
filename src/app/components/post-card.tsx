import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Heart, MessageCircle, Share2, MoreHorizontal, Star, GitFork, Eye, UserPlus, UserCheck } from "lucide-react";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
    username: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
  projectName?: string;
}

interface PostCardProps {
  post: Post;
  onLike: () => void;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
}

export function PostCard({ post, onLike, isFollowing = false, onFollowToggle }: PostCardProps) {
  return (
    <Card className="overflow-hidden border bg-card gap-0">
      <CardContent className="p-0 [&:last-child]:pb-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Avatar className="w-10 h-10 border-2 border-border">
            <AvatarImage src={post.author.avatar} />
            <AvatarFallback>{post.author.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm hover:underline cursor-pointer">{post.author.name}</h4>
              {post.projectName && (
                <>
                  <span className="text-muted-foreground text-xs">·</span>
                  <Badge variant="secondary" className="text-xs rounded-md font-normal px-2 py-0">
                    {post.projectName}
                  </Badge>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="hover:underline cursor-pointer">{post.author.username}</span>
              <span>·</span>
              <span>{post.timestamp}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onFollowToggle && (
              <Button
                variant={isFollowing ? "outline" : "default"}
                size="sm"
                onClick={onFollowToggle}
                className="h-7 text-xs rounded-md px-3 gap-1.5"
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-3.5 h-3.5" strokeWidth={2} />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" strokeWidth={2} />
                    Follow
                  </>
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="rounded-md h-8 w-8 hover:bg-muted">
              <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{post.content}</p>
        </div>

        {/* Image */}
        {post.image && (
          <div className="w-full">
            <img
              src={post.image}
              alt="Post content"
              className="w-full h-auto object-cover max-h-[500px]"
            />
          </div>
        )}

        {/* Stats */}
        {(post.likes > 0 || post.comments > 0 || post.shares > 0) && (
          <div className="px-4 py-2 flex items-center justify-between text-muted-foreground">
            <div className="flex items-center gap-1">
              {post.likes > 0 && (
                <button className="hover:underline flex items-center gap-1 !text-[11px] !font-medium">
                  <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-primary">
                    <Heart className="w-2 h-2 fill-white text-white" strokeWidth={0} />
                  </div>
                  <span>{post.likes}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {post.comments > 0 && (
                <button className="hover:underline !text-[11px] !font-medium">{post.comments} {post.comments === 1 ? 'comment' : 'comments'}</button>
              )}
              {post.shares > 0 && (
                <button className="hover:underline !text-[11px] !font-medium">{post.shares} {post.shares === 1 ? 'share' : 'shares'}</button>
              )}
            </div>
          </div>
        )}

        {/* Actions - Facebook style */}
        <Separator />
        <div className="flex items-center pb-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            className="flex-1 gap-2 rounded-none hover:bg-muted h-9 text-muted-foreground hover:text-foreground"
          >
            <Heart className="w-4 h-4" strokeWidth={2} />
            <span className="text-[11px] font-medium">React</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 gap-2 rounded-none hover:bg-muted h-9 text-muted-foreground hover:text-foreground">
            <MessageCircle className="w-4 h-4" strokeWidth={2} />
            <span className="text-[11px] font-medium">Comment</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 gap-2 rounded-none hover:bg-muted h-9 text-muted-foreground hover:text-foreground">
            <Share2 className="w-4 h-4" strokeWidth={2} />
            <span className="text-[11px] font-medium">Share</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}