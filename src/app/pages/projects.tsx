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
  Twitter,
  Linkedin,
  Youtube,
  Rocket,
  Zap,
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
      screenshots
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
      summary
      iconUrl
      bannerUrl
      screenshots
      techStack
      category
      githubUrl
      isGithubRepo
      githubStars
      githubForks
      githubLanguage
      githubTopics
      brandColor
      twitterUrl
      linkedinUrl
      facebookUrl
      youtubeUrl
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
  twitterUrl: string;
  linkedinUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  iconUrl: string;
  bannerUrl: string;
  brandColor: string;
  scrapedScreenshots: string[];
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
  twitterUrl: "", linkedinUrl: "", facebookUrl: "", youtubeUrl: "", brandColor: "",
  iconUrl: "", bannerUrl: "",
  scrapedScreenshots: [],
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

// ─── ASCII Fire Animation ─────────────────────────────────────────────────────
const FIRE_CHARS_P = [" ", ".", ":", "^", "*", "x", "X", "$", "#", "M"];
const FIRE_COLORS_P = [
  "transparent", "#1a0000", "#3d0000", "#7a1000", "#b02000",
  "#d44000", "#e86010", "#f09030", "#f8c050", "#fff8a0",
];
const CELL_PX_P = 9;

function AsciiFireAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const tick = () => {
      const W = canvas.width, H = canvas.height;
      const COLS = Math.ceil(W / CELL_PX_P), ROWS = Math.ceil(H / CELL_PX_P);
      if (!(tick as any).grid || (tick as any).cols !== COLS || (tick as any).rows !== ROWS) {
        (tick as any).grid = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
        (tick as any).cols = COLS; (tick as any).rows = ROWS;
      }
      const grid: Uint8Array[] = (tick as any).grid;
      for (let x = 0; x < COLS; x++) {
        grid[ROWS - 1][x] = Math.random() < 0.92 ? Math.floor(Math.random() * 2) + 8 : Math.floor(Math.random() * 2);
        if (ROWS > 1) grid[ROWS - 2][x] = Math.random() < 0.85 ? Math.floor(Math.random() * 2) + 7 : 0;
        if (ROWS > 2) grid[ROWS - 3][x] = Math.random() < 0.70 ? Math.floor(Math.random() * 2) + 6 : 0;
        if (ROWS > 3) grid[ROWS - 4][x] = Math.random() < 0.55 ? Math.floor(Math.random() * 2) + 5 : 0;
      }
      for (let y = 0; y < ROWS - 4; y++) {
        for (let x = 0; x < COLS; x++) {
          const below = grid[y + 1][x], left = grid[y + 1][(x - 1 + COLS) % COLS], right = grid[y + 1][(x + 1) % COLS];
          grid[y][x] = Math.max(0, Math.round((below + left + right) / 3 - Math.random() * 0.25));
        }
      }
      ctx.clearRect(0, 0, W, H);
      ctx.font = `bold ${CELL_PX_P}px monospace`;
      ctx.textBaseline = "top";
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const val = grid[y][x];
          if (val === 0) continue;
          ctx.fillStyle = FIRE_COLORS_P[Math.min(val, FIRE_COLORS_P.length - 1)];
          ctx.fillText(FIRE_CHARS_P[Math.min(val, FIRE_CHARS_P.length - 1)], x * CELL_PX_P, y * CELL_PX_P);
        }
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[1]" style={{ width: "100%", height: "100%" }} aria-hidden />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Projects() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [searchInput, setSearchInput]       = useState("");
  const [search, setSearch]                 = useState("");
  const [activeFilter, setActiveFilter]     = useState<FilterType>("ALL");
  const [activeCategory, setActiveCategory] = useState<CategoryType>("ALL");
  const [showFormDialog, setShowFormDialog]  = useState(false);

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
    const url = state.prefillProjectUrl;
    const name = state.prefillProjectName ?? "";
    setUrlInput(url);
    setFormData(f => ({ ...f, projectUrl: url, name }));
    // URL bar is always visible; just prefill it (form opens after scan)
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

  const resetAddPanel = useCallback(() => {
    setShowFormDialog(false);
    setUrlInput("");
    setFormData(INITIAL_FORM);
    setUploads(prev => {
      if (prev.iconPreview) URL.revokeObjectURL(prev.iconPreview);
      if (prev.bannerPreview) URL.revokeObjectURL(prev.bannerPreview);
      prev.screenshotFiles.forEach(s => URL.revokeObjectURL(s.preview));
      return INITIAL_UPLOADS;
    });
    setScanError(null);
    setScanMsgIdx(0);
    setUploadProgress(null);
  }, []);

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

  function removeScrapedScreenshot(idx: number) {
    setFormData(prev => ({
      ...prev,
      scrapedScreenshots: prev.scrapedScreenshots.filter((_, i) => i !== idx),
    }));
  }

  /** Normalize a raw URL string — adds https:// if missing, handles www. bare input */
  function normalizeUrl(raw: string): string {
    let url = raw.trim();
    if (!url) return url;
    // If it already has a protocol, leave it alone
    if (/^https?:\/\//i.test(url)) return url;
    // Handle //domain.com style
    if (url.startsWith("//")) return "https:" + url;
    // Bare www. or any hostname — prepend https://
    return "https://" + url;
  }

  const handleScan = useCallback(async () => {
    if (!user) { setScanError("You must be logged in to add a project."); return; }
    const normalized = normalizeUrl(urlInput);
    if (!normalized) return;
    // Sync the input so the user sees the cleaned value
    setUrlInput(normalized);

    // Basic URL validation after normalization
    try { new URL(normalized); } catch {
      setScanError("That doesn't look like a valid URL. Try: github.com/user/repo or myproject.com");
      return;
    }

    setScanError(null);
    try {
      const { data: result } = await scrapeProject({ variables: { url: normalized } });
      const info = result?.scrapeProjectInfo;
      if (!info) throw new Error("No data returned");

      // Detect type
      const isGithub = info.isGithubRepo || normalized.includes("github.com");

      setFormData({
        name: info.name || "",
        tagline: info.tagline || "",
        description: info.description || "",
        type: isGithub ? "GITHUB" : "PERSONAL",
        category: info.category || "OTHER",
        visibility: "PUBLIC",
        techStack: info.techStack?.join(", ") || "",
        projectUrl: normalized,
        githubUrl: info.githubUrl || (isGithub ? normalized : ""),
        twitterUrl: info.twitterUrl || "",
        linkedinUrl: info.linkedinUrl || "",
        facebookUrl: info.facebookUrl || "",
        youtubeUrl: info.youtubeUrl || "",
        brandColor: info.brandColor || "",
        iconUrl: info.iconUrl || "",
        bannerUrl: info.bannerUrl || (info.screenshots?.[0] || ""),
        scrapedScreenshots: Array.isArray(info.screenshots) ? info.screenshots : [],
      });
      setShowFormDialog(true);
    } catch (err: any) {
      setScanError(err?.message || "Failed to scan URL. You can add the project manually.");
    }
  }, [urlInput, scrapeProject, user]);

  const handleGoManual = useCallback(() => {
    setFormData({ ...INITIAL_FORM, projectUrl: normalizeUrl(urlInput) });
    setScanError(null);
    setShowFormDialog(true);
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

      // Combine AI-scraped screenshots with manually uploaded ones
      const allScreenshots = [
        ...formData.scrapedScreenshots, // AI-crawled screenshots (already URLs)
        ...screenshotUrls,              // Manually uploaded screenshots (newly uploaded URLs)
      ].filter(Boolean);

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
            twitterUrl: formData.twitterUrl || undefined,
            linkedinUrl: formData.linkedinUrl || undefined,
            facebookUrl: formData.facebookUrl || undefined,
            youtubeUrl: formData.youtubeUrl || undefined,
            iconUrl,
            bannerUrl,
            screenshots: allScreenshots.length > 0 ? allScreenshots : undefined,
          },
        },
      });
      resetAddPanel();
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
  }, [formData, uploads, createProject, resetAddPanel]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner — fire bg + integrated search/filter */}
      <div className="relative overflow-hidden bg-black border-b sticky top-0 z-50" style={{ minHeight: window.innerWidth < 768 ? 'auto' : 200 }}>
        <AsciiFireAnimation />
        {/* gradient: only darken the very bottom strip for text legibility, keep fire visible */}
        <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black/70 via-black/30 to-transparent pointer-events-none" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

        <div className="relative z-[3] flex flex-col px-4 md:px-6 lg:px-10 py-3 md:py-4 gap-3 md:gap-2 md:absolute md:inset-0 md:justify-between">

          {/* ── Top area: left block (title+search) floats left, CTA block floats right ── */}
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-2 lg:gap-8">

            {/* LEFT: title → search stacked — search inherits the same natural width as the title block */}
            <div className="flex flex-col gap-2 min-w-0 shrink-0 w-full lg:w-auto">
              <div>
                <h1 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight text-white leading-tight">
                  What the community is building
                </h1>
                <p className="text-white/50 text-[11px] md:text-xs mt-0.5">
                  Discover repos, personal projects, and shipped products from Lokal developers.
                </p>
              </div>
              {/* Search — naturally same width as the title container above */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35" strokeWidth={2} />
                <input
                  placeholder="Search projects…"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-white/25 focus:border-white/30 transition-all"
                />
              </div>
            </div>

            {/* RIGHT: CTA block — URL+button only */}
            <div className="flex flex-col items-end gap-2 w-full lg:flex-1 min-w-0">
              {/* URL input + Add Project — Different layouts for mobile vs desktop */}
              {user && (
                <>
                  {/* Mobile Layout: Single row with input + button */}
                  <div className="sm:hidden flex items-stretch w-full rounded-lg overflow-hidden border border-white/20 bg-white/10 backdrop-blur-md">
                    {/* URL Input */}
                    <div className="relative flex-1 min-w-0">
                      <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60 flex-shrink-0" strokeWidth={1.5} />
                      <input
                        type="url"
                        placeholder="Paste URL…"
                        value={urlInput}
                        onChange={e => { setUrlInput(e.target.value); setScanError(null); }}
                        onBlur={e => { if (e.target.value.trim()) setUrlInput(normalizeUrl(e.target.value)); }}
                        onKeyDown={e => { if (e.key === "Enter" && !scanning) handleScan(); }}
                        disabled={scanning}
                        className="w-full pl-9 pr-3 py-2.5 bg-transparent text-white placeholder:text-white/30 text-sm focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    {/* Divider */}
                    <div className="w-px bg-white/15 my-2 flex-shrink-0" />
                    {/* Add Project Button */}
                    <button
                      onClick={handleScan}
                      disabled={scanning || !urlInput.trim()}
                      className="relative flex items-center justify-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 disabled:opacity-60 transition-colors overflow-hidden flex-shrink-0"
                    >
                      {!scanning && !urlInput.trim() && (
                        <span className="absolute inset-0 bg-orange-400/20 animate-ping opacity-75 pointer-events-none" />
                      )}
                      {scanning
                        ? <Loader2 className="w-4 h-4 text-white animate-spin relative z-10" strokeWidth={2} />
                        : <Plus className="w-4 h-4 text-white relative z-10" strokeWidth={2.5} />}
                      <span className="text-sm font-bold text-white tracking-wide relative z-10 whitespace-nowrap">
                        {scanning ? "Scan" : "Add"}
                      </span>
                    </button>
                  </div>

                  {/* Desktop Layout: Horizontal pill */}
                  <div className="hidden sm:flex items-stretch w-full rounded-xl overflow-hidden border border-white/20 bg-white/10 backdrop-blur-md shadow-xl shadow-black/40 hover:border-white/30 focus-within:border-white/40 focus-within:bg-white/15 transition-all">
                    {/* Input side */}
                    <div className="flex items-center flex-1 min-w-0 pl-3 gap-2">
                      <Sparkles className="w-4 h-4 text-white/60 flex-shrink-0" strokeWidth={1.5} />
                      <input
                        type="url"
                        placeholder="Paste your project URL — github.com/user/repo or myapp.com"
                        value={urlInput}
                        onChange={e => { setUrlInput(e.target.value); setScanError(null); }}
                        onBlur={e => { if (e.target.value.trim()) setUrlInput(normalizeUrl(e.target.value)); }}
                        onKeyDown={e => { if (e.key === "Enter" && !scanning) handleScan(); }}
                        disabled={scanning}
                        className="flex-1 min-w-0 py-2.5 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none disabled:opacity-50"
                      />
                      {urlInput.trim() && !scanning && (
                        <button onClick={() => { setUrlInput(""); setScanError(null); }} className="mr-1 text-white/25 hover:text-white/60 transition-colors flex-shrink-0">
                          <X className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                    {/* Divider */}
                    <div className="w-px bg-white/15 my-2 flex-shrink-0" />
                    {/* Add Project button */}
                    <button
                      onClick={handleScan}
                      disabled={scanning}
                      className="relative flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 disabled:opacity-60 transition-colors flex-shrink-0 overflow-hidden"
                    >
                      {/* pulse ring when idle */}
                      {!scanning && !urlInput.trim() && (
                        <span className="absolute inset-0 bg-orange-400/20 animate-ping opacity-75 pointer-events-none" />
                      )}
                      {scanning
                        ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin relative z-10" strokeWidth={2} />
                        : <Plus className="w-3.5 h-3.5 text-white relative z-10" strokeWidth={2.5} />}
                      <span className="text-sm font-bold text-white tracking-wide whitespace-nowrap relative z-10">
                        {scanning ? "Scanning…" : "Add Project"}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Scan feedback */}
          {(scanning || scanError) && (
            <div className="flex flex-col gap-1">
              {scanning && (
                <div className="flex items-center gap-3">
                  <p className="text-xs text-orange-300 font-medium">{SCAN_MESSAGES[scanMsgIdx]}</p>
                  <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(20 + scanMsgIdx * 20, 95)}%` }} />
                  </div>
                </div>
              )}
              {scanError && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" strokeWidth={2} />
                  <p className="text-xs text-red-400">{scanError}</p>
                  <button onClick={handleGoManual} className="text-[11px] text-white/50 hover:text-white underline underline-offset-2 transition-colors ml-1 whitespace-nowrap">
                    Add manually
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Row 3: Filter pills + Project count ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide w-full sm:w-auto">
              {(["ALL", "TRENDING", "FEATURED", "GITHUB", "PERSONAL"] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide border transition-all duration-150 ${
                    activeFilter === f
                      ? "bg-white text-black border-white"
                      : "bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:text-white"
                  }`}
                >
                  {f === "ALL" ? "All" : f.replace("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>

            {/* Project count badge - matches brand design style - Hidden on mobile */}
            {!loading && (
              <div className="hidden sm:inline-block live-counter-border rounded-full p-[1.5px] shadow-sm shadow-black/10 sm:ml-auto">
                <div className="inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
                  <span className="relative flex items-center justify-center">
                    <span className="absolute inset-[-3px] rounded-full bg-primary/20 icon-pulse-bg"></span>
                    <Rocket className="h-3.5 w-3.5 text-primary fill-primary relative z-10" strokeWidth={2} />
                  </span>
                  <span>
                    <span className="font-semibold text-foreground tabular-nums inline-block">{projects.length}</span>
                    <span> project{projects.length !== 1 ? "s" : ""}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add / Edit Project Dialog ── */}
      <Dialog open={showFormDialog} onOpenChange={open => { if (!open) resetAddPanel(); }}>
        <DialogContent className="w-screen max-w-[96vw] xl:max-w-6xl p-0 gap-0 overflow-hidden h-[95vh] max-h-[95vh] flex flex-col [&>button]:hidden">

          {/* ── Top bar ── */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Preview — edit directly</span>
            </div>
            <button onClick={resetAddPanel} className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>

          {/* ── Scrollable preview body ── */}
          <div className="flex-1 overflow-y-auto">

            {/* Hero banner — mirrors project-detail hero */}
            <div className="relative h-52 md:h-64 bg-gradient-to-br from-primary/15 via-primary/5 to-muted overflow-hidden group">
              <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerFileChange} />
              {(uploads.bannerPreview || formData.bannerUrl) ? (
                <img
                  src={uploads.bannerPreview || formData.bannerUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none" />
              {/* hover edit overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => bannerInputRef.current?.click()}
              >
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
                  <ImagePlus className="w-3.5 h-3.5" strokeWidth={2} /> Change Banner
                </div>
              </div>
              {(uploads.bannerPreview || formData.bannerUrl) && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); if (uploads.bannerPreview) URL.revokeObjectURL(uploads.bannerPreview); setUploads(u => ({ ...u, bannerFile: null, bannerPreview: null })); setFormData(f => ({ ...f, bannerUrl: "" })); }}
                  className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                >
                  <X className="w-3 h-3" strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Header row — icon + name + tagline + pills, overlapping banner */}
            <div className="px-6">
              <div className="relative -mt-12 flex items-start gap-4 pb-5">
                {/* Icon */}
                <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconFileChange} />
                <div
                  className="w-24 h-24 rounded-2xl bg-card border-4 border-background shadow-xl flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer group/icon"
                  onClick={() => iconInputRef.current?.click()}
                >
                  {(uploads.iconPreview || formData.iconUrl) ? (
                    <img
                      src={uploads.iconPreview || formData.iconUrl}
                      alt="Icon"
                      className="w-full h-full object-cover group-hover/icon:opacity-80 transition-opacity"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground group-hover/icon:text-foreground transition-colors">
                      <Upload className="w-6 h-6" strokeWidth={1.5} />
                      <span className="text-[9px] font-medium">Icon</span>
                    </div>
                  )}
                </div>

                {/* Name + tagline + meta pills */}
                <div className="flex-1 min-w-0 pt-4 sm:pt-6">
                  <input
                    placeholder="Project name *"
                    value={formData.name}
                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    className="w-full text-2xl md:text-3xl font-bold bg-transparent border-b border-transparent hover:border-muted-foreground/30 focus:border-orange-500/60 focus:outline-none pb-0.5 mb-1.5 placeholder:text-muted-foreground/30 tracking-tight transition-colors"
                  />
                  <input
                    placeholder="One-line tagline *"
                    value={formData.tagline}
                    onChange={e => setFormData(f => ({ ...f, tagline: e.target.value }))}
                    className="w-full text-base text-muted-foreground bg-transparent border-b border-transparent hover:border-muted-foreground/20 focus:border-orange-500/40 focus:outline-none pb-0.5 mb-3 placeholder:text-muted-foreground/30 transition-colors"
                  />
                  {/* Category + Visibility + Type pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={formData.category} onValueChange={v => setFormData(f => ({ ...f, category: v }))}>
                      <SelectTrigger className="h-6 text-[11px] rounded-full px-2.5 border-orange-500/30 bg-orange-500/10 text-orange-400 w-auto gap-1 hover:bg-orange-500/20 transition-colors">
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
                    <Select value={formData.visibility} onValueChange={v => setFormData(f => ({ ...f, visibility: v }))}>
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
                        onClick={() => setFormData(f => ({ ...f, type: t }))}
                        className={`flex items-center gap-1 h-6 px-2.5 rounded-full text-[11px] font-semibold border transition-all ${
                          formData.type === t
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
                {formData.githubUrl && (
                  <div className="flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium text-muted-foreground">
                    <Code2 className="w-3.5 h-3.5" strokeWidth={2} /> Source Code
                  </div>
                )}
                {formData.projectUrl && (
                  <div className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                    <Globe className="w-3.5 h-3.5" strokeWidth={2} /> Visit Project
                  </div>
                )}
              </div>
            </div>

            {/* Two-column body — mirrors project-detail grid */}
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Left (2 cols): About + Tech + Screenshots */}
              <div className="md:col-span-2 space-y-6">

                {/* About */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</h3>
                  <Textarea
                    placeholder="What does it do? Who is it for? What problem does it solve?"
                    value={formData.description}
                    onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                    className="min-h-[88px] resize-none text-sm bg-muted/30 border-muted-foreground/15 focus-visible:border-orange-500/50 focus-visible:ring-orange-500/20"
                  />
                </div>

                {/* Tech Stack */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tech Stack</h3>
                  <Input
                    placeholder="React, TypeScript, Node.js, PostgreSQL…"
                    value={formData.techStack}
                    onChange={e => setFormData(f => ({ ...f, techStack: e.target.value }))}
                    className="text-sm bg-muted/30 border-muted-foreground/15 focus-visible:border-orange-500/50 focus-visible:ring-orange-500/20 mb-2"
                  />
                  {formData.techStack && (
                    <div className="flex flex-wrap gap-1.5">
                      {formData.techStack.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                        <span key={t} className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[11px] font-medium">{t}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Screenshots strip */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Screenshots
                    {(formData.scrapedScreenshots.length > 0 || uploads.screenshotFiles.length > 0) && (
                      <span className="font-normal normal-case opacity-50 ml-1">
                        — {formData.scrapedScreenshots.length + uploads.screenshotFiles.length} page{(formData.scrapedScreenshots.length + uploads.screenshotFiles.length) !== 1 ? "s" : ""}
                      </span>
                    )}
                  </h3>
                  <input ref={screenshotInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleScreenshotFilesChange} />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* AI-crawled screenshots */}
                    {formData.scrapedScreenshots.map((url, i) => (
                      <div key={`scraped-${i}`} className="relative group/ss flex-shrink-0">
                        <img
                          src={url}
                          alt={i === 0 ? "Home" : `Page ${i + 1}`}
                          className="w-full rounded-xl border object-cover aspect-video"
                        />
                        <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl">
                          <span className="text-[10px] text-white/80 font-medium">{i === 0 ? "Home" : `Page ${i + 1}`}</span>
                        </div>
                        <button type="button" onClick={() => removeScrapedScreenshot(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover/ss:opacity-100 transition-opacity shadow-md">
                          <X className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                    {/* Manually uploaded screenshots */}
                    {uploads.screenshotFiles.map((s, i) => (
                      <div key={`upload-${i}`} className="relative group/ss flex-shrink-0">
                        <img src={s.preview} alt={`Upload ${i + 1}`} className="w-full rounded-xl border object-cover aspect-video" />
                        <button type="button" onClick={() => removeScreenshot(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover/ss:opacity-100 transition-opacity shadow-md">
                          <X className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                    {/* Add button */}
                    {uploads.screenshotFiles.length < 5 && (
                      <button
                        type="button"
                        onClick={() => screenshotInputRef.current?.click()}
                        className="rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-1 hover:border-orange-500/40 hover:bg-orange-500/5 transition-colors text-muted-foreground hover:text-orange-500 aspect-video"
                      >
                        <Camera className="w-5 h-5" strokeWidth={1.5} />
                        <span className="text-[10px]">Add photo</span>
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Right (1 col): Links card + Brand color */}
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
                        value={formData.projectUrl}
                        onChange={e => setFormData(f => ({ ...f, projectUrl: e.target.value }))}
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
                        value={formData.githubUrl}
                        onChange={e => setFormData(f => ({ ...f, githubUrl: e.target.value }))}
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
                        value={formData.twitterUrl}
                        onChange={e => setFormData(f => ({ ...f, twitterUrl: e.target.value }))}
                        className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 min-w-0"
                      />
                      {formData.twitterUrl && <span className="text-[9px] text-sky-400 font-semibold bg-sky-400/10 px-1.5 py-0.5 rounded-full flex-shrink-0">AI</span>}
                    </div>
                    {/* LinkedIn */}
                    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-blue-600/10 flex items-center justify-center flex-shrink-0">
                        <Linkedin className="w-3.5 h-3.5 text-blue-600" strokeWidth={2} />
                      </div>
                      <input
                        placeholder="https://linkedin.com/…"
                        value={formData.linkedinUrl}
                        onChange={e => setFormData(f => ({ ...f, linkedinUrl: e.target.value }))}
                        className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 min-w-0"
                      />
                      {formData.linkedinUrl && <span className="text-[9px] text-blue-500 font-semibold bg-blue-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">AI</span>}
                    </div>
                    {/* Facebook */}
                    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        {/* Facebook icon — lucide doesn't have one, use SVG */}
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                        </svg>
                      </div>
                      <input
                        placeholder="https://facebook.com/…"
                        value={formData.facebookUrl}
                        onChange={e => setFormData(f => ({ ...f, facebookUrl: e.target.value }))}
                        className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 min-w-0"
                      />
                      {formData.facebookUrl && <span className="text-[9px] text-blue-500 font-semibold bg-blue-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">AI</span>}
                    </div>
                    {/* YouTube */}
                    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                        <Youtube className="w-3.5 h-3.5 text-red-500" strokeWidth={2} />
                      </div>
                      <input
                        placeholder="https://youtube.com/@…"
                        value={formData.youtubeUrl}
                        onChange={e => setFormData(f => ({ ...f, youtubeUrl: e.target.value }))}
                        className="flex-1 bg-transparent text-xs focus:outline-none placeholder:text-muted-foreground/40 min-w-0"
                      />
                      {formData.youtubeUrl && <span className="text-[9px] text-red-400 font-semibold bg-red-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">AI</span>}
                    </div>
                  </div>

                  {/* Brand color row */}
                  {formData.brandColor && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-2.5 px-2.5 py-1.5">
                      <span className="w-7 h-7 rounded-lg flex-shrink-0 border border-white/10 shadow-sm" style={{ background: formData.brandColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">Brand color</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{formData.brandColor}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats preview card — mirrors sidebar stats */}
                <div className="rounded-xl border bg-card p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">After publishing</h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 text-[10px]">🔥</span>
                      <span>0 fires — be the first to react</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" strokeWidth={2} />
                      <span>0 stars</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" strokeWidth={2} />
                      <span>+XP awarded on publish</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ── Sticky footer ── */}
          <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-3.5 border-t bg-background/95 backdrop-blur-sm">
            <div className="flex-1">
              {uploadProgress && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" strokeWidth={2} />
                  <span className="text-xs text-muted-foreground">{uploadProgress}</span>
                </div>
              )}
              {(!formData.name || !formData.tagline) && !uploadProgress && (
                <p className="text-xs text-muted-foreground/60">Name and tagline are required to publish</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resetAddPanel} className="text-muted-foreground hover:text-foreground">
                Cancel
              </Button>
              <Button
                onClick={handleAddProject}
                disabled={!formData.name || !formData.tagline || creating || !!uploadProgress}
                className="gap-2 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white border-none min-w-36 font-bold shadow-lg shadow-orange-500/25 disabled:opacity-50"
              >
                {(creating || uploadProgress)
                  ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                  : <Sparkles className="w-4 h-4" strokeWidth={2} />}
                {creating ? "Publishing…" : "Publish Project"}
              </Button>
            </div>
          </div>

        </DialogContent>
      </Dialog>

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

      {/* Content */}
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-6">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-6 font-mono">
            ⚠ {error.message}
          </div>
        )}

        {loading && projects.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
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

