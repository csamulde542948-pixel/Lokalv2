import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { 
  Shield, 
  TrendingUp, 
  Award, 
  Zap, 
  Star, 
  Crown, 
  Flame,
  Trophy,
  Target,
  Code,
  Users,
  Rocket,
  ChevronRight
} from "lucide-react";
import { LeftSidebar } from "../components/left-sidebar";
import { RightSidebar } from "../components/right-sidebar";

// Rank tiers
const ranks = [
  {
    id: 1,
    name: "Newbie",
    icon: Code,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/20",
    minXP: 0,
    maxXP: 100,
    description: "Just getting started"
  },
  {
    id: 2,
    name: "Junior Dev",
    icon: Target,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    minXP: 100,
    maxXP: 500,
    description: "Building your foundation"
  },
  {
    id: 3,
    name: "Developer",
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    minXP: 500,
    maxXP: 1500,
    description: "Shipping features daily"
  },
  {
    id: 4,
    name: "Senior Dev",
    icon: Star,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    minXP: 1500,
    maxXP: 3000,
    description: "Leading the way"
  },
  {
    id: 5,
    name: "Tech Lead",
    icon: Flame,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
    minXP: 3000,
    maxXP: 5000,
    description: "Guiding the team"
  },
  {
    id: 6,
    name: "Architect",
    icon: Trophy,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
    minXP: 5000,
    maxXP: 10000,
    description: "Building systems"
  },
  {
    id: 7,
    name: "Legend",
    icon: Crown,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
    minXP: 10000,
    maxXP: Infinity,
    description: "Elite status achieved"
  },
];

// Special roles
const roles = [
  {
    id: 1,
    name: "🎨 Designer",
    description: "Earned by sharing UI/UX projects",
    requirement: "Share 5 design projects",
    earned: true,
  },
  {
    id: 2,
    name: "🚀 Launcher",
    description: "Launched a project on Launchpad",
    requirement: "Launch 1 project",
    earned: true,
  },
  {
    id: 3,
    name: "🔥 Roast Master",
    description: "Got roasted and survived",
    requirement: "Get roasted 3 times",
    earned: true,
  },
  {
    id: 4,
    name: "💬 Community Champion",
    description: "Active community member",
    requirement: "50+ helpful comments",
    earned: false,
  },
  {
    id: 5,
    name: "⚡ Speed Demon",
    description: "Ship projects fast",
    requirement: "Launch 5 projects in a month",
    earned: false,
  },
  {
    id: 6,
    name: "🏆 Top 10",
    description: "Reached top 10 leaderboard",
    requirement: "Rank in top 10",
    earned: false,
  },
];

// XP activities
const xpActivities = [
  { action: "Create a post", xp: 10, icon: "📝" },
  { action: "Launch a project", xp: 100, icon: "🚀" },
  { action: "Get roasted", xp: 50, icon: "🔥" },
  { action: "Receive a like", xp: 2, icon: "❤️" },
  { action: "Receive a comment", xp: 5, icon: "💬" },
  { action: "Share a project", xp: 15, icon: "🔗" },
  { action: "Complete profile", xp: 50, icon: "✅" },
  { action: "Make a connection", xp: 20, icon: "🤝" },
];

export function RankRole() {
  // Mock user data
  const currentXP = 2350;
  const currentRankIndex = ranks.findIndex(r => currentXP >= r.minXP && currentXP < r.maxXP);
  const currentRank = ranks[currentRankIndex];
  const nextRank = ranks[currentRankIndex + 1];
  
  const progressToNext = nextRank 
    ? ((currentXP - currentRank.minXP) / (nextRank.minXP - currentRank.minXP)) * 100
    : 100;

  return (
    <div className="flex min-h-screen">
      {/* Left Sidebar */}
      <LeftSidebar className="hidden xl:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto" />

      {/* Main Content */}
      <div className="flex-1 border-x">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-black mb-2">Rank & Role</h1>
            <p className="text-muted-foreground">
              Level up by contributing to the community and earning XP
            </p>
          </div>

          {/* Current Rank Card */}
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <div className={`w-24 h-24 rounded-2xl ${currentRank.bgColor} border-4 ${currentRank.borderColor} flex items-center justify-center`}>
                  <currentRank.icon className={`w-12 h-12 ${currentRank.color}`} strokeWidth={2} />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold">{currentRank.name}</h2>
                      <Badge variant="secondary" className="text-sm">
                        Rank {currentRank.id}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{currentRank.description}</p>
                  </div>

                  {/* XP Progress */}
                  {nextRank && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{currentXP.toLocaleString()} XP</span>
                        <span className="text-muted-foreground">
                          {nextRank.minXP.toLocaleString()} XP to {nextRank.name}
                        </span>
                      </div>
                      <Progress value={progressToNext} className="h-3" />
                      <p className="text-xs text-muted-foreground">
                        {(nextRank.minXP - currentXP).toLocaleString()} XP remaining
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* All Ranks */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" strokeWidth={2} />
                <h2 className="text-xl font-bold">All Ranks</h2>
              </div>

              <div className="space-y-3">
                {ranks.map((rank) => {
                  const Icon = rank.icon;
                  const isCurrentRank = rank.id === currentRank.id;
                  const isUnlocked = currentXP >= rank.minXP;

                  return (
                    <Card 
                      key={rank.id} 
                      className={`transition-all ${
                        isCurrentRank 
                          ? `ring-2 ring-primary shadow-lg` 
                          : isUnlocked 
                          ? 'opacity-100' 
                          : 'opacity-40'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-xl ${rank.bgColor} border-2 ${rank.borderColor} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-7 h-7 ${rank.color}`} strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold truncate">{rank.name}</h3>
                              {isCurrentRank && (
                                <Badge variant="default" className="text-xs">Current</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {rank.description}
                            </p>
                            <p className="text-xs font-semibold text-muted-foreground">
                              {rank.minXP.toLocaleString()} - {rank.maxXP === Infinity ? '∞' : rank.maxXP.toLocaleString()} XP
                            </p>
                          </div>
                          {isUnlocked && (
                            <Award className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={2} />
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

                <div className="space-y-3">
                  {roles.map((role) => (
                    <Card key={role.id} className={role.earned ? '' : 'opacity-60'}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-sm">{role.name}</h3>
                              {role.earned && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                  Earned
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {role.description}
                            </p>
                            <p className="text-xs font-medium text-muted-foreground">
                              {role.requirement}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* XP Guide */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" strokeWidth={2} />
                  <h2 className="text-xl font-bold">Earn XP</h2>
                </div>

                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {xpActivities.map((activity, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{activity.icon}</span>
                            <span className="text-sm font-medium">{activity.action}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs font-bold">
                            +{activity.xp} XP
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <RightSidebar 
        category="rank-role" 
        className="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto" 
      />
    </div>
  );
}
