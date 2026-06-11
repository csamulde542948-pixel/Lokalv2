// ─── Add Project Dialog ──────────────────────────────────────────────────────
// Dark CLI terminal aesthetic. Brand-aligned: JetBrains Mono everywhere,
// orange primary prompt, sharp borders, $ prefix per field, ASCII corners,
// blinking caret, command-style labels. URL → scrape → review → ship.
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { gql } from "@apollo/client/core";
import { useMutation } from "@apollo/client/react";
import {
  Loader2,
  Github,
  X,
  CheckCircle2,
  AlertCircle,
  Hash,
  Globe,
  Smartphone,
  Terminal as TerminalIcon,
  Package,
  Code2,
  Award,
  Layers,
  Star,
  GitFork,
  Image as ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { adaptProjectAvatar } from "../../lib/defaults";

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const SCRAPE_PROJECT = gql`
  mutation ScrapeProject($url: String!) {
    scrapeProjectInfo(url: $url) {
      name
      tagline
      description
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

const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
    }
  }
`;

// ─── Types ───────────────────────────────────────────────────────────────────

type ProjectCategory = "WEB_APP" | "MOBILE_APP" | "LIBRARY" | "CLI_TOOL" | "PORTFOLIO" | "OTHER";
type ProjectType = "GITHUB" | "PERSONAL";
type Visibility = "PUBLIC" | "PRIVATE";

interface ScrapedInfo {
  name: string;
  tagline: string;
  description: string;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  screenshots: string[];
  techStack: string[];
  category: ProjectCategory;
  githubUrl?: string | null;
  isGithubRepo: boolean;
  githubStars?: number | null;
  githubForks?: number | null;
  githubLanguage?: string | null;
  githubTopics: string[];
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
}

interface AddProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
  defaultUrl?: string;
}

const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  WEB_APP: "Web App",
  MOBILE_APP: "Mobile App",
  LIBRARY: "Library",
  CLI_TOOL: "CLI Tool",
  PORTFOLIO: "Portfolio",
  OTHER: "Other",
};

const CATEGORY_VALUES: ProjectCategory[] = [
  "WEB_APP",
  "MOBILE_APP",
  "LIBRARY",
  "CLI_TOOL",
  "PORTFOLIO",
  "OTHER",
];

const CATEGORY_ICONS: Record<ProjectCategory, React.ElementType> = {
  WEB_APP: Globe,
  MOBILE_APP: Smartphone,
  LIBRARY: Package,
  CLI_TOOL: TerminalIcon,
  PORTFOLIO: Award,
  OTHER: Code2,
};

function clampText(value: string | null | undefined, max: number) {
  return (value ?? "").trim().slice(0, max);
}

function normalizeUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function normalizeScrapedTags(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const raw of values) {
    const tag = raw
      ?.trim()
      .toLowerCase()
      .replace(/^#+/, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);

    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    normalized.push(tag);
    if (normalized.length >= 8) break;
  }

  return normalized;
}

// ─── Terminal frame ──────────────────────────────────────────────────────────
// Shared dark terminal "window" chrome (red/yellow/green dots + title bar
// + monospace title) wrapped around the body content of each step.
function TerminalFrame({
  title,
  step,
  children,
}: {
  title: string;
  step: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md overflow-hidden border border-zinc-700/80 bg-zinc-950 text-zinc-100 shadow-2xl shadow-black/40">
      {/* Title bar — fake macOS chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900/90 border-b border-zinc-800/80">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        <div className="flex-1 mx-3 text-center">
          <span className="text-[10px] font-mono text-zinc-500 tracking-wide select-none">
            {title}
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase select-none">
          {step}
        </span>
      </div>

      {/* Body */}
      <div className="font-mono text-sm text-zinc-100">{children}</div>
    </div>
  );
}

// Inline blinking caret — shown at the end of a prompt line
function Caret() {
  return (
    <span
      className="inline-block w-1.5 h-3.5 align-middle ml-0.5 bg-primary animate-pulse"
      aria-hidden
    />
  );
}

// Reusable prompt row: `$ <label> <hint>...` then content underneath
function PromptLine({
  prompt,
  hint,
  children,
}: {
  prompt: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-zinc-300">
      <span className="text-primary select-none">$</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-100">{prompt}</span>
          {hint && (
            <span className="text-[10px] text-zinc-500 tracking-wide normal-case">
              // {hint}
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

// Comment line — dimmed
function CommentLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-zinc-500 leading-relaxed pl-5">{children}</p>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AddProjectDialog({ open, onOpenChange, onCreated, defaultUrl }: AddProjectDialogProps) {
  const location = useLocation();
  const prefill = (location.state as any) ?? {};
  const initialUrl: string = defaultUrl ?? prefill.prefillProjectUrl ?? "";
  const initialName: string = prefill.prefillProjectName ?? "";

  const { user } = useAuth();

  const [step, setStep] = useState<"url" | "edit">("url");
  const [url, setUrl] = useState(initialUrl);
  const [name, setName] = useState(initialName);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [projectUrl, setProjectUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState<string | null>(null);
  const [twitterUrl, setTwitterUrl] = useState<string | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState<string | null>(null);
  const [facebookUrl, setFacebookUrl] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<ProjectCategory>("WEB_APP");
  const [type, setType] = useState<ProjectType>("PERSONAL");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Owner info (current user) for the preview footer
  const ownerName = (user?.user_metadata as any)?.full_name
    || (user?.user_metadata as any)?.name
    || user?.email?.split("@")[0]
    || "you";
  const ownerUsername = (user?.user_metadata as any)?.username
    || (user?.email?.split("@")[0] ?? "you");
  const ownerAvatar = (user?.user_metadata as any)?.avatar_url
    || (user?.user_metadata as any)?.picture
    || null;

  // Reset to step 1 every time the dialog opens
  useEffect(() => {
    if (open) {
      setStep("url");
      setUrl(initialUrl);
      setName(initialName);
      setTagline("");
      setDescription("");
      setIconUrl(null);
      setBannerUrl(null);
      setScreenshots([]);
      setProjectUrl(initialUrl);
      setGithubUrl(null);
      setTwitterUrl(null);
      setLinkedinUrl(null);
      setFacebookUrl(null);
      setYoutubeUrl(null);
      setCategory("WEB_APP");
      setType("PERSONAL");
      setVisibility("PUBLIC");
      setTags([]);
      setTagInput("");
    }
  }, [open, initialUrl, initialName]);

  // ── Scrape ────────────────────────────────────────────────────────────────
  const [scrape, { loading: scraping, error: scrapeError }] = useMutation(SCRAPE_PROJECT);

  async function handleScrape() {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("URL is required");
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      toast.error("URL must start with http:// or https://");
      return;
    }
    try {
      const res = await scrape({ variables: { url: trimmed } });
      const info: ScrapedInfo = res.data?.scrapeProjectInfo;
      if (!info) throw new Error("No data returned");
      setName(clampText(info.name, 60));
      setTagline(clampText(info.tagline, 80));
      setDescription(clampText(info.description, 500));
      setIconUrl(normalizeUrl(info.iconUrl));
      setBannerUrl(normalizeUrl(info.bannerUrl));
      setScreenshots((info.screenshots ?? []).map(normalizeUrl).filter(Boolean).slice(0, 8) as string[]);
      setProjectUrl(trimmed);
      setGithubUrl(normalizeUrl(info.githubUrl));
      setTwitterUrl(normalizeUrl(info.twitterUrl));
      setLinkedinUrl(normalizeUrl(info.linkedinUrl));
      setFacebookUrl(normalizeUrl(info.facebookUrl));
      setYoutubeUrl(normalizeUrl(info.youtubeUrl));
      setCategory(info.category ?? "WEB_APP");
      setType(info.isGithubRepo ? "GITHUB" : "PERSONAL");
      setTags(normalizeScrapedTags([...(info.techStack ?? []), ...(info.githubTopics ?? [])]));
      setStep("edit");
      toast.success("Scrape complete — review & ship");
    } catch (e: any) {
      toast.error(e?.graphQLErrors?.[0]?.message ?? e?.message ?? "Scrape failed. Try a different URL.");
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const [createProject, { loading: creating, error: createError }] = useMutation(CREATE_PROJECT);

  function addTag(raw: string) {
    const t = raw.trim().toLowerCase().replace(/^#+/, "");
    if (!t || t.length > 24) return;
    if (tags.includes(t)) return;
    if (tags.length >= 8) {
      toast.error("Max 8 tags");
      return;
    }
    setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  async function handleSubmit() {
    if (!name.trim() || !tagline.trim() || !description.trim()) {
      toast.error("name, tagline, and description are required");
      return;
    }
    try {
      const normalizedTags = normalizeScrapedTags(tags);
      const res = await createProject({
        variables: {
          input: {
            name: clampText(name, 60),
            tagline: clampText(tagline, 80),
            description: clampText(description, 500),
            iconUrl: iconUrl ?? undefined,
            bannerUrl: bannerUrl ?? undefined,
            projectUrl: projectUrl.trim() || undefined,
            githubUrl: githubUrl ?? undefined,
            twitterUrl: twitterUrl ?? undefined,
            linkedinUrl: linkedinUrl ?? undefined,
            facebookUrl: facebookUrl ?? undefined,
            youtubeUrl: youtubeUrl ?? undefined,
            screenshots: screenshots.length > 0 ? screenshots : undefined,
            type,
            visibility,
            category,
            tags: normalizedTags,
          },
        },
      });
      const id: string = res.data?.createProject?.id;
      if (!id) throw new Error("No project id returned");
      toast.success("Project shipped!");
      onOpenChange(false);
      onCreated(id);
    } catch (e: any) {
      toast.error(e?.graphQLErrors?.[0]?.message ?? e?.message ?? "Could not create project");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[640px] p-0 overflow-hidden rounded-md gap-0 border-0 bg-transparent shadow-none"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {step === "url" ? "Ship a project — paste URL" : "Ship a project — review details"}
        </DialogTitle>
        <TerminalFrame
          title={`lokalhost.club — ship ${step === "url" ? "(1/2)" : "(2/2)"}`}
          step={step === "url" ? "1 / 2" : "2 / 2"}
        >
          {step === "url" ? (
            <UrlStep
              url={url}
              onUrl={setUrl}
              onScrape={handleScrape}
              loading={scraping}
              error={scrapeError}
            />
          ) : (
            <EditStep
              name={name}
              onName={setName}
              tagline={tagline}
              onTagline={setTagline}
              description={description}
              onDescription={setDescription}
              iconUrl={iconUrl}
              bannerUrl={bannerUrl}
              screenshots={screenshots}
              category={category}
              onCategory={setCategory}
              type={type}
              onType={setType}
              visibility={visibility}
              onVisibility={setVisibility}
              tags={tags}
              tagInput={tagInput}
              onTagInput={setTagInput}
              onAddTag={addTag}
              onRemoveTag={removeTag}
              onBack={() => setStep("url")}
              onSubmit={handleSubmit}
              submitting={creating}
              submitError={createError}
              onCancel={() => onOpenChange(false)}
              ownerName={ownerName}
              ownerUsername={ownerUsername}
              ownerAvatar={ownerAvatar}
            />
          )}
        </TerminalFrame>
      </DialogContent>
    </Dialog>
  );
}

// ─── Step 1: URL input ──────────────────────────────────────────────────────

function UrlStep({
  url,
  onUrl,
  onScrape,
  loading,
  error,
}: {
  url: string;
  onUrl: (v: string) => void;
  onScrape: () => void;
  loading: boolean;
  error: any;
}) {
  return (
    <div className="px-4 sm:px-5 py-4 space-y-3">
      {/* Boot banner */}
      <div className="text-zinc-500 text-[11px] leading-relaxed select-none">
        ┌──(lokalhost@ship)─[~]<br />
        └──$ <span className="text-zinc-300">ship init</span>
      </div>

      <PromptLine prompt="paste project url" hint="github.com/you/repo, your live url, or producthunt">
        <div className="mt-1.5 flex items-center gap-2 bg-zinc-900/70 border border-zinc-700/80 rounded-sm focus-within:border-primary/70 focus-within:shadow-[0_0_0_2px] focus-within:shadow-primary/20 transition-all">
          <span className="pl-3 text-primary select-none text-sm">›</span>
          <Input
            value={url}
            onChange={(e) => onUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) onScrape();
            }}
            placeholder="https://github.com/you/project"
            disabled={loading}
            className="flex-1 border-0 bg-transparent font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-0"
            autoFocus
          />
          {loading ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin mr-3" />
          ) : (
            <span className="mr-3 text-zinc-600 select-none animate-pulse">▌</span>
          )}
        </div>
      </PromptLine>

      {error && (
        <div className="text-[11px] text-red-400 font-mono pl-5 flex items-start gap-1.5">
          <span className="select-none">!</span>
          <span>{String(error?.message ?? "scrape failed")}</span>
        </div>
      )}

      <div className="pl-5 pt-1">
        <Button
          onClick={onScrape}
          disabled={loading || !url.trim()}
          className="w-full font-mono font-semibold text-xs h-9 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border-0 rounded-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              scraping...
            </>
          ) : (
            <>
              <span className="text-primary mr-2 select-none">$</span>
              ship scrape --url
            </>
          )}
        </Button>
      </div>

      <div className="pt-3 mt-2 border-t border-dashed border-zinc-800/80 space-y-1">
        <CommentLine># tip: github.com/you/repo, your live project URL,</CommentLine>
        <CommentLine>#      or a product hunt page — we'll figure it out.</CommentLine>
      </div>
    </div>
  );
}

// ─── Step 2: Edit scraped info + live project card preview ────────────────

function EditStep({
  name,
  onName,
  tagline,
  onTagline,
  description,
  onDescription,
  iconUrl,
  bannerUrl,
  screenshots,
  category,
  onCategory,
  type,
  onType,
  visibility,
  onVisibility,
  tags,
  tagInput,
  onTagInput,
  onAddTag,
  onRemoveTag,
  onBack,
  onSubmit,
  onCancel,
  submitting,
  submitError,
  ownerName,
  ownerUsername,
  ownerAvatar,
}: {
  name: string;
  onName: (v: string) => void;
  tagline: string;
  onTagline: (v: string) => void;
  description: string;
  onDescription: (v: string) => void;
  iconUrl: string | null;
  bannerUrl: string | null;
  screenshots: string[];
  category: ProjectCategory;
  onCategory: (v: ProjectCategory) => void;
  type: ProjectType;
  onType: (v: ProjectType) => void;
  visibility: Visibility;
  onVisibility: (v: Visibility) => void;
  tags: string[];
  tagInput: string;
  onTagInput: (v: string) => void;
  onAddTag: (v: string) => void;
  onRemoveTag: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  submitError: any;
  ownerName: string;
  ownerUsername: string;
  ownerAvatar: string | null;
}) {
  const CategoryIcon = CATEGORY_ICONS[category] ?? Code2;
  const previewImage = bannerUrl || screenshots?.[0] || null;

  return (
    <div className="px-4 sm:px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
      {/* Boot banner */}
      <div className="text-zinc-500 text-[11px] leading-relaxed select-none">
        ┌──(lokalhost@ship)─[~]<br />
        └──$ <span className="text-zinc-300">ship review --edit</span>
      </div>

      {/* ── Live project card preview (matches the real ProjectCard) ── */}
      <PromptLine prompt="--preview" hint="what users will see">
        <div className="mt-1.5 rounded-md overflow-hidden border border-zinc-700/80 bg-zinc-900/40">
          <div className="group flex flex-col bg-card text-card-foreground">
            {/* Banner / screenshot */}
            <div className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-card to-card">
              {previewImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewImage}
                  alt={name || "preview"}
                  className="w-full h-auto block"
                />
              ) : (
                <div className="h-28 flex items-center justify-center">
                  <CategoryIcon
                    className="w-10 h-10 text-primary/30"
                    strokeWidth={1.5}
                  />
                </div>
              )}

              {/* Top-left: star count placeholder (0 stars) */}
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/85 backdrop-blur-sm border border-border/60">
                <Star className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] font-mono font-bold text-muted-foreground tabular-nums">
                  0
                </span>
              </div>

              {/* Top-right: GITHUB + trending badges */}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                {type === "GITHUB" && (
                  <div className="w-4 h-4 rounded bg-background/85 backdrop-blur-sm border border-border/60 flex items-center justify-center">
                    <Github className="w-2.5 h-2.5 text-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-3 flex flex-col flex-1">
              <div className="flex items-start gap-2.5 mb-2">
                {/* 16x16 icon avatar */}
                <div className="w-16 h-16 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden bg-muted/30">
                  {iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={iconUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <CategoryIcon className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0 self-center">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-mono font-semibold text-sm text-foreground truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {name || "(untitled)"}
                    </h3>
                    {/* Category badge */}
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      <CategoryIcon className="w-3 h-3" />
                      {CATEGORY_LABELS[category]}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                    {tagline || "no tagline"}
                  </p>
                </div>
              </div>

              {/* Description */}
              {description && (
                <p className="text-[11px] leading-relaxed text-muted-foreground/80 line-clamp-3 mb-2.5">
                  {description}
                </p>
              )}

              {/* Tags at bottom-left */}
              {tags.length > 0 && (
                <div className="mt-auto">
                  <div className="flex flex-wrap gap-1 mb-2.5 min-h-[16px]">
                    {tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground"
                      >
                        #{t}
                      </span>
                    ))}
                    {tags.length > 3 && (
                      <span className="text-[10px] font-mono text-muted-foreground/50 px-1 py-0.5">
                        +{tags.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="h-px bg-border mb-2.5" />

                  <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      {visibility === "PRIVATE" && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[9px] uppercase tracking-wider">
                          private
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      {ownerAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={adaptProjectAvatar(ownerAvatar)}
                          alt={ownerUsername}
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                      )}
                      <span className="truncate max-w-[90px]">@{ownerUsername}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </PromptLine>

      {/* ── Editable fields ── */}
      <PromptLine prompt="--name" hint="max 60">
        <div className="mt-1.5 flex items-center gap-2 bg-zinc-900/70 border border-zinc-700/80 rounded-sm focus-within:border-primary/70 focus-within:shadow-[0_0_0_2px] focus-within:shadow-primary/20 transition-all">
          <span className="pl-3 text-zinc-500 select-none text-sm">›</span>
          <Input
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="project name"
            maxLength={60}
            className="flex-1 border-0 bg-transparent font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-0"
          />
        </div>
      </PromptLine>

      <PromptLine prompt="--tagline" hint="one-line · max 80">
        <div className="mt-1.5 flex items-center gap-2 bg-zinc-900/70 border border-zinc-700/80 rounded-sm focus-within:border-primary/70 focus-within:shadow-[0_0_0_2px] focus-within:shadow-primary/20 transition-all">
          <span className="pl-3 text-zinc-500 select-none text-sm">›</span>
          <Input
            value={tagline}
            onChange={(e) => onTagline(e.target.value)}
            placeholder="what it does, in plain English"
            maxLength={80}
            className="flex-1 border-0 bg-transparent font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-0"
          />
        </div>
      </PromptLine>

      <PromptLine prompt="--description" hint="what/why/who · max 500">
        <div className="mt-1.5 flex items-start gap-2 bg-zinc-900/70 border border-zinc-700/80 rounded-sm focus-within:border-primary/70 focus-within:shadow-[0_0_0_2px] focus-within:shadow-primary/20 transition-all px-3 py-2">
          <span className="text-zinc-500 select-none text-sm">›</span>
          <Textarea
            value={description}
            onChange={(e) => onDescription(e.target.value)}
            placeholder="what it is, why it exists, who it's for"
            rows={3}
            maxLength={500}
            className="flex-1 border-0 bg-transparent font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 resize-none min-h-0"
          />
        </div>
      </PromptLine>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PromptLine prompt="--category">
          <Select value={category} onValueChange={(v) => onCategory(v as ProjectCategory)}>
            <SelectTrigger className="mt-1.5 font-mono text-sm h-9 bg-zinc-900/70 border border-zinc-700/80 rounded-sm focus:border-primary/70 focus:shadow-[0_0_0_2px] focus:shadow-primary/20 text-zinc-100 data-[placeholder]:text-zinc-600">
              <span className="text-zinc-500 mr-1.5">›</span>
              <SelectValue placeholder="category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_VALUES.map((c) => (
                <SelectItem key={c} value={c} className="font-mono text-sm">
                  {CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PromptLine>

        <PromptLine prompt="--visibility">
          <Select value={visibility} onValueChange={(v) => onVisibility(v as Visibility)}>
            <SelectTrigger className="mt-1.5 font-mono text-sm h-9 bg-zinc-900/70 border border-zinc-700/80 rounded-sm focus:border-primary/70 focus:shadow-[0_0_0_2px] focus:shadow-primary/20 text-zinc-100 data-[placeholder]:text-zinc-600">
              <span className="text-zinc-500 mr-1.5">›</span>
              <SelectValue placeholder="visibility" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC" className="font-mono text-sm">
                public
              </SelectItem>
              <SelectItem value="PRIVATE" className="font-mono text-sm">
                private
              </SelectItem>
            </SelectContent>
          </Select>
        </PromptLine>
      </div>

      <PromptLine prompt="--tags" hint={`up to 8 · ${tags.length}/8`}>
        <div className="mt-1.5 flex items-center gap-2 bg-zinc-900/70 border border-zinc-700/80 rounded-sm focus-within:border-primary/70 focus-within:shadow-[0_0_0_2px] focus-within:shadow-primary/20 transition-all px-3">
          <Hash className="w-3.5 h-3.5 text-zinc-500" />
          <Input
            value={tagInput}
            onChange={(e) => onTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                onAddTag(tagInput);
              } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                onRemoveTag(tags[tags.length - 1]);
              }
            }}
            placeholder="add-tag press-enter"
            className="flex-1 border-0 bg-transparent font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-0"
            maxLength={24}
          />
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 pl-1">
            {tags.map((t) => (
              <Badge
                key={t}
                variant="secondary"
                className="font-mono text-[10px] gap-1 pr-1 pl-2 bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700"
              >
                #{t}
                <button
                  onClick={() => onRemoveTag(t)}
                  className="ml-0.5 text-zinc-500 hover:text-primary transition-colors"
                  aria-label={`Remove ${t}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </PromptLine>

      {submitError && (
        <div className="text-[11px] text-red-400 font-mono pl-5 flex items-start gap-1.5">
          <span className="select-none">!</span>
          <span>{String(submitError?.message ?? "could not create project")}</span>
        </div>
      )}

      {/* Action row — terminal command style */}
      <div className="pt-3 mt-2 border-t border-dashed border-zinc-800/80 flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={submitting}
          className="font-mono text-xs h-9 px-3 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/70 border border-zinc-800 rounded-sm"
        >
          <span className="text-zinc-500 mr-1.5 select-none">‹</span>
          back
        </Button>
        <Button
          variant="ghost"
          onClick={onCancel}
          disabled={submitting}
          className="font-mono text-xs h-9 px-3 text-zinc-400 hover:text-red-400 hover:bg-zinc-900/70 border border-zinc-800 rounded-sm"
        >
          cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={submitting || !name.trim() || !tagline.trim() || !description.trim()}
          className="font-mono font-semibold text-xs h-9 px-4 flex-1 bg-primary text-primary-foreground hover:bg-primary/90 border-0 rounded-sm"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              shipping...
            </>
          ) : (
            <>
              <span className="opacity-70 mr-2 select-none">$</span>
              ship push --confirm
              <CheckCircle2 className="w-3.5 h-3.5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
