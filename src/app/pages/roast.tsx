import { useState, useEffect, useRef } from "react";
import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Flame } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { useAuth } from "../../contexts/AuthContext";

// ─── ASCII Fire Animation ─────────────────────────────────────────────────────
// Renders directly onto a <canvas> — no React state, no flicker.

const FIRE_CHARS = [" ", ".", ":", "^", "*", "x", "X", "$", "#", "M"];
const FIRE_COLORS = [
  "transparent",
  "#1a0000",
  "#3d0000",
  "#7a1000",
  "#b02000",
  "#d44000",
  "#e86010",
  "#f09030",
  "#f8c050",
  "#fff8a0",
];

const CELL_PX = 7;   // pixel size of each character cell — smaller = denser / HD feel

function AsciiFireAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tick = () => {
      const W = canvas.width;
      const H = canvas.height;
      const COLS = Math.ceil(W / CELL_PX);
      const ROWS = Math.ceil(H / CELL_PX);

      // Lazy-init or resize the grid
      if (
        !(tick as any).grid ||
        (tick as any).cols !== COLS ||
        (tick as any).rows !== ROWS
      ) {
        (tick as any).grid = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
        (tick as any).cols = COLS;
        (tick as any).rows = ROWS;
      }

      const grid: Uint8Array[] = (tick as any).grid;

      // Seed bottom four rows with heat — more rows = taller flames
      for (let x = 0; x < COLS; x++) {
        grid[ROWS - 1][x] = Math.random() < 0.92
          ? Math.floor(Math.random() * 2) + 8   // 8–9 (hottest)
          : Math.floor(Math.random() * 2);
        if (ROWS > 1)
          grid[ROWS - 2][x] = Math.random() < 0.85
            ? Math.floor(Math.random() * 2) + 7
            : 0;
        if (ROWS > 2)
          grid[ROWS - 3][x] = Math.random() < 0.70
            ? Math.floor(Math.random() * 2) + 6
            : 0;
        if (ROWS > 3)
          grid[ROWS - 4][x] = Math.random() < 0.55
            ? Math.floor(Math.random() * 2) + 5
            : 0;
      }

      // Propagate upward — lower decay lets heat climb higher
      for (let y = 0; y < ROWS - 4; y++) {
        for (let x = 0; x < COLS; x++) {
          const below = grid[y + 1][x];
          const left  = grid[y + 1][(x - 1 + COLS) % COLS];
          const right = grid[y + 1][(x + 1) % COLS];
          const avg   = (below + left + right) / 3;
          const decay = Math.random() * 0.45;
          grid[y][x] = Math.max(0, Math.round(avg - decay));
        }
      }

      // Draw
      ctx.clearRect(0, 0, W, H);
      ctx.font = `bold ${CELL_PX}px monospace`;
      ctx.textBaseline = "top";

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const val = grid[y][x];
          if (val === 0) continue;
          ctx.fillStyle = FIRE_COLORS[Math.min(val, FIRE_COLORS.length - 1)];
          ctx.fillText(
            FIRE_CHARS[Math.min(val, FIRE_CHARS.length - 1)],
            x * CELL_PX,
            y * CELL_PX,
          );
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[1]"
      style={{ width: "100%", height: "100%" }}
      aria-hidden
    />
  );
}

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_RECENT_ROASTS = gql`
  query GetRecentRoasts {
    roasts(limit: 20) {
      id
      quickRoast
      projectName
      projectUrl
      createdAt
      author {
        id
        name
        avatarUrl
      }
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentRoast {
  id: string;
  quickRoast: string;
  projectName: string;
  projectUrl: string;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
}

// ─── Marquee Card ─────────────────────────────────────────────────────────────────────────────

function RoastMarqueeCard({ roast }: { roast: RecentRoast }) {
  const displayUrl = roast.projectUrl.replace(/^https?:\/\//, '');
  return (
    <div className="flex-shrink-0 w-[260px] rounded-none border border-border/50 overflow-hidden bg-card/80 hover:border-orange-500/30 transition-colors">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40 bg-muted/20">
        <span className="text-orange-500 font-mono font-bold text-[10px]">&gt;_</span>
        <span className="text-[9px] font-mono text-muted-foreground truncate">{displayUrl} roasted</span>
      </div>
      <div className="p-3 font-mono">
        <a
          href={roast.projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-xs text-orange-400 hover:text-orange-300 truncate block mb-1.5"
        >
          {roast.projectName}
        </a>
        {roast.quickRoast && (
          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
            <span className="text-orange-500/50">$ </span>{roast.quickRoast}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Animated Scramble Headline ──────────────────────────────────────────────

const HEADLINE_SETS: [string, string, string?][] = [
  ["MUKHANG SILICON VALLEY.", "PERO GALAWANG RECTO FREELANCER.", "LET'S ROAST IT."],
  ["PASTE MOYUNG WEBSITE MO.", "SIRAIN NAMIN YUNG EGO MO."],
  ["MUKHANG MAY VISION.", "PERO WALANG DIREKSYON."],
  ["MAS MALINIS PA YUNG UI", "KESA SA BUSINESS MODEL MO."],
  ["MUKHANG PINAGISIPAN.", "PERO HINDI SOBRA."],
];

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*!?";

function useScramble(target: string, trigger: number) {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number>(0);
  const frameCountRef = useRef(0);

  useEffect(() => {
    let iter = 0;
    frameCountRef.current = 0;
    // More iters = slower reveal; throttle = frames to skip between updates
    const totalIters = Math.max(target.replace(/ /g, "").length * 2, 24);
    const throttle = 2; // only update every N animation frames

    const animate = () => {
      frameCountRef.current++;
      if (frameCountRef.current % throttle === 0) {
        iter++;
        const progress = iter / totalIters;
        setDisplay(
          target
            .split("")
            .map((char, i) => {
              if (char === " " || char === ".") return char;
              if (i / target.length < progress) return char;
              return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            })
            .join("")
        );
        if (iter >= totalIters) {
          setDisplay(target);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  return display;
}

function ScrambleLine({
  text,
  trigger,
  className,
  style,
}: {
  text: string;
  trigger: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const display = useScramble(text, trigger);
  return (
    <span className={`flex justify-center ${className ?? ""}`} style={style}>
      <span className="break-words text-center">{display}</span>
    </span>
  );
}

function AnimatedHeadline() {
  const [setIdx, setSetIdx] = useState(0);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    // Hold each tagline for 9s, then scramble to next
    const id = setInterval(() => {
      setSetIdx((i) => (i + 1) % HEADLINE_SETS.length);
      setTrigger((t) => t + 1);
    }, 9000);
    return () => clearInterval(id);
  }, []);

  const [line1, line2, line3] = HEADLINE_SETS[setIdx];

  return (
    <h1 className="font-mono font-black uppercase leading-[1.08] tracking-tight mb-4 sm:mb-6 w-full">
      <ScrambleLine
        text={line1}
        trigger={trigger}
        className="text-2xl sm:text-4xl lg:text-6xl xl:text-7xl text-foreground drop-shadow-md"
      />
      <ScrambleLine
        text={line2}
        trigger={trigger}
        className="text-2xl sm:text-4xl lg:text-6xl xl:text-7xl text-red-500 drop-shadow-lg"
        style={{ textShadow: "0 0 24px rgba(239,68,68,0.5)" }}
      />
      {line3 && (
        <ScrambleLine
          text={line3}
          trigger={trigger}
          className="text-2xl sm:text-4xl lg:text-6xl xl:text-7xl text-orange-400 drop-shadow-lg"
          style={{ textShadow: "0 0 24px rgba(251,146,60,0.55)" }}
        />
      )}
    </h1>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Roast() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projectUrl, setProjectUrl] = useState(() => searchParams.get("url") ?? "");
  const [roastConsent, setRoastConsent] = useState(false);
  const [consentShake, setConsentShake] = useState(false);

  const triggerConsentShake = () => {
    setConsentShake(true);
    setTimeout(() => setConsentShake(false), 600);
  };

  // If url came in via query param, trigger immediately
  useEffect(() => {
    let url = searchParams.get("url");
    if (url) {
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      navigate("/roast/result", { state: { projectUrl: url }, replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: recentData } = useQuery<{ roasts: RecentRoast[] }>(GET_RECENT_ROASTS, {
    fetchPolicy: "cache-and-network",
  });

  const recentRoasts = recentData?.roasts ?? [];
  const loading = !recentData;

  // Duplicate for smooth infinite marquee (need enough items to fill viewport)
  const rowOne = [...recentRoasts, ...recentRoasts];
  const rowTwo = [...[...recentRoasts].reverse(), ...[...recentRoasts].reverse()];

  const handleRoast = () => {
    let url = projectUrl.trim();
    if (!url) return;
    // Auto-prepend https:// if the user omitted the protocol (common on mobile)
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (!roastConsent) {
      triggerConsentShake();
      return;
    }
    navigate("/roast/result", { state: { projectUrl: url } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRoast();
  };

  return (
    <div className="flex flex-col">

      {/* ═══════════════════════════════════════════
          HERO — ASCII fire lives ONLY in here
      ═══════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden flex flex-col px-2 text-center h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-7rem)]"
        style={{ minHeight: 0 }}
      >

        {/* Fire fills this section only */}
        <AsciiFireAnimation />

        {/* Scrim: dark wash over the fixed fire canvas */}
        <div className="absolute inset-0 z-[2] pointer-events-none bg-background/65" />

        {/* Subtle dot-grid pattern over the scrim */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Corner crosshairs — decorative */}
        <span className="absolute top-6 left-6 text-orange-500/40 font-mono text-xl leading-none select-none pointer-events-none z-[3]">+</span>
        <span className="absolute top-6 right-6 text-orange-500/40 font-mono text-xl leading-none select-none pointer-events-none z-[3]">+</span>

        {/* ── Hero content ── */}
        <div className="relative z-[3] flex-1 flex flex-col items-center justify-center py-6 sm:py-10 w-full px-4 sm:px-6 max-w-5xl mx-auto">

          {/* Big animated scramble headline */}
          <AnimatedHeadline />

          {/* Static tagline */}
          <p className="font-mono text-[10px] sm:text-xs text-muted-foreground/50 uppercase tracking-wider sm:tracking-widest mb-5 sm:mb-8 leading-relaxed text-center px-2">
            WE ROAST STARTUPS, PORTFOLIOS, AT MGA DELUSIONAL FOUNDER.
          </p>

          {/* ── URL Input row ── */}
          <div className="w-full max-w-xl">
            <div className="flex border border-border/50 bg-background/40 backdrop-blur-md">
              <input
                type="url"
                placeholder="your-sh*t.com"
                value={projectUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent px-3 sm:px-4 py-3.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/35 outline-none min-w-0"
              />
              <button
                onClick={handleRoast}
                disabled={!projectUrl.trim()}
                className="bg-orange-600 hover:bg-orange-500 active:bg-orange-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono font-bold text-xs sm:text-sm px-3 sm:px-5 py-3.5 flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap flex-shrink-0"
                style={{ boxShadow: "0 0 18px rgba(234,88,12,0.35)" }}
              >
                <Flame className="w-4 h-4" strokeWidth={2} />
                <span className="hidden sm:inline">GET ROASTED</span>
              </button>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground/40 mt-2 text-left pl-1">
              Enter your landing page URL (e.g., your-sh*t.com)
            </p>

            {/* Consent */}
            <div
              className={`flex items-start gap-2.5 mt-4 text-left transition-transform ${consentShake ? "animate-shake" : ""}`}
            >
              <Checkbox
                id="roastConsent"
                checked={roastConsent}
                onCheckedChange={(v) => setRoastConsent(v as boolean)}
                className={`mt-0.5 flex-shrink-0 transition-all duration-200 ${
                  consentShake
                    ? "border-orange-500 ring-2 ring-orange-500/50 ring-offset-1 ring-offset-background"
                    : "border-border/50"
                }`}
              />
              <div>
                <label
                  htmlFor="roastConsent"
                  className="text-[11px] font-mono text-muted-foreground/50 leading-relaxed cursor-pointer"
                >
                  I own this project and understand this is{" "}
                  <strong className="text-muted-foreground/70">AI-generated satire</strong>.{" "}
                  {!user && (
                    <>
                      <Link to="/login" className="text-orange-400 hover:underline">Sign in</Link>
                      {" "}to save your roast.{" "}
                    </>
                  )}
                  <Link to="/terms#ai-roast" className="text-orange-400/80 hover:underline">Learn more</Link>.
                </label>
                {consentShake && (
                  <p className="text-[10px] font-mono text-orange-500 mt-1 animate-fade-in">
                    ⚠ Check this box before getting roasted
                  </p>
                )}
              </div>
            </div>

            {/* CTA to live roasts */}
            <div className="mt-6 flex justify-center">
              <a
                href="#live-roasts"
                className="flex items-center gap-2 font-mono text-[11px] text-white/40 hover:text-orange-400 transition-colors group"
              >
                <span>see who got roasted</span>
                <span className="group-hover:translate-y-0.5 transition-transform inline-block">↓</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          LIVE ROASTS — separate section below hero
      ═══════════════════════════════════════════ */}
      <section id="live-roasts" className="relative z-[4] w-full border-t border-border/30 py-8 space-y-3 bg-background">
        <div className="container mx-auto px-4 mb-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest">
                Live Roasts
              </p>
            </div>
            {recentRoasts.length > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground/50 border border-border/40 px-2 py-0.5">
                {recentRoasts.length} projects roasted
              </span>
            )}
          </div>
        </div>

        {/* Empty state */}
        {!loading && recentRoasts.length === 0 && (
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-12 border border-dashed border-border/40 text-center gap-3">
              <Flame className="w-8 h-8 text-orange-500/30" />
              <p className="font-mono text-xs text-muted-foreground/50 uppercase tracking-widest">No roasts yet</p>
              <p className="font-mono text-[11px] text-muted-foreground/40">Be the first to roast a project 🔥</p>
            </div>
          </div>
        )}

        {/* Row 1 – scrolls right (only when there's data) */}
        {recentRoasts.length > 0 && (
          <div className="relative overflow-hidden">
            <div className="flex gap-3 animate-scroll-right" style={{ width: "max-content" }}>
              {rowOne.map((r, i) => <RoastMarqueeCard key={`r1-${i}`} roast={r} />)}
            </div>
          </div>
        )}

        {/* Row 2 – scrolls left (only when there's data) */}
        {recentRoasts.length > 0 && (
          <div className="relative overflow-hidden">
            <div className="flex gap-3 animate-scroll-left" style={{ width: "max-content" }}>
              {rowTwo.map((r, i) => <RoastMarqueeCard key={`r2-${i}`} roast={r} />)}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}