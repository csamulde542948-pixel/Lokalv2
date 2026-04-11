import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router";
import { gql } from "@apollo/client/core";
import { useMutation } from "@apollo/client/react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Flame,
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
      overallScore
      projectUrl
      projectName
    }
  }
`;

const PUBLISH_ROAST_POST = gql`
  mutation PublishRoastPost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      content
      projectName
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
  overallScore: number;
  projectUrl: string;
  projectName: string;
}

// ─── Loading steps ────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { label: "Connecting to Jina Reader",   detail: "fetching page content..."      },
  { label: "Scraping target URL",         detail: "extracting text & metadata..."  },
  { label: "Sending to DeepSeek Nitro",   detail: "routing via OpenRouter..."      },
  { label: "AI generating roast",         detail: "cooking your Pinoy Style roast..."  },
  { label: "Finalizing output",           detail: "structuring paragraphs..."      },
];

// ─── Loading screen ───────────────────────────────────────────────────────────

function LoadingScreen({ url }: { url: string }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [dots, setDots]       = useState("");

  useEffect(() => {
    const iv = setInterval(() => setStepIdx(i => Math.min(i + 1, LOADING_STEPS.length - 1)), 6000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 400);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-xl overflow-hidden border border-border shadow-2xl font-mono">
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted border-b border-border">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary/70" />
            <div className="w-3 h-3 rounded-full bg-primary/40" />
            <div className="w-3 h-3 rounded-full bg-primary/20" />
          </div>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Terminal className="w-3.5 h-3.5 text-primary" />
            lokal-roast — analyzing
          </span>
          <div className="w-16" />
        </div>
        <div className="bg-card px-6 py-7 space-y-6">
          <p className="text-xs text-muted-foreground/60 truncate">
            <span className="text-primary font-semibold">$</span> generate-roast --url{" "}
            <span className="text-primary/70">{url}</span>
          </p>
          <div className="flex justify-center">
            <div className="flex items-end gap-[3px] h-14">
              {[0,1,2,3,4,5,6,7].map(i => (
                <div key={i} className="w-1.5 rounded-full"
                  style={{
                    background: "linear-gradient(to top,#f97316,#ec4899)",
                    animationName: "waveBar",
                    animationDuration: "1.2s",
                    animationTimingFunction: "ease-in-out",
                    animationIterationCount: "infinite",
                    animationDelay: `${i * 0.15}s`,
                    height: "20px",
                  }}
                />
              ))}
            </div>
          </div>
          <p className="text-center text-xs font-semibold text-primary tracking-widest uppercase">
            {LOADING_STEPS[stepIdx]?.label}...
          </p>
          <div className="space-y-2">
            {LOADING_STEPS.map((step, i) => {
              const done   = i < stepIdx;
              const active = i === stepIdx;
              return (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="w-4 text-center flex-shrink-0">
                    {done   ? <span className="text-green-500">✓</span>
                    : active ? <span className="text-primary animate-pulse">▶</span>
                    :          <span className="text-muted-foreground/30">○</span>}
                  </span>
                  <span className={`flex-1 ${done ? "line-through text-muted-foreground/40" : active ? "text-foreground" : "text-muted-foreground/30"}`}>
                    {step.label}
                  </span>
                  {active && <span className="text-muted-foreground/60">{step.detail}{dots}</span>}
                </div>
              );
            })}
          </div>
          <div className="relative h-0.5 rounded-full bg-muted overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
              style={{
                width: `${((stepIdx + 1) / LOADING_STEPS.length) * 100}%`,
                background: "linear-gradient(90deg,#f97316,#ec4899,#8b5cf6)",
              }}
            />
          </div>
          <p className="text-center text-[10px] text-muted-foreground/40">
            This can take up to 60s — DeepSeek Nitro is cooking 🔥
          </p>
        </div>
      </div>
      <style>{`
        @keyframes waveBar {
          0%,100% { height:8px; opacity:.4 }
          50%      { height:48px; opacity:1 }
        }
      `}</style>
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

  const [publishRoastPost] = useMutation<
    { createPost: { id: string } },
    { input: { content: string; projectName?: string; tags?: string[] } }
  >(PUBLISH_ROAST_POST);

  const [generateRoast, { loading }] = useMutation<
    { generateRoast: GeneratedRoast },
    { input: { projectUrl: string; projectName: string } }
  >(GENERATE_ROAST);

  // Redirect if no URL and no cached roast
  useEffect(() => {
    if (!incoming?.projectUrl && !loadRoastFromSession()) navigate("/roast", { replace: true });
  }, [incoming, navigate]);

  const runMutation = (url: string) => {
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
        if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network")) {
          setMutationError("NETWORK");
        } else if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("too many")) {
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
    const content = `🔥 Just roasted **${roast.projectName}** with Lokal AI!\n\n${roast.fullRoast}\n\n👉 ${roast.projectUrl}`;
    try {
      await publishRoastPost({
        variables: { input: { content, projectName: roast.projectName, tags: ["roast", "ai", "lokal"] } },
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
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card overflow-hidden shadow-xl font-mono">
          <div className="h-1 bg-gradient-to-r from-destructive/60 via-orange-500/60 to-destructive/30" />
          <div className="px-6 py-7 space-y-5">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isRateLimit ? "bg-orange-500/10" : "bg-destructive/10"}`}>
                <AlertTriangle className={`w-5 h-5 ${isRateLimit ? "text-orange-500" : "text-destructive"}`} />
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {isRateLimit ? "Roast limit reached" : isNetwork ? "Connection error" : "Request failed"}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {isAnonLimit
                    ? "You've used your 3 free roasts this hour. Sign in to get 10 roasts per hour."
                    : isAuthLimit
                    ? "You've hit your 10 roasts per hour. Come back in a bit!"
                    : isNetwork
                    ? "Could not reach the backend. Make sure the server is running on port 4000."
                    : mutationError}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {isAnonLimit ? (
                <>
                  <Link to="/login" state={{ from: location }} className="flex-1">
                    <Button size="sm" className="w-full gap-2">
                      <LogIn className="w-3.5 h-3.5" /> Sign In
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={goBack}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </Button>
                </>
              ) : (
                <>
                  {!isAuthLimit && (
                    <Button size="sm" className="flex-1 gap-2" onClick={() => {
                      firedRef.current = false;
                      setMutationError(null);
                      runMutation(incoming!.projectUrl);
                    }}>
                      <RotateCcw className="w-3.5 h-3.5" /> Retry
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={goBack}>
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </Button>
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
      {/* Blurred auth modal */}
      {showAuthModal && (
        <AuthModal from={location} onClose={() => setShowAuthModal(false)} />
      )}

      <div className="min-h-screen bg-background flex flex-col">

        {/* ── Slim top bar ── */}
        <header className="flex items-center justify-between px-4 sm:px-6 h-12 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={goBack}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Roast another
          </button>

          {/* Brand wordmark */}
          <BrandLogo size="sm" />

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied
              ? <><Check className="w-3.5 h-3.5 text-green-500" /><span className="text-green-500">Copied</span></>
              : <><Copy className="w-3.5 h-3.5" />Copy</>}
          </button>
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* ── Project header card ── */}
          <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-md">
              <Flame className="w-5 h-5 text-white" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{roast.projectName}</h1>
              <a
                href={roast.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-0.5"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{domain}</span>
              </a>
              {roast.quickRoast && (
                <p className="text-xs text-muted-foreground/70 mt-2 italic leading-relaxed line-clamp-2 border-l-2 border-primary/30 pl-3">
                  {roast.quickRoast}
                </p>
              )}
            </div>
          </div>

          {/* ── Terminal output card ── */}
          <div className="rounded-xl overflow-hidden border border-border shadow-xl font-mono">
            {/* title bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-primary/70" />
                <div className="w-3 h-3 rounded-full bg-primary/40" />
                <div className="w-3 h-3 rounded-full bg-primary/20" />
              </div>
              {/* Brand in terminal title bar */}
              <div className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="flameLgT" x1="0" y1="32" x2="32" y2="0" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#f97316" />
                      <stop offset="1" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                  <path fill="url(#flameLgT)" d="M16 2C16 2 20 8 20 13c0 2.2-1.8 4-4 4s-4-1.8-4-4c0-1.5.5-2.8 1-4C9 12 7 16.5 7 21c0 5 4 9 9 9s9-4 9-9c0-6.5-5-13-9-19z" />
                </svg>
                <span className="text-xs font-mono font-semibold text-foreground/60">
                  lokalhost<span className="text-muted-foreground/40">.club</span>
                  <span className="text-muted-foreground/30 mx-1">—</span>
                  <span className="text-muted-foreground/50 font-normal">{domain}</span>
                </span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied
                  ? <><Check className="w-3 h-3 text-primary" /><span className="text-primary text-[10px]">Copied</span></>
                  : <><Copy className="w-3 h-3" /><span className="text-[10px]">Copy</span></>}
              </button>
            </div>

            {/* body */}
            <div className="bg-card px-5 py-5 min-h-[260px]">
              {/* prompt */}
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mb-4 text-xs text-muted-foreground/50">
                <span className="text-green-500/80 font-semibold">user</span>
                <span className="opacity-40">@</span>
                <span className="text-primary/70 font-semibold">lokalhost</span>
                <span className="opacity-40">~$</span>
                <span className="break-all text-foreground/40">
                  roast --url <span className="text-primary/60">{roast.projectUrl}</span>
                </span>
              </div>

              {/* status lines */}
              <div className="mb-5 space-y-0.5 text-xs border-b border-border/50 pb-4">
                {["Scraping via Jina Reader", "Sending to DeepSeek V3.2 Nitro", "Generating Pinoy Style roast output"].map(line => (
                  <p key={line} className="text-muted-foreground/40">
                    <span className="text-primary/50">▶</span> {line}…{" "}
                    <span className="text-green-500/60">✓</span>
                  </p>
                ))}
              </div>

              {/* typewriter output */}
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {displayed}
                {!done && (
                  <span className="inline-block w-[8px] h-[1.1em] bg-primary ml-0.5 animate-pulse align-middle rounded-[1px]" />
                )}
              </div>

              {/* done footer */}
              {done && (
                <div className="mt-6 pt-3 border-t border-border/50">
                  <p className="text-xs text-muted-foreground/40">
                    <span className="text-green-500/70">✓</span> process exited with code{" "}
                    <span className="text-destructive/70 font-bold">1</span> — roast complete
                  </p>
                  <div className="h-px mt-2 bg-gradient-to-r from-primary/40 via-pink-500/20 to-transparent" />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* ── Layer 3: AI disclaimer + Report button ── */}
          <div
            className="rounded-xl border font-mono"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div className="px-4 py-3 flex items-start justify-between gap-4">
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 mt-0.5" strokeWidth={2} />
                <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                  <span className="font-semibold text-muted-foreground/80">AI-generated satirical feedback — not factual assessment.</span>{" "}
                  This output was produced by an automated language model and does not represent the
                  views of Lokalhost or its developers. For entertainment purposes only.{" "}
                  <Link to="/terms#ai-content" className="text-primary/60 hover:text-primary transition-colors hover:underline">
                    Terms · AI Disclaimer
                  </Link>
                </p>
              </div>
              <button
                className="flex items-center gap-1 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors flex-shrink-0 mt-0.5"
                onClick={() => {
                  window.location.href = `mailto:abuse@lokalhost.club?subject=${encodeURIComponent("Report Roast Output")}&body=${encodeURIComponent(`Reporting roast for: ${roast?.projectUrl ?? ""}\n\nReason: `)}`;  
                }}
                title="Report this output"
              >
                <Flag className="w-3 h-3" strokeWidth={2} />
                Report
              </button>
            </div>
          </div>

          {/* ── Add to my projects banner ── */}
          {done && user && !dismissedAddProject && !published && (
            <div
              className="rounded-xl overflow-hidden border font-mono"
              style={{
                borderColor: "rgba(249,115,22,0.25)",
                background: "rgba(249,115,22,0.04)",
              }}
            >
              {/* CMD title bar */}
              <div
                className="flex items-center justify-between px-3 py-2 border-b"
                style={{ borderColor: "rgba(249,115,22,0.15)", background: "rgba(249,115,22,0.06)" }}
              >
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(249,115,22,0.5)" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(249,115,22,0.3)" }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(249,115,22,0.15)" }} />
                </div>
                <span className="text-[10px] text-orange-400/60">lokal-suggest — add-project</span>
                <button
                  onClick={() => setDismissedAddProject(true)}
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {/* body */}
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground/80">
                    Add this to your projects?
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
                    $ add-project --url{" "}
                    <span className="text-orange-400/70">{roast.projectUrl}</span>
                  </p>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 flex-shrink-0 text-xs h-8 px-3"
                  style={{
                    background: "linear-gradient(135deg,#f97316,#ec4899)",
                    border: "none",
                    color: "#fff",
                  }}
                  onClick={() => {
                    navigate("/projects", {
                      state: {
                        prefillProjectUrl: roast.projectUrl,
                        prefillProjectName: roast.projectName,
                      },
                    });
                  }}
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  Add Project
                </Button>
              </div>
            </div>
          )}

          {/* ── Actions ── */}
          {done && (
            <div className="space-y-3 pb-10">
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="gap-2" onClick={goBack}>
                  <RotateCcw className="w-4 h-4" />
                  Roast Another
                </Button>
                <Button
                  className="gap-2"
                  onClick={handlePublish}
                  disabled={published || publishLoading}
                >
                  {published ? (
                    <><Check className="w-4 h-4" />Published!</>
                  ) : publishLoading ? (
                    <><Zap className="w-4 h-4 animate-pulse" />Publishing…</>
                  ) : (
                    <><Share2 className="w-4 h-4" />Publish &amp; Share</>
                  )}
                </Button>
              </div>

              {publishError && (
                <p className="text-xs text-destructive font-mono text-center">⚠ {publishError}</p>
              )}

              {!user && (
                <p className="text-center text-[11px] text-muted-foreground font-mono">
                  <span className="text-primary">→</span>{" "}
                  <button
                    className="text-primary hover:underline"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Sign in
                  </button>{" "}
                  to publish to the Lokal feed
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
