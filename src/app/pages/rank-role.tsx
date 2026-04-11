import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import {
  Shield,
  Award,
  Zap,
  Star,
  Crown,
  Flame,
  Trophy,
  Target,
  Code,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { LeftSidebar } from "../components/left-sidebar";
import { RightSidebar } from "../components/right-sidebar";

// ─── Icon map: DB iconName → Lucide component ────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  Code,
  Target,
  Zap,
  Star,
  Flame,
  Trophy,
  Crown,
  Rocket,
  Shield,
  Award,
};

function getRankIcon(iconName?: string | null): LucideIcon {
  if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName];
  return Code; // fallback
}

// ─── GQL ─────────────────────────────────────────────────────────────────────

const RANK_ROLE_QUERY = gql`
  query RankRolePage {
    me {
      id
      xp
      rank {
        id
        name
        description
        minXp
        maxXp
        iconName
        color
        bgColor
        borderColor
      }
      earnedRoles {
        id
        earnedAt
        role {
          id
          name
          emoji
          description
          requirement
        }
      }
    }
    ranks {
      id
      name
      description
      minXp
      maxXp
      iconName
      color
      bgColor
      borderColor
    }
    xpActivities {
      id
      action
      xpReward
      icon
    }
  }
`;

// ─── Types ───────────────────────────────────────────────────────────────────

interface RankData {
  id: number;
  name: string;
  description?: string | null;
  minXp: number;
  maxXp?: number | null;
  iconName?: string | null;
  color?: string | null;
  bgColor?: string | null;
  borderColor?: string | null;
}

interface RoleData {
  id: number;
  name: string;
  emoji?: string | null;
  description?: string | null;
  requirement?: string | null;
}

interface UserRoleData {
  id: string;
  earnedAt: string;
  role: RoleData;
}

interface XpActivityData {
  id: number;
  action: string;
  xpReward: number;
  icon?: string | null;
}

interface MeData {
  xp: number;
  rank: RankData;
  earnedRoles: UserRoleData[];
}

interface QueryResult {
  me: MeData | null;
  ranks: RankData[];
  xpActivities: XpActivityData[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Tailwind classes stored in DB need to be present in the bundle.
 *  We keep a safe-list passthrough so Tailwind doesn't purge them. */
function rankClasses(rank: RankData) {
  return {
    color: rank.color ?? "text-gray-500",
    bgColor: rank.bgColor ?? "bg-gray-500/10",
    borderColor: rank.borderColor ?? "border-gray-500/20",
  };
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

function RankRoleSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-80" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Skeleton className="w-24 h-24 rounded-2xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-32" />
            {[...Array(4)].map((_, j) => (
              <Skeleton key={j} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RankRole() {
  const { data, loading, error } = useQuery<QueryResult>(RANK_ROLE_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  // ── Derived state ────────────────────────────────────────────────────────
  const currentXP = data?.me?.xp ?? 0;
  const currentRank = data?.me?.rank;
  const allRanks = data?.ranks ?? [];
  const earnedRoles = data?.me?.earnedRoles ?? [];
  const xpActivities = data?.xpActivities ?? [];

  // Earned role IDs set for O(1) lookup
  const earnedRoleIds = new Set(earnedRoles.map((ur) => ur.role.id));

  // Find the next rank above the current one
  const nextRank = currentRank
    ? allRanks.find((r) => r.minXp > currentRank.minXp)
    : undefined;

  const progressToNext =
    currentRank && nextRank
      ? Math.min(
          100,
          ((currentXP - currentRank.minXp) /
            (nextRank.minXp - currentRank.minXp)) *
            100
        )
      : currentRank && !nextRank
      ? 100
      : 0;

  // All roles across the platform — derived from allRanks-based roles list
  // We show all roles from the earnedRoles + any unearned ones that exist in the system.
  // Since the backend returns only earned roles on the profile, we need the full role list
  // from earnedRoles (earned) combined with a note for unearned. The xpActivities query gives
  // us the activities; all-roles is implicit. We show earned first, then unearned from the
  // global role registry. For now we show all roles the user has earned + note unearned count.
  // (Full role list would require a separate `roles` query — we make do with earnedRoles.)

  return (
    <div className="flex min-h-screen">
      {/* Left Sidebar */}
      <LeftSidebar className="hidden xl:block fixed top-14 left-0 w-64 h-[calc(100vh-3.5rem)] overflow-hidden" />

      {/* Main Content */}
      <div className="flex-1 lg:border-x xl:ml-64 lg:mr-80">
        {loading && !data ? (
          <RankRoleSkeleton />
        ) : error ? (
          <div className="max-w-5xl mx-auto p-6">
            <p className="text-destructive text-sm">
              Failed to load rank data. Please try again.
            </p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-black mb-2">Rank & Role</h1>
              <p className="text-muted-foreground">
                Level up by contributing to the community and earning XP
              </p>
            </div>

            {/* Current Rank Card */}
            {currentRank && (
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                    {/* Rank icon */}
                    <div
                      className={`w-24 h-24 rounded-2xl border-4 flex items-center justify-center flex-shrink-0 ${rankClasses(currentRank).bgColor} ${rankClasses(currentRank).borderColor}`}
                    >
                      {(() => {
                        const Icon = getRankIcon(currentRank.iconName);
                        return (
                          <Icon
                            className={`w-12 h-12 ${rankClasses(currentRank).color}`}
                            strokeWidth={2}
                          />
                        );
                      })()}
                    </div>

                    <div className="flex-1 space-y-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-2xl font-bold">{currentRank.name}</h2>
                          <Badge variant="secondary" className="text-sm">
                            Rank {currentRank.id}
                          </Badge>
                        </div>
                        {currentRank.description && (
                          <p className="text-muted-foreground">
                            {currentRank.description}
                          </p>
                        )}
                      </div>

                      {/* XP Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold">
                            {currentXP.toLocaleString()} XP
                          </span>
                          {nextRank ? (
                            <span className="text-muted-foreground">
                              {nextRank.minXp.toLocaleString()} XP to {nextRank.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-medium">
                              Max rank reached 🎉
                            </span>
                          )}
                        </div>
                        <Progress value={progressToNext} className="h-3" />
                        {nextRank && (
                          <p className="text-xs text-muted-foreground">
                            {(nextRank.minXp - currentXP).toLocaleString()} XP remaining
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* All Ranks */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" strokeWidth={2} />
                  <h2 className="text-xl font-bold">All Ranks</h2>
                </div>

                <div className="space-y-3">
                  {allRanks.map((rank) => {
                    const Icon = getRankIcon(rank.iconName);
                    const isCurrentRank = rank.id === currentRank?.id;
                    const isUnlocked = currentXP >= rank.minXp;
                    const cls = rankClasses(rank);

                    return (
                      <Card
                        key={rank.id}
                        className={`transition-all ${
                          isCurrentRank
                            ? "ring-2 ring-primary shadow-lg"
                            : isUnlocked
                            ? "opacity-100"
                            : "opacity-40"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center flex-shrink-0 ${cls.bgColor} ${cls.borderColor}`}
                            >
                              <Icon
                                className={`w-7 h-7 ${cls.color}`}
                                strokeWidth={2}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold truncate">{rank.name}</h3>
                                {isCurrentRank && (
                                  <Badge variant="default" className="text-xs">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              {rank.description && (
                                <p className="text-xs text-muted-foreground mb-1">
                                  {rank.description}
                                </p>
                              )}
                              <p className="text-xs font-semibold text-muted-foreground">
                                {rank.minXp.toLocaleString()} –{" "}
                                {rank.maxXp != null
                                  ? rank.maxXp.toLocaleString()
                                  : "∞"}{" "}
                                XP
                              </p>
                            </div>
                            {isUnlocked && (
                              <Award
                                className="w-5 h-5 text-primary flex-shrink-0"
                                strokeWidth={2}
                              />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Roles & XP Guide */}
              <div className="space-y-6">
                {/* Special Roles */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" strokeWidth={2} />
                    <h2 className="text-xl font-bold">Special Roles</h2>
                  </div>

                  {earnedRoles.length === 0 ? (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground text-sm">
                        No roles earned yet. Keep contributing to unlock them!
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {earnedRoles.map((ur) => (
                        <Card key={ur.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-bold text-sm">
                                    {ur.role.emoji ? `${ur.role.emoji} ` : ""}
                                    {ur.role.name}
                                  </h3>
                                  <Badge
                                    variant="default"
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    Earned
                                  </Badge>
                                </div>
                                {ur.role.description && (
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {ur.role.description}
                                  </p>
                                )}
                                {ur.role.requirement && (
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {ur.role.requirement}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* XP Guide */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" strokeWidth={2} />
                    <h2 className="text-xl font-bold">Earn XP</h2>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      {xpActivities.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No XP activities available.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {xpActivities.map((activity) => (
                            <div
                              key={activity.id}
                              className="flex items-center justify-between py-2 border-b last:border-b-0"
                            >
                              <div className="flex items-center gap-3">
                                {activity.icon && (
                                  <span className="text-xl">{activity.icon}</span>
                                )}
                                <span className="text-sm font-medium">
                                  {activity.action}
                                </span>
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-xs font-bold"
                              >
                                +{activity.xpReward} XP
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <RightSidebar
        category="rank-role"
        className="hidden lg:block fixed top-14 right-0 w-80 h-[calc(100vh-3.5rem)] overflow-hidden"
      />
    </div>
  );
}
