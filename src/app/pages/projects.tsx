import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Skeleton } from "../components/ui/skeleton";
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
  Lock,
  Globe,
  Smartphone,
  Monitor,
  Package,
  Award,
  Filter,
  Heart,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GET_PROJECTS = gql`
  query GetProjects($filter: ProjectFilter, $category: ProjectCategory, $search: String) {
    projects(filter: $filter, category: $category, search: $search) {
      id
      name
      tagline
      description
      iconUrl
      type
      visibility
      category
      status
      isFeatured
      isTrending
      starsCount
      forksCount
      likesCount
      rating
      progress
      tags { name }
      owner { name username avatarUrl }
      demoUrl
      githubUrl
    }
  }
`;

const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
    }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

type FilterType = "ALL" | "FEATURED" | "TRENDING" | "GITHUB" | "PERSONAL";
type CategoryType = "ALL" | "WEB_APP" | "MOBILE_APP" | "LIBRARY" | "CLI_TOOL" | "PORTFOLIO" | "OTHER";

const CATEGORY_LABELS: Record<CategoryType, string> = {
  ALL: "All", WEB_APP: "Web App", MOBILE_APP: "Mobile App",
  LIBRARY: "Library", CLI_TOOL: "CLI Tool", PORTFOLIO: "Portfolio", OTHER: "Other",
};

function getCategoryIcon(category: string) {
  switch (category) {
    case "WEB_APP":    return <Monitor className="w-3.5 h-3.5" strokeWidth={2} />;
    case "MOBILE_APP": return <Smartphone className="w-3.5 h-3.5" strokeWidth={2} />;
    case "LIBRARY":    return <Package className="w-3.5 h-3.5" strokeWidth={2} />;
    case "CLI_TOOL":   return <Code2 className="w-3.5 h-3.5" strokeWidth={2} />;
    default:           return <Layers className="w-3.5 h-3.5" strokeWidth={2} />;
  }
}

function ProjectCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-12 rounded-md" />
          <Skeleton className="h-5 w-14 rounded-md" />
          <Skeleton className="h-5 w-10 rounded-md" />
        </div>
      </div>
      <div className="px-4 py-3 border-t bg-muted/30 flex justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Projects() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput]       = useState("");
  const [search, setSearch]                 = useState("");
  const [activeFilter, setActiveFilter]     = useState<FilterType>("ALL");
  const [activeCategory, setActiveCategory] = useState<CategoryType>("ALL");
  const [showAddDialog, setShowAddDialog]   = useState(false);
  const [formData, setFormData] = useState({
    name: "", tagline: "", description: "",
    type: "PERSONAL", category: "WEB_APP", visibility: "PUBLIC",
    techStack: "", demoUrl: "", githubUrl: "",
  });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, loading, error } = useQuery(GET_PROJECTS, {
    variables: {
      filter: activeFilter === "ALL" ? undefined : activeFilter,
      category: activeCategory === "ALL" ? undefined : activeCategory,
      search: search || undefined,
    },
    fetchPolicy: "cache-and-network",
  });

  const [createProject] = useMutation(CREATE_PROJECT, {
    refetchQueries: [GET_PROJECTS],
  });

  const projects = data?.projects ?? [];

  const handleAddProject = useCallback(async () => {
    if (!formData.name || !formData.tagline) return;
    try {
      await createProject({
        variables: {
          input: {
            name: formData.name,
            tagline: formData.tagline,
            description: formData.description,
            type: formData.type,
            category: formData.category,
            visibility: formData.visibility,
            tags: formData.techStack.split(",").map(t => t.trim()).filter(Boolean),
            demoUrl: formData.demoUrl || undefined,
            githubUrl: formData.githubUrl || undefined,
          },
        },
      });
      setShowAddDialog(false);
      setFormData({ name: "", tagline: "", description: "", type: "PERSONAL", category: "WEB_APP", visibility: "PUBLIC", techStack: "", demoUrl: "", githubUrl: "" });
    } catch (_) {/* server error surfaced via Apollo */ }
  }, [formData, createProject]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-primary" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Projects</h1>
                <p className="text-sm text-muted-foreground">
                  {loading ? "Loading…" : `${projects.length} projects found`}
                </p>
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
                    <Plus className="w-5 h-5" strokeWidth={2} />Add New Project
                  </DialogTitle>
                  <DialogDescription>Share your project with the lokalhost.club community</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Project Type</Label>
                    <Select value={formData.type} onValueChange={v => setFormData(f => ({ ...f, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GITHUB"><div className="flex items-center gap-2"><Github className="w-4 h-4" strokeWidth={2} />GitHub Repository</div></SelectItem>
                        <SelectItem value="PERSONAL"><div className="flex items-center gap-2"><Layers className="w-4 h-4" strokeWidth={2} />Personal Project</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Project Name *</Label>
                    <Input placeholder="My Awesome Project" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tagline *</Label>
                    <Input placeholder="Brief one-liner describing your project" value={formData.tagline} onChange={e => setFormData(f => ({ ...f, tagline: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Detailed description…" rows={4} value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={formData.category} onValueChange={v => setFormData(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="WEB_APP">Web App</SelectItem>
                          <SelectItem value="MOBILE_APP">Mobile App</SelectItem>
                          <SelectItem value="LIBRARY">Library</SelectItem>
                          <SelectItem value="CLI_TOOL">CLI Tool</SelectItem>
                          <SelectItem value="PORTFOLIO">Portfolio</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Visibility</Label>
                      <Select value={formData.visibility} onValueChange={v => setFormData(f => ({ ...f, visibility: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PUBLIC"><div className="flex items-center gap-2"><Globe className="w-4 h-4" strokeWidth={2} />Public</div></SelectItem>
                          <SelectItem value="PRIVATE"><div className="flex items-center gap-2"><Lock className="w-4 h-4" strokeWidth={2} />Private</div></SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tech Stack (comma separated)</Label>
                    <Input placeholder="React, TypeScript, Node.js" value={formData.techStack} onChange={e => setFormData(f => ({ ...f, techStack: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Demo URL</Label>
                      <Input type="url" placeholder="https://…" value={formData.demoUrl} onChange={e => setFormData(f => ({ ...f, demoUrl: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>GitHub URL</Label>
                      <Input type="url" placeholder="https://github.com/…" value={formData.githubUrl} onChange={e => setFormData(f => ({ ...f, githubUrl: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                  <Button onClick={handleAddProject} disabled={!formData.name || !formData.tagline}>Add Project</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search + Filters */}
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
              <Input
                placeholder="Search projects by name, description, or tech stack…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(["ALL", "FEATURED", "TRENDING", "GITHUB", "PERSONAL"] as FilterType[]).map(f => {
                const icons: Record<FilterType, React.ReactNode> = {
                  ALL: <Layers className="w-3.5 h-3.5" strokeWidth={2} />,
                  FEATURED: <Award className="w-3.5 h-3.5" strokeWidth={2} />,
                  TRENDING: <TrendingUp className="w-3.5 h-3.5" strokeWidth={2} />,
                  GITHUB: <Github className="w-3.5 h-3.5" strokeWidth={2} />,
                  PERSONAL: <Code2 className="w-3.5 h-3.5" strokeWidth={2} />,
                };
                const labels: Record<FilterType, string> = {
                  ALL: "All Projects", FEATURED: "Featured", TRENDING: "Trending",
                  GITHUB: "GitHub", PERSONAL: "Personal",
                };
                return (
                  <Button key={f} size="sm" variant={activeFilter === f ? "default" : "outline"} onClick={() => setActiveFilter(f)} className="gap-2">
                    {icons[f]}{labels[f]}
                  </Button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground flex items-center gap-1 px-2">
                <Filter className="w-3 h-3" strokeWidth={2} />Categories:
              </span>
              {(["ALL", "WEB_APP", "MOBILE_APP", "LIBRARY", "CLI_TOOL", "PORTFOLIO", "OTHER"] as CategoryType[]).map(c => (
                <Button key={c} size="sm" variant={activeCategory === c ? "secondary" : "ghost"} onClick={() => setActiveCategory(c)} className="gap-1.5 text-xs h-7">
                  {c !== "ALL" && getCategoryIcon(c)}
                  {CATEGORY_LABELS[c]}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-6 font-mono">
            ⚠ {error.message}
          </div>
        )}

        {loading && projects.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <ProjectCardSkeleton key={i} />)}
          </div>
        ) : projects.length === 0 ? (
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
            {projects.map((project: any) => (
              <Card
                key={project.id}
                className="border bg-card hover:border-primary/50 hover:shadow-lg transition-all group cursor-pointer"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <CardContent className="p-0">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      {project.iconUrl ? (
                        <img src={project.iconUrl} alt={project.name} className="w-16 h-16 rounded-xl border border-border object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl border border-border bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FolderKanban className="w-7 h-7 text-primary" strokeWidth={1.5} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{project.name}</h3>
                          {project.visibility === "PRIVATE" && <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" strokeWidth={2} />}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{project.tagline}</p>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs gap-1 rounded-full">
                            {getCategoryIcon(project.category)}
                            {CATEGORY_LABELS[project.category as CategoryType] ?? project.category}
                          </Badge>
                          {project.isFeatured && <Badge variant="default" className="text-xs rounded-full">Featured</Badge>}
                          {project.isTrending && (
                            <Badge variant="secondary" className="text-xs rounded-full gap-1">
                              <TrendingUp className="w-3 h-3" strokeWidth={2} />Trending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={project.owner?.avatarUrl} />
                        <AvatarFallback>{project.owner?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground truncate">
                        by <span className="text-primary hover:underline">{project.owner?.username}</span>
                      </span>
                    </div>

                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{project.description}</p>
                    )}

                    {project.type === "PERSONAL" && project.progress != null && project.progress < 100 && (
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold text-primary">{project.progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${project.progress}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {(project.tags ?? []).slice(0, 3).map((t: any) => (
                        <Badge key={t.name} variant="secondary" className="text-xs rounded-md py-0 font-normal">{t.name}</Badge>
                      ))}
                      {(project.tags ?? []).length > 3 && (
                        <Badge variant="secondary" className="text-xs rounded-md py-0 font-normal">+{project.tags.length - 3}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      {project.rating != null && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-primary fill-primary" strokeWidth={2} />
                          <span className="font-medium">{project.rating.toFixed(1)}</span>
                        </span>
                      )}
                      {project.type === "GITHUB" && (
                        <span className="flex items-center gap-1">
                          <GitFork className="w-3.5 h-3.5" strokeWidth={2} />{project.forksCount}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" strokeWidth={2} />{project.likesCount}
                      </span>
                    </div>
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5" strokeWidth={2} />{project.starsCount}
                    </span>
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

