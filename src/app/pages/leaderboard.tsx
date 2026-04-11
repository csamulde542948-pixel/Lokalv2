import { useState } from "react";
import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Separator } from "../components/ui/separator";
import {
  Trophy, TrendingUp, Code2, Users, Star, GitFork, Crown, Zap,
  ExternalLink, Flame, Heart, Rocket, Swords, ArrowUpRight,
} from "lucide-react";

// --- GraphQL -----------------------------------------------------------------

const GET_LEADERBOARD = gql`
  query GetLeaderboard {
    leaderboard {
      developers {
        rank xp trend
        profile { id name username avatarUrl }
      }
      projects {
        rank trend
        project {
          id name tagline starsCount forksCount likesCount
          tags { name }
          owner: author { id name avatarUrl }
        }
      }
      featuredProjects {
        id name tagline starsCount forksCount projectUrl
        tags { name }
        owner: author { id name avatarUrl }
      }
      shipper {
        rank trend projectsShipped postsCount
        profile { id name username avatarUrl }
      }
      roastSurvivor {
        rank roastsReceived avgOverallScore totalRoastScore
        profile { id name username avatarUrl }
      }
      labanLauncher {
        rank currentStreak longestStreak
        profile { id name username avatarUrl }
      }
      communityBuilder {
        rank roastsGiven launchpadParticipation communityScore
        profile { id name username avatarUrl }
      }
      underdog {
        rank xpGain previousRank currentXp
        profile { id name username avatarUrl }
      }
    }
  }
`;

// --- Types -------------------------------------------------------------------

type TabId =
  | "developers"
  | "shipper"
  | "roastSurvivor"
  | "labanLauncher"
  | "communityBuilder"
  | "underdog"
  | "projects"
  | "featured";

interface TabConfig {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  reset: string;
  description: string;
}

// --- Tab Config ---------------------------------------------------------------

const TABS: TabConfig[] = [
  {
    id: "developers",
    label: "Top Devs",
    shortLabel: "Devs",
    icon: <Users className="w-3.5 h-3.5" />,
    reset: "All-time",
    description: "Highest XP earners of all time",
  },
  {
    id: "shipper",
    label: "Shipper of the Week",
    shortLabel: "Shipper",
    icon: <Rocket className="w-3.5 h-3.5" />,
    reset: "Resets Monday",
    description: "Most projects & posts shipped this week",
  },
  {
    id: "roastSurvivor",
    label: "Roast Survivor",
    shortLabel: "Survivor",
    icon: <Flame className="w-3.5 h-3.5" />,
    reset: "Permanent",
    description: "Hall of fame � most roasts absorbed",
  },
  {
    id: "labanLauncher",
    label: "Laban Launcher",
    shortLabel: "Laban",
    icon: <Swords className="w-3.5 h-3.5" />,
    reset: "Active streak",
    description: "Longest active shipping streak in days",
  },
  {
    id: "communityBuilder",
    label: "Community Builder",
    shortLabel: "Builder",
    icon: <Heart className="w-3.5 h-3.5" />,
    reset: "Resets monthly",
    description: "Most roasts given + Launchpad participation",
  },
  {
    id: "underdog",
    label: "Underdog",
    shortLabel: "Underdog",
    icon: <ArrowUpRight className="w-3.5 h-3.5" />,
    reset: "Resets Monday",
    description: "Biggest XP jump from outside top 20",
  },
  {
    id: "projects",
    label: "Top Projects",
    shortLabel: "Projects",
    icon: <Code2 className="w-3.5 h-3.5" />,
    reset: "All-time",
    description: "Highest-rated community projects",
  },
  {
    id: "featured",
    label: "Featured",
    shortLabel: "Featured",
    icon: <Crown className="w-3.5 h-3.5" />,
    reset: "Sponsored",
    description: "Sponsored � paid placement on the leaderboard",
  },
];

// --- Helpers -----------------------------------------------------------------

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base leading-none">??</span>;
  if (rank === 2) return <span className="text-base leading-none">??</span>;
  if (rank === 3) return <span className="text-base leading-none">??</span>;
  return <span className="text-xs font-semibold text-muted-foreground w-5 text-center">#{rank}</span>;
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "UP")   return <TrendingUp className="w-3 h-3 text-green-500" strokeWidth={2} />;
  if (trend === "DOWN") return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" strokeWidth={2} />;
  return null;
}

// --- Skeletons ----------------------------------------------------------------

function RowSkeleton() {
  return (
    <div className="p-3 flex items-center gap-3">
      <Skeleton className="h-5 w-5 rounded-sm flex-shrink-0" />
      <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28 rounded-md" />
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>
      <Skeleton className="h-4 w-14 rounded-md" />
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-md" />
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

function EmptyState({ message }: { message: string }) {
  return <p className="p-8 text-center text-sm text-muted-foreground">{message}</p>;
}

// --- Board: Top Developers ----------------------------------------------------

function DevelopersBoard({ data, loading }: { data: any[]; loading: boolean }) {
  return (
    <Card className="border">
      <CardContent className="p-0">
        {loading && data.length === 0
          ? [...Array(8)].map((_, i) => <div key={i}><RowSkeleton />{i < 7 && <Separator />}</div>)
          : data.map((dev: any, i: number) => (
            <div key={dev.profile.id}>
              <div className="p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-6 flex items-center justify-center flex-shrink-0"><RankBadge rank={dev.rank} /></div>
                  <Avatar className="w-9 h-9 border border-border flex-shrink-0">
                    <AvatarImage src={dev.profile.avatarUrl} />
                    <AvatarFallback>{dev.profile.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{dev.profile.name}</span>
                      <TrendIcon trend={dev.trend} />
                    </div>
                    <p className="text-xs text-muted-foreground">@{dev.profile.username}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Zap className="w-3 h-3 text-yellow-500" strokeWidth={2} />
                    <span className="text-sm font-semibold tabular-nums">{dev.xp.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">XP</span>
                  </div>
                </div>
              </div>
              {i < data.length - 1 && <Separator />}
            </div>
          ))}
        {!loading && data.length === 0 && <EmptyState message="No developers yet." />}
      </CardContent>
    </Card>
  );
}

// --- Board: Shipper of the Week -----------------------------------------------

function ShipperBoard({ data, loading }: { data: any[]; loading: boolean }) {
  return (
    <Card className="border">
      <CardContent className="p-0">
        {loading && data.length === 0
          ? [...Array(8)].map((_, i) => <div key={i}><RowSkeleton />{i < 7 && <Separator />}</div>)
          : data.map((entry: any, i: number) => (
            <div key={entry.profile.id}>
              <div className="p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-6 flex items-center justify-center flex-shrink-0"><RankBadge rank={entry.rank} /></div>
                  <Avatar className="w-9 h-9 border border-border flex-shrink-0">
                    <AvatarImage src={entry.profile.avatarUrl} />
                    <AvatarFallback>{entry.profile.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{entry.profile.name}</span>
                      <TrendIcon trend={entry.trend} />
                    </div>
                    <p className="text-xs text-muted-foreground">@{entry.profile.username}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Rocket className="w-3 h-3 text-primary" strokeWidth={2} />
                      <span className="font-semibold text-foreground">{entry.projectsShipped}</span> shipped
                    </span>
                    <span className="flex items-center gap-1">
                      <Code2 className="w-3 h-3" strokeWidth={2} />
                      {entry.postsCount} posts
                    </span>
                  </div>
                </div>
              </div>
              {i < data.length - 1 && <Separator />}
            </div>
          ))}
        {!loading && data.length === 0 && <EmptyState message="No shippers this week yet. Ship something!" />}
      </CardContent>
    </Card>
  );
}

// --- Board: Roast Survivor ----------------------------------------------------

function RoastSurvivorBoard({ data, loading }: { data: any[]; loading: boolean }) {
  return (
    <Card className="border">
      <CardContent className="p-0">
        {loading && data.length === 0
          ? [...Array(8)].map((_, i) => <div key={i}><RowSkeleton />{i < 7 && <Separator />}</div>)
          : data.map((entry: any, i: number) => (
            <div key={entry.profile.id}>
              <div className="p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-6 flex items-center justify-center flex-shrink-0"><RankBadge rank={entry.rank} /></div>
                  <Avatar className="w-9 h-9 border border-border flex-shrink-0">
                    <AvatarImage src={entry.profile.avatarUrl} />
                    <AvatarFallback>{entry.profile.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm truncate block">{entry.profile.name}</span>
                    <p className="text-xs text-muted-foreground">@{entry.profile.username}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs">
                      <Flame className="w-3 h-3 text-orange-500" strokeWidth={2} />
                      <span className="font-semibold text-foreground">{entry.roastsReceived}</span>
                      <span className="text-muted-foreground">roasts</span>
                    </div>
                    <p className="text-xs text-muted-foreground">avg <span className="font-semibold text-foreground">{entry.avgOverallScore.toFixed(1)}</span>/10</p>
                  </div>
                </div>
              </div>
              {i < data.length - 1 && <Separator />}
            </div>
          ))}
        {!loading && data.length === 0 && <EmptyState message="No roast survivors yet. Get your project roasted!" />}
      </CardContent>
    </Card>
  );
}

// --- Board: Laban Launcher ----------------------------------------------------

function LabanLauncherBoard({ data, loading }: { data: any[]; loading: boolean }) {
  return (
    <Card className="border">
      <CardContent className="p-0">
        {loading && data.length === 0
          ? [...Array(8)].map((_, i) => <div key={i}><RowSkeleton />{i < 7 && <Separator />}</div>)
          : data.map((entry: any, i: number) => (
            <div key={entry.profile.id}>
              <div className="p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-6 flex items-center justify-center flex-shrink-0"><RankBadge rank={entry.rank} /></div>
                  <Avatar className="w-9 h-9 border border-border flex-shrink-0">
                    <AvatarImage src={entry.profile.avatarUrl} />
                    <AvatarFallback>{entry.profile.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm truncate block">{entry.profile.name}</span>
                    <p className="text-xs text-muted-foreground">@{entry.profile.username}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs">
                      <Swords className="w-3 h-3 text-primary" strokeWidth={2} />
                      <span className="font-bold text-foreground text-sm">{entry.currentStreak}</span>
                      <span className="text-muted-foreground">day streak</span>
                    </div>
                    {entry.longestStreak > entry.currentStreak && (
                      <p className="text-xs text-muted-foreground">best: {entry.longestStreak}d</p>
                    )}
                  </div>
                </div>
              </div>
              {i < data.length - 1 && <Separator />}
            </div>
          ))}
        {!loading && data.length === 0 && <EmptyState message="No active streaks yet. Start shipping daily!" />}
      </CardContent>
    </Card>
  );
}

// --- Board: Community Builder -------------------------------------------------

function CommunityBuilderBoard({ data, loading }: { data: any[]; loading: boolean }) {
  return (
    <Card className="border">
      <CardContent className="p-0">
        {loading && data.length === 0
          ? [...Array(8)].map((_, i) => <div key={i}><RowSkeleton />{i < 7 && <Separator />}</div>)
          : data.map((entry: any, i: number) => (
            <div key={entry.profile.id}>
              <div className="p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-6 flex items-center justify-center flex-shrink-0"><RankBadge rank={entry.rank} /></div>
                  <Avatar className="w-9 h-9 border border-border flex-shrink-0">
                    <AvatarImage src={entry.profile.avatarUrl} />
                    <AvatarFallback>{entry.profile.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm truncate block">{entry.profile.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" strokeWidth={2} />{entry.roastsGiven} roasts</span>
                      <span className="flex items-center gap-0.5"><Rocket className="w-2.5 h-2.5" strokeWidth={2} />{entry.launchpadParticipation} launchpad</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Heart className="w-3 h-3 text-pink-500" strokeWidth={2} fill="currentColor" />
                    <span className="text-sm font-bold tabular-nums">{entry.communityScore}</span>
                    <span className="text-xs text-muted-foreground">pts</span>
                  </div>
                </div>
              </div>
              {i < data.length - 1 && <Separator />}
            </div>
          ))}
        {!loading && data.length === 0 && <EmptyState message="No community builders this month. Give a roast!" />}
      </CardContent>
    </Card>
  );
}

// --- Board: Underdog ----------------------------------------------------------

function UnderdogBoard({ data, loading }: { data: any[]; loading: boolean }) {
  return (
    <Card className="border">
      <CardContent className="p-0">
        {loading && data.length === 0
          ? [...Array(8)].map((_, i) => <div key={i}><RowSkeleton />{i < 7 && <Separator />}</div>)
          : data.map((entry: any, i: number) => (
            <div key={entry.profile.id}>
              <div className="p-3 hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-6 flex items-center justify-center flex-shrink-0"><RankBadge rank={entry.rank} /></div>
                  <Avatar className="w-9 h-9 border border-border flex-shrink-0">
                    <AvatarImage src={entry.profile.avatarUrl} />
                    <AvatarFallback>{entry.profile.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm truncate block">{entry.profile.name}</span>
                    <p className="text-xs text-muted-foreground">was #{entry.previousRank} � now {entry.currentXp.toLocaleString()} XP</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 bg-green-500/10 border border-green-500/20 rounded-md px-2 py-0.5">
                    <ArrowUpRight className="w-3 h-3 text-green-600" strokeWidth={2.5} />
                    <span className="text-xs font-bold text-green-600">+{entry.xpGain.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              {i < data.length - 1 && <Separator />}
            </div>
          ))}
        {!loading && data.length === 0 && <EmptyState message="No underdogs this week yet. Grind that XP!" />}
      </CardContent>
    </Card>
  );
}

// --- Board: Top Projects ------------------------------------------------------

function ProjectsBoard({ data, loading }: { data: any[]; loading: boolean }) {
  return (
    <Card className="border">
      <CardContent className="p-0">
        {loading && data.length === 0
          ? [...Array(8)].map((_, i) => <div key={i}><RowSkeleton />{i < 7 && <Separator />}</div>)
          : data.map((item: any, i: number) => {
            const p = item.project;
            return (
              <div key={p.id}>
                <div className="p-3 hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => (window.location.href = `/project/${p.id}`)}>
                  <div className="flex items-start gap-3">
                    <div className="w-6 flex items-center justify-center pt-0.5 flex-shrink-0"><RankBadge rank={item.rank} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-semibold text-sm truncate text-primary">{p.name}</span>
                        <TrendIcon trend={item.trend} />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">{p.tagline}</p>
                      <div className="flex flex-wrap gap-1 mb-1.5">
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
                        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Star className="w-3 h-3" strokeWidth={2} />{p.starsCount}</span>
                          <span className="flex items-center gap-0.5"><GitFork className="w-3 h-3" strokeWidth={2} />{p.forksCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {i < data.length - 1 && <Separator />}
              </div>
            );
          })}
        {!loading && data.length === 0 && <EmptyState message="No projects yet." />}
      </CardContent>
    </Card>
  );
}

// --- Board: Featured Projects -------------------------------------------------

function FeaturedBoard({ data, loading }: { data: any[]; loading: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {loading && data.length === 0
        ? [...Array(4)].map((_, i) => (
          <Card key={i} className="border-2 border-primary/20">
            <CardContent className="p-4"><FeaturedSkeleton /></CardContent>
          </Card>
        ))
        : data.map((p: any) => (
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
                  <Badge variant="outline" className="text-xs rounded-md font-normal border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-1.5 py-0">
                    SPONSORED
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
                {p.projectUrl && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-primary/10 gap-1" asChild>
                    <a href={p.projectUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3" strokeWidth={2} /> View
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      {!loading && data.length === 0 && (
        <div className="col-span-full">
          <Card className="border-2 border-dashed border-primary/20">
            <CardContent className="p-8 flex flex-col items-center gap-3">
              <Crown className="w-8 h-8 text-primary/40" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground text-center">No featured projects yet.<br />Get your project in front of the community.</p>
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                <Zap className="w-3.5 h-3.5" strokeWidth={2} /> Get Featured
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- Main Component -----------------------------------------------------------

export function Leaderboard() {
  const [activeTab, setActiveTab] = useState<TabId>("developers");

  const { data, loading, error } = useQuery(GET_LEADERBOARD, {
    fetchPolicy: "cache-and-network",
  });

  const lb = (data as any)?.leaderboard;
  const activeConfig = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-semibold leading-tight">Leaderboard</h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-snug">6 boards. Ship. Roast. Build. Repeat.</p>
              </div>
            </div>
            {activeTab === "featured" && (
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs flex-shrink-0">
                <Zap className="w-3.5 h-3.5" strokeWidth={2} />
                Get Featured
              </Button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-6 font-mono">
            ? {error.message}
          </div>
        )}

        {/* Tab Scroll Row */}
        <div className="mb-4 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-hide">
          <div className="flex gap-1.5 w-max">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                  ${activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                {tab.icon}
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active board description + reset badge */}
        <div className="flex items-center gap-2 mb-4">
          <p className="text-xs text-muted-foreground flex-1">{activeConfig.description}</p>
          <Badge
            variant="secondary"
            className={`text-xs rounded-md font-normal flex-shrink-0 ${
              activeConfig.reset === "Permanent"
                ? "border border-primary/30 text-primary bg-primary/10"
                : activeConfig.reset === "Sponsored"
                ? "border border-yellow-500/30 text-yellow-600 bg-yellow-500/10"
                : ""
            }`}
          >
            {activeConfig.reset}
          </Badge>
        </div>

        {/* Board Content */}
        {activeTab === "developers"      && <DevelopersBoard      data={lb?.developers      ?? []} loading={loading} />}
        {activeTab === "shipper"         && <ShipperBoard         data={lb?.shipper         ?? []} loading={loading} />}
        {activeTab === "roastSurvivor"   && <RoastSurvivorBoard   data={lb?.roastSurvivor   ?? []} loading={loading} />}
        {activeTab === "labanLauncher"   && <LabanLauncherBoard   data={lb?.labanLauncher   ?? []} loading={loading} />}
        {activeTab === "communityBuilder"&& <CommunityBuilderBoard data={lb?.communityBuilder ?? []} loading={loading} />}
        {activeTab === "underdog"        && <UnderdogBoard        data={lb?.underdog        ?? []} loading={loading} />}
        {activeTab === "projects"        && <ProjectsBoard        data={lb?.projects        ?? []} loading={loading} />}
        {activeTab === "featured"        && <FeaturedBoard        data={lb?.featuredProjects ?? []} loading={loading} />}

      </div>
    </div>
  );
}
