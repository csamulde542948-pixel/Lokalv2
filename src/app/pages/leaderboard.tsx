import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Separator } from "../components/ui/separator";
import {
  Trophy, TrendingUp, Code2, Users, Star, GitFork, Crown, Zap,
  Flame, Heart, Rocket, Swords, ArrowUpRight, RefreshCw,
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
          id name tagline starsCount forksCount
          tags { name }
          owner { id name avatarUrl }
        }
      }
      featuredProjects {
        id name tagline starsCount forksCount projectUrl
        tags { name }
        owner { id name avatarUrl }
      }
      shipper {
        rank trend projectsShipped postsCount
        profile { id name username avatarUrl }
      }
      roastSurvivor {
        rank roastsReceived
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

// --- Helpers -----------------------------------------------------------------

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return (
    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-[10px] font-black text-white shadow-sm shadow-yellow-500/40 select-none">1</span>
  );
  if (rank === 2) return (
    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-[10px] font-black text-white shadow-sm select-none">2</span>
  );
  if (rank === 3) return (
    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-[10px] font-black text-white shadow-sm select-none">3</span>
  );
  return (
    <span className="text-xs font-bold text-muted-foreground w-6 text-center tabular-nums">
      {rank}
    </span>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "UP")   return <TrendingUp className="w-3 h-3 text-green-500 flex-shrink-0" strokeWidth={2.5} />;
  if (trend === "DOWN") return <TrendingUp className="w-3 h-3 text-red-500 rotate-180 flex-shrink-0" strokeWidth={2.5} />;
  return null;
}

// --- Skeletons ----------------------------------------------------------------

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Skeleton className="h-5 w-5 rounded-sm flex-shrink-0" />
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-2.5 w-16 rounded" />
      </div>
      <Skeleton className="h-4 w-12 rounded" />
    </div>
  );
}

function GhostRow({ rank }: { rank: number }) {
  const isTop3 = rank <= 3;
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 ${isTop3 ? "opacity-60" : "opacity-35"}`}>
      <div className="w-6 flex items-center justify-center flex-shrink-0">
        {isTop3 ? (
          <Skeleton className={`w-6 h-6 rounded-full ${rank === 1 ? "bg-yellow-500/20" : rank === 2 ? "bg-slate-400/20" : "bg-amber-700/20"}`} />
        ) : (
          <span className="text-xs font-bold text-muted-foreground/30 w-6 text-center">{rank}</span>
        )}
      </div>
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className={`h-3 rounded ${rank === 1 ? "w-28" : rank === 2 ? "w-24" : "w-20"}`} />
        <Skeleton className="h-2.5 w-14 rounded" />
      </div>
      <Skeleton className="h-4 w-12 rounded" />
    </div>
  );
}

// --- Board Header -------------------------------------------------------------

interface BoardHeaderProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  reset: string;
  resetColor?: string;
  description: string;
  action?: React.ReactNode;
}

function BoardHeader({ icon, iconBg, title, reset, resetColor, description, action }: BoardHeaderProps) {
  return (
    <CardHeader className="pb-3 pt-4 px-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm leading-none">{title}</h3>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${resetColor ?? "border-border text-muted-foreground bg-muted/50"}`}>
                {reset}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{description}</p>
          </div>
        </div>
        {action}
      </div>
    </CardHeader>
  );
}

function rankRowBg(rank: number) {
  if (rank === 1) return "bg-yellow-500/8 hover:bg-yellow-500/12";
  if (rank === 2) return "bg-slate-400/6 hover:bg-slate-400/10";
  if (rank === 3) return "bg-amber-600/6 hover:bg-amber-600/10";
  return "hover:bg-muted/40";
}

// --- Board: Top Developers ----------------------------------------------------

function DevelopersBoard({ data, loading }: { data: any[]; loading: boolean }) {
  const rows = data.slice(0, 15);
  return (
    <Card className="flex flex-col h-full border bg-card">
      <BoardHeader
        icon={<Users className="w-4 h-4 text-blue-500" strokeWidth={2} />}
        iconBg="bg-blue-500/10"
        title="Top Developers"
        reset="All-time"
        description="Highest XP earners"
      />
      <CardContent className="p-0 flex-1">
        {loading && rows.length === 0
          ? [...Array(8)].map((_, i) => <div key={i}><RowSkeleton />{i < 7 && <Separator />}</div>)
          : rows.map((dev: any, i: number) => (
            <div key={dev.profile.id}>
              <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer ${rankRowBg(dev.rank)}`}>
                <div className="w-6 flex items-center justify-center flex-shrink-0">
                  <RankBadge rank={dev.rank} />
                </div>
                <Avatar className="w-8 h-8 border border-border flex-shrink-0">
                  <AvatarImage src={dev.profile.avatarUrl} />
                  <AvatarFallback className="text-xs">{dev.profile.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-medium truncate leading-none ${dev.rank <= 3 ? "font-semibold" : ""}`}>{dev.profile.name}</span>
                    <TrendIcon trend={dev.trend} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">@{dev.profile.username}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Zap className="w-3 h-3 text-yellow-500" strokeWidth={2} />
                  <span className="text-xs font-bold tabular-nums">{dev.xp.toLocaleString()}</span>
                </div>
              </div>
              {i < rows.length - 1 && <Separator />}
            </div>
          ))}
        {!loading && rows.length === 0 && (
          <div className="opacity-60">
            {[...Array(7)].map((_, i) => <div key={i}><GhostRow rank={i + 1} />{i < 6 && <Separator />}</div>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Board: Shipper of the Week -----------------------------------------------

function ShipperBoard({ data, loading }: { data: any[]; loading: boolean }) {
  const rows = data.slice(0, 15);
  return (
    <Card className="flex flex-col h-full border bg-card">
      <BoardHeader
        icon={<Rocket className="w-4 h-4 text-violet-500" strokeWidth={2} />}
        iconBg="bg-violet-500/10"
        title="Shipper of the Week"
        reset="Resets Monday"
        resetColor="border-violet-500/30 text-violet-600 bg-violet-500/10"
        description="Most projects & posts shipped"
      />
      <CardContent className="p-0 flex-1">
        {loading && rows.length === 0
          ? [...Array(8)].map((_, i) => <div key={i}><RowSkeleton />{i < 7 && <Separator />}</div>)
          : rows.map((entry: any, i: number) => (
            <div key={entry.profile.id}>
              <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer ${rankRowBg(entry.rank)}`}>
                <div className="w-6 flex items-center justify-center flex-shrink-0">
                  <RankBadge rank={entry.rank} />
                </div>
                <Avatar className="w-8 h-8 border border-border flex-shrink-0">
                  <AvatarImage src={entry.profile.avatarUrl} />
                  <AvatarFallback className="text-xs">{entry.profile.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-medium truncate leading-none ${entry.rank <= 3 ? "font-semibold" : ""}`}>{entry.profile.name}</span>
                    <TrendIcon trend={entry.trend} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">@{entry.profile.username}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px]">
                  <span className="flex items-center gap-0.5 bg-violet-500/10 text-violet-600 font-semibold px-1.5 py-0.5 rounded">
                    <Rocket className="w-2.5 h-2.5" />{entry.projectsShipped}
                  </span>
                  <span className="flex items-center gap-0.5 text-muted-foreground">
                    <Code2 className="w-2.5 h-2.5" />{entry.postsCount}
                  </span>
                </div>
              </div>
              {i < rows.length - 1 && <Separator />}
            </div>
          ))}
        {!loading && rows.length === 0 && (
          <div className="opacity-60">
            {[...Array(7)].map((_, i) => <div key={i}><GhostRow rank={i + 1} />{i < 6 && <Separator />}</div>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Board: Roast Survivor ----------------------------------------------------

function RoastSurvivorBoard({ data, loading }: { data: any[]; loading: boolean }) {
  const rows = data.slice(0, 15);
  return (
    <Card className="flex flex-col h-full border bg-card">
      <BoardHeader
        icon={<Flame className="w-4 h-4 text-orange-500" strokeWidth={2} />}
        iconBg="bg-orange-500/10"
        title="Roast Survivor"
        reset="Permanent"
        resetColor="border-orange-500/30 text-orange-600 bg-orange-500/10"
        description="Hall of fame ï¿½ roasts absorbed"
      />
      <CardContent className="p-0 flex-1">
        {loading && rows.length === 0
          ? [...Array(8)].map((_, i) => <div key={i}><RowSkeleton />{i < 7 && <Separator />}</div>)
          : rows.map((entry: any, i: number) => (
            <div key={entry.profile.id}>
              <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer ${rankRowBg(entry.rank)}`}>
                <div className="w-6 flex items-center justify-center flex-shrink-0">
                  <RankBadge rank={entry.rank} />
                </div>
                <Avatar className="w-8 h-8 border border-border flex-shrink-0">
                  <AvatarImage src={entry.profile.avatarUrl} />
                  <AvatarFallback className="text-xs">{entry.profile.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm truncate leading-none block ${entry.rank <= 3 ? "font-semibold" : "font-medium"}`}>{entry.profile.name}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">@{entry.profile.username}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span className="font-bold">{entry.roastsReceived}</span>
                    <span className="text-muted-foreground">roasts</span>
                  </div>
                </div>
              </div>
              {i < rows.length - 1 && <Separator />}
            </div>
          ))}
        {!loading && rows.length === 0 && (
          <div className="opacity-60">
            {[...Array(7)].map((_, i) => <div key={i}><GhostRow rank={i + 1} />{i < 6 && <Separator />}</div>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Board: Laban Launcher ----------------------------------------------------

function LabanLauncherBoard({ data, loading }: { data: any[]; loading: boolean }) {
  const rows = data.slice(0, 15);
  return (
    <Card className="flex flex-col h-full border bg-card">
      <BoardHeader
        icon={<Swords className="w-4 h-4 text-primary" strokeWidth={2} />}
        iconBg="bg-primary/10"
        title="Laban Launcher"
        reset="Active streak"
        resetColor="border-primary/30 text-primary bg-primary/10"
        description="Longest active shipping streak"
      />
      <CardContent className="p-0 flex-1">
        {loading && rows.length === 0
          ? [...Array(8)].map((_, i) => <div key={i}><RowSkeleton />{i < 7 && <Separator />}</div>)
          : rows.map((entry: any, i: number) => (
            <div key={entry.profile.id}>
              <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer ${rankRowBg(entry.rank)}`}>
                <div className="w-6 flex items-center justify-center flex-shrink-0">
                  <RankBadge rank={entry.rank} />
                </div>
                <Avatar className="w-8 h-8 border border-border flex-shrink-0">
                  <AvatarImage src={entry.profile.avatarUrl} />
                  <AvatarFallback className="text-xs">{entry.profile.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm truncate leading-none block ${entry.rank <= 3 ? "font-semibold" : "font-medium"}`}>{entry.profile.name}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">@{entry.profile.username}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <Swords className="w-3 h-3 text-primary" strokeWidth={2} />
                    <span className="font-bold text-sm tabular-nums">{entry.currentStreak}</span>
                    <span className="text-[11px] text-muted-foreground">days</span>
                  </div>
                  {entry.longestStreak > entry.currentStreak && (
                    <p className="text-[10px] text-muted-foreground">best {entry.longestStreak}d</p>
                  )}
                </div>
              </div>
              {i < rows.length - 1 && <Separator />}
            </div>
          ))}
        {!loading && rows.length === 0 && (
          <div className="opacity-60">
            {[...Array(7)].map((_, i) => <div key={i}><GhostRow rank={i + 1} />{i < 6 && <Separator />}</div>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Board: Community Builder -------------------------------------------------

function CommunityBuilderBoard({ data, loading }: { data: any[]; loading: boolean }) {
  const rows = data.slice(0, 15);
  return (
    <Card className="flex flex-col h-full border bg-card">
      <BoardHeader
        icon={<Heart className="w-4 h-4 text-pink-500" strokeWidth={2} />}
        iconBg="bg-pink-500/10"
        title="Community Builder"
        reset="Resets monthly"
        resetColor="border-pink-500/30 text-pink-600 bg-pink-500/10"
        description="Roasts given + Launchpad participation"
      />
      <CardContent className="p-0 flex-1">
        {loading && rows.length === 0
          ? [...Array(8)].map((_, i) => <div key={i}><RowSkeleton />{i < 7 && <Separator />}</div>)
          : rows.map((entry: any, i: number) => (
            <div key={entry.profile.id}>
              <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer ${rankRowBg(entry.rank)}`}>
                <div className="w-6 flex items-center justify-center flex-shrink-0">
                  <RankBadge rank={entry.rank} />
                </div>
                <Avatar className="w-8 h-8 border border-border flex-shrink-0">
                  <AvatarImage src={entry.profile.avatarUrl} />
                  <AvatarFallback className="text-xs">{entry.profile.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm truncate leading-none block ${entry.rank <= 3 ? "font-semibold" : "font-medium"}`}>{entry.profile.name}</span>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" />{entry.roastsGiven}</span>
                    <span className="flex items-center gap-0.5"><Rocket className="w-2.5 h-2.5" />{entry.launchpadParticipation}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 bg-pink-500/10 rounded-md px-2 py-0.5">
                  <Heart className="w-3 h-3 text-pink-500" strokeWidth={2} fill="currentColor" />
                  <span className="text-xs font-bold text-pink-600 tabular-nums">{entry.communityScore}</span>
                </div>
              </div>
              {i < rows.length - 1 && <Separator />}
            </div>
          ))}
        {!loading && rows.length === 0 && (
          <div className="opacity-60">
            {[...Array(7)].map((_, i) => <div key={i}><GhostRow rank={i + 1} />{i < 6 && <Separator />}</div>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Board: Underdog ----------------------------------------------------------

function UnderdogBoard({ data, loading }: { data: any[]; loading: boolean }) {
  const rows = data.slice(0, 15);
  return (
    <Card className="flex flex-col h-full border bg-card">
      <BoardHeader
        icon={<ArrowUpRight className="w-4 h-4 text-green-500" strokeWidth={2.5} />}
        iconBg="bg-green-500/10"
        title="Underdog"
        reset="Resets Monday"
        resetColor="border-green-500/30 text-green-600 bg-green-500/10"
        description="Biggest XP jump from outside top 20"
      />
      <CardContent className="p-0 flex-1">
        {loading && rows.length === 0
          ? [...Array(8)].map((_, i) => <div key={i}><RowSkeleton />{i < 7 && <Separator />}</div>)
          : rows.map((entry: any, i: number) => (
            <div key={entry.profile.id}>
              <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer ${rankRowBg(entry.rank)}`}>
                <div className="w-6 flex items-center justify-center flex-shrink-0">
                  <RankBadge rank={entry.rank} />
                </div>
                <Avatar className="w-8 h-8 border border-border flex-shrink-0">
                  <AvatarImage src={entry.profile.avatarUrl} />
                  <AvatarFallback className="text-xs">{entry.profile.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm truncate leading-none block ${entry.rank <= 3 ? "font-semibold" : "font-medium"}`}>{entry.profile.name}</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    was #{entry.previousRank} &rarr; {entry.currentXp.toLocaleString()} XP
                  </p>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0 bg-green-500/10 border border-green-500/20 rounded-md px-2 py-0.5">
                  <ArrowUpRight className="w-3 h-3 text-green-600" strokeWidth={2.5} />
                  <span className="text-xs font-bold text-green-600 tabular-nums">+{entry.xpGain.toLocaleString()}</span>
                </div>
              </div>
              {i < rows.length - 1 && <Separator />}
            </div>
          ))}
        {!loading && rows.length === 0 && (
          <div className="opacity-60">
            {[...Array(7)].map((_, i) => <div key={i}><GhostRow rank={i + 1} />{i < 6 && <Separator />}</div>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Board: Top Projects ------------------------------------------------------

function ProjectsBoard({ data, loading }: { data: any[]; loading: boolean }) {
  const rows = data.slice(0, 15);
  return (
    <Card className="flex flex-col h-full border bg-card">
      <BoardHeader
        icon={<Code2 className="w-4 h-4 text-cyan-500" strokeWidth={2} />}
        iconBg="bg-cyan-500/10"
        title="Top Projects"
        reset="All-time"
        description="Highest stars + likes"
      />
      <CardContent className="p-0 flex-1">
        {loading && rows.length === 0
          ? [...Array(8)].map((_, i) => <div key={i}><RowSkeleton />{i < 7 && <Separator />}</div>)
          : rows.map((item: any, i: number) => {
            const p = item.project;
            return (
              <div key={p.id}>
                <div
                  className={`flex items-start gap-3 px-4 py-2.5 transition-colors cursor-pointer ${rankRowBg(item.rank)}`}
                  onClick={() => (window.location.href = `/project/${p.id}`)}
                >
                  <div className="w-6 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <RankBadge rank={item.rank} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className={`text-sm truncate text-primary leading-none ${item.rank <= 3 ? "font-semibold" : "font-medium"}`}>{p.name}</span>
                      <TrendIcon trend={item.trend} />
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mb-1">{p.tagline}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Avatar className="w-3.5 h-3.5 border border-border">
                          <AvatarImage src={p.owner?.avatarUrl} />
                          <AvatarFallback className="text-[8px]">{p.owner?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">{p.owner?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5" />{p.starsCount}</span>
                        <span className="flex items-center gap-0.5"><GitFork className="w-2.5 h-2.5" />{p.forksCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {i < rows.length - 1 && <Separator />}
              </div>
            );
          })}
        {!loading && rows.length === 0 && (
          <div className="opacity-60">
            {[...Array(7)].map((_, i) => <div key={i}><GhostRow rank={i + 1} />{i < 6 && <Separator />}</div>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Featured Projects Stripe -------------------------------------------------

function FeaturedStripe({ data, loading }: { data: any[]; loading: boolean }) {
  // Build ghost pills for skeleton — same shape as real pills
  const skeletonPills = [...Array(8)].map((_, i) => (
    <div
      key={i}
      className="flex items-center gap-2 flex-shrink-0 border border-yellow-500/20 rounded-full px-3 py-1.5 bg-card"
    >
      <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
      <Skeleton className={`h-2.5 rounded ${i % 3 === 0 ? "w-24" : i % 3 === 1 ? "w-16" : "w-20"}`} />
      <Skeleton className="h-2 w-8 rounded" />
    </div>
  ));

  if (loading && data.length === 0) {
    return (
      <div className="w-full border-y border-yellow-500/20 bg-gradient-to-r from-yellow-500/8 via-amber-500/5 to-yellow-500/8 mb-6 overflow-hidden relative">
        <div className="absolute left-[130px] top-0 h-full w-12 z-10 pointer-events-none bg-gradient-to-r from-background to-transparent" />
        <div className="absolute right-[110px] top-0 h-full w-12 z-10 pointer-events-none bg-gradient-to-l from-background to-transparent" />
        <div className="flex items-center py-2.5">
          {/* sticky label */}
          <div className="flex items-center gap-1.5 flex-shrink-0 pl-4 pr-4 z-20 border-r border-yellow-500/20">
            <Crown className="w-3.5 h-3.5 text-yellow-500/50" strokeWidth={2} fill="currentColor" />
            <span className="text-[10px] font-black text-yellow-600/50 dark:text-yellow-400/50 uppercase tracking-widest whitespace-nowrap">Featured</span>
          </div>
          {/* scrolling skeleton track — same animation as live */}
          <div className="overflow-hidden flex-1 mx-2">
            <div className="flex gap-3 animate-scroll-right" style={{ width: "max-content" }}>
              {[...skeletonPills, ...skeletonPills].map((pill, i) => (
                <div key={i}>{pill}</div>
              ))}
            </div>
          </div>
          {/* CTA placeholder */}
          <div className="flex-shrink-0 pl-3 pr-4 z-20 border-l border-yellow-500/20">
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) return null;

  const items = [...data, ...data, ...data];

  return (
    <div className="w-full border-y border-yellow-500/20 bg-gradient-to-r from-yellow-500/8 via-amber-500/5 to-yellow-500/8 mb-6 overflow-hidden relative">
      {/* fade edges */}
      <div className="absolute left-[130px] top-0 h-full w-12 z-10 pointer-events-none bg-gradient-to-r from-background/0 via-transparent to-transparent" />
      <div className="absolute right-[110px] top-0 h-full w-12 z-10 pointer-events-none bg-gradient-to-l from-background/0 via-transparent to-transparent" />

      <div className="flex items-center py-2.5">
        {/* sticky label */}
        <div className="flex items-center gap-1.5 flex-shrink-0 pl-4 pr-4 z-20 border-r border-yellow-500/20">
          <Crown className="w-3.5 h-3.5 text-yellow-500" strokeWidth={2} fill="currentColor" />
          <span className="text-[10px] font-black text-yellow-600 dark:text-yellow-400 uppercase tracking-widest whitespace-nowrap">Featured</span>
        </div>

        {/* scrolling track */}
        <div className="overflow-hidden flex-1 mx-2">
          <div className="flex gap-3 animate-scroll-right" style={{ width: "max-content" }}>
            {items.map((p: any, i: number) => (
              <a
                key={`${p.id}-${i}`}
                href={p.projectUrl ?? `/project/${p.id}`}
                target={p.projectUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex items-center gap-2 flex-shrink-0 border border-yellow-500/25 hover:border-yellow-500/60 bg-card hover:bg-yellow-500/10 rounded-full px-3 py-1.5 transition-all group"
              >
                <Avatar className="w-5 h-5 border border-yellow-500/30 flex-shrink-0">
                  <AvatarImage src={p.owner?.avatarUrl} />
                  <AvatarFallback className="text-[8px] bg-yellow-500/20">{p.name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="text-[11px] font-semibold text-foreground whitespace-nowrap group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                  {p.name}
                </span>
                {p.starsCount > 0 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Star className="w-2.5 h-2.5 text-yellow-500" strokeWidth={2} />
                    {p.starsCount}
                  </span>
                )}
                {p.tags?.[0] && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border border-yellow-500/20 whitespace-nowrap">
                    {p.tags[0].name}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>

        {/* Get Featured CTA */}
        <div className="flex-shrink-0 pl-3 pr-4 z-20 border-l border-yellow-500/20">
          <Button variant="outline" size="sm" className="h-6 px-2.5 text-[10px] gap-1 border-yellow-500/40 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/60">
            <Zap className="w-2.5 h-2.5" strokeWidth={2} /> Get Featured
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Main Component -----------------------------------------------------------

export function Leaderboard() {
  const { data, loading, error } = useQuery(GET_LEADERBOARD, {
    fetchPolicy: "cache-first",
  });

  const lb = (data as any)?.leaderboard;

  return (
    <div className="w-full pb-20">

      {/* Page Header */}
      <div className="flex items-center justify-between px-3 sm:px-6 pt-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Leaderboard</h1>
            <p className="text-xs text-muted-foreground">Ship. Roast. Build. Repeat.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pr-3 sm:pr-6">
          <RefreshCw className="w-3 h-3" strokeWidth={2} />
          <span className="hidden sm:inline">Live rankings</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 sm:mx-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-5">
          {error.message}
        </div>
      )}

      {/* -- Featured Projects Stripe -- */}
      <FeaturedStripe data={lb?.featuredProjects ?? []} loading={loading} />

      {/* -- Board grids -- */}
      <div className="px-3 sm:px-6">
        {/* Row 1: Top Devs + Shipper + Roast Survivor (3-col) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
          <DevelopersBoard    data={lb?.developers    ?? []} loading={loading} />
          <ShipperBoard       data={lb?.shipper        ?? []} loading={loading} />
          <RoastSurvivorBoard data={lb?.roastSurvivor ?? []} loading={loading} />
        </div>

        {/* Row 2: Laban + Community + Underdog (3-col) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
          <LabanLauncherBoard    data={lb?.labanLauncher    ?? []} loading={loading} />
          <CommunityBuilderBoard data={lb?.communityBuilder ?? []} loading={loading} />
          <UnderdogBoard         data={lb?.underdog         ?? []} loading={loading} />
        </div>

        {/* Row 3: Top Projects (full width) */}
        <div className="grid grid-cols-1 gap-4">
          <ProjectsBoard data={lb?.projects ?? []} loading={loading} />
        </div>
      </div>

    </div>
  );
}
