import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { 
  FolderKanban, 
  Star, 
  GitFork, 
  Plus,
  Github,
  Layers,
  Search,
  Code2,
  TrendingUp,
  Clock,
  Lock,
  Globe,
  Smartphone,
  Monitor,
  Package,
  Award,
  Filter,
  Heart,
  Download
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

// Mock Projects - All types combined
const mockProjects = [
  {
    id: "1",
    name: "LokalShop",
    tagline: "E-commerce platform for Philippine businesses",
    description: "Complete e-commerce solution with inventory management, payment gateways, and analytics dashboard",
    owner: {
      name: "Angela Torres",
      username: "angelat",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    },
    icon: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&h=200&fit=crop",
    type: "github",
    visibility: "public",
    category: "Web App",
    featured: true,
    trending: true,
    stars: 1240,
    forks: 234,
    likes: 890,
    downloads: "50K+",
    rating: 4.5,
    tech: ["Next.js", "TypeScript", "PostgreSQL", "Stripe"],
    lastUpdated: "2 days ago",
    status: "Active",
  },
  {
    id: "2",
    name: "FarmConnect",
    tagline: "Connecting farmers directly with buyers",
    description: "Mobile marketplace connecting local farmers with buyers across the Philippines",
    owner: {
      name: "Maria Santos",
      username: "mariasantos",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    icon: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=200&h=200&fit=crop",
    type: "personal",
    visibility: "private",
    category: "Mobile App",
    featured: true,
    trending: true,
    likes: 763,
    stars: 456,
    downloads: "10K+",
    rating: 4.7,
    tech: ["React Native", "Firebase", "Stripe"],
    lastUpdated: "1 day ago",
    status: "In Progress",
    progress: 85,
  },
  {
    id: "3",
    name: "FreelancerHub PH",
    tagline: "Project management for freelancers",
    description: "Comprehensive tool for Filipino freelancers to manage clients, track time, and handle invoices",
    owner: {
      name: "Juan dela Cruz",
      username: "juandc",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    icon: "https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=200&h=200&fit=crop",
    type: "github",
    visibility: "public",
    category: "Web App",
    featured: false,
    trending: true,
    stars: 654,
    forks: 89,
    likes: 432,
    downloads: "25K+",
    rating: 4.3,
    tech: ["Next.js", "Supabase", "TypeScript"],
    lastUpdated: "5 hours ago",
    status: "Active",
  },
  {
    id: "4",
    name: "PayPH SDK",
    tagline: "Philippine payment gateway integration",
    description: "Unified SDK for integrating GCash, PayMaya, and other Philippine payment gateways",
    owner: {
      name: "Carlos Reyes",
      username: "carlosr",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    },
    icon: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=200&h=200&fit=crop",
    type: "github",
    visibility: "public",
    category: "Library",
    featured: false,
    trending: false,
    stars: 432,
    forks: 67,
    likes: 298,
    downloads: "15K+",
    rating: 4.6,
    tech: ["TypeScript", "Node.js", "REST API"],
    lastUpdated: "1 week ago",
    status: "Active",
  },
  {
    id: "5",
    name: "TaskFlow Pro",
    tagline: "Team collaboration made simple",
    description: "Private project management tool for enterprise clients with custom workflows",
    owner: {
      name: "Sofia Reyes",
      username: "sofiar",
      avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop",
    },
    icon: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=200&h=200&fit=crop",
    type: "personal",
    visibility: "private",
    category: "Web App",
    featured: false,
    trending: false,
    likes: 234,
    stars: 178,
    downloads: "5K+",
    rating: 4.4,
    tech: ["React", "Node.js", "MongoDB"],
    lastUpdated: "3 days ago",
    status: "In Progress",
    progress: 70,
  },
  {
    id: "6",
    name: "FoodiesPH",
    tagline: "Discover local restaurants",
    description: "Mobile app for discovering and reviewing local restaurants across the Philippines",
    owner: {
      name: "Miguel Fernandez",
      username: "miguelf",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    },
    icon: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=200&fit=crop",
    type: "personal",
    visibility: "public",
    category: "Mobile App",
    featured: false,
    trending: true,
    likes: 567,
    stars: 345,
    downloads: "20K+",
    rating: 4.2,
    tech: ["Flutter", "Firebase", "Google Maps"],
    lastUpdated: "4 hours ago",
    status: "Active",
  },
  {
    id: "7",
    name: "DevTools CLI",
    tagline: "Developer productivity toolkit",
    description: "Command-line tools collection for common development tasks and automation",
    owner: {
      name: "Diego Martinez",
      username: "diegom",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
    },
    icon: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=200&h=200&fit=crop",
    type: "github",
    visibility: "public",
    category: "CLI Tool",
    featured: false,
    trending: false,
    stars: 298,
    forks: 45,
    likes: 187,
    downloads: "8K+",
    rating: 4.1,
    tech: ["Rust", "CLI"],
    lastUpdated: "2 weeks ago",
    status: "Active",
  },
  {
    id: "8",
    name: "BudgetBuddy PH",
    tagline: "Personal finance tracker",
    description: "Track expenses, manage budgets, and achieve financial goals tailored for Filipinos",
    owner: {
      name: "Isabella Cruz",
      username: "isabellac",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    },
    icon: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=200&h=200&fit=crop",
    type: "personal",
    visibility: "private",
    category: "Mobile App",
    featured: false,
    trending: false,
    likes: 412,
    stars: 289,
    downloads: "12K+",
    rating: 4.5,
    tech: ["React Native", "Expo", "SQLite"],
    lastUpdated: "6 days ago",
    status: "In Progress",
    progress: 60,
  },
];

type FilterType = "all" | "featured" | "trending" | "github" | "personal";
type CategoryType = "all" | "Web App" | "Mobile App" | "Library" | "CLI Tool" | "Portfolio";

export function Projects() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeCategory, setActiveCategory] = useState<CategoryType>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Filter projects based on search and filters
  const filteredProjects = mockProjects.filter((project) => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.tech.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = 
      activeFilter === "all" ? true :
      activeFilter === "featured" ? project.featured :
      activeFilter === "trending" ? project.trending :
      activeFilter === "github" ? project.type === "github" :
      activeFilter === "personal" ? project.type === "personal" :
      true;

    const matchesCategory = 
      activeCategory === "all" ? true : project.category === activeCategory;

    return matchesSearch && matchesFilter && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Web App": return <Monitor className="w-3.5 h-3.5" strokeWidth={2} />;
      case "Mobile App": return <Smartphone className="w-3.5 h-3.5" strokeWidth={2} />;
      case "Library": return <Package className="w-3.5 h-3.5" strokeWidth={2} />;
      case "CLI Tool": return <Code2 className="w-3.5 h-3.5" strokeWidth={2} />;
      default: return <Layers className="w-3.5 h-3.5" strokeWidth={2} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-primary" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Projects</h1>
                <p className="text-sm text-muted-foreground">{filteredProjects.length} projects found</p>
              </div>
            </div>
            
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  Add Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" strokeWidth={2} />
                    Add New Project
                  </DialogTitle>
                  <DialogDescription>
                    Share your project with the lokalhost.club community
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Project Type */}
                  <div className="space-y-2">
                    <Label>Project Type</Label>
                    <Select defaultValue="personal">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="github">
                          <div className="flex items-center gap-2">
                            <Github className="w-4 h-4" strokeWidth={2} />
                            GitHub Repository
                          </div>
                        </SelectItem>
                        <SelectItem value="personal">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4" strokeWidth={2} />
                            Personal Project
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Project Name */}
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project Name *</Label>
                    <Input id="project-name" placeholder="My Awesome Project" />
                  </div>

                  {/* Tagline */}
                  <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline *</Label>
                    <Input id="tagline" placeholder="Brief one-liner describing your project" />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Detailed description of your project..."
                      rows={4}
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select defaultValue="web">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="web">Web App</SelectItem>
                        <SelectItem value="mobile">Mobile App</SelectItem>
                        <SelectItem value="library">Library</SelectItem>
                        <SelectItem value="cli">CLI Tool</SelectItem>
                        <SelectItem value="portfolio">Portfolio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Visibility */}
                  <div className="space-y-2">
                    <Label>Visibility</Label>
                    <Select defaultValue="public">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" strokeWidth={2} />
                            Public - Anyone can see
                          </div>
                        </SelectItem>
                        <SelectItem value="private">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4" strokeWidth={2} />
                            Private - Only you can see
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tech Stack */}
                  <div className="space-y-2">
                    <Label htmlFor="tech">Tech Stack</Label>
                    <Input 
                      id="tech" 
                      placeholder="React, TypeScript, Node.js (comma separated)"
                    />
                  </div>

                  {/* URLs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="demo-url">Demo URL</Label>
                      <Input id="demo-url" type="url" placeholder="https://..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="github-url">GitHub URL</Label>
                      <Input id="github-url" type="url" placeholder="https://github.com/..." />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setShowAddDialog(false)}>
                    Add Project
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filters */}
          <div className="mt-4 space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
              <Input
                placeholder="Search projects by name, description, or tech stack..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={activeFilter === "all" ? "default" : "outline"}
                onClick={() => setActiveFilter("all")}
                className="gap-2"
              >
                <Layers className="w-3.5 h-3.5" strokeWidth={2} />
                All Projects
              </Button>
              <Button
                size="sm"
                variant={activeFilter === "featured" ? "default" : "outline"}
                onClick={() => setActiveFilter("featured")}
                className="gap-2"
              >
                <Award className="w-3.5 h-3.5" strokeWidth={2} />
                Featured
              </Button>
              <Button
                size="sm"
                variant={activeFilter === "trending" ? "default" : "outline"}
                onClick={() => setActiveFilter("trending")}
                className="gap-2"
              >
                <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} />
                Trending
              </Button>
              <Button
                size="sm"
                variant={activeFilter === "github" ? "default" : "outline"}
                onClick={() => setActiveFilter("github")}
                className="gap-2"
              >
                <Github className="w-3.5 h-3.5" strokeWidth={2} />
                GitHub
              </Button>
              <Button
                size="sm"
                variant={activeFilter === "personal" ? "default" : "outline"}
                onClick={() => setActiveFilter("personal")}
                className="gap-2"
              >
                <Code2 className="w-3.5 h-3.5" strokeWidth={2} />
                Personal
              </Button>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1 px-2">
                <Filter className="w-3 h-3" strokeWidth={2} />
                Categories:
              </span>
              {(["all", "Web App", "Mobile App", "Library", "CLI Tool", "Portfolio"] as CategoryType[]).map((category) => (
                <Button
                  key={category}
                  size="sm"
                  variant={activeCategory === category ? "secondary" : "ghost"}
                  onClick={() => setActiveCategory(category)}
                  className="gap-1.5 text-xs h-7"
                >
                  {category !== "all" && getCategoryIcon(category)}
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="container mx-auto px-4 py-6">
        {filteredProjects.length === 0 ? (
          <Card className="border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="w-12 h-12 text-muted-foreground mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-semibold mb-2">No projects found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Try adjusting your search or filters to find what you're looking for
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <Card 
                key={project.id} 
                className="border bg-card hover:border-primary/50 hover:shadow-lg transition-all group cursor-pointer" 
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <CardContent className="p-0">
                  {/* Project Header with Icon */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {/* Project Icon */}
                      <img
                        src={project.icon}
                        alt={project.name}
                        className="w-16 h-16 rounded-xl border border-border object-cover flex-shrink-0"
                      />
                      
                      {/* Project Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                            {project.name}
                          </h3>
                          {project.visibility === "private" && (
                            <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" strokeWidth={2} />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {project.tagline}
                        </p>
                        
                        {/* Badges */}
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs gap-1 rounded-full">
                            {getCategoryIcon(project.category)}
                            {project.category}
                          </Badge>
                          {project.featured && (
                            <Badge variant="default" className="text-xs rounded-full">
                              Featured
                            </Badge>
                          )}
                          {project.trending && (
                            <Badge variant="secondary" className="text-xs rounded-full gap-1">
                              <TrendingUp className="w-3 h-3" strokeWidth={2} />
                              Trending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Owner Info */}
                    <div className="flex items-center gap-2 text-xs">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={project.owner.avatar} />
                        <AvatarFallback>{project.owner.name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground truncate">
                        by <span className="text-primary hover:underline">{project.owner.username}</span>
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>

                    {/* Progress Bar (for personal projects in progress) */}
                    {project.type === "personal" && project.progress !== undefined && project.progress < 100 && (
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold text-primary">{project.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Tech Stack */}
                    <div className="flex flex-wrap gap-1">
                      {project.tech.slice(0, 3).map((tech) => (
                        <Badge 
                          key={tech} 
                          variant="secondary" 
                          className="text-xs rounded-md py-0 font-normal"
                        >
                          {tech}
                        </Badge>
                      ))}
                      {project.tech.length > 3 && (
                        <Badge variant="secondary" className="text-xs rounded-md py-0 font-normal">
                          +{project.tech.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Footer Stats */}
                  <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-primary fill-primary" strokeWidth={2} />
                        <span className="font-medium">{project.rating}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Download className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>{project.downloads}</span>
                      </div>
                      {project.type === "github" && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <GitFork className="w-3.5 h-3.5" strokeWidth={2} />
                          <span>{project.forks}</span>
                        </div>
                      )}
                      {project.type === "personal" && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Heart className="w-3.5 h-3.5" strokeWidth={2} />
                          <span>{project.likes}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" strokeWidth={2} />
                      <span>{project.lastUpdated}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
