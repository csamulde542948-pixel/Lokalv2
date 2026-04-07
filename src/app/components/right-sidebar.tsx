import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { TrendingUp, Users, GitFork, Star, Sparkles, Code2 } from "lucide-react";
import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";

const GET_SIDEBAR_DATA = gql`
  query GetSidebarData {
    leaderboard {
      developers {
        rank
        xp
        profile { id name username avatarUrl }
      }
      featuredProjects {
        id
        name
        tagline
        starsCount
        forksCount
        isFeatured
        isTrending
        tags { name }
        owner { name username avatarUrl }
      }
    }
  }
`;

interface RightSidebarProps {
  className?: string;
  category?: "home" | "launchpad" | "leaderboard" | "roast" | "profile" | "rank-role";
}

function ProjectSkeleton() {
  return (
    <div className="p-2 space-y-2">
      <div className="flex items-start gap-2.5">
        <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-2.5 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DevSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2.5 w-16" />
      </div>
      <Skeleton className="h-7 w-16 rounded-md flex-shrink-0" />
    </div>
  );
}

export function RightSidebar({ className = "" }: RightSidebarProps) {
  const { data, loading } = useQuery(GET_SIDEBAR_DATA, {
    fetchPolicy: "cache-and-network",
  });

  const featuredProjects: any[] = data?.leaderboard?.featuredProjects ?? [];
  const developers: any[] = data?.leaderboard?.developers ?? [];

  return (
    <aside className={`w-80 ${className}`}>
      <div className="p-2 space-y-3">

        {/* Featured Projects Section */}
        <div>
          <div className="px-2 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" strokeWidth={2} />
              <h3 className="font-semibold text-sm">Featured Projects</h3>
            </div>
          </div>
          <div className="space-y-1.5">
            {loading && featuredProjects.length === 0 ? (
              [...Array(4)].map((_, i) => <ProjectSkeleton key={i} />)
            ) : featuredProjects.length === 0 ? (
              <p className="px-2 text-xs text-muted-foreground py-3">No featured projects yet</p>
            ) : (
              featuredProjects.slice(0, 5).map((project: any, index: number) => (
                <div
                  key={project.id}
                  className={`p-2 hover:bg-muted/50 cursor-pointer transition-colors group rounded-lg ${
                    index === 0 ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      index === 0 ? "bg-primary" : "bg-muted"
                    }`}>
                      <Code2 className={`w-4 h-4 ${index === 0 ? "text-primary-foreground" : "text-muted-foreground"}`} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {(project.isTrending || index === 0) && (
                              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                            )}
                            <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {project.name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                            {project.tagline}
                          </p>
                        </div>
                        {(project.tags ?? []).length > 0 && (
                          <Badge
                            variant={index === 0 ? "default" : "outline"}
                            className="text-[10px] h-4 px-1.5 rounded flex-shrink-0"
                          >
                            {project.tags[0].name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className={`w-3 h-3 ${index === 0 ? "fill-primary text-primary" : ""}`} strokeWidth={2} />
                          {project.starsCount?.toLocaleString() ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3 h-3" strokeWidth={2} />
                          {project.forksCount?.toLocaleString() ?? 0}
                        </span>
                        {project.isTrending && (
                          <span className="flex items-center gap-1 ml-auto">
                            <TrendingUp className="w-3 h-3 text-green-500" strokeWidth={2} />
                            <span className="text-green-500 font-medium">Trending</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Developers */}
        <div>
          <div className="px-2 mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" strokeWidth={2} />
              <h3 className="font-semibold text-sm">Top Developers</h3>
            </div>
          </div>
          <div className="space-y-2.5">
            {loading && developers.length === 0 ? (
              [...Array(4)].map((_, i) => <DevSkeleton key={i} />)
            ) : developers.length === 0 ? (
              <p className="px-2 text-xs text-muted-foreground py-3">No developers yet</p>
            ) : (
              developers.slice(0, 5).map((dev: any, index: number) => (
                <div key={dev.profile?.id ?? index} className="flex items-center gap-3">
                  <Avatar className="w-9 h-9 border-2 border-border flex-shrink-0">
                    <AvatarImage src={dev.profile?.avatarUrl ?? undefined} />
                    <AvatarFallback>{dev.profile?.name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{dev.profile?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{dev.profile?.username}</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs rounded-md px-3">
                    Follow
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </aside>
  );
}