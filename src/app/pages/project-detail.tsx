import { useState } from "react";
import { useParams } from "react-router";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import {
  Star,
  Eye,
  Globe,
  ExternalLink,
  Calendar,
  Users,
  Heart,
  Share2,
  Code2,
  Lock,
  GitFork,
  Tag,
  AlertCircle,
} from "lucide-react";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      name
      tagline
      description
      iconUrl
      bannerUrl
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
      demoUrl
      githubUrl
      createdAt
      tags { name }
      owner { name username avatarUrl }
      members { profile { name username avatarUrl } role }
    }
  }
`;

const LIKE_PROJECT = gql`
  mutation LikeProject($projectId: ID!) {
    likeProject(projectId: $projectId) {
      id
      likesCount
    }
  }
`;

const STAR_PROJECT = gql`
  mutation StarProject($projectId: ID!) {
    starProject(projectId: $projectId) {
      id
      starsCount
    }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function ProjectDetailSkeleton() {
  return (
    <div className="min-h-screen">
      <Skeleton className="w-full h-72" />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="w-20 h-20 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"overview" | "team">("overview");

  const { data, loading, error } = useQuery(GET_PROJECT, {
    variables: { id },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });

  const [likeProject] = useMutation(LIKE_PROJECT);
  const [starProject] = useMutation(STAR_PROJECT);

  if (loading) return <ProjectDetailSkeleton />;

  if (error || !data?.project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" strokeWidth={1.5} />
          <h2 className="text-lg font-semibold">Project not found</h2>
          <p className="text-sm text-muted-foreground">{error?.message ?? "This project may have been removed."}</p>
        </div>
      </div>
    );
  }

  const project = data.project;
  const tags = project.tags ?? [];
  const members = project.members ?? [];

  function handleLike() {
    likeProject({ variables: { projectId: project.id } });
  }

  function handleStar() {
    starProject({ variables: { projectId: project.id } });
  }

  return (
    <div className="min-h-screen">
      {/* Banner */}
      <div className="relative w-full h-72 bg-muted overflow-hidden">
        {project.bannerUrl ? (
          <img src={project.bannerUrl} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-muted to-primary/5" />
        )}
        {project.isFeatured && (
          <Badge className="absolute top-4 right-4 bg-yellow-500/90 text-white border-0">Featured</Badge>
        )}
        {project.isTrending && (
          <Badge className="absolute top-4 left-4 bg-primary/90 text-white border-0">Trending</Badge>
        )}
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left/Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border">
                {project.iconUrl ? (
                  <img src={project.iconUrl} alt={project.name} className="w-full h-full object-cover" />
                ) : (
                  <Code2 className="w-10 h-10 text-muted-foreground" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">{project.name}</h1>
                  {project.visibility === "PRIVATE" && (
                    <Lock className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                  )}
                  {project.category && (
                    <Badge variant="secondary" className="text-xs">{project.category.replace(/_/g, " ")}</Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm mb-2">{project.tagline}</p>
                <div className="flex items-center gap-2">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={project.owner?.avatarUrl} />
                    <AvatarFallback>{project.owner?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">by <span className="text-foreground font-medium">{project.owner?.name}</span></span>
                  <span className="text-xs text-muted-foreground">· @{project.owner?.username}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleStar} className="gap-2" variant="secondary">
                <Star className="w-4 h-4" strokeWidth={2} />
                Star · {project.starsCount}
              </Button>
              <Button onClick={handleLike} className="gap-2" variant="secondary">
                <Heart className="w-4 h-4" strokeWidth={2} />
                Like · {project.likesCount}
              </Button>
              <Button className="gap-2" variant="secondary">
                <Share2 className="w-4 h-4" strokeWidth={2} />
                Share
              </Button>
              {project.demoUrl && (
                <Button asChild className="gap-2">
                  <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-4 h-4" strokeWidth={2} />
                    Live Demo
                    <ExternalLink className="w-3 h-3" strokeWidth={2} />
                  </a>
                </Button>
              )}
              {project.githubUrl && (
                <Button asChild variant="outline" className="gap-2">
                  <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                    <Code2 className="w-4 h-4" strokeWidth={2} />
                    GitHub
                    <ExternalLink className="w-3 h-3" strokeWidth={2} />
                  </a>
                </Button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b">
              {(["overview", "team"] as const).map(tab => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? "default" : "ghost"}
                  size="sm"
                  className={`rounded-none border-b-2 rounded-t-md capitalize -mb-px ${activeTab === tab ? "border-primary" : "border-transparent"}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </Button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="space-y-6">
                <Card className="border">
                  <CardHeader><CardTitle className="text-base">About</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {project.description ?? "No description provided."}
                    </p>
                  </CardContent>
                </Card>

                {tags.length > 0 && (
                  <Card className="border">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Tag className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                        Tags
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((t: any) => (
                          <Badge key={t.name} variant="secondary" className="text-xs">{t.name}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {project.progress != null && (
                  <Card className="border">
                    <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Completion</span>
                        <span className="text-sm font-semibold">{project.progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${project.progress}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "team" && (
              <Card className="border">
                <CardHeader><CardTitle className="text-base">Team Members</CardTitle></CardHeader>
                <CardContent>
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No team members listed</p>
                  ) : (
                    <div className="space-y-3">
                      {members.map((m: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={m.profile?.avatarUrl} />
                            <AvatarFallback>{m.profile?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{m.profile?.name}</p>
                            <p className="text-xs text-muted-foreground">@{m.profile?.username} · {m.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Stats */}
            <Card className="border">
              <CardHeader><CardTitle className="text-base">Stats</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Star, label: "Stars", value: project.starsCount },
                    { icon: Heart, label: "Likes", value: project.likesCount },
                    { icon: GitFork, label: "Forks", value: project.forksCount },
                    { icon: Eye, label: "Views", value: null },
                  ].filter(s => s.value !== null && s.value !== undefined).map(s => (
                    <div key={s.label} className="text-center p-3 rounded-md bg-muted/30">
                      <s.icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" strokeWidth={2} />
                      <div className="text-lg font-bold">{(s.value ?? 0).toLocaleString()}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</div>
                    </div>
                  ))}
                </div>
                {project.rating != null && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Rating</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" strokeWidth={2} />
                        <span className="text-sm font-semibold">{project.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Details */}
            <Card className="border">
              <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {project.status && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="secondary" className="text-xs capitalize">{project.status.replace(/_/g, " ")}</Badge>
                  </div>
                )}
                {project.category && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium text-xs">{project.category.replace(/_/g, " ")}</span>
                  </div>
                )}
                {project.type && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium text-xs capitalize">{project.type}</span>
                  </div>
                )}
                {project.createdAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium text-xs">{formatDate(project.createdAt)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visibility</span>
                  <div className="flex items-center gap-1">
                    {project.visibility === "PRIVATE" ? (
                      <Lock className="w-3 h-3 text-muted-foreground" strokeWidth={2} />
                    ) : (
                      <Globe className="w-3 h-3 text-muted-foreground" strokeWidth={2} />
                    )}
                    <span className="font-medium text-xs capitalize">{project.visibility?.toLowerCase()}</span>
                  </div>
                </div>
                {project.demoUrl && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Demo</span>
                    <a href={project.demoUrl} className="text-primary hover:underline text-xs flex items-center gap-1" target="_blank" rel="noopener noreferrer">
                      Visit <ExternalLink className="w-3 h-3" strokeWidth={2} />
                    </a>
                  </div>
                )}
                {project.githubUrl && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Source</span>
                    <a href={project.githubUrl} className="text-primary hover:underline text-xs flex items-center gap-1" target="_blank" rel="noopener noreferrer">
                      GitHub <ExternalLink className="w-3 h-3" strokeWidth={2} />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Owner */}
            <Card className="border">
              <CardHeader><CardTitle className="text-base">Owner</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={project.owner?.avatarUrl} />
                    <AvatarFallback>{project.owner?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{project.owner?.name}</p>
                    <p className="text-xs text-muted-foreground">@{project.owner?.username}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
