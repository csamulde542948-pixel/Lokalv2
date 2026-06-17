import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Separator } from "./ui/separator";
import {
  TrendingUp, Users, Star, Sparkles, Code2,
  Flame, Rocket, Zap, Trophy, Swords,
} from "lucide-react";
import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { Link } from "react-router";
import { useFollowToggle } from "../features/social/hooks/useFollowToggle";
import { useAuth } from "../../contexts/AuthContext";
import { avatarSrc } from "../../lib/defaults";

const FEATURED_PROJECT_IDS = [
  "cmp5i563n00b9co7jpocajrtw",
  "cmq9qxfvj0002brtbp6ut0alu",
];

const FEATURED_PROJECT_FIELDS = gql`
  fragment FeaturedProjectFields on Project {
    id
    name
    tagline
    iconUrl
    starsCount
    forksCount
    isFeatured
    isTrending
    tags { name }
    owner { id name username avatarUrl }
  }
`;

const GET_SIDEBAR_DATA = gql`
  query GetSidebarData {
    featuredProject0: project(id: "cmp5i563n00b9co7jpocajrtw") {
      ...FeaturedProjectFields
    }
    featuredProject1: project(id: "cmq9qxfvj0002brtbp6ut0alu") {
      ...FeaturedProjectFields
    }
    leaderboard {
      developers {
        rank xp
        profile { id name username avatarUrl }
      }
      featuredProjects {
        ...FeaturedProjectFields
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
  ${FEATURED_PROJECT_FIELDS}
`;

export interface RightSidebarProps {
  className?: string;
  category?: "home" | "launchpad" | "leaderboard" | "roast" | "profile" | "rank-role" | "jobs" | "events";
}

function ProjectSkeleton() {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-1 py-1">
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-2.5 w-20" />
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
        <AvatarImage src={avatarSrc(profile.avatarUrl)} />
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

/**
 * Top Developer row with a real Follow button. The whole row is a
 * <Link> for navigation; the Follow button stops propagation so clicking
 * it doesn't trigger a navigation.
 */
function DeveloperRow({
  dev,
  rank,
  isSelf,
}: {
  dev: any;
  rank: number;
  isSelf: boolean;
}) {
  const { user: authUser } = useAuth();
  const { localFollowing, toggleFollow } = useFollowToggle({
    userId: dev.profile?.id,
    isFollowing: !!dev.isFollowedByMe,
  });

  return (
    <Link
      to={`/profile/${dev.profile?.username}`}
      className="flex items-center gap-2.5 py-1 rounded-lg hover:bg-muted/50 px-1 transition-colors group"
    >
      <span
        className={`text-xs font-bold w-4 text-center flex-shrink-0 ${
          rank === 1
            ? "text-amber-400"
            : rank === 2
              ? "text-slate-400"
              : rank === 3
                ? "text-orange-400"
                : "text-muted-foreground"
        }`}
      >
        {rank <= 3 ? MEDALS[rank - 1] : rank}
      </span>
      <Avatar className="w-7 h-7 flex-shrink-0">
        <AvatarImage src={dev.profile?.avatarUrl ?? undefined} />
        <AvatarFallback className="text-[10px]">{dev.profile?.name?.[0] ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
          {dev.profile?.name}
        </p>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {dev.xp?.toLocaleString() ?? 0} XP
        </p>
      </div>
      {isSelf ? (
        <span className="shrink-0 h-6 px-2 inline-flex items-center text-[10px] rounded text-muted-foreground font-medium">
          You
        </span>
      ) : authUser ? (
        <Button
          size="sm"
          variant={localFollowing ? "secondary" : "outline"}
          className="shrink-0 h-6 text-[10px] rounded px-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFollow();
          }}
        >
          {localFollowing ? "Following" : "Follow"}
        </Button>
      ) : (
        <Link
          to="/login"
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 h-6 px-2 inline-flex items-center text-[10px] rounded text-primary hover:underline"
        >
          Follow
        </Link>
      )}
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
  const { user: authUser } = useAuth();
  const { data, loading } = useQuery(GET_SIDEBAR_DATA, {
    fetchPolicy: "cache-first",
    // 10 min — backend has a 90s cache for the leaderboard payload, so polling
    // faster than 90s would just hit the same cache entry. 10 min keeps the UI
    // feeling fresh without burning server cycles.
    pollInterval: 600_000,
  });

  const lb               = (data as any)?.leaderboard;
  const pinnedFeaturedProjects = FEATURED_PROJECT_IDS
    .map((_, index) => (data as any)?.[`featuredProject${index}`])
    .filter(Boolean);
  const featuredProjects = [
    ...pinnedFeaturedProjects,
    ...(lb?.featuredProjects ?? []),
  ].filter((project, index, all) => (
    project?.id && all.findIndex((p) => p?.id === project.id) === index
  ));
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
              : featuredProjects.slice(0, FEATURED_PROJECT_IDS.length).map((project: any, index: number) => (
                <Link
                  key={project.id}
                  to={`/project/${project.id}`}
                  className="flex items-center gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-muted/50 group"
                >
                  <Avatar className="w-8 h-8 rounded-lg flex-shrink-0 border border-border bg-muted">
                    {project.iconUrl && <AvatarImage src={project.iconUrl} className="object-cover" />}
                    <AvatarFallback className="rounded-lg text-[10px] bg-primary/10 text-primary">
                      {project.name?.[0]?.toUpperCase() ?? <Code2 className="w-3.5 h-3.5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {project.tagline || "Featured project"}
                    </p>
                  </div>
                  {project.isTrending ? (
                    <TrendingUp className="w-3.5 h-3.5 text-green-500 flex-shrink-0" strokeWidth={2} />
                  ) : (
                    <Star className="w-3.5 h-3.5 text-primary flex-shrink-0" strokeWidth={2} />
                  )}
                </Link>
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
                    <DeveloperRow
                      key={dev.profile?.id ?? `dev-${i}`}
                      dev={dev}
                      rank={i + 1}
                      isSelf={!!authUser && dev.profile?.id === authUser.id}
                    />
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
