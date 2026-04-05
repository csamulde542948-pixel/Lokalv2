import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { TrendingUp, Users, Calendar, GitFork, Star, Code2, Sparkles } from "lucide-react";

interface RightSidebarProps {
  className?: string;
  category?: 'home' | 'launchpad' | 'leaderboard' | 'roast' | 'profile' | 'rank-role';
}

const trendingDevelopers = [
  {
    name: "Angela Torres",
    username: "@angelat",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    followers: 234,
  },
  {
    name: "Carlos Reyes",
    username: "@carlosr",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    followers: 189,
  },
  {
    name: "Maria Santos",
    username: "@mariasantos",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    followers: 156,
  },
  {
    name: "Juan Dela Cruz",
    username: "@juandc",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    followers: 142,
  },
  {
    name: "Sofia Rodriguez",
    username: "@sofiarodz",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop",
    followers: 128,
  },
];

// Different trending projects for different categories
const trendingProjectsByCategory = {
  home: [
    { name: "LokalShop", count: "2.3k", icon: "🛒", description: "E-commerce for local businesses", category: "Marketplace" },
    { name: "FarmConnect", count: "1.8k", icon: "🌾", description: "Farm-to-table logistics platform", category: "AgriTech" },
    { name: "FreelancerHub", count: "1.5k", icon: "💼", description: "Filipino freelancer community", category: "Community" },
    { name: "DeployMaster", count: "1.2k", icon: "🚀", description: "One-click deployment tool", category: "DevTools" },
    { name: "PayMaya Clone", count: "980", icon: "💳", description: "Digital wallet for local payments", category: "FinTech" },
  ],
  launchpad: [
    { name: "LaunchKit", count: "3.1k", icon: "🎯", description: "MVP builder for startups", category: "Startup" },
    { name: "EventHub", count: "2.7k", icon: "📅", description: "Community event management", category: "Events" },
    { name: "GrowthHack", count: "2.2k", icon: "📈", description: "Marketing automation suite", category: "Marketing" },
    { name: "PitchDeck", count: "1.9k", icon: "🎨", description: "AI-powered presentation maker", category: "Design" },
    { name: "StartupOS", count: "1.6k", icon: "⚡", description: "All-in-one startup management", category: "Productivity" },
  ],
  leaderboard: [
    { name: "CodeMasters", count: "4.5k", icon: "👑", description: "Competitive coding platform", category: "Education" },
    { name: "GitRanked", count: "3.8k", icon: "🏆", description: "Developer ranking system", category: "Analytics" },
    { name: "SkillTree", count: "3.2k", icon: "🌳", description: "Tech skill progression tracker", category: "Learning" },
    { name: "DevScore", count: "2.8k", icon: "⚡", description: "Open source contribution tracker", category: "DevTools" },
    { name: "LeaderLab", count: "2.4k", icon: "🎯", description: "Gamified learning challenges", category: "Education" },
  ],
  roast: [
    { name: "RoastAI", count: "5.1k", icon: "🔥", description: "AI-powered code review", category: "AI/ML" },
    { name: "CodeCritic", count: "4.2k", icon: "🎤", description: "Brutal code feedback engine", category: "DevTools" },
    { name: "RefactorBot", count: "3.5k", icon: "🤖", description: "Automated code improvement", category: "AI/ML" },
    { name: "LintMaster", count: "2.9k", icon: "✨", description: "Next-gen code linter", category: "DevTools" },
    { name: "CodeReview.ai", count: "2.3k", icon: "🧠", description: "Smart PR review assistant", category: "AI/ML" },
  ],
  profile: [
    { name: "DevPortfolio", count: "3.3k", icon: "💼", description: "Beautiful developer portfolios", category: "Design" },
    { name: "ProfileKit", count: "2.6k", icon: "👤", description: "Profile builder for devs", category: "Tools" },
    { name: "ShowcaseHub", count: "2.1k", icon: "🎨", description: "Project showcase platform", category: "Community" },
    { name: "CareerTrack", count: "1.7k", icon: "📊", description: "Developer career analytics", category: "Analytics" },
    { name: "ResumeGen", count: "1.4k", icon: "📄", description: "AI-powered resume builder", category: "Career" },
  ],
  "rank-role": [
    { name: "BadgeQuest", count: "4.2k", icon: "🏅", description: "Gamification platform for devs", category: "Gamification" },
    { name: "SkillUp", count: "3.7k", icon: "⚡", description: "Level up your tech skills", category: "Education" },
    { name: "XP Tracker", count: "3.1k", icon: "📊", description: "Track your developer progress", category: "Analytics" },
    { name: "AchieveLab", count: "2.5k", icon: "🎯", description: "Achievement system builder", category: "Tools" },
    { name: "RankMe", count: "2.0k", icon: "🏆", description: "Developer ranking engine", category: "Community" },
  ],
};

export function RightSidebar({ className = "", category = 'home' }: RightSidebarProps) {
  const trendingProjects = trendingProjectsByCategory[category];

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
          {trendingProjects.slice(0, 5).map((project, index) => (
            <div
              key={index}
              className={`p-2 hover:bg-muted/50 cursor-pointer transition-colors group rounded-lg ${
                index === 0 ? 'bg-primary/5' : ''
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
                  index === 0 ? 'bg-primary' : 'bg-muted'
                }`}>
                  {project.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {index === 0 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0"></div>
                        )}
                        <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {project.name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                        {project.description}
                      </p>
                    </div>
                    <Badge 
                      variant={index === 0 ? "default" : "outline"} 
                      className="text-[10px] h-4 px-1.5 rounded flex-shrink-0"
                    >
                      {project.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className={`w-3 h-3 ${index === 0 ? 'fill-primary text-primary' : ''}`} strokeWidth={2} />
                      {project.count}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3 h-3" strokeWidth={2} />
                      {Math.floor(parseInt(project.count) * 0.3)}
                    </span>
                    {index === 0 && (
                      <span className="flex items-center gap-1 ml-auto">
                        <TrendingUp className="w-3 h-3 text-green-500" strokeWidth={2} />
                        <span className="text-green-500 font-medium">Trending</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
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
          {trendingDevelopers.map((dev, index) => (
            <div key={index} className="flex items-center gap-3">
              <Avatar className="w-9 h-9 border-2 border-border flex-shrink-0">
                <AvatarImage src={dev.avatar} />
                <AvatarFallback>{dev.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{dev.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {dev.username}
                </p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs rounded-md px-3">
                Follow
              </Button>
            </div>
          ))}
        </div>
      </div>
      </div>
    </aside>
  );
}