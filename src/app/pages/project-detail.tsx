import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth } from "../../contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent } from "../components/ui/tooltip";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Star,
  Globe,
  ExternalLink,
  Share2,
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
  Upload,
} from "lucide-react";

// ─── Fire Icon ────────────────────────────────────────────────────────────────
function FireIcon({ className }: { className?: string }) {
  return (
    <svg fill="none" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M13.7605 6.61389C13.138 6.79867 12.6687 7.21667 12.3251 7.67073C12.2513 7.76819 12.0975 7.69495 12.1268 7.57552C12.7848 4.86978 11.9155 2.6209 9.20582 1.51393C9.06836 1.4576 8.92527 1.58097 8.96132 1.72519C10.1939 6.67417 5.00941 6.25673 5.66459 11.8671C5.67585 11.9634 5.56769 12.0293 5.48882 11.973C5.2432 11.7967 4.96885 11.4288 4.78069 11.1702C4.72548 11.0942 4.60605 11.1156 4.5807 11.2063C4.43085 11.7482 4.35986 12.2586 4.35986 12.7656C4.35986 14.7373 5.37333 16.473 6.90734 17.4791C6.99522 17.5366 7.10789 17.4543 7.07804 17.3535C6.99917 17.0887 6.95466 16.8093 6.95128 16.5203C6.95128 16.3429 6.96255 16.1615 6.99015 15.9925C7.05438 15.5677 7.20197 15.1632 7.44985 14.7948C8.29995 13.5188 10.0041 12.2862 9.73199 10.6125C9.71453 10.5066 9.83959 10.4368 9.91846 10.5094C11.119 11.6063 11.3567 13.0817 11.1595 14.405C11.1426 14.5199 11.2868 14.5813 11.3595 14.4912C11.5432 14.2613 11.7674 14.0596 12.0113 13.9081C12.0722 13.8703 12.1533 13.8991 12.1764 13.9667C12.3121 14.3616 12.5138 14.7323 12.7042 15.1029C12.9318 15.5485 13.0529 16.0573 13.0338 16.5958C13.0242 16.8578 12.9808 17.1113 12.9082 17.3524C12.8772 17.4543 12.9887 17.5394 13.0783 17.4808C14.6134 16.4747 15.6275 14.739 15.6275 12.7662C15.6275 12.0806 15.5075 11.4085 15.2804 10.7787C14.8044 9.45766 13.5966 8.46561 13.9019 6.74403C13.9166 6.66178 13.8405 6.59023 13.7605 6.61389Z"
        fill="currentColor"
      />
    </svg>
  );
}

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

function getCategoryIcon(category: string) {
  switch (category) {
    case "WEB_APP":    return <Monitor className="w-3.5 h-3.5" strokeWidth={2} />;
    case "MOBILE_APP": return <Smartphone className="w-3.5 h-3.5" strokeWidth={2} />;
    case "LIBRARY":    return <Package className="w-3.5 h-3.5" strokeWidth={2} />;
    case "CLI_TOOL":   return <Code2 className="w-3.5 h-3.5" strokeWidth={2} />;
    default:           return <Layers className="w-3.5 h-3.5" strokeWidth={2} />;
  }
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    WEB_APP: "Web App", MOBILE_APP: "Mobile App", LIBRARY: "Library",
    CLI_TOOL: "CLI Tool", PORTFOLIO: "Portfolio", OTHER: "Other",
  };
  return labels[category] ?? category;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProjectDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-3">
          <Skeleton className="h-5 w-28" />
        </div>
      </div>
      <div className="relative">
        <Skeleton className="w-full h-56 md:h-64" />
        <div className="container mx-auto px-4">
          <div className="relative -mt-10 flex items-end gap-4 pb-5">
            <Skeleton className="w-20 h-20 rounded-2xl" />
            <div className="flex-1 space-y-2 pb-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-5">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-5xl w-full mx-4" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/70 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <img
          src={images[activeIndex]}
          alt={`Screenshot ${activeIndex + 1}`}
          className="w-full max-h-[80vh] object-contain rounded-lg"
        />
        {images.length > 1 && (
          <>
            <button
              onClick={onPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="flex justify-center gap-1.5 mt-3">
              {images.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${i === activeIndex ? "bg-white" : "bg-white/30"}`}
                />
              ))}
            </div>
          </>
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
    // Set screenshots separately in their own state
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
      // Remove the param from URL so refresh doesn't re-trigger
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
      // Build input object, filtering out empty strings
      const input: any = {
        name: editForm.name,
        tagline: editForm.tagline,
        visibility: editForm.visibility,
        category: editForm.category,
        type: editForm.type,
      };

      // Only add optional fields if they have values
      if (editForm.description?.trim()) input.description = editForm.description;
      if (editForm.iconUrl?.trim()) input.iconUrl = editForm.iconUrl;
      if (editForm.bannerUrl?.trim()) input.bannerUrl = editForm.bannerUrl;
      if (editForm.projectUrl?.trim()) input.projectUrl = editForm.projectUrl;
      if (editForm.githubUrl?.trim()) input.githubUrl = editForm.githubUrl;
      if (editForm.twitterUrl?.trim()) input.twitterUrl = editForm.twitterUrl;
      if (editForm.linkedinUrl?.trim()) input.linkedinUrl = editForm.linkedinUrl;
      if (editForm.facebookUrl?.trim()) input.facebookUrl = editForm.facebookUrl;
      if (editForm.youtubeUrl?.trim()) input.youtubeUrl = editForm.youtubeUrl;
      
      // Handle tags
      const tagsList = editForm.tags?.split(",").map((t: string) => t.trim()).filter(Boolean) || [];
      if (tagsList.length > 0) input.tags = tagsList;
      
      // Handle screenshots
      if (editScreenshots.length > 0) input.screenshots = editScreenshots;

      console.log("🔄 Saving project changes...", { id, input });

      const result = await updateProjectMutation({
        variables: { id, input },
      });
      
      console.log("✅ Project saved successfully:", result);
      setShowEditDialog(false);
    } catch (error) {
      console.error("❌ Error saving project:", error);
      alert("Failed to save changes: " + (error as any)?.message);
    }
    finally { setSaving(false); }
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
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h2 className="text-lg font-semibold">Project not found</h2>
          <p className="text-sm text-muted-foreground max-w-sm">{error?.message ?? "This project may have been removed or you don't have access."}</p>
          <Button variant="outline" onClick={() => navigate("/projects")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
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
    ...(project.screenshotUrl && !(project.screenshots ?? []).includes(project.screenshotUrl) ? [project.screenshotUrl] : []),
  ];
  const heroImage = project.bannerUrl || allScreenshots[0];

  function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{project?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting…</span>
              ) : (
                <span className="flex items-center gap-2"><Trash2 className="w-4 h-4" />Delete Project</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-screen max-w-[96vw] xl:max-w-6xl p-0 gap-0 overflow-hidden h-[95vh] max-h-[95vh] flex flex-col [&>button]:hidden">

          {/* ── Top bar ── */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Pencil className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Edit Project — Live Preview</span>
            </div>
            <button onClick={() => setShowEditDialog(false)} className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>

          {/* ── Scrollable preview body ── */}
          <div className="flex-1 overflow-y-auto">

            {/* Hero banner — mirrors project-detail hero */}
            <div className="relative h-52 md:h-64 bg-gradient-to-br from-primary/15 via-primary/5 to-muted overflow-hidden">
              {editForm.bannerUrl ? (
                <img
                  src={editForm.bannerUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
            </div>

            {/* Header row — icon + name + tagline + pills, overlapping banner */}
            <div className="px-6">
              <div className="relative -mt-12 flex items-start gap-4 pb-5">
                {/* Icon */}
                <div className="w-24 h-24 rounded-2xl bg-card border-4 border-background shadow-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                  {editForm.iconUrl ? (
                    <img
                      src={editForm.iconUrl}
                      alt="Icon"
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground">
                      <Upload className="w-6 h-6" strokeWidth={1.5} />
                      <span className="text-[9px] font-medium">Icon</span>
                    </div>
                  )}
                </div>

                {/* Name + tagline + meta pills */}
                <div className="flex-1 min-w-0 pt-4 sm:pt-6">
                  <input
                    placeholder="Project name *"
                    value={editForm.name ?? ""}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full text-2xl md:text-3xl font-bold bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-primary/60 focus:outline-none pb-0.5 mb-1.5 placeholder:text-muted-foreground/30 tracking-tight transition-colors"
                  />
                  <input
                    placeholder="One-line tagline *"
                    value={editForm.tagline ?? ""}
                    onChange={e => setEditForm(f => ({ ...f, tagline: e.target.value }))}
                    className="w-full text-base text-muted-foreground bg-transparent border-b border-transparent hover:border-muted-foreground/20 focus:border-primary/40 focus:outline-none pb-0.5 mb-3 placeholder:text-muted-foreground/30 transition-colors"
                  />
                  {/* Category + Visibility + Type pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={editForm.category} onValueChange={v => setEditForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger className="h-6 text-[11px] rounded-full px-2.5 border-primary/30 bg-primary/10 text-primary w-auto gap-1 hover:bg-primary/20 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WEB_APP">🌐 Web App</SelectItem>
                        <SelectItem value="MOBILE_APP">📱 Mobile App</SelectItem>
                        <SelectItem value="LIBRARY">📦 Library</SelectItem>
                        <SelectItem value="CLI_TOOL">⌨️ CLI Tool</SelectItem>
                        <SelectItem value="PORTFOLIO">🎨 Portfolio</SelectItem>
                        <SelectItem value="OTHER">✨ Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={editForm.visibility} onValueChange={v => setEditForm(f => ({ ...f, visibility: v }))}>
                      <SelectTrigger className="h-6 text-[11px] rounded-full px-2.5 border w-auto gap-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PUBLIC"><div className="flex items-center gap-1.5"><Globe className="w-3 h-3" strokeWidth={2} />Public</div></SelectItem>
                        <SelectItem value="PRIVATE"><div className="flex items-center gap-1.5"><Lock className="w-3 h-3" strokeWidth={2} />Private</div></SelectItem>
                      </SelectContent>
                    </Select>
                    {(["PERSONAL", "GITHUB"] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEditForm(f => ({ ...f, type: t }))}
                        className={`flex items-center gap-1 h-6 px-2.5 rounded-full text-[11px] font-semibold border transition-all ${
                          editForm.type === t
                            ? "bg-foreground text-background border-foreground"
                            : "bg-transparent text-muted-foreground border-muted-foreground/20 hover:border-muted-foreground/40"
                        }`}
                      >
                        {t === "GITHUB" ? <Github className="w-3 h-3" strokeWidth={2} /> : <Code2 className="w-3 h-3" strokeWidth={2} />}
                        {t === "GITHUB" ? "GitHub" : "Personal"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action bar — mirrors project-detail action row */}
              <div className="flex flex-wrap items-center gap-2 pb-5 border-b">
                {/* Fire button preview */}
                <div className="flex items-center gap-0 h-8 rounded-lg overflow-hidden border border-orange-500/40">
                  <span className="flex items-center gap-1.5 px-2.5 h-full text-orange-500 text-xs font-semibold">
                    🔥 Fire
                  </span>
                  <span className="w-px h-4 bg-orange-500/30" />
                  <span className="px-2.5 h-full flex items-center text-xs font-bold text-orange-500">0</span>
                </div>
                <div className="flex-1" />
                {editForm.githubUrl && (
                  <div className="flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium text-muted-foreground">
                    <Code2 className="w-3.5 h-3.5" strokeWidth={2} /> Source Code
                  </div>
                )}
                {editForm.projectUrl && (
                  <div className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                    <Globe className="w-3.5 h-3.5" strokeWidth={2} /> Visit Project
                  </div>
                )}
              </div>
            </div>

            {/* Two-column body — mirrors project-detail grid */}
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Left (2 cols): About + Tech */}
              <div className="md:col-span-2 space-y-6">

                {/* About */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</h3>
                  <Textarea
                    placeholder="What does it do? Who is it for? What problem does it solve?"
                    value={editForm.description ?? ""}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    className="min-h-[88px] resize-none text-sm bg-muted/30 border-muted-foreground/15 focus-visible:border-primary/50 focus-visible:ring-primary/20"
                  />
                </div>

                {/* Tech Stack */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tech Stack</h3>
                  <Input
                    placeholder="React, TypeScript, Node.js, PostgreSQL…"
                    value={editForm.tags ?? ""}
                    onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                    className="text-sm bg-muted/30 border-muted-foreground/15 focus-visible:border-primary/50 focus-visible:ring-primary/20 mb-2"
                  />
                  {editForm.tags && (
                    <div className="flex flex-wrap gap-1.5">
                      {editForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean).map((t: string) => (
                        <span key={t} className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-medium">{t}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Screenshots */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Screenshots
                    {editScreenshots.length > 0 && (
                      <span className="font-normal normal-case opacity-50 ml-1">
                        — {editScreenshots.length} page{editScreenshots.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {editScreenshots.map((url, i) => (
                      <div key={i} className="relative group aspect-video rounded-lg border bg-muted/30 overflow-hidden">
                        <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditScreenshots(prev => prev.filter((_, idx) => idx !== i));
                            }}
                            className="w-8 h-8 rounded-full bg-red-500/90 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
                          >
                            <X className="w-4 h-4" strokeWidth={2} />
                          </button>
                        </div>
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-white font-medium">
                          {i + 1}
                        </div>
                      </div>
                    ))}
                    {/* Add screenshot button */}
                    <button
                      type="button"
                      onClick={() => {
                        const url = prompt("Enter screenshot URL:");
                        if (url) {
                          setEditScreenshots(prev => [...prev, url]);
                        }
                      }}
                      className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                    >
                      <Upload className="w-5 h-5" strokeWidth={1.5} />
                      <span className="text-[10px] font-medium">Add Screenshot</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Right (1 col): Links card */}
              <div className="space-y-4">

                {/* Links card — mirrors project-detail sidebar links card */}
                <div className="rounded-xl border bg-card p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Links</h4>
                  <div className="space-y-1">
                    {/* Website */}
                    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Globe className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
                      </div>
                      <input
                        placeholder="https://myproject.com"
                        value={editForm.projectUrl ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, projectUrl: e.target.value }))}
                        className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 min-w-0"
                      />
                    </div>
                    {/* GitHub */}
                    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Github className="w-3.5 h-3.5" strokeWidth={2} />
                      </div>
                      <input
                        placeholder="https://github.com/…"
                        value={editForm.githubUrl ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, githubUrl: e.target.value }))}
                        className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 min-w-0"
                      />
                    </div>
                    {/* Twitter */}
                    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                        <Twitter className="w-3.5 h-3.5 text-sky-500" strokeWidth={2} />
                      </div>
                      <input
                        placeholder="https://x.com/…"
                        value={editForm.twitterUrl ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, twitterUrl: e.target.value }))}
                        className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 min-w-0"
                      />
                    </div>
                    {/* LinkedIn */}
                    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0">
                        <Linkedin className="w-3.5 h-3.5 text-blue-600" strokeWidth={2} />
                      </div>
                      <input
                        placeholder="https://linkedin.com/…"
                        value={editForm.linkedinUrl ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, linkedinUrl: e.target.value }))}
                        className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 min-w-0"
                      />
                    </div>
                    {/* Facebook */}
                    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                        </svg>
                      </div>
                      <input
                        placeholder="https://facebook.com/…"
                        value={editForm.facebookUrl ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, facebookUrl: e.target.value }))}
                        className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 min-w-0"
                      />
                    </div>
                    {/* YouTube */}
                    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <Youtube className="w-3.5 h-3.5 text-red-500" strokeWidth={2} />
                      </div>
                      <input
                        placeholder="https://youtube.com/@…"
                        value={editForm.youtubeUrl ?? ""}
                        onChange={e => setEditForm(f => ({ ...f, youtubeUrl: e.target.value }))}
                        className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 min-w-0"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ── Sticky footer ── */}
          <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-3.5 border-t bg-background/95 backdrop-blur-sm">
            <div className="flex-1">
              {(!editForm.name || !editForm.tagline) && !saving && (
                <p className="text-xs text-muted-foreground/60">Name and tagline are required</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowEditDialog(false)} className="text-muted-foreground hover:text-foreground">
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editForm.name || !editForm.tagline || saving}
                className="gap-2 bg-primary hover:bg-primary/90 active:bg-primary text-primary-foreground border-none min-w-36 font-bold shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" strokeWidth={2} />
                )}
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxIdx !== null && allScreenshots.length > 0 && (
        <ScreenshotLightbox
          images={allScreenshots}
          activeIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx((lightboxIdx - 1 + allScreenshots.length) % allScreenshots.length)}
          onNext={() => setLightboxIdx((lightboxIdx + 1) % allScreenshots.length)}
        />
      )}

      {/* Top nav bar */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-2.5 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            Projects
          </Button>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="ghost" onClick={handleShare} className="gap-1.5">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                  {copied ? "Copied!" : "Share"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy link to clipboard</TooltipContent>
            </Tooltip>
            {project.projectUrl && (
              <Button size="sm" asChild className="gap-1.5">
                <a href={project.projectUrl} target="_blank" rel="noopener noreferrer">
                  <Globe className="w-3.5 h-3.5" strokeWidth={2} />
                  Visit
                  <ExternalLink className="w-3 h-3" strokeWidth={2} />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative w-full h-48 md:h-60 bg-muted overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={project.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/15 via-primary/5 to-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

        {/* Featured / Trending badges */}
        <div className="absolute top-3 right-3 flex gap-2">
          {project.isFeatured && (
            <Badge className="bg-yellow-500/90 text-white border-0 shadow-lg backdrop-blur-sm">⭐ Featured</Badge>
          )}
          {project.isTrending && (
            <Badge className="bg-blue-500/90 text-white border-0 shadow-lg backdrop-blur-sm">🔥 Trending</Badge>
          )}
        </div>
      </div>

      {/* Project header — overlaps banner */}
      <div className="container mx-auto px-4">
        <div className="relative -mt-12 md:-mt-14 flex flex-col sm:flex-row items-start gap-4 pb-6">
          {/* Icon */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-card border-4 border-background shadow-xl flex items-center justify-center overflow-hidden flex-shrink-0">
            {project.iconUrl ? (
              <img src={project.iconUrl} alt={project.name} className="w-full h-full object-cover" />
            ) : (
              <FolderKanban className="w-10 h-10 text-muted-foreground" strokeWidth={1.5} />
            )}
          </div>

          {/* Title block */}
          <div className="flex-1 min-w-0 pt-1 sm:pt-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{project.name}</h1>
              {project.isVerified && (
                <Tooltip>
                  <TooltipTrigger>
                    <BadgeCheck className="w-5 h-5 text-blue-500" strokeWidth={2} />
                  </TooltipTrigger>
                  <TooltipContent>Verified project</TooltipContent>
                </Tooltip>
              )}
              {project.visibility === "PRIVATE" && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Lock className="w-3 h-3" strokeWidth={2} />Private
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm md:text-base mb-3">{project.tagline}</p>

            {/* Inline meta */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span
                className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => navigate(`/profile/${project.owner?.username}`)}
              >
                <Avatar className="w-4 h-4">
                  <AvatarImage src={project.owner?.avatarUrl} />
                  <AvatarFallback className="text-[8px]">{project.owner?.name?.[0]}</AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">{project.owner?.name}</span>
                <span>@{project.owner?.username}</span>
              </span>
              {project.category && (
                <span className="flex items-center gap-1">
                  {getCategoryIcon(project.category)}
                  {getCategoryLabel(project.category)}
                </span>
              )}
              {project.createdAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
                  {formatDate(project.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex flex-wrap items-center gap-3 pb-6 border-b">
          {/* Fire react button */}
          <button
            onClick={() => starProject({ variables: { projectId: project.id } })}
            className="group flex items-center gap-0 h-9 rounded-lg overflow-hidden border border-orange-500/40 hover:border-orange-500 transition-all"
          >
            <span className="flex items-center gap-1.5 px-3 h-full text-orange-500 group-hover:bg-orange-500/10 transition-colors">
              <FireIcon className="w-4 h-4" />
              <span className="text-sm font-semibold">Fire</span>
            </span>
            <span className="w-px h-5 bg-orange-500/30" />
            <span className="px-3 h-full flex items-center text-sm font-bold tabular-nums text-orange-500 group-hover:bg-orange-500/10 transition-colors">
              {project.starsCount ?? 0}
            </span>
          </button>

          <div className="flex-1" />
          {/* Owner-only action buttons */}
          {user && project.owner?.id === user.id && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={openEdit}
              >
                <Pencil className="w-4 h-4" strokeWidth={2} />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4" strokeWidth={2} />
                Delete
              </Button>
            </>
          )}
          {project.githubUrl && (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                <Code2 className="w-4 h-4" strokeWidth={2} />
                Source Code
                <ExternalLink className="w-3 h-3" strokeWidth={2} />
              </a>
            </Button>
          )}
          {project.projectUrl && (
            <Button asChild size="sm" className="gap-1.5">
              <a href={project.projectUrl} target="_blank" rel="noopener noreferrer">
                <Globe className="w-4 h-4" strokeWidth={2} />
                Visit Project
                <ExternalLink className="w-3 h-3" strokeWidth={2} />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left — tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview">
              <TabsList className="mb-6">
                <TabsTrigger value="overview" className="gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Overview
                </TabsTrigger>
                {allScreenshots.length > 0 && (
                  <TabsTrigger value="screenshots" className="gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    Pages
                    <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5 rounded-full">{allScreenshots.length}</Badge>
                  </TabsTrigger>
                )}
                <TabsTrigger value="team" className="gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Team
                  {members.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5 rounded-full">{members.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ─── Overview Tab ─── */}
              <TabsContent value="overview" className="space-y-6">
                {/* About */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">About</h3>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                      {project.description || "No description provided yet."}
                    </p>
                  </div>
                </div>

                {/* Screenshot preview (first 3) — crawled pages gallery */}
                {allScreenshots.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pages Crawled</h3>
                      <span className="text-[11px] text-muted-foreground">{allScreenshots.length} page{allScreenshots.length !== 1 ? "s" : ""} captured</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {allScreenshots.slice(0, 4).map((url: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setLightboxIdx(i)}
                          className="relative block rounded-xl overflow-hidden border hover:ring-2 hover:ring-orange-500/40 transition-all group/ss bg-muted/50"
                        >
                          <img
                            src={url}
                            alt={`Page ${i + 1}`}
                            className="w-full object-cover aspect-video group-hover/ss:scale-[1.02] transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute bottom-0 inset-x-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
                            <span className="text-[11px] text-white/80 font-medium">
                              {i === 0 ? "Home" : `Page ${i + 1}`}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                    {allScreenshots.length > 4 && (
                      <p className="text-xs text-muted-foreground mt-2">+{allScreenshots.length - 4} more — see Screenshots tab</p>
                    )}
                  </div>
                )}

                {/* Tech stack / tags */}
                {tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" strokeWidth={2} />
                      Tech Stack
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((t: any) => (
                        <Badge key={t.name} variant="secondary" className="text-xs rounded-lg px-3 py-1 font-normal">{t.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress */}
                {project.progress != null && project.progress > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Progress</h3>
                    <div className="rounded-xl border bg-card p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Completion</span>
                        <span className="text-sm font-bold text-primary">{project.progress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ─── Screenshots Tab ─── */}
              {allScreenshots.length > 0 && (
                <TabsContent value="screenshots" className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    {allScreenshots.length} page{allScreenshots.length !== 1 ? "s" : ""} automatically crawled and captured from this project.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {allScreenshots.map((url: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setLightboxIdx(i)}
                        className="relative block rounded-xl overflow-hidden border hover:ring-2 hover:ring-orange-500/40 transition-all group/ss bg-muted/50"
                      >
                        <img
                          src={url}
                          alt={`Page ${i + 1}`}
                          className="w-full object-cover aspect-video group-hover/ss:scale-[1.02] transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute bottom-0 inset-x-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-between">
                          <span className="text-xs text-white font-semibold">{i === 0 ? "Home" : `Page ${i + 1}`}</span>
                          <span className="text-[10px] text-white/60">click to expand</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              )}

              {/* ─── Team Tab ─── */}
              <TabsContent value="team" className="space-y-4">
                {/* Owner card */}
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Owner</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-primary/20">
                      <AvatarImage src={project.owner?.avatarUrl} />
                      <AvatarFallback className="text-lg">{project.owner?.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{project.owner?.name}</p>
                      <p className="text-sm text-muted-foreground">@{project.owner?.username}</p>
                    </div>
                    <div className="flex-1" />
                    <Badge variant="outline" className="text-xs">Owner</Badge>
                  </div>
                </div>

                {/* Members */}
                {members.length > 0 ? (
                  <div className="rounded-xl border bg-card p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Members</p>
                    <div className="space-y-3">
                      {members.map((m: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={m.profile?.avatarUrl} />
                            <AvatarFallback>{m.profile?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{m.profile?.name}</p>
                            <p className="text-xs text-muted-foreground">@{m.profile?.username}</p>
                          </div>
                          <Badge variant="secondary" className="text-xs capitalize">{m.role?.toLowerCase()}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border bg-card p-8 text-center">
                    <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">No team members yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* Stats card */}
            <div className="rounded-xl border bg-card p-5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Stats</h4>
              <div className="flex items-center justify-center py-3 rounded-lg bg-orange-500/5 border border-orange-500/20 gap-4">
                <FireIcon className="w-7 h-7 text-orange-500" />
                <div>
                  <div className="text-3xl font-bold tabular-nums text-orange-500">{(project.starsCount ?? 0).toLocaleString()}</div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wide">fires</div>
                </div>
              </div>
              {project.rating != null && project.rating > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rating</span>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i <= Math.round(project.rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                          strokeWidth={2}
                        />
                      ))}
                      <span className="text-sm font-semibold ml-1">{project.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Details card */}
            <div className="rounded-xl border bg-card p-5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Details</h4>
              <div className="space-y-3 text-sm">
                {project.status && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="secondary" className="text-xs capitalize rounded-lg">{project.status.replace(/_/g, " ").toLowerCase()}</Badge>
                  </div>
                )}
                {project.category && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      {getCategoryIcon(project.category)}
                      {getCategoryLabel(project.category)}
                    </span>
                  </div>
                )}
                {project.type && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="text-xs font-medium capitalize">{project.type.toLowerCase()}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Visibility</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    {project.visibility === "PRIVATE"
                      ? <><Lock className="w-3 h-3" strokeWidth={2} />Private</>
                      : <><Globe className="w-3 h-3" strokeWidth={2} />Public</>
                    }
                  </span>
                </div>
                {project.createdAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="text-xs font-medium">{formatDate(project.createdAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Links card */}
            {(project.projectUrl || project.githubUrl || project.twitterUrl || project.linkedinUrl) && (
              <div className="rounded-xl border bg-card p-5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Links</h4>
                <div className="space-y-2">
                  {project.projectUrl && (
                    <a
                      href={project.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Globe className="w-4 h-4 text-primary" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">Website</p>
                        <p className="text-xs text-muted-foreground truncate">{project.projectUrl.replace(/^https?:\/\//, "")}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                    </a>
                  )}
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Code2 className="w-4 h-4 text-foreground" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">Source Code</p>
                        <p className="text-xs text-muted-foreground truncate">{project.githubUrl.replace(/^https?:\/\/github\.com\//, "")}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                    </a>
                  )}
                  {project.twitterUrl && (
                    <a
                      href={project.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
                        <Twitter className="w-4 h-4 text-sky-500" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">X / Twitter</p>
                        <p className="text-xs text-muted-foreground truncate">{project.twitterUrl.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "@")}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                    </a>
                  )}
                  {project.linkedinUrl && (
                    <a
                      href={project.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0">
                        <Linkedin className="w-4 h-4 text-blue-600" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">LinkedIn</p>
                        <p className="text-xs text-muted-foreground truncate">{project.linkedinUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\//, "")}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                    </a>
                  )}
                  {project.facebookUrl && (
                    <a
                      href={project.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">Facebook</p>
                        <p className="text-xs text-muted-foreground truncate">{project.facebookUrl.replace(/^https?:\/\/(www\.)?facebook\.com\//, "")}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                    </a>
                  )}
                  {project.youtubeUrl && (
                    <a
                      href={project.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <Youtube className="w-4 h-4 text-red-500" strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">YouTube</p>
                        <p className="text-xs text-muted-foreground truncate">{project.youtubeUrl.replace(/^https?:\/\/(www\.)?youtube\.com\//, "")}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Owner mini-card */}
            <div className="rounded-xl border bg-card p-5">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Created by</h4>
              <div
                className="flex items-center gap-3 cursor-pointer hover:bg-muted/40 -mx-2 px-2 py-2 rounded-lg transition-colors"
                onClick={() => navigate(`/profile/${project.owner?.username}`)}
              >
                <Avatar className="w-11 h-11 border-2 border-primary/20">
                  <AvatarImage src={project.owner?.avatarUrl} />
                  <AvatarFallback className="text-base">{project.owner?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{project.owner?.name}</p>
                  <p className="text-xs text-muted-foreground">@{project.owner?.username}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
