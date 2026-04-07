import { useState } from "react";
import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Trophy, TrendingUp, Code2, Users, Star, GitFork, Crown, Zap, ExternalLink } from "lucide-react";
import { Separator } from "../components/ui/separator";

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_LEADERBOARD = gql`
  query GetLeaderboard {
    leaderboard {
      developers {
        rank
        xp
        trend
        profile {
          id
          name
          username
          avatarUrl
          projectsCount
        }
      }
      projects {
        rank
        trend
        project {
          id
          name
          tagline
          starsCount
          forksCount
          likesCount
          tags { name }
          owner { name username avatarUrl }
        }
      }
      featuredProjects {
        id
        name
        tagline
        starsCount
        forksCount
        demoUrl
        tags { name }
        owner { name username avatarUrl }
      }
    }
  }
`;

// ─── Skeletons ────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3">
      <Skeleton className="w-6 h-4 rounded" />
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      <Skeleton className="h-3 w-12" />
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="rounded-lg border-2 border-primary/20 bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-1">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
    </div>
  );
}

export function Leaderboard() {
  const [activeTab, setActiveTab] = useState<"developers" | "projects">("developers");

  const { data, loading, error } = useQuery(GET_LEADERBOARD, {
    fetchPolicy: "cache-and-network",
  });

  const developers = data?.leaderboard?.developers ?? [];
  const projects   = data?.leaderboard?.projects   ?? [];
  const featured   = data?.leaderboard?.featuredProjects ?? [];

  const getTrendIcon = (trend: string) => {
    if (trend === "UP")   return <TrendingUp className="w-3.5 h-3.5 text-green-600" strokeWidth={2} />;
    if (trend === "DOWN") return <TrendingUp className="w-3.5 h-3.5 text-red-600 rotate-180" strokeWidth={2} />;
    return null;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-primary" strokeWidth={2} />
            <div>
              <h1 className="text-2xl font-semibold">Leaderboard</h1>
              <p className="text-sm text-muted-foreground">Top developers and projects in the community</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-6 font-mono">
            ⚠ {error.message}
          </div>
        )}

        {/* Featured Projects */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" strokeWidth={2} />
              <h2 className="text-lg font-semibold">Featured Projects</h2>
              <Badge variant="secondary" className="text-xs rounded-md font-normal">Premium</Badge>
            </div>
            <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
              <Zap className="w-3.5 h-3.5" strokeWidth={2} />
              Get Featured
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loading && featured.length === 0
              ? [...Array(3)].map((_, i) => <FeaturedSkeleton key={i} />)
              : featured.map((p: any) => (
                <Card key={p.id} className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5 hover:border-primary/40 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="w-10 h-10 border border-border flex-shrink-0">
                        <AvatarImage src={p.owner?.avatarUrl} />
                        <AvatarFallback>{p.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm text-primary truncate">{p.name}</h3>
                          <Crown className="w-3.5 h-3.5 text-primary flex-shrink-0" strokeWidth={2} fill="currentColor" />
                        </div>
                        <Badge variant="outline" className="text-xs rounded-md font-normal border-primary/50 text-primary">
                          Featured
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{p.tagline}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {(p.tags ?? []).slice(0, 3).map((t: any) => (
                        <Badge key={t.name} variant="secondary" className="text-xs rounded-md py-0 font-normal">{t.name}</Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Star className="w-3 h-3" strokeWidth={2} />{p.starsCount}</span>
                        <span className="flex items-center gap-1"><GitFork className="w-3 h-3" strokeWidth={2} />{p.forksCount}</span>
                      </div>
                      {p.demoUrl && (
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-primary/10 gap-1" asChild>
                          <a href={p.demoUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" strokeWidth={2} /> View
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Developers */}
          <div>
            <div className="mb-3">
              <Button variant="default" className="gap-2">
                <Users className="w-4 h-4" strokeWidth={2} />
                Top Developers
              </Button>
            </div>
            <Card className="border">
              <CardContent className="p-0">
                {loading && developers.length === 0
                  ? [...Array(6)].map((_, i) => (
                    <div key={i}><RowSkeleton />{i < 5 && <Separator />}</div>
                  ))
                  : developers.map((dev: any, index: number) => (
                    <div key={dev.profile.id}>
                      <div className="p-3 hover:bg-muted cursor-pointer transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-semibold w-6 text-center flex-shrink-0 text-muted-foreground">
                            #{dev.rank}
                          </div>
                          <Avatar className="w-10 h-10 border-2 border-border flex-shrink-0">
                            <AvatarImage src={dev.profile.avatarUrl} />
                            <AvatarFallback>{dev.profile.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm truncate">{dev.profile.name}</h3>
                              {getTrendIcon(dev.trend)}
                            </div>
                            <p className="text-xs text-muted-foreground">@{dev.profile.username} · {dev.profile.projectsCount} projects</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-1 justify-end">
                              <Star className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                              <span className="text-sm font-semibold">{dev.xp.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < developers.length - 1 && <Separator />}
                    </div>
                  ))}
                {!loading && developers.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">No developers yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Projects */}
          <div>
            <div className="mb-3">
              <Button variant="outline" className="gap-2">
                <Code2 className="w-4 h-4" strokeWidth={2} />
                Top Projects
              </Button>
            </div>
            <Card className="border">
              <CardContent className="p-0">
                {loading && projects.length === 0
                  ? [...Array(6)].map((_, i) => (
                    <div key={i}><RowSkeleton />{i < 5 && <Separator />}</div>
                  ))
                  : projects.map((item: any, index: number) => {
                    const p = item.project;
                    return (
                      <div key={p.id}>
                        <div
                          className="p-3 hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => window.location.href = `/project/${p.id}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-sm font-semibold w-6 text-center pt-1 flex-shrink-0 text-muted-foreground">
                              #{item.rank}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm truncate text-primary">{p.name}</h3>
                                {getTrendIcon(item.trend)}
                              </div>
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{p.tagline}</p>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {(p.tags ?? []).slice(0, 3).map((t: any) => (
                                  <Badge key={t.name} variant="secondary" className="text-xs rounded-md py-0 font-normal">{t.name}</Badge>
                                ))}
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Avatar className="w-4 h-4 border border-border">
                                    <AvatarImage src={p.owner?.avatarUrl} />
                                    <AvatarFallback>{p.owner?.name?.[0]}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground truncate">{p.owner?.name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1"><Star className="w-3 h-3" strokeWidth={2} />{p.starsCount}</span>
                                  <span className="flex items-center gap-1"><GitFork className="w-3 h-3" strokeWidth={2} />{p.forksCount}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {index < projects.length - 1 && <Separator />}
                      </div>
                    );
                  })}
                {!loading && projects.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">No projects yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
