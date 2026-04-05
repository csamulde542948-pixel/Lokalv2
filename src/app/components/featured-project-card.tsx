import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  ExternalLink, 
  Star, 
  GitFork, 
  TrendingUp,
  Sparkles,
  Info
} from "lucide-react";

export interface FeaturedProject {
  id: string;
  name: string;
  description: string;
  author: {
    name: string;
    avatar: string;
    username: string;
  };
  image: string;
  category: string;
  stars: number;
  forks?: number;
  url: string;
  tags: string[];
  isSponsored?: boolean;
}

interface FeaturedProjectCardProps {
  project: FeaturedProject;
}

export function FeaturedProjectCard({ project }: FeaturedProjectCardProps) {
  return (
    <Card className="border bg-card hover:shadow-md transition-shadow">
      <CardContent className="p-0 [&:last-child]:pb-0">
        {/* Sponsored Badge */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b bg-muted/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
            <span className="font-medium">Featured Project</span>
            {project.isSponsored && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span>Sponsored</span>
              </>
            )}
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <Info className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>

        {/* Author Info */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-border">
              <AvatarImage src={project.author.avatar} />
              <AvatarFallback>{project.author.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{project.author.name}</h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {project.category}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{project.author.username}</p>
            </div>
          </div>
        </div>

        {/* Project Image */}
        <div className="relative group cursor-pointer">
          <img 
            src={project.image} 
            alt={project.name}
            className="w-full aspect-[2/1] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Project Details */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <div>
            <h2 className="text-lg font-bold mb-1 hover:text-primary transition-colors cursor-pointer">
              {project.name}
            </h2>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {project.tags.slice(0, 4).map((tag) => (
              <Badge 
                key={tag} 
                variant="outline" 
                className="text-xs px-2 py-0.5 rounded-md bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
              >
                {tag}
              </Badge>
            ))}
            {project.tags.length > 4 && (
              <Badge 
                variant="outline" 
                className="text-xs px-2 py-0.5 rounded-md bg-muted/50"
              >
                +{project.tags.length - 4}
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" strokeWidth={2} />
              <span className="font-medium text-foreground">{project.stars.toLocaleString()}</span>
            </div>
            {project.forks !== undefined && (
              <div className="flex items-center gap-1.5">
                <GitFork className="w-4 h-4" strokeWidth={2} />
                <span className="font-medium text-foreground">{project.forks.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" strokeWidth={2} />
              <span className="font-medium text-primary">Trending</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              className="flex-1 gap-2" 
              onClick={() => window.open(project.url, '_blank')}
            >
              <ExternalLink className="w-4 h-4" strokeWidth={2} />
              View Project
            </Button>
            <Button variant="secondary" className="flex-1">
              Learn More
            </Button>
          </div>

          {/* Footer Info */}
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <p>
              Interested in featuring your project?{" "}
              <a href="/launchpad" className="text-primary hover:underline font-medium">
                Launch on Launchpad
              </a>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}