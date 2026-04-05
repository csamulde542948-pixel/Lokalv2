import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Flame,
  ExternalLink,
  Star,
  Zap,
  Clock
} from "lucide-react";

export interface RoastedProject {
  id: string;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  project: {
    name: string;
    description: string;
    url?: string;
    image: string;
    tags: string[];
  };
  roast: {
    rating: number;
    text: string;
    strengths: string[];
    improvements: string[];
  };
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
}

interface RoastedProjectCardProps {
  post: RoastedProject;
  onLike?: () => void;
}

export function RoastedProjectCard({ post, onLike }: RoastedProjectCardProps) {
  return (
    <Card className="border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 hover:shadow-lg transition-all duration-300">
      <CardContent className="p-0 [&:last-child]:pb-0">
        {/* Header - Author Info */}
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-primary/20">
                <AvatarImage src={post.author.avatar} />
                <AvatarFallback>{post.author.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{post.author.name}</h3>
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 h-4 gap-1">
                    <Flame className="w-2.5 h-2.5" strokeWidth={2.5} />
                    Got Roasted
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  {post.author.username}
                  <span className="text-muted-foreground/50">•</span>
                  <Clock className="w-3 h-3" strokeWidth={2} />
                  {post.timestamp}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Share2 className="w-4 h-4" strokeWidth={2} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          <p className="text-sm leading-relaxed">
            Just got my project roasted! 🔥 Here's the AI's brutally honest feedback...
          </p>
        </div>

        {/* Roasted Project Card */}
        <div className="mx-4 mb-4 border-2 border-primary/30 rounded-lg overflow-hidden bg-card shadow-sm">
          {/* Roast Header */}
          <div className="bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border-b border-primary/20 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/20 p-1.5 rounded-md">
                  <Flame className="w-4 h-4 text-primary" strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-bold text-sm">
                    {post.project.name}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {post.project.description}
                  </p>
                </div>
              </div>
              {post.project.url && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => window.open(post.project.url, '_blank')}
                >
                  <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                </Button>
              )}
            </div>
          </div>

          {/* Project Image */}
          <div className="relative">
            <img 
              src={post.project.image} 
              alt={post.project.name}
              className="w-full aspect-[2/1] object-cover"
            />
            <div className="absolute top-2 right-2">
              <Badge className="bg-black/60 text-white border-0 backdrop-blur-sm">
                <Zap className="w-3 h-3 mr-1 text-yellow-400" strokeWidth={2} />
                AI Roasted
              </Badge>
            </div>
          </div>

          {/* Roast Content */}
          <div className="p-4 space-y-3 bg-gradient-to-b from-transparent to-primary/5">
            {/* The Roast */}
            <div className="bg-primary/10 border border-primary/20 rounded-md p-3">
              <div className="flex items-start gap-2">
                <Flame className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-primary mb-1">The Roast</p>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {post.roast.text}
                  </p>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {post.project.tags.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="text-[10px] px-2 py-0.5 bg-muted/50 border-primary/20 hover:border-primary/40 transition-colors"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

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