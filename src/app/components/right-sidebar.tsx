import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Separator } from "./ui/separator";
import {
  TrendingUp, Users, GitFork, Star, Sparkles, Code2,
  Flame, Rocket, Zap, Trophy, Swords,
} from "lucide-react";
import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { Link } from "react-router";

const GET_SIDEBAR_DATA = gql`
  query GetSidebarData {
    leaderboard {
      developers {
        rank xp
        profile { id name username avatarUrl }
      }
      featuredProjects {
        id name tagline starsCount forksCount isFeatured isTrending
        tags { name }
        owner { id name username avatarUrl }
      }
      shipper {
        rank projectsShipped postsCount
        profile { id name username avatarUrl }
      }
      roastSurvivor {
        rank roastsReceived
        profile { id name username avatarUrl }
      }
      labanLauncher {
        rank currentStreak
        profile { id name username avatarUrl }
      }
      communityBuilder {
        rank communityScore
        profile { id name username avatarUrl }
      }
      underdog {
        rank xpGain
        profile { id name username avatarUrl }
      }
    }
  }
`;

export interface RightSidebarProps {
  className?: string;
  category?: "home" | "launchpad" | "leaderboard" | "roast" | "profile" | "rank-role" | "jobs" | "events";
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

function MiniRowSkeleton() {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-2 w-14" />
      </div>
      <Skeleton className="h-4 w-10 rounded" />
    </div>
  );
}

const MEDALS = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];

function MiniRow({
  rank,
  profile,
  meta,
}: {
  rank: number;
  profile: { name: string; username: string; avatarUrl?: string | null };
  meta: string;
}) {
  const medalColour =
    rank === 1 ? "text-amber-400" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-orange-400" : "text-muted-foreground";

  return (
    <Link
      to={`/profile/${profile.username}`}
      className="flex items-center gap-2.5 py-1 rounded-lg hover:bg-muted/50 px-1 transition-colors group"
    >
      <span className={`text-xs font-bold w-4 text-center flex-shrink-0 ${medalColour}`}>
        {rank <= 3 ? MEDALS[rank - 1] : rank}
      </span>
      <Avatar className="w-7 h-7 flex-shrink-0">
        <AvatarImage src={profile.avatarUrl ?? undefined} />
        <AvatarFallback className="text-[10px]">{profile.name?.[0] ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
          {profile.name}
        </p>
      </div>
      <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0 tabular-nums">
        {meta}
      </span>
    </Link>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  linkTo,
}: {
  icon: React.ElementType;
  title: string;
  linkTo?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-1 mb-1.5">
      <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0" strokeWidth={2} />
      <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground flex-1">
        {title}
      </h3>
      {linkTo && (
        <Link to={linkTo} className="text-[10px] text-primary hover:underline flex-shrink-0">
          See all
        </Link>
      )}
    </div>
  );
}

export function RightSidebar({ className = "", category = "home" }: RightSidebarProps) {
  const { data, loading } = useQuery(GET_SIDEBAR_DATA, {
    fetchPolicy: "cache-first",
    pollInterval: 300_000,
  });

  const lb               = (data as any)?.leaderboard;
  const featuredProjects = lb?.featuredProjects  ?? [];
  const developers       = lb?.developers        ?? [];
  const shipper          = lb?.shipper           ?? [];
  const roastSurvivor    = lb?.roastSurvivor     ?? [];
  const labanLauncher    = lb?.labanLauncher     ?? [];
  const communityBuilder = lb?.communityBuilder  ?? [];
  const underdog         = lb?.underdog          ?? [];

  return (
    <aside className={`w-80 ${className}`}>
      <div className="px-2 pt-4 pb-10 space-y-4 overflow-y-auto h-full">

        {/* Featured Projects - always shown */}
        <div>
          <SectionHeader icon={Sparkles} title="Featured Projects" linkTo="/leaderboard" />
          <div className="space-y-1">
            {loading && featuredProjects.length === 0
              ? [...Array(3)].map((_, i) => <ProjectSkeleton key={i} />)
              : featuredProjects.length === 0
              ? <p className="px-2 text-xs text-muted-foreground py-2">No featured projects yet</p>
              : featuredProjects.slice(0, 4).map((project: any, index: number) => (
                <div
                  key={project.id}
                  className={`p-2 hover:bg-muted/50 cursor-pointer transition-colors group rounded-lg ${index === 0 ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${index === 0 ? "bg-primary" : "bg-muted"}`}>
                      <Code2 className={`w-4 h-4 ${index === 0 ? "text-primary-foreground" : "text-muted-foreground"}`} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {(project.isTrending || index === 0) && (
                              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                            )}
                            <span className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                              {project.name}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
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
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
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
                            <span className="text-green-500 font-medium text-[10px]">Trending</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        <Separator />

        {/* Top Developers - home / leaderboard / rank-role */}
        {(category === "home" || category === "leaderboard" || category === "rank-role") && (
          <div>
            <SectionHeader icon={Trophy} title="Top Developers" linkTo="/leaderboard" />
            <div className="space-y-0.5">
              {loading && developers.length === 0
                ? [...Array(4)].map((_, i) => <DevSkeleton key={i} />)
                : developers.length === 0
                ? <p className="px-2 text-xs text-muted-foreground py-2">No data yet</p>
                : developers.slice(0, 5).map((dev: any, i: number) => (
                  <div key={dev.profile?.id ?? i} className="flex items-center gap-2.5 py-1 rounded-lg hover:bg-muted/50 px-1 transition-colors group">
                    <span className={`text-xs font-bold w-4 text-center flex-shrink-0 ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-muted-foreground"}`}>
                      {i < 3 ? MEDALS[i] : i + 1}
                    </span>
                    <Avatar className="w-7 h-7 flex-shrink-0">
                      <AvatarImage src={dev.profile?.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-[10px]">{dev.profile?.name?.[0] ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <Link to={`/profile/${dev.profile?.username}`}>
                        <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">{dev.profile?.name}</p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">{dev.xp?.toLocaleString()} XP</p>
                      </Link>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0 h-6 text-[10px] rounded px-2">
                      Follow
                    </Button>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Shipper of the Week - home / leaderboard */}
        {(category === "home" || category === "leaderboard") && (
          <>
            <Separator />
            <div>
              <SectionHeader icon={Rocket} title="Shipper of the Week" linkTo="/leaderboard" />
              <div className="space-y-0.5">
                {loading && shipper.length === 0
                  ? [...Array(3)].map((_, i) => <MiniRowSkeleton key={i} />)
                  : shipper.length === 0
                  ? <p className="px-2 text-xs text-muted-foreground py-2">No shippers yet this week</p>
                  : shipper.slice(0, 4).map((s: any) => (
                    <MiniRow
                      key={s.profile?.id}
                      rank={s.rank}
                      profile={s.profile}
                      meta={`${s.projectsShipped} shipped`}
                    />
                  ))
                }
              </div>
            </div>
          </>
        )}

        {/* Roast Survivors - roast / leaderboard */}
        {(category === "roast" || category === "leaderboard") && (
          <>
            <Separator />
            <div>
              <SectionHeader icon={Flame} title="Roast Survivors" linkTo="/leaderboard" />
              <div className="space-y-0.5">
                {loading && roastSurvivor.length === 0
                  ? [...Array(3)].map((_, i) => <MiniRowSkeleton key={i} />)
                  : roastSurvivor.length === 0
                  ? <p className="px-2 text-xs text-muted-foreground py-2">No roasts recorded yet</p>
                  : roastSurvivor.slice(0, 4).map((s: any) => (
                    <MiniRow
                      key={s.profile?.id}
                      rank={s.rank}
                      profile={s.profile}
                      meta={`${s.roastsReceived} roasts`}
                    />
                  ))
                }
              </div>
            </div>
          </>
        )}

        {/* Laban Launcher - home / leaderboard / rank-role */}
        {(category === "home" || category === "leaderboard" || category === "rank-role") && (
          <>
            <Separator />
            <div>
              <SectionHeader icon={Zap} title="Laban Launcher" linkTo="/leaderboard" />
              <div className="space-y-0.5">
                {loading && labanLauncher.length === 0
                  ? [...Array(3)].map((_, i) => <MiniRowSkeleton key={i} />)
                  : labanLauncher.length === 0
                  ? <p className="px-2 text-xs text-muted-foreground py-2">No streak data yet</p>
                  : labanLauncher.slice(0, 4).map((s: any) => (
                    <MiniRow
                      key={s.profile?.id}
                      rank={s.rank}
                      profile={s.profile}
                      meta={`${s.currentStreak}d streak`}
                    />
                  ))
                }
              </div>
            </div>
          </>
        )}

        {/* Community Builder - home / leaderboard */}
        {(category === "home" || category === "leaderboard") && (
          <>
            <Separator />
            <div>
              <SectionHeader icon={Users} title="Community Builder" linkTo="/leaderboard" />
              <div className="space-y-0.5">
                {loading && communityBuilder.length === 0
                  ? [...Array(3)].map((_, i) => <MiniRowSkeleton key={i} />)
                  : communityBuilder.length === 0
                  ? <p className="px-2 text-xs text-muted-foreground py-2">No community data yet</p>
                  : communityBuilder.slice(0, 4).map((s: any) => (
                    <MiniRow
                      key={s.profile?.id}
                      rank={s.rank}
                      profile={s.profile}
                      meta={`${s.communityScore} pts`}
                    />
                  ))
                }
              </div>
            </div>
          </>
        )}

        {/* Underdogs - home / leaderboard */}
        {(category === "home" || category === "leaderboard") && (
          <>
            <Separator />
            <div>
              <SectionHeader icon={Swords} title="Underdogs" linkTo="/leaderboard" />
              <div className="space-y-0.5">
                {loading && underdog.length === 0
                  ? [...Array(3)].map((_, i) => <MiniRowSkeleton key={i} />)
                  : underdog.length === 0
                  ? <p className="px-2 text-xs text-muted-foreground py-2">No underdog data yet</p>
                  : underdog.slice(0, 4).map((s: any) => (
                    <MiniRow
                      key={s.profile?.id}
                      rank={s.rank}
                      profile={s.profile}
                      meta={`+${s.xpGain?.toLocaleString()} XP`}
                    />
                  ))
                }
              </div>
            </div>
          </>
        )}

        {/* Rising Underdogs - rank-role only */}
        {category === "rank-role" && (
          <>
            <Separator />
            <div>
              <SectionHeader icon={Swords} title="Rising Underdogs" linkTo="/leaderboard" />
              <div className="space-y-0.5">
                {loading && underdog.length === 0
                  ? [...Array(3)].map((_, i) => <MiniRowSkeleton key={i} />)
                  : underdog.length === 0
                  ? <p className="px-2 text-xs text-muted-foreground py-2">No underdog data yet</p>
                  : underdog.slice(0, 4).map((s: any) => (
                    <MiniRow
                      key={s.profile?.id}
                      rank={s.rank}
                      profile={s.profile}
                      meta={`+${s.xpGain?.toLocaleString()} XP`}
                    />
                  ))
                }
              </div>
            </div>
          </>
        )}

      </div>
    </aside>
  );
}