import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { Card, CardContent } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { Separator } from "../components/ui/separator";
import {
  Shield, Award, Zap, Star, Crown, Flame, Trophy,
  Target, Code, Rocket, Lock, CheckCircle2, type LucideIcon,
} from "lucide-react";
import { LeftSidebar } from "../components/left-sidebar";
import { RightSidebar } from "../components/right-sidebar";
import { AvatarFrame, pickFrameRole } from "../components/avatar-frame";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { useAuth } from "../../contexts/AuthContext";
import { avatarSrc } from "../../lib/defaults";

const ICON_MAP: Record<string, LucideIcon> = {
  Code, Target, Zap, Star, Flame, Trophy, Crown, Rocket, Shield, Award,
  baby: Star, seedling: Star, code: Code, laptop: Code,
  users: Shield, building: Crown, star: Star,
};

function getRankIcon(iconName?: string | null): LucideIcon {
  if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName];
  return Code;
}

const RANK_HEX: Record<string, string> = {
  Newbie:       "#9ca3af",
  "Junior Dev": "#4ade80",
  Developer:    "#60a5fa",
  "Senior Dev": "#c084fc",
  "Tech Lead":  "#fb923c",
  Architect:    "#f87171",
  Principal:    "#facc15",
  Legend:       "#f59e0b",
};

const RANK_SLOT_LIMITS: Record<string, { projects: number | string; launchpad: number | string }> = {
  "Newbie":      { projects: 1,    launchpad: 1    },
  "Junior Dev":  { projects: 2,    launchpad: 2    },
  "Developer":   { projects: 3,    launchpad: 3    },
  "Senior Dev":  { projects: 5,    launchpad: 5    },
  "Tech Lead":   { projects: 8,    launchpad: 8    },
  "Architect":   { projects: 10,   launchpad: 10   },
  "Principal":   { projects: 15,   launchpad: 15   },
  "Legend":      { projects: "\u221e", launchpad: "\u221e" },
};

const ROLE_DETAILS: Record<string, { flavor: string; howTo: string }> = {
  "Open Sourcerer": {
    flavor: "You ship code that others build on. Your work lives in the open and earns trust through stars — the ultimate signal that the community finds it valuable.",
    howTo: "Get 10+ stars on any of your public projects listed on Lokal.",
  },
  "Launch King": {
    flavor: "Ideas without execution are just dreams. You've repeatedly taken something from zero to launched — five times over. The Launchpad is your home turf.",
    howTo: "Successfully launch 5 projects through the Launchpad feature.",
  },
  "Roast Master": {
    flavor: "You don't just say 'looks good' — you give real, honest, actionable feedback. The community trusts your eye for quality and your words make projects better.",
    howTo: "Submit 10 approved roast reviews on other people's projects.",
  },
  "Event Organizer": {
    flavor: "You bring the community together. Whether it's a workshop, hackathon, or meetup — you create the spaces where Filipino devs connect and grow.",
    howTo: "Create and host 1 event that attracts 20 or more registered attendees.",
  },
  "Hired!": {
    flavor: "Lokal delivered. You found your next opportunity right here in the community — proof that building in public and staying active pays off in the real world.",
    howTo: "Get hired through a job posting listed on Lokal's job board.",
  },
  "Top Contributor": {
    flavor: "Week after week, you show up. Your posts, projects, and engagement keep landing you in the top 10 of the leaderboard — a true pillar of the community.",
    howTo: "Appear in the top 10 of the weekly leaderboard for 4 separate weeks.",
  },
  "Mentor": {
    flavor: "You remember what it was like to be the new person. You share knowledge freely, leave thoughtful comments, and make others feel like they belong here.",
    howTo: "Leave 20+ comments or roasts that receive upvotes from the community.",
  },
};

const RANK_ROLE_QUERY = gql`
  query RankRolePage {
    me {
      id
      xp
      avatarUrl
      name
      rank {
        id name description minXp maxXp iconName color bgColor borderColor
      }
      earnedRoles {
        id earnedAt
        role { id name emoji description requirement }
      }
    }
    ranks {
      id name description minXp maxXp iconName color bgColor borderColor
    }
    roles {
      id name emoji description requirement
    }
    xpActivities {
      id action xpReward icon
    }
  }
`;

interface RankData {
  id: number; name: string; description?: string | null;
  minXp: number; maxXp?: number | null;
  iconName?: string | null; color?: string | null;
  bgColor?: string | null; borderColor?: string | null;
}
interface RoleData {
  id: number; name: string; emoji?: string | null;
  description?: string | null; requirement?: string | null;
}
interface UserRoleData { id: string; earnedAt: string; role: RoleData; }
interface XpActivityData { id: number; action: string; xpReward: number; icon?: string | null; }
interface MeData {
  id: string; xp: number; avatarUrl?: string | null; name: string;
  rank: RankData; earnedRoles: UserRoleData[];
}
interface QueryResult {
  me: MeData | null;
  ranks: RankData[];
  roles: RoleData[];
  xpActivities: XpActivityData[];
}

function rankClasses(rank: RankData) {
  return {
    color: rank.color ?? "text-gray-500",
    bgColor: rank.bgColor ?? "bg-gray-500/10",
    borderColor: rank.borderColor ?? "border-gray-500/20",
  };
}

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
            <Skeleton className="w-40 h-40 rounded-full" />
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

export function RankRole() {
  const { user } = useAuth();

  const { data, loading, error } = useQuery<QueryResult>(RANK_ROLE_QUERY, {
    fetchPolicy: "cache-and-network",
  });

  const currentXP    = data?.me?.xp ?? 0;
  const currentRank  = data?.me?.rank;
  const allRanks     = data?.ranks ?? [];
  const allRoles     = data?.roles ?? [];
  const earnedRoles  = data?.me?.earnedRoles ?? [];
  const xpActivities = data?.xpActivities ?? [];

  const earnedRoleIds   = new Set(earnedRoles.map((ur) => ur.role.id));
  const earnedRoleNames = earnedRoles.map((ur) => ur.role.name);
  const activeFrame     = pickFrameRole(earnedRoleNames);

  const nextRank = currentRank
    ? allRanks.find((r) => r.minXp > currentRank.minXp)
    : undefined;

  const progressToNext =
    currentRank && nextRank
      ? Math.min(100, ((currentXP - currentRank.minXp) / (nextRank.minXp - currentRank.minXp)) * 100)
      : currentRank && !nextRank
      ? 100
      : 0;

  return (
    <div className="flex min-h-screen">
      <LeftSidebar className="hidden xl:block fixed top-14 left-0 w-64 h-[calc(100vh-3.5rem)] overflow-hidden" />

      <div className="flex-1 lg:border-x xl:ml-64 lg:mr-80">
        {loading && !data ? (
          <RankRoleSkeleton />
        ) : error ? (
          <div className="max-w-5xl mx-auto p-6">
            <p className="text-destructive text-sm">Failed to load rank data. Please try again.</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto p-3 sm:p-6 space-y-8">

            <div>
              <h1 className="text-3xl font-black mb-1">Rank &amp; Role</h1>
              <p className="text-muted-foreground text-sm">
                Level up by contributing to the community. Earn XP, unlock ranks, and collect special roles.
              </p>
            </div>

            {currentRank && (
              <Card className="overflow-hidden border-2" style={{ borderColor: RANK_HEX[currentRank.name] ?? "#6b7280" }}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex-shrink-0">
                      <AvatarFrame roleName={activeFrame} rankName={currentRank.name} size={128}>
                        <Avatar className="w-32 h-32">
                          <AvatarImage src={avatarSrc(data?.me?.avatarUrl)} />
                          <AvatarFallback className="text-3xl font-bold">
                            {data?.me?.name?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                      </AvatarFrame>
                      <p className="text-[10px] text-center text-muted-foreground mt-1">
                        {activeFrame ? `${earnedRoles.find(ur => ur.role.name === activeFrame)?.role.emoji ?? ""} ${activeFrame}` : currentRank.name}
                      </p>
                    </div>

                    <div className="flex-1 space-y-4 min-w-0 w-full">
                      <div>
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h2 className="text-2xl font-bold">{currentRank.name}</h2>
                          <Badge variant="secondary">Rank {currentRank.id} of {allRanks.length}</Badge>
                          {earnedRoles.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {earnedRoles.map((ur) => (
                                <Badge key={ur.id} variant="outline" className="text-xs gap-1">
                                  <span>{ur.role.emoji}</span>{ur.role.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        {currentRank.description && (
                          <p className="text-muted-foreground text-sm">{currentRank.description}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-base">{currentXP.toLocaleString()} XP</span>
                          {nextRank ? (
                            <span className="text-muted-foreground">
                              Next: <span className="font-semibold">{nextRank.name}</span> at {nextRank.minXp.toLocaleString()} XP
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-semibold">👑 Max rank reached!</span>
                          )}
                        </div>
                        <Progress value={progressToNext} className="h-3" />
                        {nextRank && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{(nextRank.minXp - currentXP).toLocaleString()} XP</span> to reach {nextRank.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 gap-8">

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" strokeWidth={2} />
                  <h2 className="text-xl font-bold">All Ranks</h2>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {allRanks.filter(r => currentXP >= r.minXp).length}/{allRanks.length} unlocked
                  </span>
                </div>

                <div className="space-y-2">
                  {allRanks.map((rank) => {
                    const Icon          = getRankIcon(rank.iconName);
                    const isCurrentRank = rank.id === currentRank?.id;
                    const isUnlocked    = currentXP >= rank.minXp;
                    const cls           = rankClasses(rank);
                    const ringHex       = RANK_HEX[rank.name] ?? "#6b7280";
                    const slots         = RANK_SLOT_LIMITS[rank.name];

                    return (
                      <Card
                        key={rank.id}
                        className={`transition-all ${isCurrentRank ? "ring-2 ring-primary shadow-md" : isUnlocked ? "" : "opacity-40"}`}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${cls.bgColor}`}
                              style={{ borderColor: ringHex }}
                            >
                              <Icon className={`w-6 h-6 ${cls.color}`} strokeWidth={2} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-sm">{rank.name}</h3>
                                {isCurrentRank && <Badge variant="default" className="text-[10px] px-1.5 py-0">Current</Badge>}
                                {!isUnlocked && <Lock className="w-3 h-3 text-muted-foreground" strokeWidth={2} />}
                                {isUnlocked && !isCurrentRank && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" strokeWidth={2} />}
                              </div>
                              {rank.description && (
                                <p className="text-[11px] text-muted-foreground">{rank.description}</p>
                              )}
                              <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                                {rank.minXp.toLocaleString()} – {rank.maxXp != null ? rank.maxXp.toLocaleString() : "\u221e"} XP
                              </p>
                              {slots && (
                                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                                  🗂 {String(slots.projects)} project{slots.projects !== 1 && slots.projects !== "\u221e" ? "s" : ""} · {String(slots.launchpad)} launchpad{slots.launchpad !== 1 && slots.launchpad !== "\u221e" ? " events" : " event"}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-8">

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" strokeWidth={2} />
                    <h2 className="text-xl font-bold">Special Roles</h2>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {earnedRoles.length}/{allRoles.length} earned
                    </span>
                  </div>

                  <div className="space-y-2">
                    {allRoles.map((role) => {
                      const isEarned    = earnedRoleIds.has(role.id);
                      const earnedEntry = earnedRoles.find(ur => ur.role.id === role.id);
                      const details     = ROLE_DETAILS[role.name];

                      return (
                        <Card key={role.id} className={`transition-all ${!isEarned ? "opacity-50" : ""}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              {/* Live animated frame preview */}
                              <div className={`flex-shrink-0 ${!isEarned ? "grayscale" : ""}`}>
                                <AvatarFrame roleName={isEarned ? role.name : null} rankName={null} size={48}>
                                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-muted">
                                    {isEarned ? role.emoji : <Lock className="w-5 h-5 text-muted-foreground" strokeWidth={2} />}
                                  </div>
                                </AvatarFrame>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-sm">{role.emoji} {role.name}</h3>
                                  {isEarned ? (
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-600 hover:bg-green-600">
                                      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Earned
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                      <Lock className="w-2.5 h-2.5 mr-0.5" />Locked
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {details?.flavor ?? role.description}
                                </p>
                                <p className="text-[11px] text-muted-foreground/70 italic mt-0.5">
                                  {details?.howTo ?? (role.requirement ? `Req: ${role.requirement}` : null)}
                                </p>
                                {isEarned && earnedEntry && (
                                  <p className="text-[10px] text-green-600 font-semibold mt-1">
                                    ✓ Earned {new Date(earnedEntry.earnedAt).toLocaleDateString()}
                                  </p>
                                )}
                                {!isEarned && (
                                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">
                                    🖼 Earn this role to unlock its animated frame
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {allRoles.length === 0 && (
                      <Card>
                        <CardContent className="p-6 text-center text-muted-foreground text-sm">
                          No roles available.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" strokeWidth={2} />
                    <h2 className="text-xl font-bold">How to Earn XP</h2>
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      {xpActivities.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No XP activities available.</p>
                      ) : (
                        <div className="space-y-0">
                          {xpActivities.map((activity, i) => (
                            <div
                              key={activity.id}
                              className={`flex items-center justify-between py-2.5 ${i < xpActivities.length - 1 ? "border-b" : ""}`}
                            >
                              <div className="flex items-center gap-3">
                                {activity.icon && <span className="text-lg w-6 text-center">{activity.icon}</span>}
                                <span className="text-sm">{activity.action}</span>
                              </div>
                              <Badge variant="secondary" className="text-xs font-bold tabular-nums">
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

      <RightSidebar
        category="rank-role"
        className="hidden lg:block fixed top-14 right-0 w-80 h-[calc(100vh-3.5rem)] overflow-hidden"
      />
    </div>
  );
}