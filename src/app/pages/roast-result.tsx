import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { gql } from "@apollo/client/core";
import { useMutation } from "@apollo/client/react";
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

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GENERATE_ROAST = gql`
  mutation GenerateRoast($input: GenerateRoastInput!) {
    generateRoast(input: $input) {
      title
      quickRoast
      fullRoast
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
  sessionStorage.setItem(ROAST_CACHE_KEY, JSON.stringify(roast));
}
function loadRoastFromSession(): GeneratedRoast | null {
  try {
    const raw = sessionStorage.getItem(ROAST_CACHE_KEY);
    return raw ? (JSON.parse(raw) as GeneratedRoast) : null;
  } catch { return null; }
}
function clearRoastSession() {
  sessionStorage.removeItem(ROAST_CACHE_KEY);
  sessionStorage.removeItem(ROAST_PUBLISH_KEY);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncomingState { projectUrl: string; }

interface GeneratedRoast {
  title: string;
  quickRoast: string;
  fullRoast: string;
  screenshotUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  projectUrl: string;
  projectName: string;
}

// ─── Loading steps ────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { label: "Scraping with Firecrawl",      detail: "fetching page content..."           },
  { label: "Extracting brand context",     detail: "reading og tags, keywords, copy..."  },
  { label: "Sending to DeepSeek Nitro",    detail: "routing via OpenRouter..."           },
  { label: "AI generating roast",          detail: "cooking your Pinoy Style roast..."   },
  { label: "Finalizing output",            detail: "structuring paragraphs..."           },
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

function LoadingScreen({ url }: { url: string }) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setStepIdx(i => Math.min(i + 1, LOADING_STEPS.length - 1)), 6000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden font-mono">

      {/* Full-screen ASCII fire behind everything */}
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

      {/* Centered terminal card */}
      <div className="relative z-[3] flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">

          {/* Terminal window */}
          <div className="border border-orange-500/20 bg-background/60 backdrop-blur-sm overflow-hidden"
            style={{ boxShadow: "0 0 48px rgba(234,88,12,0.15), 0 0 0 1px rgba(234,88,12,0.08)" }}>

            {/* Glow line top */}
            <div className="h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />

            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-background/40 border-b border-orange-500/10">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/20" />
              </div>
              <span className="text-[10px] text-orange-400/50 uppercase tracking-[0.2em]">
                LOKI.EXE — ANALYZING TARGET
              </span>
              <div className="w-14" />
            </div>

            {/* Body */}
            <div className="px-5 py-6 space-y-5">

              {/* URL prompt */}
              <p className="text-xs text-muted-foreground/50 truncate">
                <span className="text-orange-500">$</span>{" "}
                <span className="text-orange-400/70">loki roast</span>{" "}
                <span className="text-foreground/30">--url</span>{" "}
                <span className="text-orange-300/60">{url}</span>
              </p>

              {/* Current step label */}
              <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-orange-400">
                {LOADING_STEPS[stepIdx]?.label}
              </p>

              {/* Step list */}
              <div className="space-y-2.5 border-t border-orange-500/10 pt-4">
                {LOADING_STEPS.map((step, i) => {
                  const done   = i < stepIdx;
                  const active = i === stepIdx;
                  return (
                    <div key={i} className="flex items-center gap-3 text-[11px]">
                      <span className="w-4 text-center flex-shrink-0 font-bold">
                        {done   ? <span className="text-green-500">✓</span>
                        : active ? <span className="text-orange-400 animate-pulse">▶</span>
                        :          <span className="text-muted-foreground/20">○</span>}
                      </span>
                      <span className={`flex-1 uppercase tracking-wide ${
                        done   ? "line-through text-muted-foreground/20"
                        : active ? "text-foreground"
                        :          "text-muted-foreground/20"
                      }`}>
                        {step.label}
                      </span>
                      {active && (
                        <span className="text-muted-foreground/40 text-[10px] normal-case">
                          {step.detail}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="relative h-px bg-orange-500/10 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-[1200ms]"
                  style={{
                    width: `${((stepIdx + 1) / LOADING_STEPS.length) * 100}%`,
                    background: "linear-gradient(90deg, #dc2626, #ea580c, #f97316)",
                    boxShadow: "0 0 10px rgba(249,115,22,0.7)",
                  }}
                />
              </div>

              <p className="text-center text-[10px] text-muted-foreground/30 uppercase tracking-[0.2em]">
                DeepSeek Nitro is cooking — up to 60s
              </p>
            </div>

            {/* Glow line bottom */}
            <div className="h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
          </div>
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
            # no account needed to generate — only to publish
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
  const { user }  = useAuth();

  const [copied,              setCopied]            = useState(false);
  const [published,           setPublished]         = useState(false);
  const [publishLoading,      setPublishLoading]    = useState(false);
  const [publishError,        setPublishError]      = useState<string | null>(null);
  const [showAuthModal,       setShowAuthModal]     = useState(false);
  const [roast,               setRoast]             = useState<GeneratedRoast | null>(() => loadRoastFromSession());
  const [mutationError,       setMutationError]     = useState<string | null>(null);
  const [dismissedAddProject, setDismissedAddProject] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const firedRef  = useRef(loadRoastFromSession() !== null);

  const incoming = location.state as IncomingState | null;

  const [submitRoast] = useMutation<
    { submitRoast: { id: string } },
    { input: { projectUrl: string; projectName: string; projectId?: string; title?: string; quickRoast?: string; fullRoast?: string; screenshotUrl?: string | null } }
  >(SUBMIT_ROAST);

  const [generateRoast, { loading }] = useMutation<
    { generateRoast: GeneratedRoast },
    { input: { projectUrl: string; projectName: string } }
  >(GENERATE_ROAST);

  // Redirect if no URL and no cached roast
  useEffect(() => {
    if (!incoming?.projectUrl && !loadRoastFromSession()) navigate("/roast", { replace: true });
  }, [incoming, navigate]);

  const runMutation = (rawUrl: string) => {
    // Normalize: auto-prepend https:// if protocol is missing (common on mobile / share-sheet)
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    let name: string;
    try { name = new URL(url).hostname.replace(/^www\./, "").split(".")[0]; }
    catch { name = url; }
    setMutationError(null);
    generateRoast({ variables: { input: { projectUrl: url, projectName: name } } })
      .then(({ data }) => {
        if (data?.generateRoast) {
          setRoast(data.generateRoast);
          saveRoastToSession(data.generateRoast);
        }
      })
      .catch((err) => {
        const msg: string = err?.message ?? "";
        const msgLower = msg.toLowerCase();
        const isNetworkErr =
          msgLower.includes("failed to fetch") ||
          msgLower.includes("load failed") ||       // Safari mobile
          msgLower.includes("networkerror") ||
          msgLower.includes("network request failed") ||
          err?.networkError != null;                // Apollo NetworkError wrapper
        if (isNetworkErr) {
          setMutationError("NETWORK");
        } else if (msgLower.includes("rate limit") || msgLower.includes("too many")) {
          setMutationError(user ? "AUTH_LIMIT" : "FREE_LIMIT");
        } else {
          setMutationError(msg || "Something went wrong. Please try again.");
        }
      });
  };

  // Fire once on mount
  useEffect(() => {
    if (!incoming?.projectUrl || firedRef.current) return;
    firedRef.current = true;
    runMutation(incoming.projectUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

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

  const { displayed, done } = useTypewriter(roast?.fullRoast ?? "");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [displayed]);

  const handleCopy = () => {
    if (!roast) return;
    navigator.clipboard.writeText(roast.fullRoast);
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
  if (loading || (!roast && !mutationError)) {
    return <LoadingScreen url={incoming?.projectUrl ?? ""} />;
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (mutationError) {
    const isAnonLimit = mutationError === "FREE_LIMIT";
    const isAuthLimit = mutationError === "AUTH_LIMIT";
    const isNetwork   = mutationError === "NETWORK";
    const isRateLimit = isAnonLimit || isAuthLimit;

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
              <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 border ${isRateLimit ? "border-orange-500/30 bg-orange-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                <AlertTriangle className={`w-4 h-4 ${isRateLimit ? "text-orange-500" : "text-red-500"}`} />
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-wide">
                  {isRateLimit ? "ROAST LIMIT REACHED" : isNetwork ? "CONNECTION ERROR" : "REQUEST FAILED"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1 leading-relaxed normal-case">
                  {isAnonLimit
                    ? "You've used your 3 free roasts this hour. Sign in to get 10 roasts per hour."
                    : isAuthLimit
                    ? "You've hit your 10 roasts per hour. Come back in a bit!"
                    : isNetwork
                    ? "Couldn't reach the server — check your connection and try again."
                    : mutationError}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {isAnonLimit ? (
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
                  {!isAuthLimit && (
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

  if (!roast) return null;

  const domain = (() => {
    try { return new URL(roast.projectUrl).hostname; }
    catch { return roast.projectUrl; }
  })();

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

          <button onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/60 hover:text-orange-400 transition-colors uppercase tracking-widest">
            {copied
              ? <><Check className="w-3 h-3 text-green-500" /><span className="text-green-500">COPIED</span></>
              : <><Copy className="w-3 h-3" />COPY</>}
          </button>
        </header>

        {/* ── Sticky Publish & Share bar ── */}
        {done && !published && (
          <div className="relative z-10 sticky top-12 border-b border-orange-500/20 bg-background/90 backdrop-blur-sm">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4">
              <p className="text-[11px] text-muted-foreground/50 font-mono uppercase tracking-widest hidden sm:block">
                🔥 Your roast is ready — share it with the community
              </p>
              <div className="flex items-center gap-2 ml-auto">
                {publishError && (
                  <p className="text-[10px] text-red-500/70 font-mono uppercase tracking-widest">⚠ {publishError}</p>
                )}
                <button
                  onClick={handlePublish}
                  disabled={publishLoading}
                  className="flex items-center gap-2 px-5 h-9 text-[11px] font-black uppercase tracking-widest text-white transition-opacity disabled:opacity-50 flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#ea580c,#dc2626)", boxShadow: "0 0 16px rgba(234,88,12,0.35)" }}
                >
                  {publishLoading
                    ? <><Zap className="w-3.5 h-3.5 animate-pulse" />PUBLISHING…</>
                    : <><Share2 className="w-3.5 h-3.5" />PUBLISH &amp; SHARE</>}
                </button>
              </div>
            </div>
          </div>
        )}
        {done && published && (
          <div className="relative z-10 sticky top-12 border-b border-green-500/20 bg-background/90 backdrop-blur-sm">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent" />
            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-2">
              <Check className="w-3.5 h-3.5 text-green-500" />
              <span className="text-[11px] font-black uppercase tracking-widest text-green-400 font-mono">PUBLISHED TO FEED!</span>
            </div>
          </div>
        )}

        {/* ── Main ── */}
        <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-4 font-mono">

          {/* ── Project header ── */}
          <div className="border border-border/50 bg-card/60 overflow-hidden"
            style={{ boxShadow: "0 0 24px rgba(234,88,12,0.06)" }}>

            {/* OG image banner */}
            {(roast.ogImageUrl || roast.screenshotUrl) && (
              <div className="relative w-full h-36 sm:h-44 overflow-hidden bg-card/40">
                <img
                  src={roast.ogImageUrl ?? roast.screenshotUrl ?? ""}
                  alt={`${roast.projectName} preview`}
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
                {/* Favicon / logo */}
                <div className="w-11 h-11 flex items-center justify-center flex-shrink-0 bg-card border border-border/50 overflow-hidden"
                  style={{ boxShadow: "0 0 12px rgba(234,88,12,0.12)" }}>
                  {roast.faviconUrl ? (
                    <img
                      src={roast.faviconUrl}
                      alt=""
                      className="w-7 h-7 object-contain"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        // Fallback to Google's favicon CDN
                        if (!el.dataset.fallback) {
                          el.dataset.fallback = "1";
                          el.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                        } else {
                          el.style.display = "none";
                          el.parentElement!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-orange-500"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
                        }
                      }}
                    />
                  ) : (
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                      alt=""
                      className="w-7 h-7 object-contain"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = "none";
                        el.parentElement!.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="text-orange-500"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
                      }}
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-base font-black uppercase tracking-tight text-foreground truncate">
                    {roast.projectName}
                  </h1>
                  <a href={roast.projectUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-orange-400/60 hover:text-orange-400 transition-colors mt-0.5">
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{domain}</span>
                  </a>
                  {roast.quickRoast && (
                    <p className="text-xs text-muted-foreground/60 mt-2 italic leading-relaxed line-clamp-2 border-l-2 border-orange-500/30 pl-3">
                      {roast.quickRoast}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Terminal output ── */}
          <div className="border border-border/50 overflow-hidden"
            style={{ boxShadow: "0 0 32px rgba(234,88,12,0.08)" }}>

            {/* Title bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-background/70 border-b border-border/40">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/30" />
              </div>
              <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest">
                ROAST OUTPUT — {domain}
              </span>
              <button onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-orange-400 transition-colors uppercase tracking-widest">
                {copied
                  ? <><Check className="w-3 h-3 text-green-500" /><span className="text-green-500">OK</span></>
                  : <><Copy className="w-3 h-3" />COPY</>}
              </button>
            </div>

            {/* Body */}
            <div className="bg-card/40 px-5 py-5 min-h-[240px]">
              {/* Prompt */}
              <div className="flex flex-wrap items-center gap-x-1 gap-y-1 mb-4 text-[11px] text-muted-foreground/40">
                <span className="text-green-500/70 font-bold">user</span>
                <span className="opacity-30">@</span>
                <span className="text-orange-400/60 font-bold">lokalhost</span>
                <span className="opacity-30">~$</span>
                <span className="break-all text-foreground/30">
                  loki roast --url <span className="text-orange-400/50">{roast.projectUrl}</span>
                </span>
              </div>

              {/* Completed steps */}
              <div className="mb-4 space-y-0.5 text-[11px] border-b border-border/30 pb-3">
                {["Scraping via Jina Reader", "Routing to DeepSeek V3.2 Nitro", "Generating Pinoy Style output"].map(line => (
                  <p key={line} className="text-muted-foreground/30">
                    <span className="text-orange-500/50">▶</span> {line}{" "}
                    <span className="text-green-500/50">✓</span>
                  </p>
                ))}
              </div>

              {/* Typewriter roast */}
              <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {displayed}
                {!done && (
                  <span className="inline-block w-2 h-[1em] bg-orange-500 ml-0.5 animate-pulse align-middle" />
                )}
              </div>

              {/* Done footer */}
              {done && (
                <div className="mt-6 pt-3 border-t border-border/30">
                  <p className="text-[11px] text-muted-foreground/30 uppercase tracking-widest">
                    <span className="text-green-500/60">✓</span> PROCESS EXITED CODE{" "}
                    <span className="text-red-500/70 font-black">1</span> — ROAST COMPLETE
                  </p>
                  <div className="h-px mt-2"
                    style={{ background: "linear-gradient(90deg, rgba(234,88,12,0.4), rgba(220,38,38,0.2), transparent)" }} />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* ── Disclaimer ── */}
          <div className="border border-border/30 bg-card/20 px-4 py-3 flex items-start justify-between gap-4">
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-[11px] text-muted-foreground/40 leading-relaxed">
                <span className="font-bold text-muted-foreground/60">AI-generated satire — not factual.</span>{" "}
                For entertainment only.{" "}
                <Link to="/terms#ai-content" className="text-orange-400/50 hover:text-orange-400 transition-colors hover:underline">
                  Terms · AI Disclaimer
                </Link>
              </p>
            </div>
            <button
              className="flex items-center gap-1 text-[10px] text-muted-foreground/30 hover:text-muted-foreground transition-colors flex-shrink-0 mt-0.5 uppercase tracking-widest"
              onClick={() => {
                window.location.href = `mailto:abuse@lokalhost.club?subject=${encodeURIComponent("Report Roast Output")}&body=${encodeURIComponent(`Reporting roast for: ${roast?.projectUrl ?? ""}\n\nReason: `)}`;
              }}
            >
              <Flag className="w-3 h-3" strokeWidth={2} />
              Report
            </button>
          </div>

          {/* ── Add to projects banner ── */}
          {done && user && !dismissedAddProject && !published && (
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
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground/70 uppercase tracking-wide">Add this to your projects?</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-0.5 truncate">
                    $ add-project --url <span className="text-orange-400/60">{roast.projectUrl}</span>
                  </p>
                </div>
                <button
                  className="flex items-center gap-1.5 px-3 h-8 text-xs font-bold text-white uppercase tracking-widest flex-shrink-0 transition-opacity hover:opacity-90"
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

          {/* ── Actions ── */}
          {done && (
            <div className="space-y-3 pb-10">
              <button
                onClick={goBack}
                className="w-full flex items-center justify-center gap-2 h-11 border border-border/50 text-xs font-black uppercase tracking-widest text-muted-foreground/70 hover:text-foreground hover:border-orange-500/30 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                ROAST ANOTHER
              </button>

              {!user && (
                <p className="text-center text-[11px] text-muted-foreground/40 uppercase tracking-widest">
                  <span className="text-orange-400">→</span>{" "}
                  <button className="text-orange-400 hover:underline" onClick={() => setShowAuthModal(true)}>
                    SIGN IN
                  </button>{" "}
                  TO PUBLISH TO THE LOKAL FEED
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
