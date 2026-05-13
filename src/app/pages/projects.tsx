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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
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
  Link,
  Loader2,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Pencil,
  ImagePlus,
  X,
  Camera,
  Upload,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

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
      owner { id name username avatarUrl }
      projectUrl
      githubUrl
      screenshotUrl
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

const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

const SCRAPE_PROJECT_INFO = gql`
  mutation ScrapeProjectInfo($url: String!) {
    scrapeProjectInfo(url: $url) {
      name
      tagline
      description
      iconUrl
      bannerUrl
      techStack
      category
      githubUrl
      isGithubRepo
      githubStars
      githubForks
      githubLanguage
      githubTopics
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
    <div className="rounded-xl border bg-card overflow-hidden">
      <Skeleton className="w-full aspect-video" />
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0 -mt-8 relative z-10" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex justify-between pt-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

// ─── Add Project Dialog Step Types ────────────────────────────────────────────

type DialogStep = "url" | "form";

interface ProjectFormData {
  name: string;
  tagline: string;
  description: string;
  type: string;
  category: string;
  visibility: string;
  techStack: string;
  projectUrl: string;
  githubUrl: string;
  iconUrl: string;
  bannerUrl: string;
}

// File upload state (kept separate from form data)
interface UploadFiles {
  iconFile: File | null;
  iconPreview: string | null;
  bannerFile: File | null;
  bannerPreview: string | null;
  screenshotFiles: { file: File; preview: string }[];
}

const INITIAL_FORM: ProjectFormData = {
  name: "", tagline: "", description: "",
  type: "PERSONAL", category: "WEB_APP", visibility: "PUBLIC",
  techStack: "", projectUrl: "", githubUrl: "",
  iconUrl: "", bannerUrl: "",
};

const INITIAL_UPLOADS: UploadFiles = {
  iconFile: null, iconPreview: null,
  bannerFile: null, bannerPreview: null,
  screenshotFiles: [],
};

const SCAN_MESSAGES = [
  "Fetching page content…",
  "Extracting metadata…",
  "Analyzing with AI…",
  "Classifying tech stack…",
  "Almost there…",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Projects() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [searchInput, setSearchInput]       = useState("");
  const [search, setSearch]                 = useState("");
  const [activeFilter, setActiveFilter]     = useState<FilterType>("ALL");
  const [activeCategory, setActiveCategory] = useState<CategoryType>("ALL");
  const [showAddDialog, setShowAddDialog]   = useState(false);

  // Dialog state
  const [dialogStep, setDialogStep]         = useState<DialogStep>("url");
  const [urlInput, setUrlInput]             = useState("");
  const [formData, setFormData]             = useState<ProjectFormData>(INITIAL_FORM);
  const [uploads, setUploads]               = useState<UploadFiles>(INITIAL_UPLOADS);
  const [scanError, setScanError]           = useState<string | null>(null);
  const [scanMsgIdx, setScanMsgIdx]         = useState(0);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval>>();
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Auto-open create dialog when navigated here from the roast result page
  useEffect(() => {
    const state = location.state as { prefillProjectUrl?: string; prefillProjectName?: string } | null;
    if (!state?.prefillProjectUrl) return;
    // Pre-fill the URL step and jump straight to the detail form
    const url = state.prefillProjectUrl;
    const name = state.prefillProjectName ?? "";
    setUrlInput(url);
    setFormData(f => ({
      ...f,
      projectUrl: url,
      name: name,
    }));
    setDialogStep("url");
    setShowAddDialog(true);
    // Clear the navigation state so refreshing doesn't re-open the dialog
    window.history.replaceState({}, "", location.pathname);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const [createProject, { loading: creating }] = useMutation(CREATE_PROJECT, {
    refetchQueries: [GET_PROJECTS],
  });

  const [deleteProject, { loading: deleting }] = useMutation(DELETE_PROJECT, {
    refetchQueries: [GET_PROJECTS],
  });

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject({ variables: { id: deleteTarget.id } });
    } catch (_) { /* surfaced by Apollo */ }
    finally { setDeleteTarget(null); }
  }, [deleteTarget, deleteProject]);

  const [scrapeProject, { loading: scanning }] = useMutation(SCRAPE_PROJECT_INFO);

  const projects = data?.projects ?? [];

  // Cycle scanning messages
  useEffect(() => {
    if (scanning) {
      setScanMsgIdx(0);
      scanTimerRef.current = setInterval(() => {
        setScanMsgIdx(prev => (prev + 1) % SCAN_MESSAGES.length);
      }, 2200);
    } else {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
    }
    return () => { if (scanTimerRef.current) clearInterval(scanTimerRef.current); };
  }, [scanning]);

  const resetDialog = useCallback(() => {
    setDialogStep("url");
    setUrlInput("");
    setFormData(INITIAL_FORM);
    setUploads(prev => {
      // Revoke object URLs to avoid memory leaks
      if (prev.iconPreview) URL.revokeObjectURL(prev.iconPreview);
      if (prev.bannerPreview) URL.revokeObjectURL(prev.bannerPreview);
      prev.screenshotFiles.forEach(s => URL.revokeObjectURL(s.preview));
      return INITIAL_UPLOADS;
    });
    setScanError(null);
    setScanMsgIdx(0);
    setUploadProgress(null);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setShowAddDialog(open);
    if (!open) resetDialog();
  }, [resetDialog]);

  // ─── File Upload Helpers ──────────────────────────────────────────────────

  async function uploadFileToStorage(file: File, folder: string): Promise<string> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user?.id ?? "anon"}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("project-assets")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("project-assets").getPublicUrl(path);
    return data.publicUrl;
  }

  function handleIconFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploads.iconPreview) URL.revokeObjectURL(uploads.iconPreview);
    setUploads(prev => ({ ...prev, iconFile: file, iconPreview: URL.createObjectURL(file) }));
    setFormData(f => ({ ...f, iconUrl: "" })); // clear URL since we have a file
    e.target.value = "";
  }

  function handleBannerFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploads.bannerPreview) URL.revokeObjectURL(uploads.bannerPreview);
    setUploads(prev => ({ ...prev, bannerFile: file, bannerPreview: URL.createObjectURL(file) }));
    setFormData(f => ({ ...f, bannerUrl: "" }));
    e.target.value = "";
  }

  function handleScreenshotFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const newFiles = files.slice(0, 5 - uploads.screenshotFiles.length).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setUploads(prev => ({ ...prev, screenshotFiles: [...prev.screenshotFiles, ...newFiles] }));
    e.target.value = "";
  }

  function removeScreenshot(idx: number) {
    setUploads(prev => {
      URL.revokeObjectURL(prev.screenshotFiles[idx].preview);
      return { ...prev, screenshotFiles: prev.screenshotFiles.filter((_, i) => i !== idx) };
    });
  }

  const handleScan = useCallback(async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;

    // Basic URL validation
    if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
      setScanError("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setScanError(null);
    try {
      const { data: result } = await scrapeProject({ variables: { url: trimmedUrl } });
      const info = result?.scrapeProjectInfo;
      if (!info) throw new Error("No data returned");

      // Detect type
      const isGithub = info.isGithubRepo || trimmedUrl.includes("github.com");

      setFormData({
        name: info.name || "",
        tagline: info.tagline || "",
        description: info.description || "",
        type: isGithub ? "GITHUB" : "PERSONAL",
        category: info.category || "OTHER",
        visibility: "PUBLIC",
        techStack: info.techStack?.join(", ") || "",
        projectUrl: trimmedUrl,
        githubUrl: info.githubUrl || (isGithub ? trimmedUrl : ""),
        iconUrl: info.iconUrl || "",
        bannerUrl: info.bannerUrl || "",
      });
      setDialogStep("form");
    } catch (err: any) {
      setScanError(err?.message || "Failed to scan URL. You can add the project manually.");
    }
  }, [urlInput, scrapeProject]);

  const handleGoManual = useCallback(() => {
    setFormData({ ...INITIAL_FORM, projectUrl: urlInput.trim() });
    setScanError(null);
    setDialogStep("form");
  }, [urlInput]);

  const handleAddProject = useCallback(async () => {
    if (!formData.name || !formData.tagline) return;
    try {
      let iconUrl = formData.iconUrl || undefined;
      let bannerUrl = formData.bannerUrl || undefined;
      let screenshotUrls: string[] = [];

      // Upload icon file if selected
      if (uploads.iconFile) {
        setUploadProgress("Uploading icon…");
        iconUrl = await uploadFileToStorage(uploads.iconFile, "icons");
      }

      // Upload banner file if selected
      if (uploads.bannerFile) {
        setUploadProgress("Uploading banner…");
        bannerUrl = await uploadFileToStorage(uploads.bannerFile, "banners");
      }

      // Upload screenshot files
      if (uploads.screenshotFiles.length > 0) {
        setUploadProgress("Uploading screenshots…");
        screenshotUrls = await Promise.all(
          uploads.screenshotFiles.map(s => uploadFileToStorage(s.file, "screenshots"))
        );
      }

      setUploadProgress("Creating project…");
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
            projectUrl: formData.projectUrl || undefined,
            githubUrl: formData.githubUrl || undefined,
            iconUrl,
            bannerUrl,
            screenshots: screenshotUrls.length > 0 ? screenshotUrls : undefined,
          },
        },
      });
      handleDialogOpenChange(false);
      toast.success("Project submitted!", { description: "Your project is now live on Lokal." });
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.toLowerCase().includes("project limit") || msg.toLowerCase().includes("quota")) {
        toast.error("Project limit reached 🗂", {
          description: msg.includes("upgrade") ? msg : "You've used all your project slots for your current rank. Level up to unlock more!",
          duration: 6000,
          action: { label: "View Ranks", onClick: () => window.location.href = "/rank-role" },
        });
      } else {
        toast.error("Failed to create project", { description: msg || "Something went wrong. Please try again." });
      }
    } finally { setUploadProgress(null); }
  }, [formData, uploads, createProject, handleDialogOpenChange]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-blue-500/5 to-cyan-500/10 border-b">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl" />
        </div>
        <div className="container mx-auto px-4 py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-primary" strokeWidth={2} />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">Projects</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                What the community is building
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed">
                Discover open-source repos, personal projects, and shipped products from developers in the Lokal community.
              </p>
            </div>
            {user && (
              <button
                onClick={() => setShowAddDialog(true)}
                className="group flex-shrink-0 flex items-center gap-3 px-5 py-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all duration-200 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
                  <Plus className="w-5 h-5 text-primary" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">Share your project</p>
                  <p className="text-xs text-muted-foreground">Paste a URL — we'll fill in the rest</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sticky Filter Bar */}
      <div className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
              <Input
                placeholder="Search by name, description, or tech stack…"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
            {!loading && (
              <span className="text-xs text-muted-foreground hidden sm:block whitespace-nowrap">
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </span>
            )}

            <Dialog open={showAddDialog} onOpenChange={handleDialogOpenChange}>
              {!user && (
                <DialogTrigger asChild>
                  <Button className="gap-2 flex-shrink-0">
                    <Plus className="w-4 h-4" strokeWidth={2} />
                    Add Project
                  </Button>
                </DialogTrigger>
              )}
              {user && (
                <Button className="gap-2 flex-shrink-0" onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  Add Project
                </Button>
              )}
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* ── Step 1: URL Input ── */}
                {dialogStep === "url" && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" strokeWidth={2} />
                        Add New Project
                      </DialogTitle>
                      <DialogDescription>
                        Paste your project URL and we'll auto-fill the details using AI
                      </DialogDescription>
                    </DialogHeader>

                    <div className="py-6 space-y-5">
                      {/* URL input */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Project URL</Label>
                        <div className="relative">
                          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
                          <Input
                            type="url"
                            placeholder="https://github.com/user/repo or https://myproject.com"
                            value={urlInput}
                            onChange={e => { setUrlInput(e.target.value); setScanError(null); }}
                            onKeyDown={e => { if (e.key === "Enter" && !scanning) handleScan(); }}
                            className="pl-10 h-12 text-sm"
                            autoFocus
                            disabled={scanning}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Works with GitHub repos, deployed apps, portfolio sites, npm packages, etc.
                        </p>
                      </div>

                      {/* Scanning state */}
                      {scanning && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Loader2 className="w-5 h-5 text-primary animate-spin" strokeWidth={2} />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-primary">Scanning project…</p>
                              <p className="text-xs text-muted-foreground mt-0.5 transition-all">
                                {SCAN_MESSAGES[scanMsgIdx]}
                              </p>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-3 w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: `${Math.min(20 + scanMsgIdx * 20, 95)}%`, transition: "width 0.5s ease" }} />
                          </div>
                        </div>
                      )}

                      {/* Error state */}
                      {scanError && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" strokeWidth={2} />
                            <div className="flex-1">
                              <p className="text-sm text-destructive">{scanError}</p>
                              <Button
                                variant="link"
                                size="sm"
                                className="h-auto p-0 mt-1 text-xs text-destructive/80 hover:text-destructive"
                                onClick={handleGoManual}
                              >
                                Add manually instead →
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGoManual}
                        className="text-muted-foreground"
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
                        Add manually
                      </Button>
                      <div className="flex-1" />
                      <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleScan}
                        disabled={!urlInput.trim() || scanning}
                        className="gap-2"
                      >
                        {scanning ? (
                          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                        ) : (
                          <Sparkles className="w-4 h-4" strokeWidth={2} />
                        )}
                        {scanning ? "Scanning…" : "Scan & Auto-fill"}
                      </Button>
                    </DialogFooter>
                  </>
                )}

                {/* ── Step 2: Editable Form ── */}
                {dialogStep === "form" && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 -ml-1 mr-1"
                          onClick={() => setDialogStep("url")}
                        >
                          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                        </Button>
                        Review &amp; Add Project
                      </DialogTitle>
                      <DialogDescription>
                        {uploads.iconPreview || formData.iconUrl || formData.projectUrl
                          ? "We've pre-filled the details — review and edit anything before adding."
                          : "Fill in your project details below"}
                      </DialogDescription>
                    </DialogHeader>

                    {/* Scanned preview banner */}
                    {(uploads.iconPreview || formData.iconUrl) && (
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                        <img
                          src={uploads.iconPreview || formData.iconUrl}
                          alt=""
                          className="w-10 h-10 rounded-lg border border-border object-cover flex-shrink-0"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{formData.name || "Untitled"}</p>
                          <p className="text-xs text-muted-foreground truncate">{formData.projectUrl}</p>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" strokeWidth={2} />
                      </div>
                    )}

                    <div className="space-y-4 py-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Project Type</Label>
                          <Select value={formData.type} onValueChange={v => setFormData(f => ({ ...f, type: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GITHUB"><div className="flex items-center gap-2"><Github className="w-4 h-4" strokeWidth={2} />GitHub Repo</div></SelectItem>
                              <SelectItem value="PERSONAL"><div className="flex items-center gap-2"><Layers className="w-4 h-4" strokeWidth={2} />Personal Project</div></SelectItem>
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
                        <Label>Tech Stack <span className="text-muted-foreground font-normal">(comma separated)</span></Label>
                        <Input placeholder="React, TypeScript, Node.js" value={formData.techStack} onChange={e => setFormData(f => ({ ...f, techStack: e.target.value }))} />
                        {formData.techStack && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {formData.techStack.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                              <Badge key={t} variant="secondary" className="text-xs py-0 rounded-md font-normal">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Project URL</Label>
                          <Input type="url" placeholder="https://myproject.com" value={formData.projectUrl} onChange={e => setFormData(f => ({ ...f, projectUrl: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>GitHub URL</Label>
                          <Input type="url" placeholder="https://github.com/…" value={formData.githubUrl} onChange={e => setFormData(f => ({ ...f, githubUrl: e.target.value }))} />
                        </div>
                      </div>
                      {/* Icon & Banner uploads */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Icon</Label>
                          <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconFileChange} />
                          {uploads.iconPreview || formData.iconUrl ? (
                            <div className="relative w-16 h-16 group">
                              <img
                                src={uploads.iconPreview || formData.iconUrl}
                                alt="Icon"
                                className="w-16 h-16 rounded-lg border border-border object-cover"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (uploads.iconPreview) URL.revokeObjectURL(uploads.iconPreview);
                                  setUploads(u => ({ ...u, iconFile: null, iconPreview: null }));
                                  setFormData(f => ({ ...f, iconUrl: "" }));
                                }}
                                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => iconInputRef.current?.click()}
                              className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-accent/50 transition-colors"
                            >
                              <Upload className="w-4 h-4 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">Icon</span>
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Banner</Label>
                          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerFileChange} />
                          {uploads.bannerPreview || formData.bannerUrl ? (
                            <div className="relative h-16 group">
                              <img
                                src={uploads.bannerPreview || formData.bannerUrl}
                                alt="Banner"
                                className="w-full h-16 rounded-lg border border-border object-cover"
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (uploads.bannerPreview) URL.revokeObjectURL(uploads.bannerPreview);
                                  setUploads(u => ({ ...u, bannerFile: null, bannerPreview: null }));
                                  setFormData(f => ({ ...f, bannerUrl: "" }));
                                }}
                                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => bannerInputRef.current?.click()}
                              className="w-full h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-accent/50 transition-colors"
                            >
                              <ImagePlus className="w-4 h-4 text-muted-foreground" />
                              <span className="text-[10px] text-muted-foreground">Upload banner image</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Screenshots upload */}
                      <div className="space-y-2">
                        <Label>Screenshots <span className="text-muted-foreground text-xs font-normal">(up to 5)</span></Label>
                        <input ref={screenshotInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleScreenshotFilesChange} />
                        <div className="flex flex-wrap gap-2">
                          {uploads.screenshotFiles.map((s, i) => (
                            <div key={i} className="relative w-20 h-14 group">
                              <img src={s.preview} alt={`Screenshot ${i + 1}`} className="w-20 h-14 rounded-md border border-border object-cover" />
                              <button
                                type="button"
                                onClick={() => removeScreenshot(i)}
                                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {uploads.screenshotFiles.length < 5 && (
                            <button
                              type="button"
                              onClick={() => screenshotInputRef.current?.click()}
                              className="w-20 h-14 rounded-md border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-0.5 hover:border-primary/50 hover:bg-accent/50 transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-[9px] text-muted-foreground">Add</span>
                            </button>
                          )}
                        </div>
                        {formData.projectUrl && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Camera className="w-3 h-3" /> A screenshot will also be auto-captured from your project URL
                          </p>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => handleDialogOpenChange(false)}>Cancel</Button>
                      <Button onClick={handleAddProject} disabled={!formData.name || !formData.tagline || creating || !!uploadProgress} className="gap-2">
                        {(creating || uploadProgress) ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> : <Plus className="w-4 h-4" strokeWidth={2} />}
                        {uploadProgress || (creating ? "Adding…" : "Add Project")}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Filter chips */}
          <div className="mt-3 space-y-2">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project: any) => {
              const previewImg = project.screenshotUrl || project.bannerUrl;
              return (
                <div
                  key={project.id}
                  className="group rounded-xl border bg-card overflow-hidden hover:shadow-xl hover:border-primary/40 transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  {/* Screenshot / banner preview */}
                  <div className="relative aspect-video bg-muted/60 overflow-hidden">
                    {previewImg ? (
                      <img
                        src={previewImg}
                        alt={project.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FolderKanban className="w-10 h-10 text-muted-foreground/30" strokeWidth={1.5} />
                      </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    {/* Owner actions menu */}
                    {user && project.owner?.id === user.id && (
                      <div className="absolute top-2 left-2 z-20" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:bg-black/60 hover:text-white transition-colors">
                              <MoreVertical className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-44">
                            <DropdownMenuItem
                              className="gap-2"
                              onClick={() => navigate(`/project/${project.id}?edit=1`)}
                            >
                              <Pencil className="w-4 h-4" strokeWidth={2} />
                              Edit project
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive gap-2"
                              onClick={() => setDeleteTarget({ id: project.id, name: project.name })}
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={2} />
                              Delete project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                  {/* Badges */}
                    <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                      {project.isFeatured && (
                        <Badge className="bg-yellow-500/90 text-white border-0 text-[10px] px-2 py-0.5 shadow-sm backdrop-blur-sm">
                          <Award className="w-3 h-3 mr-1" strokeWidth={2} />Featured
                        </Badge>
                      )}
                      {project.isTrending && (
                        <Badge className="bg-blue-500/90 text-white border-0 text-[10px] px-2 py-0.5 shadow-sm backdrop-blur-sm">
                          <TrendingUp className="w-3 h-3 mr-1" strokeWidth={2} />Trending
                        </Badge>
                      )}
                    </div>

                    {/* Stats overlay at bottom */}
                    <div className="absolute bottom-2.5 right-2.5 flex gap-2">
                      <span className="flex items-center gap-1 text-[11px] text-white/90 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5">
                        <Star className="w-3 h-3" strokeWidth={2} />{project.starsCount}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-white/90 bg-black/30 backdrop-blur-sm rounded-full px-2 py-0.5">
                        <Heart className="w-3 h-3" strokeWidth={2} />{project.likesCount}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    {/* Icon + Name row */}
                    <div className="flex items-start gap-3 -mt-8 relative z-10 mb-3">
                      <div className="w-11 h-11 rounded-xl bg-card border-2 border-background shadow-md flex items-center justify-center overflow-hidden flex-shrink-0">
                        {project.iconUrl ? (
                          <img src={project.iconUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <FolderKanban className="w-5 h-5 text-primary" strokeWidth={2} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-5">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{project.name}</h3>
                          {project.visibility === "PRIVATE" && <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" strokeWidth={2} />}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{project.tagline}</p>
                      </div>
                    </div>

                    {/* Tags */}
                    {(project.tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {(project.tags ?? []).slice(0, 3).map((t: any) => (
                          <span key={t.name} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{t.name}</span>
                        ))}
                        {(project.tags ?? []).length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">+{project.tags.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Progress bar (personal projects) */}
                    {project.type === "PERSONAL" && project.progress != null && project.progress > 0 && project.progress < 100 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold text-primary">{project.progress}%</span>
                        </div>
                        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${project.progress}%` }} />
                        </div>
                      </div>
                    )}

                    {/* Footer: owner + category */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="flex items-center gap-1.5">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={project.owner?.avatarUrl} />
                          <AvatarFallback className="text-[8px]">{project.owner?.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] text-muted-foreground truncate max-w-[100px]">{project.owner?.username}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] gap-1 rounded-full h-5 px-2 font-normal">
                        {getCategoryIcon(project.category)}
                        {CATEGORY_LABELS[project.category as CategoryType] ?? project.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

