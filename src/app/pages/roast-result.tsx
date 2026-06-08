import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, Link, useParams } from "react-router";
import { gql } from "@apollo/client/core";
import { useMutation, useQuery } from "@apollo/client/react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Terminal,
  Copy,
  Check,
  ArrowLeft,
  RotateCcw,
  ExternalLink,
  Share2,
  Zap,
  AlertTriangle,
  LogIn,
  X,
  UserPlus,
  FolderPlus,
  Flag,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { BrandLogo } from "../components/brand-logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GENERATE_ROAST = gql`
  mutation GenerateRoast($input: GenerateRoastInput!) {
    generateRoast(input: $input) {
      generationId
      title
      quickRoast
      fullRoast
      screenshotUrl
      faviconUrl
      ogImageUrl
      projectUrl
      projectName
      language
    }
  }
`;

const GET_ROAST_GENERATION = gql`
  query GetRoastGeneration($id: ID!) {
    roastGeneration(id: $id) {
      id
      title
      quickRoast
      fullRoast
      language
      screenshotUrl
      faviconUrl
      ogImageUrl
      projectUrl
      projectName
    }
  }
`;

const GET_BRAND_ANALYSIS = gql`
  query GetBrandAnalysis($id: ID!) {
    brandAnalysis(id: $id) {
      id
      title
      designMd
      screenshotUrl
      faviconUrl
      ogImageUrl
      projectUrl
      projectName
    }
  }
`;

const GENERATE_BRAND_ANALYSIS = gql`
  mutation GenerateBrandAnalysis($input: GenerateRoastInput!) {
    generateBrandAnalysis(input: $input) {
      id
      title
      designMd
      screenshotUrl
      faviconUrl
      ogImageUrl
      projectUrl
      projectName
    }
  }
`;

const SUBMIT_ROAST = gql`
  mutation SubmitRoast($input: SubmitRoastInput!) {
    submitRoast(input: $input) {
      id
      quickRoast
      fullRoast
      projectId
      createdAt
    }
  }
`;

// ─── Session persistence ──────────────────────────────────────────────────────

const ROAST_CACHE_KEY = "lokal:pending_roast";
const ROAST_PUBLISH_KEY = "lokal:pending_publish";

function saveRoastToSession(roast: GeneratedRoast) {
  try { sessionStorage.setItem(ROAST_CACHE_KEY, JSON.stringify(roast)); } catch {}
}
function loadRoastFromSession(forUrl?: string | null): GeneratedRoast | null {
  try {
    const raw = sessionStorage.getItem(ROAST_CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as GeneratedRoast;
    // If a target URL is provided (e.g. a fresh /roast submit), only restore
    // the cache when it matches — otherwise an old "iloveurl" roast would
    // override the user's new analysis and the new mutation would never fire.
    if (forUrl) {
      const norm = (u: string) => (u || "").trim().replace(/\/+$/, "").toLowerCase();
      if (norm(cached.projectUrl) !== norm(forUrl)) return null;
    }
    return cached;
  } catch { return null; }
}
function clearRoastSession() {
  sessionStorage.removeItem(ROAST_CACHE_KEY);
  sessionStorage.removeItem(ROAST_PUBLISH_KEY);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ToolMode = "roast" | "brand";
type RoastLanguage = "taglish" | "english";

interface IncomingState {
  projectUrl: string;
  tool?: ToolMode;
  language?: RoastLanguage;
}

interface GeneratedRoast {
  generationId: string | null;
  title: string;
  quickRoast: string;
  fullRoast: string;
  screenshotUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  projectUrl: string;
  projectName: string;
  language: RoastLanguage;
}

interface BrandColorToken {
  name: string;
  value: string;
  role: string;
}

interface BrandTypographyToken {
  name: string;
  usage: string;
  sample: string;
  fontFamily: string;
}

function titleCaseToken(value: string) {
  return value
    .replace(/[#`*_]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toCssFontFamily(fontFamily: string) {
  return fontFamily
    .split(",")
    .map((family) => family.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean)
    .map((family) => /^(system-ui|serif|sans-serif|monospace|cursive|fantasy)$/i.test(family)
      ? family
      : `"${family}"`)
    .join(", ");
}

const BROWN_FOX_SPECIMEN = "The quick brown fox jumps over the lazy dog";


function extractBrandColors(markdown: string): BrandColorToken[] {
  const lines = markdown.split("\n");
  const matches = Array.from(new Set(markdown.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []));

  return matches.slice(0, 8).map((value, index) => {
    const line = lines.find((item) => item.includes(value)) ?? "";
    const beforeHex = line.split(value)[0] ?? "";
    const rawName = beforeHex
      .replace(/^[-*\s|:]+/, "")
      .replace(/\b(hex|color|token|value)\b/gi, "")
      .slice(-36);
    const name = titleCaseToken(rawName) || `Color ${index + 1}`;
    const role = /primary/i.test(line)
      ? "Primary"
      : /accent/i.test(line)
        ? "Accent"
        : /background|surface/i.test(line)
          ? "Surface"
          : /text|foreground/i.test(line)
            ? "Text"
            : /border/i.test(line)
              ? "Border"
              : "Brand";

    return { name, value, role };
  });
}

function cleanSpecimenText(raw: string): string {
  return raw
    .replace(/^\s*\*\*?|^\s*__?/, "")
    .replace(/\*\*?\s*$|__?\s*$/, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTypeSpecimenSamples(markdown: string): Record<string, string> {
  const samples: Record<string, string> = {};
  const specimenSection =
    markdown.match(/###\s+Type Specimens([\s\S]*?)(?=\n##\s+|$)/i)?.[1]
    ?? markdown.match(/##\s+Typography([\s\S]*?)(?=\n##\s+|$)/i)?.[1]
    ?? "";

  const linePatterns: RegExp[] = [
    /^[-*]?\s*\*?\*?(Display|Heading|Body|Interface|Code)\s+Specimen\*?\*?\s*:\s*(.+)$/i,
    /^[-*]?\s*\*?\*?(Display|Heading|Body|Interface|Code)\*?\*?\s*:\s*(.+)$/i,
  ];

  for (const line of specimenSection.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let match: RegExpMatchArray | null = null;
    for (const pattern of linePatterns) {
      match = trimmed.match(pattern);
      if (match) break;
    }
    if (!match) continue;

    const usage = /body/i.test(match[1])
      ? "Body"
      : /code/i.test(match[1])
        ? "Code"
        : /interface/i.test(match[1])
          ? "Interface"
          : /heading/i.test(match[1])
            ? "Heading"
            : "Display";

    const sample = cleanSpecimenText(match[2]);
    if (sample) samples[usage] = sample;
  }

  return samples;
}

function extractBrandTypography(markdown: string): BrandTypographyToken[] {
  const tokens: BrandTypographyToken[] = [];
  const seen = new Set<string>();
  const specimenSamples = extractTypeSpecimenSamples(markdown);

  const addToken = (usage: string, rawFont: string) => {
    const cleaned = rawFont
      .replace(/[`*_]/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/\b(fallback|stack|font|family|weight|size|line height)\b/gi, "")
      .split(/[.;|]/)[0]
      .split(",")[0]
      .trim();
    if (!cleaned || cleaned.length < 3 || cleaned.length > 42) return;
    if (/specimen|headline written|product-section|ui copy|sentence|not detected/i.test(cleaned)) return;

    const key = `${usage}:${cleaned}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tokens.push({
      name: cleaned,
      usage,
      fontFamily: cleaned,
      sample: specimenSamples[usage] ?? "",
    });
  };

  const detectedTokensSection =
    markdown.match(/##\s+Detected Tokens([\s\S]*?)(?=\n##\s+|$)/i)?.[1] ?? "";
  const typographySection =
    detectedTokensSection.match(/###\s+Typography([\s\S]*?)(?=\n###\s+|\n##\s+|$)/i)?.[1]
    ?? markdown.match(/##\s+Typography([\s\S]*?)(?=\n##\s+|$)/i)?.[1]
    ?? markdown;

  for (const line of typographySection.split("\n")) {
    const trimmed = line.trim();
    const labeled = trimmed.match(/^[-*]?\s*\*?\*?(Display|Headings?|Heading|H1|H2|Body|Caption|Interface|Code)(?:\s*(?:font|family|typeface))?\*?\*?\s*[:|-]\s*(.+)$/i);
    if (!labeled) continue;
    if (/specimen/i.test(labeled[1]) || /specimen/i.test(labeled[2])) continue;
    const usage = /body/i.test(labeled[1])
      ? "Body"
      : /code/i.test(labeled[1])
        ? "Code"
        : /caption|interface/i.test(labeled[1])
          ? "Interface"
          : /heading|h1|h2/i.test(labeled[1])
            ? "Heading"
            : "Display";
    addToken(usage, labeled[2]);
  }

  for (const line of typographySection.split("\n")) {
    if (!line.trim().startsWith("|")) continue;
    const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const [role, font] = cells;
    if (/^-+$/.test(role) || /^role$/i.test(role) || /^font$/i.test(font)) continue;
    if (/(display|h1|h2|h3|body|caption|code|interface)/i.test(role)) {
      addToken(
        /body/i.test(role)
          ? "Body"
          : /code/i.test(role)
            ? "Code"
            : /caption|interface/i.test(role)
              ? "Interface"
              : /h1|h2|h3|heading/i.test(role)
                ? "Heading"
                : "Display",
        font
      );
    }
  }

  return tokens.slice(0, 4);
}

function renderMarkdownPreview(markdown: string) {
  return markdown.split("\n").map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={index} className="h-3" />;
    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={index} className="mt-5 mb-2 text-sm font-black uppercase tracking-wide text-foreground">
          {trimmed.slice(4)}
        </h3>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={index} className="mt-6 mb-2 text-base font-black uppercase tracking-wide text-orange-300">
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h1 key={index} className="mb-3 text-lg font-black uppercase tracking-tight text-foreground">
          {trimmed.slice(2)}
        </h1>
      );
    }
    if (/^[-*]\s+/.test(trimmed)) {
      return (
        <p key={index} className="pl-3 text-sm leading-relaxed text-foreground/80">
          <span className="text-orange-400/70">•</span> {trimmed.replace(/^[-*]\s+/, "")}
        </p>
      );
    }
    return (
      <p key={index} className="text-sm leading-relaxed text-foreground/80">
        {trimmed}
      </p>
    );
  });
}

interface GeneratedBrandAnalysis {
  id: string | null;
  title: string;
  designMd: string;
  screenshotUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  projectUrl: string;
  projectName: string;
}

// ─── Loading steps ────────────────────────────────────────────────────────────

const ROAST_LOADING_STEPS = [
  { label: "Reading the page",             detail: "fetching content..."                 },
  { label: "Extracting context",           detail: "pulling metadata & copy..."          },
  { label: "Routing through the model",    detail: "sending to AI..."                    },
  { label: "Generating roast",             detail: "cooking the take..."                 },
  { label: "Finalizing output",            detail: "structuring paragraphs..."           },
];

const BRAND_LOADING_STEPS = [
  { label: "Reading the page",             detail: "fetching content..."                 },
  { label: "Extracting context",           detail: "pulling metadata, copy, visuals..."  },
  { label: "Routing through the model",    detail: "sending to AI..."                    },
  { label: "Generating analysis",          detail: "drafting the brand review..."        },
  { label: "Finalizing output",            detail: "formatting design.md..."             },
];

// ─── ASCII Fire Canvas (same as hero) ────────────────────────────────────────

const FIRE_CHARS = [" ", ".", ":", "^", "*", "x", "X", "$", "#", "M"];
const FIRE_COLORS = [
  "transparent","#1a0000","#3d0000","#7a1000","#b02000",
  "#d44000","#e86010","#f09030","#f8c050","#fff8a0",
];
const CELL_PX = 7;

function AsciiFireCanvas({ className, style }: { className?: string; style?: React.CSSProperties }) {
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
      const COLS = Math.ceil(W / CELL_PX), ROWS = Math.ceil(H / CELL_PX);
      if (!(tick as any).grid || (tick as any).cols !== COLS || (tick as any).rows !== ROWS) {
        (tick as any).grid = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
        (tick as any).cols = COLS; (tick as any).rows = ROWS;
      }
      const grid: Uint8Array[] = (tick as any).grid;
      for (let x = 0; x < COLS; x++) {
        grid[ROWS-1][x] = Math.random() < 0.92 ? Math.floor(Math.random()*2)+8 : Math.floor(Math.random()*2);
        if (ROWS>1) grid[ROWS-2][x] = Math.random() < 0.85 ? Math.floor(Math.random()*2)+7 : 0;
        if (ROWS>2) grid[ROWS-3][x] = Math.random() < 0.70 ? Math.floor(Math.random()*2)+6 : 0;
        if (ROWS>3) grid[ROWS-4][x] = Math.random() < 0.55 ? Math.floor(Math.random()*2)+5 : 0;
      }
      for (let y = 0; y < ROWS-4; y++) {
        for (let x = 0; x < COLS; x++) {
          const below=grid[y+1][x], left=grid[y+1][(x-1+COLS)%COLS], right=grid[y+1][(x+1)%COLS];
          grid[y][x] = Math.max(0, Math.round((below+left+right)/3 - Math.random()*0.45));
        }
      }
      ctx.clearRect(0,0,W,H);
      ctx.font = `bold ${CELL_PX}px monospace`;
      ctx.textBaseline = "top";
      for (let y=0; y<ROWS; y++) for (let x=0; x<COLS; x++) {
        const val = grid[y][x];
        if (!val) continue;
        ctx.fillStyle = FIRE_COLORS[Math.min(val, FIRE_COLORS.length-1)];
        ctx.fillText(FIRE_CHARS[Math.min(val, FIRE_CHARS.length-1)], x*CELL_PX, y*CELL_PX);
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);
  return <canvas ref={canvasRef} className={className} style={style} aria-hidden />;
}

// ─── Loading screen ───────────────────────────────────────────────────────────

type LoadingTheme = {
  ringStroke: string;      // $ prompt + cursor color
  chipText: string;        // command name + progress label color
  progressFrom: string;
  progressTo: string;
  progressGlow: string;
};

const ROAST_THEME: LoadingTheme = {
  ringStroke: "#f97316",
  chipText: "#fdba74",
  progressFrom: "#dc2626",
  progressTo: "#fb923c",
  progressGlow: "rgba(249,115,22,0.7)",
};

const BRAND_THEME: LoadingTheme = {
  ringStroke: "#22d3ee",
  chipText: "#67e8f9",
  progressFrom: "#0891b2",
  progressTo: "#67e8f9",
  progressGlow: "rgba(34,211,238,0.7)",
};

function LoadingScreen({ url, tool }: { url: string; tool: ToolMode }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const steps = tool === "brand" ? BRAND_LOADING_STEPS : ROAST_LOADING_STEPS;
  const theme = tool === "brand" ? BRAND_THEME : ROAST_THEME;
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    const iv = setInterval(() => setStepIdx(i => Math.min(i + 1, steps.length - 1)), 6000);
    return () => clearInterval(iv);
  }, [steps.length]);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, []);

  const elapsedMs = now - startTime.current;
  const elapsed = `${(elapsedMs / 1000).toFixed(1)}s`;
  const progress = ((stepIdx + 1) / steps.length) * 100;
  const stepElapsed = (i: number) => {
    if (i < stepIdx) {
      // completed step — give a believable fake duration
      const seed = (i * 137) % 1000;
      return `${(0.3 + (seed / 1000) * 1.2).toFixed(2)}s`;
    }
    if (i === stepIdx) {
      // current step — use live elapsed since start of this step
      const since = elapsedMs - i * 6000;
      return `${Math.max(0, since / 1000).toFixed(1)}s`;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden font-mono">

      {/* Full-screen ASCII fire behind everything — kept */}
      <AsciiFireCanvas className="absolute inset-0 pointer-events-none z-[1]" style={{ width: "100%", height: "100%" }} />

      {/* Scrim */}
      <div className="absolute inset-0 z-[2] pointer-events-none bg-background/70" />

      {/* Dot grid */}
      <div className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />

      {/* Corner marks */}
      <span className="absolute top-5 left-5 z-[3] text-orange-500/40 text-xl leading-none select-none pointer-events-none">+</span>
      <span className="absolute top-5 right-5 z-[3] text-orange-500/40 text-xl leading-none select-none pointer-events-none">+</span>

      {/* Centered CLI card */}
      <div className="relative z-[3] flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[600px]">

          <div
            className="border border-border/50 bg-background/70 backdrop-blur-sm overflow-hidden"
            style={{ boxShadow: "0 0 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)" }}
          >
            {/* Title bar — minimal terminal chrome */}
            <div className="flex items-center justify-between px-3 py-2 bg-background/60 border-b border-border/40">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40">
                {tool === "brand" ? "lokal brand" : "loki roast"} — pipeline
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground/30 font-mono w-14 text-right">
                t+{elapsed}
              </span>
            </div>

            {/* Body — terminal log */}
            <div className="bg-card/30 px-5 py-5 font-mono text-[12px] leading-relaxed min-h-[280px]">

              {/* Boot line */}
              <p className="text-muted-foreground/35">
                <span className="text-muted-foreground/25">▶</span> booting pipeline…
                <span className="text-green-500/70 ml-1">ready</span>
              </p>

              {/* Command prompt */}
              <p className="mt-2 truncate">
                <span style={{ color: theme.ringStroke }}>$</span>{" "}
                <span style={{ color: theme.chipText }}>{tool === "brand" ? "lokal brand" : "loki roast"}</span>{" "}
                <span className="text-foreground/30">--url</span>{" "}
                <span className="text-foreground/55">{url}</span>
              </p>

              {/* Spacer */}
              <div className="h-2" />

              {/* Step log lines */}
              <div className="space-y-1">
                {steps.map((step, i) => {
                  const done   = i < stepIdx;
                  const active = i === stepIdx;
                  const tag    = stepElapsed(i);
                  return (
                    <div key={i} className="flex items-start gap-2.5 min-w-0">
                      {/* Status tag */}
                      <span
                        className={`shrink-0 font-black text-[11px] ${
                          done   ? "text-green-500/80"
                          : active ? "text-foreground/40"
                          :          "text-foreground/15"
                        }`}
                      >
                        {done ? "[ok]" : active ? "[..]" : "[  ]"}
                      </span>

                      {/* Message */}
                      <span
                        className={`flex-1 min-w-0 truncate ${
                          done   ? "text-foreground/35"
                          : active ? "text-foreground/90"
                          :          "text-foreground/20"
                        }`}
                      >
                        <span className="lowercase">{step.label}</span>
                        {active && (
                          <>
                            <span className="text-foreground/30">{" — "}</span>
                            <span className="text-foreground/45 lowercase">{step.detail}</span>
                          </>
                        )}
                      </span>

                      {/* Timing */}
                      <span
                        className={`shrink-0 text-[10px] tabular-nums ${
                          done   ? "text-muted-foreground/40"
                          : active ? "text-foreground/45"
                          :          "text-foreground/15"
                        }`}
                      >
                        {done ? tag : active ? `${tag} …` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Live prompt line — blinking cursor */}
              <p className="mt-2 flex items-center gap-1">
                <span style={{ color: theme.ringStroke }} className="font-black">$</span>
                <span
                  className="inline-block w-2 h-3.5 align-middle anim-pulse"
                  style={{ background: theme.ringStroke, boxShadow: `0 0 6px ${theme.ringStroke}` }}
                />
              </p>

              {/* Spacer */}
              <div className="h-3" />

              {/* Divider */}
              <div className="h-px bg-border/40" />

              {/* Progress bar */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground/40">
                  <span>progress</span>
                  <span style={{ color: theme.chipText }} className="tabular-nums">
                    [{Math.round(progress).toString().padStart(3, " ")}%]
                  </span>
                </div>
                <div
                  className="relative h-px overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.07)" }}
                >
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-[1200ms]"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${theme.progressFrom}, ${theme.progressTo})`,
                      boxShadow: `0 0 8px ${theme.progressGlow}`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/35">
                  <span style={{ color: theme.chipText }} className="anim-flicker">●</span>{" "}
                  {tool === "brand" ? "analyzing the brand — up to 60s" : "cooking your roast — up to 60s"}
                </p>
              </div>
            </div>

            {/* Bottom edge glow */}
            <div className="h-px bg-gradient-to-r from-transparent via-orange-500/15 to-transparent" />
          </div>

          {/* Hint under the card */}
          <p className="mt-3 text-center text-[10px] text-muted-foreground/30 uppercase tracking-[0.2em]">
            keep this tab open — output is being prepared
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Auth modal — CMD glassmorphism ─────────────────────────────────────────

function AuthModal({
  onClose,
  from,
}: {
  onClose: () => void;
  from: ReturnType<typeof useLocation>;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        background: "rgba(0,0,0,0.72)",
      }}
      onClick={onClose}
    >
      {/* Noise texture overlay on backdrop */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
          opacity: 0.6,
        }}
      />

      <div
        className="relative w-full max-w-md font-mono overflow-hidden"
        style={{
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(15,15,18,0.82)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 32px 64px rgba(0,0,0,0.6), 0 0 80px rgba(249,115,22,0.06)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Noise texture on card */}
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Glow top edge */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />

        {/* CMD title bar */}
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
        >
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
          </div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            lokal-auth — publish-roast
          </span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-5 h-5 rounded transition-colors"
            style={{ color: "rgba(255,255,255,0.3)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* CMD body */}
        <div className="px-6 py-6 space-y-5">
          {/* Prompt lines */}
          <div className="space-y-1 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            <p>
              <span style={{ color: "#22c55e" }}>user</span>
              <span style={{ color: "rgba(255,255,255,0.25)" }}>@</span>
              <span style={{ color: "rgba(255,255,255,0.5)" }}>lokalhost</span>
              <span style={{ color: "rgba(255,255,255,0.25)" }}> ~$</span>
              <span style={{ color: "rgba(255,255,255,0.7)" }}> publish-roast --target feed</span>
            </p>
            <p style={{ color: "#ef4444" }}>✗ Error: authentication required</p>
            <p style={{ color: "rgba(255,255,255,0.3)" }}>→ sign in to continue</p>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />

          {/* Headline */}
          <div>
            <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
              Authentication required
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
              Your roast is ready 🔥 Sign in or create a free account to publish it to the Lokal community.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="space-y-2">
            <Link to="/login" state={{ from }} className="block">
              <button
                className="w-full flex items-center gap-2.5 px-4 h-10 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, #f97316, #ec4899)",
                  color: "#fff",
                  border: "none",
                  boxShadow: "0 0 20px rgba(249,115,22,0.25)",
                }}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>$ sign-in --session new</span>
              </button>
            </Link>
            <Link to="/signup" state={{ from }} className="block">
              <button
                className="w-full flex items-center gap-2.5 px-4 h-10 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.09)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.85)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>$ create-account --free</span>
              </button>
            </Link>
          </div>

          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
            # sign in required to generate and publish
          </p>
        </div>

        {/* Bottom glow edge */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-pink-500/30 to-transparent" />
      </div>
    </div>
  );
}

// ─── Typewriter hook ──────────────────────────────────────────────────────────

function useTypewriter(text: string, chunkSize = 8) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone]           = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    setDisplayed(""); setDone(false); idxRef.current = 0;
    if (!text) return;
    const tick = () => {
      if (idxRef.current >= text.length) { setDone(true); return; }
      idxRef.current += Math.min(chunkSize, text.length - idxRef.current);
      setDisplayed(text.slice(0, idxRef.current));
      requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, chunkSize]);

  return { displayed, done };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function RoastResult() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { generationId, analysisId } = useParams();
  const { user }  = useAuth();
  const websiteDetailsRef = useRef<HTMLDivElement>(null);

  const [copied,              setCopied]            = useState(false);
  const [published,           setPublished]         = useState(false);
  const [publishLoading,      setPublishLoading]    = useState(false);
  const [publishError,        setPublishError]      = useState<string | null>(null);
  const [showAuthModal,       setShowAuthModal]     = useState(false);
  const [roast,               setRoast]             = useState<GeneratedRoast | null>(() => {
    const incoming = location.state as IncomingState | null;
    return loadRoastFromSession(incoming?.projectUrl);
  });
  const [brandAnalysis,       setBrandAnalysis]     = useState<GeneratedBrandAnalysis | null>(null);
  const [activeTool,          setActiveTool]        = useState<ToolMode>(() => (location.state as IncomingState | null)?.tool ?? "roast");
  const [mutationError,       setMutationError]     = useState<string | null>(null);
  const [dismissedAddProject, setDismissedAddProject] = useState(false);
  const [websiteDetailsHeight, setWebsiteDetailsHeight] = useState<number | null>(null);
  const [isDesktopLayout,     setIsDesktopLayout]   = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const incomingForRef = (location.state as IncomingState | null);
  const firedRef  = useRef(loadRoastFromSession(incomingForRef?.projectUrl) !== null);

  const incoming = location.state as IncomingState | null;

  const { data: savedGenerationData, loading: savedGenerationLoading } = useQuery<{
    roastGeneration: (GeneratedRoast & { id: string }) | null;
  }>(GET_ROAST_GENERATION, {
    variables: { id: generationId ?? "" },
    skip: !generationId,
    fetchPolicy: "cache-and-network",
  });

  const { data: savedBrandData, loading: savedBrandLoading } = useQuery<{
    brandAnalysis: GeneratedBrandAnalysis | null;
  }>(GET_BRAND_ANALYSIS, {
    variables: { id: analysisId ?? "" },
    skip: !analysisId,
    fetchPolicy: "cache-and-network",
  });

  const [submitRoast] = useMutation<
    { submitRoast: { id: string } },
    { input: { generationId?: string | null; projectUrl: string; projectName: string; projectId?: string; title?: string; quickRoast?: string; fullRoast?: string; screenshotUrl?: string | null } }
  >(SUBMIT_ROAST);

  const [generateRoast, { loading }] = useMutation<
    { generateRoast: GeneratedRoast },
    { input: { projectUrl: string; projectName: string } }
  >(GENERATE_ROAST);

  const [generateBrandAnalysis, { loading: brandLoading }] = useMutation<
    { generateBrandAnalysis: GeneratedBrandAnalysis },
    { input: { projectUrl: string; projectName: string } }
  >(GENERATE_BRAND_ANALYSIS);

  // Redirect if no URL and no cached roast
  useEffect(() => {
    if (!generationId && !analysisId && !incoming?.projectUrl && !loadRoastFromSession(incoming?.projectUrl)) navigate("/roast", { replace: true });
  }, [generationId, analysisId, incoming, navigate]);

  useEffect(() => {
    const saved = savedGenerationData?.roastGeneration;
    if (!saved) return;
    setActiveTool("roast");
    setRoast({
      generationId: saved.id,
      title: saved.title,
      quickRoast: saved.quickRoast,
      fullRoast: saved.fullRoast,
      language: saved.language ?? "taglish",
      screenshotUrl: saved.screenshotUrl,
      faviconUrl: saved.faviconUrl,
      ogImageUrl: saved.ogImageUrl,
      projectUrl: saved.projectUrl,
      projectName: saved.projectName,
    });
  }, [savedGenerationData]);

  useEffect(() => {
    const saved = savedBrandData?.brandAnalysis;
    if (!saved) return;
    setActiveTool("brand");
    setBrandAnalysis(saved);
  }, [savedBrandData]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktopLayout(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const panel = websiteDetailsRef.current;
    if (!panel || activeTool !== "brand") {
      setWebsiteDetailsHeight(null);
      return;
    }

    const updateHeight = () => setWebsiteDetailsHeight(Math.ceil(panel.getBoundingClientRect().height));
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [activeTool, brandAnalysis]);

  const runMutation = (rawUrl: string) => {
    // Normalize: auto-prepend https:// if protocol is missing (common on mobile / share-sheet)
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    let name: string;
    try { name = new URL(url).hostname.replace(/^www\./, "").split(".")[0]; }
    catch { name = url; }
    setMutationError(null);
    const tool = incoming?.tool ?? "roast";
    setActiveTool(tool);

    if (tool === "brand") {
      generateBrandAnalysis({ variables: { input: { projectUrl: url, projectName: name } } })
        .then(({ data }) => {
          if (data?.generateBrandAnalysis) {
            setBrandAnalysis(data.generateBrandAnalysis);
            if (data.generateBrandAnalysis.id) {
              navigate(`/roast/brand/${data.generateBrandAnalysis.id}`, { replace: true });
            }
          }
        })
        .catch((err) => {
          const msg: string = err?.message ?? "";
          const msgLower = msg.toLowerCase();
          const code: string = err?.graphQLErrors?.[0]?.extensions?.code ?? "";
          if (code === "INSUFFICIENT_CREDITS" || msgLower.includes("not enough credits")) {
            setMutationError("NO_CREDITS");
          } else if (msgLower.includes("unauthorized")) {
            setMutationError("AUTH_REQUIRED");
          } else {
            setMutationError(msg || "Something went wrong. Please try again.");
          }
        });
      return;
    }

    generateRoast({
      variables: {
        input: {
          projectUrl: url,
          projectName: name,
          language: incoming?.language ?? "taglish",
        },
      },
    })
      .then(({ data }) => {
        if (data?.generateRoast) {
          setRoast(data.generateRoast);
          saveRoastToSession(data.generateRoast);
        }
      })
      .catch((err) => {
        const msg: string = err?.message ?? "";
        const msgLower = msg.toLowerCase();
        // Apollo passes through GraphQLError extensions from the backend.
        const code: string = err?.graphQLErrors?.[0]?.extensions?.code ?? "";
        const isNetworkErr =
          msgLower.includes("failed to fetch") ||
          msgLower.includes("load failed") ||
          msgLower.includes("networkerror") ||
          msgLower.includes("network request failed") ||
          err?.networkError != null;
        const isCreditErr =
          code === "INSUFFICIENT_CREDITS" ||
          msgLower.includes("not enough credits");
        const isAuthErr =
          code === "UNAUTHENTICATED" ||
          msgLower.includes("unauthorized");
        if (isNetworkErr) {
          setMutationError("NETWORK");
        } else if (isCreditErr) {
          setMutationError("NO_CREDITS");
        } else if (isAuthErr) {
          setMutationError("AUTH_REQUIRED");
        } else {
          setMutationError(msg || "Something went wrong. Please try again.");
        }
      });
  };

  // Fire once on mount
  useEffect(() => {
    if (!incoming?.projectUrl || firedRef.current) return;
    if (generationId || analysisId) return;
    // Invalidate any stale session cache that doesn't match the current
    // analysis target so future visits don't pick up the old roast.
    if (!loadRoastFromSession(incoming.projectUrl)) clearRoastSession();
    // Clear stale brand analysis from a previous run before starting fresh.
    setBrandAnalysis(null);
    firedRef.current = true;
    runMutation(incoming.projectUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming, generationId, analysisId]);

  // Auto-publish after returning from login
  useEffect(() => {
    if (!user || !roast) return;
    const pending = sessionStorage.getItem(ROAST_PUBLISH_KEY);
    if (pending === "1") {
      sessionStorage.removeItem(ROAST_PUBLISH_KEY);
      handlePublish();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roast]);

  const subject = roast ?? brandAnalysis;
  const outputText = activeTool === "brand"
    ? brandAnalysis?.designMd ?? ""
    : roast?.fullRoast ?? "";
  const { displayed, done } = useTypewriter(outputText);
  const brandMarkdown = brandAnalysis?.designMd ?? "";
  const brandColors = useMemo(() => extractBrandColors(brandMarkdown), [brandMarkdown]);
  const brandColorGroups = useMemo(() => {
    const groups: Record<string, BrandColorToken[]> = {};
    for (const color of brandColors) {
      const key = color.role === "Brand" ? "Primary" : color.role;
      groups[key] = [...(groups[key] ?? []), color];
    }
    return groups;
  }, [brandColors]);
  const brandTypography = useMemo(() => extractBrandTypography(brandMarkdown), [brandMarkdown]);
  const brandTokenJson = useMemo(() => JSON.stringify({
    projectName: subject?.projectName ?? "",
    projectUrl: subject?.projectUrl ?? "",
    generatedFrom: "design.md",
    colors: brandColors,
    typography: brandTypography,
  }, null, 2), [subject?.projectName, subject?.projectUrl, brandColors, brandTypography]);

  useEffect(() => {
    if (activeTool !== "brand") return;
    const loadedLinks: HTMLLinkElement[] = [];
    const fontNames = Array.from(new Set(
      brandTypography
        .map((font) => font.fontFamily.split(",")[0]?.replace(/['"]/g, "").trim())
        .filter((fontName): fontName is string => Boolean(fontName && fontName.length > 2))
    ));

    for (const fontName of fontNames) {
      if (/^(system-ui|sans-serif|serif|monospace|arial|helvetica)$/i.test(fontName)) continue;
      const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName).replace(/%20/g, "+")}:wght@400;500;600;700;800;900&display=swap`;
      if (document.querySelector(`link[data-brand-font="${fontName}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.brandFont = fontName;
      document.head.appendChild(link);
      loadedLinks.push(link);
    }

    return () => {
      for (const link of loadedLinks) link.remove();
    };
  }, [activeTool, brandTypography]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [displayed]);

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePublish = async () => {
    if (!roast) return;
    if (!user) {
      saveRoastToSession(roast);
      sessionStorage.setItem(ROAST_PUBLISH_KEY, "1");
      setShowAuthModal(true);
      return;
    }
    setPublishLoading(true);
    setPublishError(null);
    try {
      // submitRoast saves to the Roast table, notifies the project owner,
      // awards XP, and creates a feed post as a side effect on the backend.
      // projectId is not available at this point (user pasted a URL, not
      // picked from their own projects), so it's omitted — the backend will
      // still save the roast content and publish it to the feed.
      await submitRoast({
        variables: {
          input: {
            generationId: roast.generationId,
            projectUrl: roast.projectUrl,
            projectName: roast.projectName,
            title: roast.title,
            quickRoast: roast.quickRoast,
            fullRoast: roast.fullRoast,
            screenshotUrl: roast.screenshotUrl ?? undefined,
          },
        },
      });
      clearRoastSession();
      setPublished(true);
      setTimeout(() => navigate("/"), 1800);
    } catch (err: any) {
      setPublishError(err?.message ?? "Failed to publish. Try again.");
    } finally {
      setPublishLoading(false);
    }
  };

  const goBack = () => { clearRoastSession(); navigate("/roast"); };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading || brandLoading || savedGenerationLoading || savedBrandLoading || (!subject && !mutationError)) {
    return <LoadingScreen url={incoming?.projectUrl ?? ""} tool={incoming?.tool ?? activeTool} />;
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (mutationError) {
    const isNoCredits = mutationError === "NO_CREDITS";
    const isAuthRequired = mutationError === "AUTH_REQUIRED";
    const isNetwork = mutationError === "NETWORK";
    const isRecoverable = isNoCredits || isAuthRequired;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 font-mono">
        <div className="w-full max-w-sm border border-border/50 overflow-hidden"
          style={{ boxShadow: "0 0 32px rgba(220,38,38,0.08)" }}>
          {/* Red top bar */}
          <div className="h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
          {/* Title bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-background/70 border-b border-border/40">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
            </div>
            <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">LOKI.EXE — ERROR</span>
            <div className="w-14" />
          </div>
          <div className="bg-card/40 px-5 py-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 border ${isRecoverable ? "border-orange-500/30 bg-orange-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                <AlertTriangle className={`w-4 h-4 ${isRecoverable ? "text-orange-500" : "text-red-500"}`} />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-wide">
                  {isNoCredits ? "NO CREDITS AVAILABLE" : isAuthRequired ? "SIGN IN REQUIRED" : isNetwork ? "CONNECTION ERROR" : "REQUEST FAILED"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed normal-case">
                  {isNoCredits
                    ? "This roast needs 1 credit. Add or grant credits before trying again."
                    : isAuthRequired
                    ? "Sign in so Lokal can use your credit balance for this roast."
                    : isNetwork
                    ? "Couldn't reach the server — check your connection and try again."
                    : mutationError}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {isAuthRequired ? (
                <>
                  <Link to="/login" state={{ from: location }} className="flex-1">
                    <button className="w-full flex items-center justify-center gap-2 h-9 text-xs font-black uppercase tracking-widest text-white"
                      style={{ background: "linear-gradient(135deg,#ea580c,#dc2626)" }}>
                      <LogIn className="w-3.5 h-3.5" /> SIGN IN
                    </button>
                  </Link>
                  <button onClick={goBack}
                    className="flex-1 flex items-center justify-center gap-2 h-9 border border-border/50 text-xs font-black uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> BACK
                  </button>
                </>
              ) : (
                <>
                  {!isNoCredits && (
                    <button
                      className="flex-1 flex items-center justify-center gap-2 h-9 text-xs font-black uppercase tracking-widest text-white"
                      style={{ background: "linear-gradient(135deg,#ea580c,#dc2626)" }}
                      onClick={() => { firedRef.current = false; setMutationError(null); runMutation(incoming!.projectUrl); }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> RETRY
                    </button>
                  )}
                  <button onClick={goBack}
                    className="flex-1 flex items-center justify-center gap-2 h-9 border border-border/50 text-xs font-black uppercase tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" /> BACK
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!subject) return null;

  const domain = (() => {
    try { return new URL(subject.projectUrl).hostname; }
    catch { return subject.projectUrl; }
  })();
  const ogBannerImageUrl = subject.ogImageUrl ?? subject.screenshotUrl ?? null;
  const brandScreenshotUrl = activeTool === "brand" ? subject.screenshotUrl : null;
  const brandPanelHeight = activeTool === "brand" && isDesktopLayout && websiteDetailsHeight
    ? websiteDetailsHeight
    : undefined;

  // ── Result ────────────────────────────────────────────────────────────────
  return (
    <>
      {showAuthModal && <AuthModal from={location} onClose={() => setShowAuthModal(false)} />}

      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">

        {/* Full-screen ASCII fire — same as loading screen */}
        <AsciiFireCanvas className="fixed inset-0 pointer-events-none z-[1]" style={{ width: "100%", height: "100%" }} />

        {/* Scrim — keeps text readable */}
        <div className="fixed inset-0 z-[2] pointer-events-none bg-background/80" />

        {/* Dot grid */}
        <div className="fixed inset-0 z-[2] pointer-events-none opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }} />

        {/* Corner marks */}
        <span className="fixed top-16 left-5 z-[3] text-orange-500/30 text-xl leading-none select-none pointer-events-none">+</span>
        <span className="fixed top-16 right-5 z-[3] text-orange-500/30 text-xl leading-none select-none pointer-events-none">+</span>
        <span className="fixed bottom-5 left-5 z-[3] text-orange-500/20 text-xl leading-none select-none pointer-events-none">+</span>
        <span className="fixed bottom-5 right-5 z-[3] text-orange-500/20 text-xl leading-none select-none pointer-events-none">+</span>

        {/* ── Top bar ── */}
        <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 h-12 border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0">
          {/* Glow line */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />

          <button onClick={goBack}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/60 hover:text-orange-400 transition-colors uppercase tracking-widest">
            <ArrowLeft className="w-3 h-3" />
            BACK
          </button>

          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40">
            LOKI.EXE — RESULT
          </span>

          <div className="flex items-center gap-2">
            {done && (
              <button onClick={goBack}
                className="flex items-center gap-1.5 text-xs font-mono font-black uppercase tracking-widest text-white px-3 h-7 transition-opacity hover:opacity-90"
                style={{
                  background: activeTool === "brand"
                    ? "linear-gradient(135deg,#0891b2,#0e7490)"
                    : "linear-gradient(135deg,#ea580c,#dc2626)",
                  boxShadow: activeTool === "brand"
                    ? "0 0 14px rgba(8,145,178,0.35)"
                    : "0 0 14px rgba(234,88,12,0.35)",
                }}
                title={activeTool === "brand" ? "Analyze another website" : "Roast another website"}
              >
                <RotateCcw className="w-3 h-3" />
                {activeTool === "brand" ? "ANALYZE ANOTHER" : "ROAST ANOTHER"}
              </button>
            )}
          </div>
        </header>

        {/* ── Main ── */}
        <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-4 font-mono">
          <div className="grid lg:grid-cols-[minmax(280px,380px)_1fr] gap-4 items-stretch">

          {/* ── Project header ── */}
          <div className="border border-border/50 bg-card/60 overflow-hidden lg:sticky lg:top-28"
            style={{ boxShadow: "0 0 24px rgba(234,88,12,0.06)" }}>

            <div ref={websiteDetailsRef}>
              {/* OG image banner */}
              {ogBannerImageUrl && (
                <div className="relative w-full h-36 sm:h-44 overflow-hidden bg-card/40">
                  <img
                    src={ogBannerImageUrl}
                    alt={`${subject.projectName} preview`}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                  {/* Gradient fade to card bg */}
                  <div className="absolute inset-0"
                    style={{ background: "linear-gradient(to bottom, transparent 50%, hsl(var(--card)/0.95) 100%)" }} />
                  {/* Scan-line texture overlay */}
                  <div className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                      backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
                    }} />
                </div>
              )}

            {/* Card body */}
            <div className="px-5 py-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 flex items-center justify-center flex-shrink-0 bg-card border border-border/50 overflow-hidden"
                  style={{ boxShadow: "0 0 12px rgba(234,88,12,0.12)" }}>
                  <img
                    src={subject.faviconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                    alt=""
                    className="w-7 h-7 object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <h1 className="text-base font-black uppercase tracking-tight text-foreground truncate">
                      {subject.projectName}
                    </h1>
                    {activeTool === "roast" && roast?.language && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border font-mono font-bold uppercase tracking-wider text-[9px] flex-shrink-0 ${
                          roast.language === "english"
                            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                            : "border-orange-500/30 bg-orange-500/10 text-orange-300"
                        }`}
                        title={`Roasted in ${roast.language === "english" ? "English" : "Taglish"}`}
                      >
                        {roast.language === "english" ? "🇬🇧 EN" : "🇵🇭 TL"}
                      </span>
                    )}
                  </div>
                  <a href={subject.projectUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-orange-400/60 hover:text-orange-400 transition-colors mt-0.5">
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{domain}</span>
                  </a>
                  {activeTool === "roast" && roast?.quickRoast && (
                    <p className="text-xs text-muted-foreground/60 mt-2 italic leading-relaxed line-clamp-2 border-l-2 border-orange-500/30 pl-3">
                      {roast.quickRoast}
                    </p>
                  )}
                  {activeTool === "brand" && (
                    <p className="text-xs text-muted-foreground/60 mt-2 leading-relaxed border-l-2 border-cyan-500/30 pl-3">
                      Formal brand and product design analysis of the live page capture.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {activeTool === "brand" && brandScreenshotUrl && (
              <div className="border-t border-border/40 bg-background/30 px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/45 mb-2">
                  Site Screenshot
                </p>
                <div className="h-52 sm:h-64 overflow-hidden border border-border/40 bg-card/40">
                  <img
                    src={brandScreenshotUrl}
                    alt={`${subject.projectName} screenshot`}
                    className="h-full w-full object-cover object-top"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              </div>
            )}

            {activeTool === "brand" && (
              <div className="border-t border-cyan-500/15 bg-cyan-500/[0.03] px-5 py-4 space-y-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300/70 mb-3">
                    Color Palette
                  </p>
                  {brandColors.length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(brandColorGroups).map(([group, colors]) => (
                        <div key={group} className="space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/45">
                            {group}
                          </p>
                          <div className="grid grid-cols-5 gap-2">
                            {colors.map((color) => (
                              <div key={`${group}-${color.value}`} className="min-w-0">
                                <div
                                  className="h-8 w-8 border border-border/40 shadow-sm"
                                  style={{ backgroundColor: color.value }}
                                  title={`${color.name} ${color.value}`}
                                />
                                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-foreground/70 truncate">
                                  {color.name}
                                </p>
                                <p className="text-[10px] text-cyan-300/70 uppercase truncate">
                                  {color.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] leading-relaxed text-muted-foreground/45">
                      No color tokens were detected in this saved analysis. Regenerate the brand analysis to refresh the capture.
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300/70 mb-3">
                    Typography Specimen
                  </p>
                  {brandTypography.length > 0 ? (
                    <div className="space-y-2">
                      {brandTypography.map((font) => (
                      <div
                        key={`${font.usage}-${font.name}`}
                        className="border border-border/40 bg-background/35 px-3 py-3"
                        style={{ fontFamily: toCssFontFamily(font.fontFamily) || undefined }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/45">
                            {font.usage}
                          </span>
                          <span className="text-[10px] text-cyan-300/65 truncate">{font.name}</span>
                        </div>
                        <p
                          className={`leading-tight text-foreground ${
                            font.usage === "Display"
                              ? "text-lg"
                              : font.usage === "Heading"
                                ? "text-base"
                                : font.usage === "Code"
                                  ? "text-xs"
                                  : font.usage === "Interface"
                                    ? "text-xs"
                                    : "text-sm"
                          }`}
                          style={{
                            fontFamily: toCssFontFamily(font.fontFamily) || undefined,
                            fontWeight: font.usage === "Body" || font.usage === "Code" || font.usage === "Interface" ? 400 : 700,
                            letterSpacing: font.usage === "Display" ? "-0.01em" : "normal",
                          }}
                        >
                          {BROWN_FOX_SPECIMEN}
                        </p>
                      </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] leading-relaxed text-muted-foreground/45">
                      No typography tokens were detected in this saved analysis. Regenerate the brand analysis to refresh the capture.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTool === "roast" && done && !published && (
              <div className="border-t border-orange-500/15 bg-orange-500/[0.03] px-5 py-4 space-y-3">
                <p className="text-[11px] text-muted-foreground/60 font-mono uppercase tracking-widest">
                  🔥 Your roast is ready — share it with the community
                </p>
                {publishError && (
                  <p className="text-[10px] text-red-500/70 font-mono uppercase tracking-widest">⚠ {publishError}</p>
                )}
                <button
                  onClick={handlePublish}
                  disabled={publishLoading}
                  className="w-full flex items-center justify-center gap-2 h-10 text-[11px] font-black uppercase tracking-widest text-white transition-opacity disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#ea580c,#dc2626)", boxShadow: "0 0 16px rgba(234,88,12,0.35)" }}
                >
                  {publishLoading
                    ? <><Zap className="w-3.5 h-3.5 animate-pulse" />PUBLISHING...</>
                    : <><Share2 className="w-3.5 h-3.5" />PUBLISH &amp; SHARE</>}
                </button>
              </div>
            )}

            {activeTool === "roast" && done && published && (
              <div className="border-t border-green-500/20 bg-green-500/[0.04] px-5 py-3 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span className="text-[11px] font-black uppercase tracking-widest text-green-400 font-mono">PUBLISHED TO FEED!</span>
              </div>
            )}

            <div className="border-t border-border/30 bg-card/20 px-5 py-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 mt-0.5" strokeWidth={2} />
                  {activeTool === "brand" ? (
                    <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
                      <span className="font-bold text-muted-foreground/60">AI-generated brand analysis.</span>{" "}
                      Review before using as final design guidance.{" "}
                      <Link to="/terms#ai-content" className="text-orange-400/50 hover:text-orange-400 transition-colors hover:underline">
                        Terms - AI Disclaimer
                      </Link>
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
                      <span className="font-bold text-muted-foreground/60">AI-generated satire — not factual.</span>{" "}
                      For entertainment only.{" "}
                      <Link to="/terms#ai-content" className="text-orange-400/50 hover:text-orange-400 transition-colors hover:underline">
                        Terms · AI Disclaimer
                      </Link>
                    </p>
                  )}
                </div>
                <button
                  className="flex items-center gap-1 text-[10px] text-muted-foreground/30 hover:text-muted-foreground transition-colors flex-shrink-0 mt-0.5 uppercase tracking-widest"
                  onClick={() => {
                    window.location.href = `mailto:abuse@lokalhost.club?subject=${encodeURIComponent("Report AI Output")}&body=${encodeURIComponent(`Reporting output for: ${subject.projectUrl}\n\nReason: `)}`;
                  }}
                >
                  <Flag className="w-3 h-3" strokeWidth={2} />
                  Report
                </button>
              </div>
            </div>
            </div>

            <div className="border-t border-border/30 bg-card/20 px-5 py-4 space-y-4">

              {activeTool === "roast" && done && user && !dismissedAddProject && !published && roast && (
                <div className="border border-orange-500/20 bg-orange-500/[0.03] overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-orange-500/10 bg-orange-500/[0.04]">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-500/50" />
                      <div className="w-2 h-2 rounded-full bg-orange-500/30" />
                      <div className="w-2 h-2 rounded-full bg-orange-500/15" />
                    </div>
                    <span className="text-[10px] text-orange-400/50 uppercase tracking-widest">SUGGEST — ADD PROJECT</span>
                    <button onClick={() => setDismissedAddProject(true)}
                      className="text-muted-foreground/30 hover:text-muted-foreground transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground/70 uppercase tracking-wide">Add this to your projects?</p>
                      <p className="text-[10px] text-muted-foreground/40 mt-0.5 break-all">
                        $ add-project --url <span className="text-orange-400/60">{roast.projectUrl}</span>
                      </p>
                    </div>
                    <button
                      className="w-full flex items-center justify-center gap-1.5 h-8 text-xs font-bold text-white uppercase tracking-widest transition-opacity hover:opacity-90"
                      style={{ background: "linear-gradient(135deg,#ea580c,#dc2626)", boxShadow: "0 0 16px rgba(234,88,12,0.3)" }}
                      onClick={() => navigate("/projects", {
                        state: { prefillProjectUrl: roast.projectUrl, prefillProjectName: roast.projectName },
                      })}
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      ADD
                    </button>
                  </div>
                </div>
              )}

              {done && activeTool === "roast" && !user && (
                <p className="text-center text-[11px] text-muted-foreground/40 uppercase tracking-widest">
                  <span className="text-orange-400">→</span>{" "}
                  <button className="text-orange-400 hover:underline" onClick={() => setShowAuthModal(true)}>
                    SIGN IN
                  </button>{" "}
                  TO PUBLISH TO THE LOKAL FEED
                </p>
              )}
            </div>
          </div>

          {/* Terminal output */}
          {activeTool === "brand" ? (
            <div
              className="border border-border/50 overflow-hidden flex flex-col"
              style={{
                boxShadow: "0 0 32px rgba(6,182,212,0.08)",
                height: brandPanelHeight,
              }}
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-background/70 border-b border-border/40">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
                </div>
                <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                  BRAND ANALYSIS — {domain}
                </span>
                <button onClick={handleCopy}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-cyan-300 transition-colors uppercase tracking-widest">
                  {copied
                    ? <><Check className="w-3 h-3 text-green-500" /><span className="text-green-500">OK</span></>
                    : <><Copy className="w-3 h-3" />COPY</>}
                </button>
              </div>

              <Tabs defaultValue="preview" className="bg-card/40 flex flex-1 min-h-0 flex-col">
                <div className="border-b border-border/30 px-4 py-3">
                  <TabsList className="grid w-full grid-cols-3 bg-background/60 border border-border/40">
                    <TabsTrigger value="preview" className="text-[10px] uppercase tracking-widest">Preview</TabsTrigger>
                    <TabsTrigger value="markdown" className="text-[10px] uppercase tracking-widest">MD Format</TabsTrigger>
                    <TabsTrigger value="tokens" className="text-[10px] uppercase tracking-widest">JSON Tokens</TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="preview" className="m-0 flex-1 min-h-0 px-5 py-5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="mb-4 flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px] text-muted-foreground/40">
                    <span className="text-green-500/70 font-bold">user</span>
                    <span className="opacity-30">@</span>
                    <span className="text-cyan-300/70 font-bold">lokalhost</span>
                    <span className="opacity-30">~$</span>
                    <span className="break-all text-foreground/30">
                      lokal brand --preview --url <span className="text-cyan-300/60">{subject.projectUrl}</span>
                    </span>
                  </div>
                  <div className="space-y-1">
                    {renderMarkdownPreview(brandMarkdown || displayed)}
                    {!done && (
                      <span className="inline-block w-2 h-[1em] bg-cyan-400 ml-0.5 animate-pulse align-middle" />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="markdown" className="m-0 flex-1 min-h-0 px-5 py-5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/85">
                    {brandMarkdown || displayed}
                  </pre>
                </TabsContent>

                <TabsContent value="tokens" className="m-0 flex-1 min-h-0 px-5 py-5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-cyan-100/85">
                    {brandTokenJson}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
          <div className="border border-border/50 overflow-hidden"
            style={{ boxShadow: "0 0 32px rgba(234,88,12,0.08)" }}>
            <div className="flex items-center justify-between px-4 py-2.5 bg-background/70 border-b border-border/40">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
              </div>
              <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                {activeTool === "brand" ? "DESIGN.MD" : "ROAST OUTPUT"} — {domain}
              </span>
              <button onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-orange-400 transition-colors uppercase tracking-widest">
                {copied
                  ? <><Check className="w-3 h-3 text-green-500" /><span className="text-green-500">OK</span></>
                  : <><Copy className="w-3 h-3" />COPY</>}
              </button>
            </div>

            <div className="bg-card/40 px-5 py-5 min-h-[240px]">
              <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mb-4 text-[11px] text-muted-foreground/40">
                <span className="text-green-500/70 font-bold">user</span>
                <span className="opacity-30">@</span>
                <span className="text-orange-400/60 font-bold">lokalhost</span>
                <span className="opacity-30">~$</span>
                <span className="break-all text-foreground/30">
                  {activeTool === "brand" ? "lokal brand --design-md --url" : "loki roast --url"} <span className="text-orange-400/50">{subject.projectUrl}</span>
                </span>
              </div>

              <div className="mb-4 space-y-0.5 text-[11px] border-b border-border/30 pb-3">
                {(activeTool === "brand"
                  ? ["Reading the page", "Extracting brand signals", "Generating the analysis"]
                  : ["Reading the page", "Routing through the model", "Generating the output"]
                ).map(line => (
                  <p key={line} className="text-muted-foreground/30">
                    <span className="text-orange-500/50">▶</span> {line}{" "}
                    <span className="text-green-500/50">✓</span>
                  </p>
                ))}
              </div>

              <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {displayed}
                {!done && (
                  <span className="inline-block w-2 h-[1em] bg-orange-500 ml-0.5 animate-pulse align-middle" />
                )}
              </div>

              {done && (
                <div className="mt-6 pt-3 border-t border-border/30">
                  <p className="text-[11px] text-muted-foreground/30 uppercase tracking-widest">
                    <span className="text-green-500/60">✓</span> PROCESS EXITED CODE{" "}
                    <span className="text-red-500/70 font-black">1</span> — {activeTool === "brand" ? "DESIGN.MD COMPLETE" : "ROAST COMPLETE"}
                  </p>
                  <div className="h-px mt-2"
                    style={{ background: "linear-gradient(90deg, rgba(234,88,12,0.4), rgba(220,38,38,0.2), transparent)" }} />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>
          )}
          </div>
        </main>
      </div>
    </>
  );
}
