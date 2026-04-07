import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
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
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

// ─── GraphQL ─────────────────────────────────────────────────────────────────

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

// ─── Loading overlay ─────────────────────────────────────────────────────────

const LOADING_STEPS = [
  { label: "Connecting to Jina Reader", detail: "fetching page content..." },
  { label: "Scraping target URL", detail: "extracting text & metadata..." },
  { label: "Sending to DeepSeek Nitro", detail: "routing via OpenRouter..." },
  { label: "AI generating roast", detail: "cooking your Taglish roast..." },
  { label: "Finalizing output", detail: "structuring paragraphs..." },
];

function AiLoadingOverlay({ url }: { url: string }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const iv = setInterval(() => {
      setStepIdx((i) => (i < LOADING_STEPS.length - 1 ? i + 1 : i));
    }, 6000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-lg overflow-hidden border border-border shadow-2xl font-mono">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary/70" />
            <div className="w-3 h-3 rounded-full bg-primary/40" />
            <div className="w-3 h-3 rounded-full bg-primary/20" />
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Terminal className="w-3.5 h-3.5 text-primary" />
            <span>lokal-roast — analyzing</span>
          </div>
          <div className="w-14" />
        </div>

        {/* Body */}
        <div className="bg-card px-5 py-6">
          {/* Prompt */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mb-6 text-xs">
            <span className="text-primary font-semibold">lokal</span>
            <span className="text-muted-foreground/50">@</span>
            <span className="text-foreground/60">roast-engine</span>
            <span className="text-muted-foreground/50">~$</span>
            <span className="text-foreground/70 truncate">generate-roast --url <span className="text-primary/80">{url}</span></span>
          </div>

          {/* ── Wave animation ── */}
          <div className="flex justify-center mb-6">
            <div className="relative flex items-end justify-center gap-[3px] h-14 w-32">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="w-[6px] rounded-full"
                  style={{
                    background: `linear-gradient(to top, #f97316, #ec4899)`,
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

          {/* Status label */}
          <p className="text-center text-xs font-semibold text-primary mb-5 tracking-wide uppercase">
            {LOADING_STEPS[stepIdx]?.label ?? "Processing"}...
          </p>

          {/* Steps */}
          <div className="space-y-2 mb-5">
            {LOADING_STEPS.map((step, i) => {
              const isDone = i < stepIdx;
              const isActive = i === stepIdx;
              return (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <div className="w-4 flex-shrink-0 flex justify-center">
                    {isDone ? (
                      <span className="text-green-500">✓</span>
                    ) : isActive ? (
                      <span className="text-primary animate-pulse">▶</span>
                    ) : (
                      <span className="text-muted-foreground/30">○</span>
                    )}
                  </div>
                  <span className={`flex-1 ${
                    isDone ? "text-muted-foreground/40 line-through"
                    : isActive ? "text-foreground"
                    : "text-muted-foreground/30"
                  }`}>
                    {step.label}
                  </span>
                  {isActive && <span className="text-muted-foreground">{step.detail}{dots}</span>}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="relative h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
              style={{
                width: `${((stepIdx + 1) / LOADING_STEPS.length) * 100}%`,
                background: "linear-gradient(90deg, #f97316, #ec4899, #8b5cf6)",
              }}
            />
          </div>

          <p className="text-center text-xs text-muted-foreground/40 mt-4">
            This can take up to 60s — DeepSeek Nitro is cooking 🔥
          </p>
        </div>
      </div>

      <style>{`
        @keyframes waveBar {
          0%, 100% { height: 8px;  opacity: 0.4; }
          50%       { height: 48px; opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncomingState {
  projectUrl: string;
}

interface GeneratedRoast {
  title: string;
  quickRoast: string;
  fullRoast: string;
  overallScore: number;
  projectUrl: string;
  projectName: string;
}

// ─── Typewriter hook ─────────────────────────────────────────────────────────

function useTypewriter(text: string, chunkSize = 7) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const idxRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    idxRef.current = 0;
    if (!text) return;

    const tick = () => {
      if (idxRef.current >= text.length) {
        setDone(true);
        return;
      }
      const chunk = Math.min(chunkSize, text.length - idxRef.current);
      idxRef.current += chunk;
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
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [roast, setRoast] = useState<GeneratedRoast | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  const incoming = location.state as IncomingState | null;

  const [publishRoastPost] = useMutation<
    { createPost: { id: string } },
    { input: { content: string; projectName?: string; tags?: string[] } }
  >(PUBLISH_ROAST_POST);

  const [generateRoast, { loading }] = useMutation<
    { generateRoast: GeneratedRoast },
    { input: { projectUrl: string; projectName: string } }
  >(GENERATE_ROAST);

  // Redirect if no URL passed
  useEffect(() => {
    if (!incoming?.projectUrl) navigate("/roast", { replace: true });
  }, [incoming, navigate]);

  const runMutation = (url: string) => {
    let name: string;
    try {
      name = new URL(url).hostname.replace(/^www\./, "").split(".")[0];
    } catch {
      name = url;
    }
    setMutationError(null);
    generateRoast({ variables: { input: { projectUrl: url, projectName: name } } })
      .then(({ data }) => {
        if (data?.generateRoast) setRoast(data.generateRoast);
      })
      .catch((err) => {
        const msg: string = err?.message ?? "";
        if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network")) {
          setMutationError("Could not reach the backend. Make sure the server is running on port 4000 and try again.");
        } else {
          setMutationError(msg || "Something went wrong. Please try again.");
        }
      });
  };

  // Fire mutation once on mount
  useEffect(() => {
    if (!incoming?.projectUrl || firedRef.current) return;
    firedRef.current = true;
    runMutation(incoming.projectUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  const { displayed, done } = useTypewriter(roast?.fullRoast ?? "", 7);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [displayed]);

  // Show loading overlay while mutation is in flight
  if (loading || (!roast && !mutationError)) {
    return <AiLoadingOverlay url={incoming?.projectUrl ?? ""} />;
  }

  // Error state
  if (mutationError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card font-mono overflow-hidden">
          {/* Terminal title bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border-b border-border">
            <div className="w-3 h-3 rounded-full bg-destructive/70" />
            <div className="w-3 h-3 rounded-full bg-primary/40" />
            <div className="w-3 h-3 rounded-full bg-primary/20" />
            <span className="ml-2 text-xs text-muted-foreground flex items-center gap-1">
              <Terminal className="w-3 h-3 text-primary" /> lokal-roast — error
            </span>
          </div>
          <div className="px-5 py-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Request failed</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{mutationError}</p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="gap-2 flex-1"
                onClick={() => {
                  firedRef.current = false;
                  runMutation(incoming!.projectUrl);
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 flex-1"
                onClick={() => navigate("/roast")}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Try Different URL
              </Button>
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

  const handleCopy = () => {
    navigator.clipboard.writeText(roast.fullRoast);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Publish roast to social feed as a Post
  const handlePublish = async () => {
    if (!roast) return;
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }
    setPublishLoading(true);
    setPublishError(null);
    const content = `🔥 Just roasted **${roast.projectName}** with Lokal AI!\n\n${roast.fullRoast}\n\n👉 ${roast.projectUrl}`;
    try {
      await publishRoastPost({
        variables: {
          input: {
            content,
            projectName: roast.projectName,
            tags: ["roast", "ai", "lokal"],
          },
        },
      });
      setPublished(true);
      // Navigate to feed after short delay so user sees success
      setTimeout(() => navigate("/feed"), 1800);
    } catch (err: any) {
      setPublishError(err?.message ?? "Failed to publish. Try again.");
    } finally {
      setPublishLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b bg-card px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground flex-shrink-0"
            onClick={() => navigate("/roast")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <span className="text-border hidden sm:block">|</span>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center flex-shrink-0">
              <Flame className="w-3.5 h-3.5 text-white" fill="currentColor" />
            </div>
            <span className="font-semibold text-sm truncate">{roast.projectName}</span>
            <a
              href={roast.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
            >
              {domain}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs h-8 text-muted-foreground"
            onClick={handleCopy}
          >
            {copied
              ? <><Check className="w-3.5 h-3.5 text-green-500" />Copied</>
              : <><Copy className="w-3.5 h-3.5" />Copy</>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs h-8 text-muted-foreground"
            onClick={() => navigate("/roast")}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Roast Another</span>
          </Button>
        </div>
      </div>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">

        {/* ── Project info row ────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-1">
          <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Flame className="w-4.5 h-4.5 text-primary" fill="currentColor" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{roast.projectName}</p>
            <a
              href={roast.projectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{roast.projectUrl}</span>
            </a>
          </div>
          <Badge variant="secondary" className="ml-auto flex-shrink-0 text-[10px] rounded font-normal">
            AI Roast
          </Badge>
        </div>

        {/* ── CMD Terminal ─────────────────────────────────────────── */}
        <div className="rounded-lg overflow-hidden border border-border shadow-lg font-mono">

          {/* Title bar — uses card bg + primary accent */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted border-b border-border">
            <div className="flex items-center gap-2">
              {/* Brand-colored dots instead of macOS red/yellow/green */}
              <div className="w-3 h-3 rounded-full bg-primary/70" />
              <div className="w-3 h-3 rounded-full bg-primary/40" />
              <div className="w-3 h-3 rounded-full bg-primary/20" />
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span className="text-foreground/70 truncate max-w-[180px] sm:max-w-xs">{domain}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              {copied
                ? <><Check className="w-3.5 h-3.5 text-primary" /><span className="text-primary">Copied</span></>
                : <><Copy className="w-3.5 h-3.5" /><span>Copy</span></>}
            </button>
          </div>

          {/* Terminal body — uses card background (dark: #252526, light: white) */}
          <div className="bg-card px-5 py-4 min-h-[300px]">

            {/* Prompt line */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mb-4 text-xs">
              <span className="text-primary font-semibold">lokal</span>
              <span className="text-muted-foreground/50">@</span>
              <span className="text-foreground/60">roast-engine</span>
              <span className="text-muted-foreground/50">~$</span>
              <span className="text-foreground/80 break-all">generate-roast --url <span className="text-primary/80">{roast.projectUrl}</span></span>
            </div>

            {/* System status lines */}
            <div className="mb-5 space-y-1 text-xs border-b border-border pb-4">
              <p className="text-muted-foreground">
                <span className="text-primary">▶</span> Scraping via Jina Reader...{" "}
                <span className="text-green-500 dark:text-green-400">✓ done</span>
              </p>
              <p className="text-muted-foreground">
                <span className="text-primary">▶</span> Sending to DeepSeek V3.2 Nitro...{" "}
                <span className="text-green-500 dark:text-green-400">✓ done</span>
              </p>
              <p className="text-muted-foreground">
                <span className="text-primary">▶</span> Generating Taglish roast output...{" "}
                <span className="text-green-500 dark:text-green-400">✓ done</span>
              </p>
            </div>

            {/* Typewriter roast output */}
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {displayed}
              {!done && (
                <span className="inline-block w-[9px] h-[1.1em] bg-primary ml-0.5 animate-pulse align-middle rounded-[1px]" />
              )}
            </div>

            {/* Done footer */}
            {done && (
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    <span className="text-green-500 dark:text-green-400">✓</span> Process exited with code{" "}
                    <span className="text-destructive font-bold">1</span>
                    <span className="ml-1">— roast complete</span>
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-primary/50 via-primary/20 to-transparent mt-3" />
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* ── Actions (shown when done typing) ───────────────────── */}
        {done && (
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => navigate("/roast")}
              >
                <RotateCcw className="w-4 h-4" />
                Roast Another Project
              </Button>

              {/* Publish & Share to feed */}
              <Button
                className="flex-1 gap-2"
                onClick={handlePublish}
                disabled={published || publishLoading}
              >
                {published ? (
                  <><Check className="w-4 h-4" />Published! Redirecting to Feed...</>
                ) : publishLoading ? (
                  <><Zap className="w-4 h-4 animate-pulse" />Publishing...</>
                ) : (
                  <><Share2 className="w-4 h-4" />Publish &amp; Share Roast</>
                )}
              </Button>
            </div>

            {/* Publish error */}
            {publishError && (
              <p className="text-xs text-destructive font-mono text-center">
                ⚠ {publishError}
              </p>
            )}

            {/* Not logged in hint */}
            {!user && (
              <p className="text-xs text-muted-foreground text-center font-mono">
                <span className="text-primary">→</span> You need to be logged in to publish to the feed.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

