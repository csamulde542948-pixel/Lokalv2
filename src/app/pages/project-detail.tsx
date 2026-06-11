// ─── Project Detail ────────────────────────────────────────────────────────────
// Brand-aligned redesign. Same data, same features, new layout.
//
//   ┌─ Top breadcrumb bar ────────────────────────────────────────┐
//   ├─ Hero (full-bleed banner, crosshairs, 16x16 icon, title) ─┤
//   ├─ Stats strip (fires · stars · forks · likes · rating) ──────┤
//   ├─ Two-column body ──────────────────────────────────────────┤
//   │   Left  (2/3)                │   Right (1/3, sticky)       │
//   │   • About / Description       │   • Details                │
//   │   • Tech Stack (tags)         │   • Links                  │
//   │   • Pages Crawled (grid)      │   • Created By             │
//   │   • Team                      │                            │
//   │   • Progress (if any)         │                            │
//   └──────────────────────────────┴────────────────────────────┘
//
//   Edit dialog → dark CLI terminal (matches AddProjectDialog).
//
// Uses: monospace headings (JetBrains Mono via global), `>_` prefix
// on section labels, sharp rounded-md borders, orange primary,
// corner crosshairs, dot-grid in hero.
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "../../contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { Tooltip, TooltipTrigger, TooltipContent } from "../components/ui/tooltip";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Flame,
  Star,
  GitFork,
  Heart,
  Globe,
  ExternalLink,
  Code2,
  Lock,
  AlertCircle,
  BadgeCheck,
  Camera,
  ArrowLeft,
  Calendar,
  Users,
  Tag,
  Monitor,
  Smartphone,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  FolderKanban,
  Trash2,
  Pencil,
  Twitter,
  Linkedin,
  Youtube,
  Github,
  Sparkles,
  Share2,
  Hash,
  Terminal,
  Award,
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
      projectUrl
      githubUrl
      twitterUrl
      linkedinUrl
      facebookUrl
      youtubeUrl
      screenshotUrl
      screenshots
      isVerified
      createdAt
      tags { name }
      owner { id name username avatarUrl }
      members { profile { id name username avatarUrl } role }
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

const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      name
      tagline
      description
      iconUrl
      bannerUrl
      projectUrl
      githubUrl
      twitterUrl
      linkedinUrl
      facebookUrl
      youtubeUrl
      visibility
      category
      type
      status
      progress
      screenshots
      tags { name }
    }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  WEB_APP: Monitor,
  MOBILE_APP: Smartphone,
  LIBRARY: Package,
  CLI_TOOL: Code2,
  PORTFOLIO: Award,
  OTHER: Layers,
};

function getCategoryIcon(category: string): React.ElementType {
  return CATEGORY_ICON_MAP[category] ?? Layers;
}

const CATEGORY_LABELS: Record<string, string> = {
  WEB_APP: "Web App", MOBILE_APP: "Mobile App", LIBRARY: "Library",
  CLI_TOOL: "CLI Tool", PORTFOLIO: "Portfolio", OTHER: "Other",
};

function getCategoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Shipped",
  ARCHIVED: "Archived",
};

function getStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

// ─── Section label (brand-styled `>_` terminal style) ─────────────────────────

function SectionLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-center gap-2 border-l-2 border-primary pl-2.5 mb-3">
      <span className="text-primary font-mono font-bold text-xs select-none">{">_"}</span>
      <h3 className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
        {children}
      </h3>
      {hint && (
        <span className="text-[10px] font-mono text-muted-foreground/50">// {hint}</span>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProjectDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar — breadcrumb back to projects */}
      <div className="sticky top-16 z-30 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Skeleton className="h-7 w-20 rounded-sm" />
            <span className="text-muted-foreground/30 font-mono">/</span>
            <Skeleton className="h-4 w-40 rounded-sm" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-12 rounded-sm" />
            <Skeleton className="h-7 w-16 rounded-sm" />
          </div>
        </div>
      </div>

      {/* Hero — matches real wallpaper placeholder */}
      <div className="px-4 sm:px-6 lg:px-8 bg-black">
        <section className="relative overflow-hidden h-[400px] max-w-[1500px] mx-auto flex flex-col bg-black">
          <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
          <div className="relative z-[2] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 mt-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5">
              <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-md flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-8 sm:h-10 w-56 rounded-sm" />
                <Skeleton className="h-4 w-3/4 max-w-md rounded-sm" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-3 w-24 rounded-sm" />
                  <Skeleton className="h-3 w-16 rounded-sm" />
                  <Skeleton className="h-3 w-20 rounded-sm" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-md" />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Stats strip */}
      <div className="border-b border-border/60 bg-card/40">
        <div className="px-4 sm:px-6 lg:px-8 py-3 max-w-[1500px] mx-auto flex flex-wrap items-center gap-2 sm:gap-3">
          <Skeleton className="h-7 w-20 rounded-sm" />
          <Skeleton className="h-7 w-20 rounded-sm" />
          <Skeleton className="h-7 w-20 rounded-sm" />
          <Skeleton className="h-7 w-20 rounded-sm" />
        </div>
      </div>

      {/* Body — two-column layout */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1500px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24 rounded-sm" />
              <Skeleton className="h-5 w-full rounded-sm" />
              <Skeleton className="h-5 w-5/6 rounded-sm" />
              <Skeleton className="h-5 w-2/3 rounded-sm" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-28 rounded-sm" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-16 rounded-sm" />
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-32 rounded-sm" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-video w-full rounded-md" />
                ))}
              </div>
            </div>
          </div>
          {/* Right column */}
          <div className="space-y-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-20 rounded-sm" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded-sm" />
                <Skeleton className="h-4 w-3/4 rounded-sm" />
                <Skeleton className="h-4 w-2/3 rounded-sm" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-16 rounded-sm" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-24 rounded-sm" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-20 rounded-sm" />
                  <Skeleton className="h-3 w-14 rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screenshot Lightbox ──────────────────────────────────────────────────────

function ScreenshotLightbox({
  images,
  activeIndex,
  onClose,
  onPrev,
  onNext,
}: {
  images: string[];
  activeIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full mx-4 rounded-md overflow-hidden border border-border/60 bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* macOS-style title bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/40 border-b border-border/60">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          <div className="flex-1 mx-3 text-center">
            <span className="text-[10px] font-mono text-muted-foreground tracking-wide select-none">
              screenshot {activeIndex + 1} / {images.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <img
          src={images[activeIndex]}
          alt={`Screenshot ${activeIndex + 1}`}
          className="w-full max-h-[80vh] object-contain bg-background/50"
        />

        {images.length > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-border/60 bg-muted/30">
            <button
              onClick={onPrev}
              className="w-8 h-8 rounded-md flex items-center justify-center bg-background/60 border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-1.5">
              {images.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === activeIndex ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onNext}
              className="w-8 h-8 rounded-md flex items-center justify-center bg-background/60 border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              aria-label="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [editScreenshots, setEditScreenshots] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Open edit dialog pre-filled with current project data
  function openEdit() {
    if (!data?.project) return;
    const p = data.project;
    setEditForm({
      name: p.name ?? "",
      tagline: p.tagline ?? "",
      description: p.description ?? "",
      iconUrl: p.iconUrl ?? "",
      bannerUrl: p.bannerUrl ?? "",
      projectUrl: p.projectUrl ?? "",
      githubUrl: p.githubUrl ?? "",
      twitterUrl: p.twitterUrl ?? "",
      linkedinUrl: p.linkedinUrl ?? "",
      facebookUrl: p.facebookUrl ?? "",
      youtubeUrl: p.youtubeUrl ?? "",
      visibility: p.visibility ?? "PUBLIC",
      category: p.category ?? "OTHER",
      type: p.type ?? "PERSONAL",
      tags: (p.tags ?? []).map((t: any) => t.name).join(", "),
    });
    setEditScreenshots(p.screenshots ?? []);
    setShowEditDialog(true);
  }

  const { data, loading, error } = useQuery(GET_PROJECT, {
    variables: { id },
    skip: !id,
    fetchPolicy: "cache-and-network",
  });

  // Auto-open edit dialog when coming from card's "Edit project" link (?edit=1)
  useEffect(() => {
    if (data?.project && searchParams.get("edit") === "1") {
      openEdit();
      navigate(`/project/${id}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.project]);

  const [likeProject] = useMutation(LIKE_PROJECT);
  const [starProject] = useMutation(STAR_PROJECT);
  const [deleteProjectMutation] = useMutation(DELETE_PROJECT);
  const [updateProjectMutation] = useMutation(UPDATE_PROJECT, {
    refetchQueries: [{ query: GET_PROJECT, variables: { id } }],
  });

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const input: any = {
        name: editForm.name,
        tagline: editForm.tagline,
        visibility: editForm.visibility,
        category: editForm.category,
        type: editForm.type,
      };

      if (editForm.description?.trim()) input.description = editForm.description;
      if (editForm.iconUrl?.trim()) input.iconUrl = editForm.iconUrl;
      if (editForm.bannerUrl?.trim()) input.bannerUrl = editForm.bannerUrl;
      if (editForm.projectUrl?.trim()) input.projectUrl = editForm.projectUrl;
      if (editForm.githubUrl?.trim()) input.githubUrl = editForm.githubUrl;
      if (editForm.twitterUrl?.trim()) input.twitterUrl = editForm.twitterUrl;
      if (editForm.linkedinUrl?.trim()) input.linkedinUrl = editForm.linkedinUrl;
      if (editForm.facebookUrl?.trim()) input.facebookUrl = editForm.facebookUrl;
      if (editForm.youtubeUrl?.trim()) input.youtubeUrl = editForm.youtubeUrl;

      const tagsList = editForm.tags?.split(",").map((t: string) => t.trim()).filter(Boolean) || [];
      if (tagsList.length > 0) input.tags = tagsList;

      if (editScreenshots.length > 0) input.screenshots = editScreenshots;

      await updateProjectMutation({ variables: { id, input } });
      setShowEditDialog(false);
    } catch (error: any) {
      alert("Failed to save changes: " + (error?.message ?? "Unknown error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteProjectMutation({ variables: { id } });
      navigate("/projects");
    } catch (_) {
      setDeleting(false);
    }
  }

  if (loading) return <ProjectDetailSkeleton />;

  if (error || !data?.project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 px-4">
          <div className="w-16 h-16 rounded-md border border-border/60 bg-card flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-lg font-mono font-semibold mb-1">project not found</h2>
            <p className="text-xs text-muted-foreground max-w-sm font-mono">
              {error?.message ?? "this project may have been removed or you don't have access."}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/projects")}
            className="gap-2 font-mono text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            back to projects
          </Button>
        </div>
      </div>
    );
  }

  const project = data.project;
  const tags = project.tags ?? [];
  const members = project.members ?? [];
  const allScreenshots = [
    ...(project.screenshots ?? []),
    ...(project.screenshotUrl && !(project.screenshots ?? []).includes(project.screenshotUrl)
      ? [project.screenshotUrl]
      : []),
  ];
  const heroImage = project.bannerUrl || allScreenshots[0] || null;
  const CategoryIcon = getCategoryIcon(project.category);

  function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const isOwner = !!(user && project.owner?.id === user.id);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ════════════════════════════════════════════
          TOP BAR — breadcrumb back to projects
      ════════════════════════════════════════════ */}
      <div className="sticky top-16 z-30 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/projects")}
              className="gap-1.5 font-mono text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              projects
            </Button>
            <span className="text-muted-foreground/30 font-mono">/</span>
            <span className="text-[11px] font-mono text-muted-foreground truncate">
              {project.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleShare}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent hover:border-border/60 transition-colors"
                  aria-label="Copy link"
                >
                  {copied ? <Check className="w-3.5 h-3.3.5 text-primary" /> : <Share2 className="w-3.5 h-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "copied!" : "copy link"}</TooltipContent>
            </Tooltip>
            {isOwner && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openEdit}
                  className="gap-1.5 font-mono text-[11px] h-7 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="gap-1.5 font-mono text-[11px] h-7 px-2.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          HERO — full-bleed banner, 16x16 icon, title
      ════════════════════════════════════════════ */}
      <div className="px-4 sm:px-6 lg:px-8 bg-black">
        <section className="relative overflow-hidden h-[400px] max-w-[1500px] mx-auto flex flex-col bg-black">
          {/* Banner image as background */}
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImage}
              alt={project.name}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-card to-background" />
          )}

          {/* Slight linear edge fade on the sides to blend image into black bg */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
              background: "linear-gradient(90deg, #000 0%, transparent 6%, transparent 94%, #000 100%)",
            }}
          />

          {/* Dark gradient scrim over the banner */}
          <div
            className="absolute inset-0 z-[1] pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.80) 100%)",
            }}
          />

          {/* Content */}
          <div className="relative z-[2] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 mt-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5">
              {/* 16x16 icon avatar — no border, no shadow, image fills */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden bg-muted/30 backdrop-blur-sm">
                {project.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.iconUrl}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FolderKanban className="w-8 h-8 sm:w-10 sm:h-10 text-primary" strokeWidth={1.5} />
                )}
              </div>

              {/* Title block */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-primary font-mono font-bold text-xs sm:text-sm select-none animate-pulse">
                    {">_"}
                  </span>
                  <h1
                    className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-none"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {project.name}
                  </h1>
                {project.isVerified && (
                  <Tooltip>
                    <TooltipTrigger>
                      <BadgeCheck className="w-5 h-5 text-primary" strokeWidth={2} />
                    </TooltipTrigger>
                    <TooltipContent>verified project</TooltipContent>
                  </Tooltip>
                )}
                {project.visibility === "PRIVATE" && (
                  <Badge variant="outline" className="text-[10px] gap-1 h-5 px-1.5 font-mono">
                    <Lock className="w-3 h-3" strokeWidth={2} />private
                  </Badge>
                )}
              </div>
              <p className="text-sm sm:text-base text-white/85 mb-2 max-w-2xl">{project.tagline}</p>

              {/* Inline meta */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-white/60">
                <Link
                  to={`/profile/${project.owner?.username}`}
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Avatar className="w-4 h-4 border border-white/30">
                    {project.owner?.avatarUrl && <AvatarImage src={project.owner.avatarUrl} />}
                    <AvatarFallback className="text-[8px]">
                      {project.owner?.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-white/90">@{project.owner?.username}</span>
                </Link>
                {project.category && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className="flex items-center gap-1">
                      <CategoryIcon className="w-3.5 h-3.5" />
                      {getCategoryLabel(project.category)}
                    </span>
                  </>
                )}
                {project.createdAt && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" strokeWidth={2} />
                      {formatDate(project.createdAt)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Right action cluster */}
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              <button
                onClick={() => starProject({ variables: { projectId: project.id } })}
                className="group flex items-center gap-0 h-9 rounded-md overflow-hidden border border-orange-500/40 hover:border-orange-500 transition-all bg-background/70 backdrop-blur-sm"
              >
                <span className="flex items-center gap-1.5 px-3 h-full text-orange-400 group-hover:bg-orange-500/10 transition-colors font-mono">
                  <Flame className="w-3.5 h-3.5 fill-orange-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">fire</span>
                </span>
                <span className="w-px h-5 bg-orange-500/30" />
                <span className="px-3 h-full flex items-center text-xs font-bold tabular-nums text-orange-400 group-hover:bg-orange-500/10 transition-colors font-mono">
                  {project.starsCount ?? 0}
                </span>
              </button>

              {project.githubUrl && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-9 font-mono text-[11px] bg-background/70 backdrop-blur-sm border-border/60"
                >
                  <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                    <Code2 className="w-3.5 h-3.5" strokeWidth={2} />
                    source
                    <ExternalLink className="w-3 h-3" strokeWidth={2} />
                  </a>
                </Button>
              )}
              {project.projectUrl && (
                <Button
                  asChild
                  size="sm"
                  className="gap-1.5 h-9 font-mono text-[11px] font-bold"
                >
                  <a href={project.projectUrl} target="_blank" rel="noopener noreferrer">
                    <Globe className="w-3.5 h-3.5" strokeWidth={2} />
                    visit
                    <ExternalLink className="w-3 h-3" strokeWidth={2} />
                  </a>
                </Button>
              )}
              </div>
            </div>
          </div>
        </section>
        </div>

      {/* ════════════════════════════════════════════
          STATS STRIP — fires · stars · forks · likes · rating
      ════════════════════════════════════════════ */}
      <div className="border-b border-border/60 bg-card/40">
        <div className="px-4 sm:px-6 lg:px-8 py-3 max-w-[1500px] mx-auto flex flex-wrap items-center gap-2 sm:gap-3">
          <StatChip
            icon={Flame}
            iconClass="text-orange-500 fill-orange-500"
            label="fires"
            value={project.starsCount ?? 0}
          />
          {project.forksCount != null && project.forksCount > 0 && (
            <StatChip
              icon={GitFork}
              iconClass="text-muted-foreground"
              label="forks"
              value={project.forksCount}
            />
          )}
          <StatChip
            icon={Heart}
            iconClass="text-pink-500"
            label="likes"
            value={project.likesCount ?? 0}
          />
          {project.rating != null && project.rating > 0 && (
            <div className="flex items-center gap-2 px-3 h-9 rounded-md bg-background border border-border/60 font-mono">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i <= Math.round(project.rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/30"
                    }`}
                    strokeWidth={2}
                  />
                ))}
              </div>
              <span className="text-xs font-bold tabular-nums text-foreground">
                {project.rating.toFixed(1)}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                rating
              </span>
            </div>
          )}
          {project.progress != null && project.progress > 0 && (
            <div className="flex items-center gap-2 px-3 h-9 rounded-md bg-background border border-border/60 font-mono">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                progress
              </span>
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums text-primary">
                {project.progress}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          BODY — two-column: main (2/3) + sidebar (1/3 sticky)
      ════════════════════════════════════════════ */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1500px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: main content ── */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {/* About */}
            <section className="rounded-md border border-border/60 bg-card p-4 sm:p-5">
              <SectionLabel hint="long-form pitch">about</SectionLabel>
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90 font-mono">
                {project.description || <span className="text-muted-foreground/60 italic">no description provided yet.</span>}
              </p>
            </section>

            {/* Pages Crawled */}
            {allScreenshots.length > 0 && (
              <section className="rounded-md border border-border/60 bg-card p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel hint={`${allScreenshots.length} captured`}>pages crawled</SectionLabel>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allScreenshots.slice(0, 4).map((url: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setLightboxIdx(i)}
                      className="relative block rounded-md overflow-hidden border border-border/60 hover:border-primary/50 transition-all group/ss bg-muted/30"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Page ${i + 1}`}
                        className="w-full aspect-video object-cover group-hover/ss:scale-[1.02] transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 inset-x-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-between">
                        <span className="text-[10px] text-white/90 font-mono font-bold uppercase tracking-wider">
                          {i === 0 ? "home" : `page ${i + 1}`}
                        </span>
                        <span className="text-[9px] text-white/60 font-mono">click ↗</span>
                      </div>
                    </button>
                  ))}
                </div>
                {allScreenshots.length > 4 && (
                  <p className="text-[11px] text-muted-foreground/60 font-mono mt-2.5">
                    +{allScreenshots.length - 4} more pages captured
                  </p>
                )}
              </section>
            )}

            {/* Tech Stack */}
            {tags.length > 0 && (
              <section className="rounded-md border border-border/60 bg-card p-4 sm:p-5">
                <SectionLabel hint={`${tags.length} tag${tags.length !== 1 ? "s" : ""}`}>tech stack</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t: any) => (
                    <span
                      key={t.name}
                      className="text-[11px] font-mono px-2 py-0.5 rounded border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                    >
                      <Hash className="w-2.5 h-2.5 inline -mt-0.5 mr-0.5 opacity-60" />
                      {t.name}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Team */}
            <section className="rounded-md border border-border/60 bg-card p-4 sm:p-5">
              <SectionLabel hint={members.length > 0 ? `${members.length + 1} total` : "just the owner"}>
                team
              </SectionLabel>
              <div className="space-y-2">
                {/* Owner row */}
                <div
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => navigate(`/profile/${project.owner?.username}`)}
                >
                  <Avatar className="w-9 h-9 border border-border">
                    {project.owner?.avatarUrl && (
                      <AvatarImage src={project.owner.avatarUrl} />
                    )}
                    <AvatarFallback>{project.owner?.name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate font-mono">{project.owner?.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">@{project.owner?.username}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider">
                    owner
                  </Badge>
                </div>

                {/* Members */}
                {members.length > 0 && members.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/40 transition-colors">
                    <Avatar className="w-9 h-9">
                      {m.profile?.avatarUrl && <AvatarImage src={m.profile.avatarUrl} />}
                      <AvatarFallback>{m.profile?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate font-mono">{m.profile?.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">@{m.profile?.username}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-mono capitalize">
                      {m.role?.toLowerCase()}
                    </Badge>
                  </div>
                ))}

                {members.length === 0 && (
                  <p className="text-[11px] text-muted-foreground/50 font-mono text-center py-2">
                    // solo project — no additional members
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* ── Right: sticky sidebar ── */}
          <aside className="space-y-4 min-w-0">
            {/* Details */}
            <div className="rounded-md border border-border/60 bg-card p-4">
              <SectionLabel>details</SectionLabel>
              <div className="space-y-2.5 text-xs font-mono">
                {project.status && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">status</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          project.status === "ACTIVE"
                            ? "bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/60"
                            : project.status === "IN_PROGRESS"
                              ? "bg-amber-500 shadow-[0_0_6px] shadow-amber-500/60"
                              : project.status === "COMPLETED"
                                ? "bg-primary shadow-[0_0_6px] shadow-primary/60"
                                : "bg-zinc-500"
                        }`}
                      />
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                )}
                {project.category && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">category</span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <CategoryIcon className="w-3.5 h-3.5" />
                      {getCategoryLabel(project.category)}
                    </span>
                  </div>
                )}
                {project.type && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">type</span>
                    <span className="font-medium uppercase tracking-wider">{project.type.toLowerCase()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">visibility</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    {project.visibility === "PRIVATE" ? (
                      <>
                        <Lock className="w-3 h-3" />private
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3" />public
                      </>
                    )}
                  </span>
                </div>
                {project.createdAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">created</span>
                    <span className="font-medium">{formatDate(project.createdAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Links */}
            {(project.projectUrl || project.githubUrl || project.twitterUrl || project.linkedinUrl || project.facebookUrl || project.youtubeUrl) && (
              <div className="rounded-md border border-border/60 bg-card p-4">
                <SectionLabel>links</SectionLabel>
                <div className="space-y-1">
                  {project.projectUrl && (
                    <LinkRow
                      icon={Globe}
                      iconClass="text-primary"
                      iconBg="bg-primary/10"
                      label="Website"
                      url={project.projectUrl}
                      display={project.projectUrl.replace(/^https?:\/\//, "")}
                    />
                  )}
                  {project.githubUrl && (
                    <LinkRow
                      icon={Github}
                      iconClass="text-foreground"
                      iconBg="bg-muted"
                      label="Source Code"
                      url={project.githubUrl}
                      display={project.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
                    />
                  )}
                  {project.twitterUrl && (
                    <LinkRow
                      icon={Twitter}
                      iconClass="text-sky-500"
                      iconBg="bg-sky-500/10"
                      label="X / Twitter"
                      url={project.twitterUrl}
                      display={project.twitterUrl.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "@")}
                    />
                  )}
                  {project.linkedinUrl && (
                    <LinkRow
                      icon={Linkedin}
                      iconClass="text-blue-600"
                      iconBg="bg-blue-600/10"
                      label="LinkedIn"
                      url={project.linkedinUrl}
                      display={project.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\//, "")}
                    />
                  )}
                  {project.facebookUrl && (
                    <LinkRow
                      icon={FacebookGlyph}
                      iconClass="text-blue-500"
                      iconBg="bg-blue-500/10"
                      label="Facebook"
                      url={project.facebookUrl}
                      display={project.facebookUrl.replace(/^https?:\/\/(www\.)?facebook\.com\//, "")}
                    />
                  )}
                  {project.youtubeUrl && (
                    <LinkRow
                      icon={Youtube}
                      iconClass="text-red-500"
                      iconBg="bg-red-500/10"
                      label="YouTube"
                      url={project.youtubeUrl}
                      display={project.youtubeUrl.replace(/^https?:\/\/(www\.)?youtube\.com\//, "")}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Created by */}
            <div className="rounded-md border border-border/60 bg-card p-4">
              <SectionLabel>created by</SectionLabel>
              <Link
                to={`/profile/${project.owner?.username}`}
                className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
              >
                <Avatar className="w-11 h-11 border-2 border-primary/20">
                  {project.owner?.avatarUrl && (
                    <AvatarImage src={project.owner.avatarUrl} />
                  )}
                  <AvatarFallback className="text-sm font-mono">
                    {project.owner?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate font-mono">{project.owner?.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">@{project.owner?.username}</p>
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          LIGHTBOX
      ════════════════════════════════════════════ */}
      {lightboxIdx !== null && (
        <ScreenshotLightbox
          images={allScreenshots}
          activeIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onPrev={() =>
            setLightboxIdx((i) => (i! - 1 + allScreenshots.length) % allScreenshots.length)
          }
          onNext={() => setLightboxIdx((i) => (i! + 1) % allScreenshots.length)}
        />
      )}

      {/* ════════════════════════════════════════════
          DELETE CONFIRM
      ════════════════════════════════════════════ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono">
              <span className="text-destructive">!</span> delete "{project.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs">
              this will permanently delete the project and all its data. this action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="font-mono text-xs">
              cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono text-xs"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  deleting…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  delete project
                </span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════════════════════════════════════════════
          EDIT DIALOG (dark CLI terminal)
      ════════════════════════════════════════════ */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent
          className="w-screen max-w-[96vw] xl:max-w-6xl p-0 gap-0 overflow-hidden h-[95vh] max-h-[95vh] flex flex-col bg-transparent border-0 shadow-none"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Edit project</DialogTitle>
          <div className="rounded-md overflow-hidden border border-zinc-700/80 bg-zinc-950 text-zinc-100 shadow-2xl shadow-black/40 flex flex-col h-full">
            {/* Title bar — macOS-style chrome */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900/90 border-b border-zinc-800/80 flex-shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              <div className="flex-1 mx-3 text-center">
                <span className="text-[10px] font-mono text-zinc-500 tracking-wide select-none">
                  edit project — live preview
                </span>
              </div>
              <button
                onClick={() => setShowEditDialog(false)}
                className="text-zinc-400 hover:text-zinc-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <EditForm
                project={project}
                editForm={editForm}
                setEditForm={setEditForm}
                editScreenshots={editScreenshots}
                setEditScreenshots={setEditScreenshots}
                onSave={handleSaveEdit}
                saving={saving}
                onCancel={() => setShowEditDialog(false)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Stat Chip (stats strip) ───────────────────────────────────────────────────

function StatChip({
  icon: Icon,
  iconClass,
  label,
  value,
}: {
  icon: React.ElementType;
  iconClass?: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 px-3 h-9 rounded-md bg-background border border-border/60 font-mono">
      <Icon className={`w-3.5 h-3.5 ${iconClass ?? "text-muted-foreground"}`} strokeWidth={2} />
      <span className="text-xs font-bold tabular-nums text-foreground">
        {value.toLocaleString()}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

// ─── Link Row (sidebar) ────────────────────────────────────────────────────────

function LinkRow({
  icon: Icon,
  iconClass,
  iconBg,
  label,
  url,
  display,
}: {
  icon: React.ElementType;
  iconClass?: string;
  iconBg?: string;
  label: string;
  url: string;
  display: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-muted/60 transition-colors group font-mono"
    >
      <div
        className={`w-7 h-7 rounded-md ${iconBg ?? "bg-muted"} flex items-center justify-center flex-shrink-0`}
      >
        <Icon className={`w-3.5 h-3.5 ${iconClass ?? "text-foreground"}`} strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium group-hover:text-primary transition-colors">{label}</p>
        <p className="text-[10px] text-muted-foreground truncate">{display}</p>
      </div>
      <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" strokeWidth={2} />
    </a>
  );
}

// Inline Facebook glyph (no lucide icon)
function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      width="14"
      height="14"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// ─── Edit Form (dark CLI terminal) ─────────────────────────────────────────────

function EditForm({
  project,
  editForm,
  setEditForm,
  editScreenshots,
  setEditScreenshots,
  onSave,
  saving,
  onCancel,
}: {
  project: any;
  editForm: Record<string, any>;
  setEditForm: (v: Record<string, any>) => void;
  editScreenshots: string[];
  setEditScreenshots: (v: string[]) => void;
  onSave: () => void;
  saving: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="px-5 py-4 space-y-3 font-mono text-sm">
      {/* Boot banner */}
      <div className="text-zinc-500 text-[11px] leading-relaxed select-none">
        ┌──(lokalhost@edit)─[~]<br />
        └──$ <span className="text-zinc-300">project edit --live</span>
      </div>

      {/* Live preview header */}
      <div className="border border-zinc-800 bg-zinc-900/60 rounded-sm px-3 py-2 text-[11px] text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="text-primary select-none">#</span>
          <span className="text-zinc-200 truncate">{editForm.name || "(untitled)"}</span>
        </div>
        <div className="mt-0.5 text-zinc-500 line-clamp-1">{editForm.tagline || "no tagline"}</div>
      </div>

      <EditPrompt prompt="--name">
        <EditInput
          value={editForm.name}
          onChange={(v) => setEditForm({ ...editForm, name: v })}
          placeholder="project name"
        />
      </EditPrompt>

      <EditPrompt prompt="--tagline">
        <EditInput
          value={editForm.tagline}
          onChange={(v) => setEditForm({ ...editForm, tagline: v })}
          placeholder="one-line pitch"
        />
      </EditPrompt>

      <EditPrompt prompt="--description" hint="what/why/who">
        <div className="mt-1.5 flex items-start gap-2 bg-zinc-900/70 border border-zinc-700/80 rounded-sm focus-within:border-primary/70 focus-within:shadow-[0_0_0_2px] focus-within:shadow-primary/20 transition-all px-3 py-2">
          <span className="text-zinc-500 select-none text-sm">›</span>
          <Textarea
            value={editForm.description ?? ""}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            placeholder="long-form description"
            rows={3}
            className="flex-1 border-0 bg-transparent font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none min-h-0"
          />
        </div>
      </EditPrompt>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <EditPrompt prompt="--category">
          <Select
            value={editForm.category}
            onValueChange={(v) => setEditForm({ ...editForm, category: v })}
          >
            <SelectTrigger className="mt-1.5 font-mono text-sm h-9 bg-zinc-900/70 border border-zinc-700/80 rounded-sm focus:border-primary/70 focus:shadow-[0_0_0_2px] focus:shadow-primary/20 text-zinc-100">
              <span className="text-zinc-500 mr-1.5">›</span>
              <SelectValue placeholder="category" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CATEGORY_LABELS) as string[]).map((c) => (
                <SelectItem key={c} value={c} className="font-mono text-sm">
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </EditPrompt>

        <EditPrompt prompt="--type">
          <Select
            value={editForm.type}
            onValueChange={(v) => setEditForm({ ...editForm, type: v })}
          >
            <SelectTrigger className="mt-1.5 font-mono text-sm h-9 bg-zinc-900/70 border border-zinc-700/80 rounded-sm focus:border-primary/70 focus:shadow-[0_0_0_2px] focus:shadow-primary/20 text-zinc-100">
              <span className="text-zinc-500 mr-1.5">›</span>
              <SelectValue placeholder="type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERSONAL" className="font-mono text-sm">personal</SelectItem>
              <SelectItem value="GITHUB" className="font-mono text-sm">github</SelectItem>
            </SelectContent>
          </Select>
        </EditPrompt>

        <EditPrompt prompt="--visibility">
          <Select
            value={editForm.visibility}
            onValueChange={(v) => setEditForm({ ...editForm, visibility: v })}
          >
            <SelectTrigger className="mt-1.5 font-mono text-sm h-9 bg-zinc-900/70 border border-zinc-700/80 rounded-sm focus:border-primary/70 focus:shadow-[0_0_0_2px] focus:shadow-primary/20 text-zinc-100">
              <span className="text-zinc-500 mr-1.5">›</span>
              <SelectValue placeholder="visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC" className="font-mono text-sm">public</SelectItem>
              <SelectItem value="PRIVATE" className="font-mono text-sm">private</SelectItem>
            </SelectContent>
          </Select>
        </EditPrompt>
      </div>

      <EditPrompt prompt="--icon-url" hint="optional">
        <EditInput
          value={editForm.iconUrl ?? ""}
          onChange={(v) => setEditForm({ ...editForm, iconUrl: v })}
          placeholder="https://..."
        />
      </EditPrompt>

      <EditPrompt prompt="--banner-url" hint="optional">
        <EditInput
          value={editForm.bannerUrl ?? ""}
          onChange={(v) => setEditForm({ ...editForm, bannerUrl: v })}
          placeholder="https://..."
        />
      </EditPrompt>

      <EditPrompt prompt="--project-url" hint="live site">
        <EditInput
          value={editForm.projectUrl ?? ""}
          onChange={(v) => setEditForm({ ...editForm, projectUrl: v })}
          placeholder="https://..."
        />
      </EditPrompt>

      <EditPrompt prompt="--github-url">
        <EditInput
          value={editForm.githubUrl ?? ""}
          onChange={(v) => setEditForm({ ...editForm, githubUrl: v })}
          placeholder="https://github.com/..."
        />
      </EditPrompt>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <EditPrompt prompt="--twitter-url">
          <EditInput
            value={editForm.twitterUrl ?? ""}
            onChange={(v) => setEditForm({ ...editForm, twitterUrl: v })}
            placeholder="https://x.com/..."
          />
        </EditPrompt>

        <EditPrompt prompt="--linkedin-url">
          <EditInput
            value={editForm.linkedinUrl ?? ""}
            onChange={(v) => setEditForm({ ...editForm, linkedinUrl: v })}
            placeholder="https://linkedin.com/..."
          />
        </EditPrompt>

        <EditPrompt prompt="--facebook-url">
          <EditInput
            value={editForm.facebookUrl ?? ""}
            onChange={(v) => setEditForm({ ...editForm, facebookUrl: v })}
            placeholder="https://facebook.com/..."
          />
        </EditPrompt>

        <EditPrompt prompt="--youtube-url">
          <EditInput
            value={editForm.youtubeUrl ?? ""}
            onChange={(v) => setEditForm({ ...editForm, youtubeUrl: v })}
            placeholder="https://youtube.com/..."
          />
        </EditPrompt>
      </div>

      <EditPrompt prompt="--tags" hint="comma-separated">
        <EditInput
          value={editForm.tags ?? ""}
          onChange={(v) => setEditForm({ ...editForm, tags: v })}
          placeholder="react, typescript, supabase"
        />
      </EditPrompt>

      <EditPrompt prompt="--screenshots" hint="comma-separated urls">
        <EditInput
          value={editScreenshots.join(", ")}
          onChange={(v) =>
            setEditScreenshots(
              v.split(",").map((s: string) => s.trim()).filter(Boolean)
            )
          }
          placeholder="https://..., https://..."
        />
      </EditPrompt>

      {/* Action row */}
      <div className="pt-3 mt-2 border-t border-dashed border-zinc-800/80 flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
          className="font-mono text-xs h-9 px-3 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70 border border-zinc-800 rounded-sm"
        >
          cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={saving}
          className="font-mono font-semibold text-xs h-9 px-4 flex-1 bg-primary text-primary-foreground hover:bg-primary/90 border-0 rounded-sm"
        >
          {saving ? (
            <>
              <span className="w-3 h-3 mr-2 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              saving...
            </>
          ) : (
            <>
              <span className="opacity-70 mr-2 select-none">$</span>
              save --confirm
              <Check className="w-3.5 h-3.5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function EditPrompt({
  prompt,
  hint,
  children,
}: {
  prompt: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-zinc-300 text-xs">
        <span className="text-primary select-none">$</span>
        <span className="text-zinc-100">{prompt}</span>
        {hint && (
          <span className="text-[10px] text-zinc-500 tracking-wide">// {hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function EditInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-1.5 flex items-center gap-2 bg-zinc-900/70 border border-zinc-700/80 rounded-sm focus-within:border-primary/70 focus-within:shadow-[0_0_0_2px] focus-within:shadow-primary/20 transition-all">
      <span className="pl-3 text-zinc-500 select-none text-sm">›</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border-0 bg-transparent font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-0"
      />
    </div>
  );
}
