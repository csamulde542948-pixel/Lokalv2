import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Trophy, TrendingUp, Code2, Users, Star, GitFork, Crown, Zap, ExternalLink } from "lucide-react";
import { Separator } from "../components/ui/separator";

// Mock data for featured projects
const featuredProjects = [
  {
    id: "f1",
    name: "LokalShop Pro",
    description: "Premium e-commerce platform for Philippine businesses with advanced analytics",
    author: "Angela Torres",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    logo: "🛒",
    stars: 1240,
    forks: 234,
    tech: ["Next.js", "Stripe", "PostgreSQL", "Analytics"],
    featured: true,
    featuredBadge: "Premium Sponsor",
  },
  {
    id: "f2",
    name: "CloudDeploy PH",
    description: "One-click deployment platform built for Filipino developers",
    author: "Carlos Reyes",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    logo: "☁️",
    stars: 890,
    forks: 156,
    tech: ["Go", "Docker", "Kubernetes"],
    featured: true,
    featuredBadge: "Featured",
  },
  {
    id: "f3",
    name: "PayMaya SDK",
    description: "Simplified payment integration for Philippine developers",
    author: "Maria Santos",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    logo: "💳",
    stars: 756,
    forks: 89,
    tech: ["TypeScript", "React", "Node.js"],
    featured: true,
    featuredBadge: "Featured",
  },
];

// Mock data for developers leaderboard
const mockDevelopers = [
  {
    id: "1",
    rank: 1,
    name: "Angela Torres",
    username: "@angelat",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    points: 2847,
    projects: 12,
    trend: "up",
  },
  {
    id: "2",
    rank: 2,
    name: "Carlos Reyes",
    username: "@carlosr",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    points: 2653,
    projects: 8,
    trend: "up",
  },
  {
    id: "3",
    rank: 3,
    name: "Maria Santos",
    username: "@mariasantos",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    points: 2541,
    projects: 15,
    trend: "same",
  },
  {
    id: "4",
    rank: 4,
    name: "Juan dela Cruz",
    username: "@juandc",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    points: 2398,
    projects: 9,
    trend: "down",
  },
  {
    id: "5",
    rank: 5,
    name: "Miguel Fernandez",
    username: "@miguelf",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    points: 2187,
    projects: 7,
    trend: "up",
  },
  {
    id: "6",
    rank: 6,
    name: "Sofia Reyes",
    username: "@sofiar",
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop",
    points: 1956,
    projects: 11,
    trend: "up",
  },
  {
    id: "7",
    rank: 7,
    name: "Diego Martinez",
    username: "@diegom",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
    points: 1843,
    projects: 6,
    trend: "same",
  },
  {
    id: "8",
    rank: 8,
    name: "Isabella Cruz",
    username: "@isabellac",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    points: 1725,
    projects: 10,
    trend: "up",
  },
];

// Mock data for projects leaderboard
const mockProjects = [
  {
    id: "1",
    rank: 1,
    name: "LokalShop",
    description: "E-commerce platform for local Philippine businesses",
    author: "Angela Torres",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    stars: 847,
    forks: 123,
    trend: "up",
    tech: ["Next.js", "Stripe", "PostgreSQL"],
  },
  {
    id: "2",
    rank: 2,
    name: "FarmConnect",
    description: "Connecting local farmers with buyers",
    author: "Maria Santos",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    stars: 763,
    forks: 89,
    trend: "up",
    tech: ["React Native", "Firebase"],
  },
  {
    id: "3",
    rank: 3,
    name: "FreelancerHub PH",
    description: "Project management tool for Filipino freelancers",
    author: "Juan dela Cruz",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    stars: 654,
    forks: 67,
    trend: "same",
    tech: ["Next.js", "Supabase"],
  },
  {
    id: "4",
    rank: 4,
    name: "DeployMaster",
    description: "CLI tool for automating deployment tasks",
    author: "Miguel Fernandez",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    stars: 589,
    forks: 45,
    trend: "up",
    tech: ["Rust", "CLI"],
  },
  {
    id: "5",
    rank: 5,
    name: "BudgetBuddy PH",
    description: "Personal finance tracker for Filipinos",
    author: "Sofia Reyes",
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop",
    stars: 521,
    forks: 34,
    trend: "down",
    tech: ["React", "Node.js", "MongoDB"],
  },
  {
    id: "6",
    rank: 6,
    name: "SkillMatch",
    description: "Job matching platform for tech workers",
    author: "Diego Martinez",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
    stars: 478,
    forks: 28,
    trend: "up",
    tech: ["Vue.js", "Laravel"],
  },
];

export function Leaderboard() {
  const [activeTab, setActiveTab] = useState<"developers" | "projects">("developers");

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="w-3.5 h-3.5 text-green-600" strokeWidth={2} />;
    if (trend === "down") return <TrendingUp className="w-3.5 h-3.5 text-red-600 rotate-180" strokeWidth={2} />;
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

        {/* Featured Projects Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" strokeWidth={2} />
              <h2 className="text-lg font-semibold">Featured Projects</h2>
              <Badge variant="secondary" className="text-xs rounded-md font-normal">
                Premium
              </Badge>
            </div>
            <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
              <Zap className="w-3.5 h-3.5" strokeWidth={2} />
              Get Featured
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {featuredProjects.map((project) => (
              <Card key={project.id} className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5 hover:border-primary/40 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-3xl flex-shrink-0">{project.logo}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm text-primary truncate">{project.name}</h3>
                        <Crown className="w-3.5 h-3.5 text-primary flex-shrink-0" strokeWidth={2} fill="currentColor" />
                      </div>
                      <Badge variant="outline" className="text-xs rounded-md font-normal border-primary/50 text-primary mb-2">
                        {project.featuredBadge}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.tech.slice(0, 3).map((tech) => (
                      <Badge key={tech} variant="secondary" className="text-xs rounded-md py-0 font-normal">
                        {tech}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3" strokeWidth={2} />
                        {project.stars}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork className="w-3 h-3" strokeWidth={2} />
                        {project.forks}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs hover:bg-primary/10 gap-1">
                      <ExternalLink className="w-3 h-3" strokeWidth={2} />
                      View
                    </Button>
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
                {mockDevelopers.map((dev, index) => (
                  <div key={dev.id}>
                    <div className="p-3 hover:bg-muted cursor-pointer transition-colors">
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className="text-sm font-semibold w-6 text-center flex-shrink-0 text-muted-foreground">
                          #{dev.rank}
                        </div>

                        {/* Avatar */}
                        <Avatar className="w-10 h-10 border-2 border-border flex-shrink-0">
                          <AvatarImage src={dev.avatar} />
                          <AvatarFallback>{dev.name[0]}</AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm truncate">{dev.name}</h3>
                            {getTrendIcon(dev.trend)}
                          </div>
                          <p className="text-xs text-muted-foreground">{dev.username} · {dev.projects} projects</p>
                        </div>

                        {/* Points */}
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1 justify-end">
                            <Star className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                            <span className="text-sm font-semibold">{dev.points.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < mockDevelopers.length - 1 && <Separator />}
                  </div>
                ))}
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
                {mockProjects.map((project, index) => (
                  <div key={project.id}>
                    <div 
                      className="p-3 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/project/${project.id}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Rank */}
                        <div className="text-sm font-semibold w-6 text-center pt-1 flex-shrink-0 text-muted-foreground">
                          #{project.rank}
                        </div>

                        {/* Project Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate text-primary">{project.name}</h3>
                            {getTrendIcon(project.trend)}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{project.description}</p>
                          
                          {/* Tech Stack */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {project.tech.map((tech) => (
                              <Badge key={tech} variant="secondary" className="text-xs rounded-md py-0 font-normal">
                                {tech}
                              </Badge>
                            ))}
                          </div>

                          {/* Author & Stats */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Avatar className="w-4 h-4 border border-border">
                                <AvatarImage src={project.avatar} />
                                <AvatarFallback>{project.author[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground truncate">{project.author}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3" strokeWidth={2} />
                                {project.stars}
                              </span>
                              <span className="flex items-center gap-1">
                                <GitFork className="w-3 h-3" strokeWidth={2} />
                                {project.forks}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < mockProjects.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}