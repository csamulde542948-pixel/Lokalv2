// â”€â”€â”€ Landing Page â€” lokalhost.club â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Positioning: The uncensored dev social platform. Anti-Facebook. PH-first, global reach.
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import { BrandLogo } from "../components/brand-logo";
import {
  Flame,
  ArrowRight,
  Moon,
  Sun,
  Terminal,
  Github,
} from "lucide-react";

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/*  UTILITIES                                                                */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial = saved || "dark";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return { theme, toggle };
}

function FadeIn({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ASCII MASCOT — Linus Torvalds                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

const DENSITY_RAMP = " `.-':_,^=;><+!rc*/z?sLTv)J7(|Fi{C}fI31tlu[neoZ5Yxjya]2ESwqkP6h9d4VpOGbUAKXHm8RD#$Bg0MNWQ%&@";
const CODE_GLYPHS  = "01{}()<>/\\|;:=+*#@$!?~%^&_";

function TypingText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;
    const start = () => {
      timer = setInterval(() => {
        idx++;
        setDisplay(text.slice(0, idx));
        if (idx >= text.length) clearInterval(timer);
      }, 70);
    };
    const d = setTimeout(start, delay);
    return () => { clearTimeout(d); clearInterval(timer); };
  }, [text, delay]);
  return <>{display}<span className="animate-pulse">_</span></>;
}

function Mascot({ className = "" }: { className?: string }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const animRef     = useRef<number>(0);
  const gridRef     = useRef<{
    finalChar: string;
    r: number; g: number; b: number; a: number;
    px: number; py: number;
    delay: number;
    done: boolean;
  }[]>([]);
  const startTimeRef = useRef<number>(0);
  const [loaded, setLoaded] = useState(false);

  const FONT_SIZE   = 7;
  const CELL_SIZE   = 4;
  const CANVAS_SIZE = 440;

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.textBaseline = "top";

    const elapsed = performance.now() - startTimeRef.current;
    const grid    = gridRef.current;
    const CLEN    = CODE_GLYPHS.length;
    const RLEN    = DENSITY_RAMP.length;
    let allDone   = true;

    for (let i = 0; i < grid.length; i++) {
      const c = grid[i];
      const t = elapsed - c.delay;

      if (t < 0) {
        allDone = false;
        if (t > -400 && Math.random() > 0.96) {
          ctx.font      = `bold ${FONT_SIZE}px 'JetBrains Mono',monospace`;
          ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.06)`;
          ctx.fillText(CODE_GLYPHS[Math.floor(Math.random() * CLEN)], c.px, c.py);
        }
        continue;
      }

      if (!c.done) allDone = false;

      if (t < 300) {
        ctx.font      = `bold ${FONT_SIZE}px 'JetBrains Mono',monospace`;
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.08)`;
        ctx.fillText(CODE_GLYPHS[Math.floor(Math.random() * CLEN)], c.px, c.py);
        continue;
      }

      if (t < 600) {
        const p = (t - 300) / 300;
        ctx.font      = `bold ${FONT_SIZE}px 'JetBrains Mono',monospace`;
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${(c.a / 255 * p).toFixed(2)})`;
        ctx.fillText(
          Math.random() < p
            ? c.finalChar
            : CODE_GLYPHS[Math.floor(Math.random() * CLEN)],
          c.px, c.py,
        );
        continue;
      }

      c.done = true;
      ctx.font      = `bold ${FONT_SIZE}px 'JetBrains Mono',monospace`;
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${(c.a / 255).toFixed(2)})`;
      ctx.fillText(
        Math.random() > 0.998
          ? DENSITY_RAMP[Math.floor(Math.random() * RLEN)]
          : c.finalChar,
        c.px, c.py,
      );
    }

    if (!allDone) {
      animRef.current = requestAnimationFrame(drawFrame);
    }
  }, []);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/linus.png";

    img.onload = () => {
      setLoaded(true);

      const cols = Math.floor(CANVAS_SIZE / CELL_SIZE);
      const rows = Math.floor(CANVAS_SIZE / CELL_SIZE);
      const off  = document.createElement("canvas");
      off.width  = cols;
      off.height = rows;
      const oc   = off.getContext("2d")!;
      oc.drawImage(img, 0, 0, cols, rows);
      const px   = oc.getImageData(0, 0, cols, rows).data;

      const grid: typeof gridRef.current = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = (row * cols + col) * 4;
          const r = px[idx], g = px[idx + 1], b = px[idx + 2], a = px[idx + 3];
          if (a < 20) continue;

          const lum     = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const rampIdx = Math.floor(lum * (DENSITY_RAMP.length - 1));

          grid.push({
            finalChar: DENSITY_RAMP[rampIdx],
            r, g, b, a,
            px: col * CELL_SIZE,
            py: row * CELL_SIZE,
            delay: row * 18 + Math.random() * 300,
            done: false,
          });
        }
      }

      gridRef.current      = grid;
      startTimeRef.current = performance.now();
      animRef.current      = requestAnimationFrame(drawFrame);
    };

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [drawFrame]);

  return (
    <div className={`relative select-none ${className}`} aria-hidden>
      <div style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="relative z-10 block"
        />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="text-center">
              <Terminal className="w-8 h-8 text-primary/40 mx-auto mb-2 animate-pulse" />
              <span className="text-primary/60 font-mono text-xs">generating...</span>
            </div>
          </div>
        )}
      </div>
      <div className="text-center mt-3">
        <p className="text-sm font-bold font-mono text-foreground">
          <TypingText text="Linus Torvalds" delay={800} />
        </p>
      </div>
    </div>
  );
}
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/*  TERMINAL CARD â€” Kali-style terminal window component                     */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function TermCard({
  title = "terminal",
  children,
  className = "",
  accent = false,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-lg border overflow-hidden transition-all h-full ${
      accent
        ? "border-primary/40 ring-1 ring-primary/20 shadow-[0_0_30px_-5px] shadow-primary/15"
        : "border-border/60 hover:border-primary/30"
    } ${className}`}>
      {/* >_ cmd header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40 bg-muted/30">
        <span className="text-primary font-mono font-bold text-xs">&gt;_</span>
        <span className="text-[10px] font-mono text-muted-foreground truncate">{title}</span>
      </div>
      {/* Body */}
      <div className="bg-card p-4 text-sm font-mono">
        {children}
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/*  ROAST MARQUEE                                                            */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

interface RoastCard { name: string; url: string; snippet: string; }

const ROAST_CARDS: RoastCard[] = [
  { name: "MyAwesomeApp", url: "https://myawesomeapp.com", snippet: "Design from 2005 called, it wants its gradients back." },
  { name: "PinoyStartup", url: "https://pinoystartup.ph", snippet: "Too many fonts, too little sense. Pick a lane, pre!" },
  { name: "TechBro SaaS", url: "https://techbrosaas.io", snippet: "Generic SaaS template #4729. Where's the personality?" },
  { name: "SuperPortfolio", url: "https://superportfolio.dev", snippet: "Autoplay music in 2026? Brave but terrible choice." },
  { name: "LokalShop PH", url: "https://lokalshop.ph", snippet: "Actually decent! May improvement pa pero goods na." },
  { name: "BudgetBuddy", url: "https://budgetbuddy.app", snippet: "The UI is functional but the colors? Questionable." },
  { name: "DevHub Manila", url: "https://devhubmanila.com", snippet: "Loading for 10 seconds? Users don't have all day, pre." },
  { name: "CraftCafe PH", url: "https://craftcafe.ph", snippet: "Beautiful design, terrible UX. Beauty without brains." },
  { name: "FreelancerHQ", url: "https://freelancerhq.ph", snippet: "Clean and functional. But where's the Filipino flavor?" },
  { name: "AI Tutor PH", url: "https://aitutorph.com", snippet: "The chatbot has more personality than your landing page." },
];


function MarqueeCard({ card }: { card: RoastCard }) {
  return (
    <div className="flex-shrink-0 w-[280px] rounded-lg border border-border/60 overflow-hidden transition-all hover:scale-[1.02] hover:border-primary/30">
      {/* >_ cmd header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40 bg-muted/30">
        <span className="text-primary font-mono font-bold text-[10px]">&gt;_</span>
        <span className="text-[9px] font-mono text-muted-foreground truncate">{card.url.replace(/^https?:\/\//, '')} has been roasted</span>
      </div>
      {/* Body */}
      <div className="bg-card p-3 font-mono">
        <a
          href={card.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-xs text-primary hover:underline truncate block mb-1.5"
        >
          {card.name}
        </a>
        <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
          <span className="text-primary/70">$ </span>{card.snippet}
        </p>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/*  DATA                                                                     */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const APP_URL = "https://app.lokalhost.club";

const FEATURES = [
  {
    title: "Project Roaster",
    desc: "Paste any URL. Loki AI gives brutally honest Pinoy Style feedback on design, UX, copy, performance. No feelings spared. No post removed.",
    highlighted: true,
  },
  {
    title: "Dev Feed",
    desc: "Share your side projects, ask for feedback, post memes, rant about bugs. Your post goes live instantly. No mods gatekeeping you.",
  },
  {
    title: "Launchpad",
    desc: "Ship your project and let the community upvote it. Like Product Hunt pero walang paywall. Get featured, get users, get roasted.",
    tier2: true,
  },
  {
    title: "XP & Leaderboard",
    desc: "Earn XP for every post, comment, roast, and launch. Climb the ranks from Intern to CTO. Flex your grind, not just your LinkedIn title.",
    tier2: true,
  },
  {
    title: "UI/UX & Design Welcome",
    desc: "Not just for backend bros. Designers, frontend devs, creative coders \u2014 this is your space too. Show your Figma, share your process.",
  },
  {
    title: "Real Community",
    desc: "Follow devs, DMs, real-time chat, notifications. The full social platform \u2014 built for people who actually build things.",
  },
];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/*  MAIN COMPONENT                                                           */
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export function Landing() {
  const { theme, toggle } = useTheme();
  const [projectUrl, setProjectUrl] = useState("");
  const [roastConsent, setRoastConsent] = useState(false);
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const doubled = [...ROAST_CARDS, ...ROAST_CARDS];
  const reversed = [...[...ROAST_CARDS].reverse(), ...[...ROAST_CARDS].reverse()];

  const handleRoast = () => {
    const url = projectUrl.trim();
    if (!url) return;
    window.location.href = `/roast?url=${encodeURIComponent(url)}`;
  };

  const handleBetaSignup = () => {
    if (!email.trim()) return;
    // TODO: wire to Supabase or email list service
    setJoined(true);
    setTimeout(() => setJoined(false), 4000);
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden font-mono">

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/*  NAVBAR                                                          */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}

      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" showText linkTo="/" />
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#manifesto" className="hover:text-foreground transition-colors">Manifesto</a>
            <a href="#beta" className="hover:text-foreground transition-colors">Early Access</a>
            <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
            </button>
            <a
              href={APP_URL}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 h-9 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:opacity-90 transition-opacity"
            >
              Launch App <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/*  HERO â”€ The Problem + The Promise                                */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}

      <section className="relative pt-12 pb-8 sm:pt-20 sm:pb-12 overflow-x-clip">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/8 rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 overflow-visible">
          {/* Text left (65%) + Mascot right (35%) â€” mascot allowed to overflow */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-6 overflow-visible">

            {/* â”€â”€ Left: Text content (65%) â”€â”€ */}
            <div className="lg:w-[65%] min-w-0 text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-4">
                Ship your work.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-red-500">
                  Get roasted.
                </span>{" "}
                Build anyway.
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-4 leading-relaxed lg:mx-0 mx-auto">
                The <span className="text-foreground font-bold">uncensored social platform</span> for developers, designers &amp; builders.
                Share projects, get brutally honest AI feedback in Pinoy Style, climb the ranks.
                <span className="text-primary font-semibold"> No mod approval needed.</span>
              </p>

              <blockquote className="border-l-4 border-primary/60 pl-4 mb-8 text-left lg:mx-0 mx-auto max-w-xl">
                <p className="text-base sm:text-lg font-semibold text-foreground leading-snug">
                  &ldquo;Na-suspend account ko sa FB for sharing our startup website.&rdquo;
                </p>
                <footer className="text-sm text-muted-foreground mt-1">
                  &mdash; Sound familiar? &#x1F643; You belong here.
                </footer>
              </blockquote>

              {/* Hero roast input */}
              <div className="max-w-xl mb-6 lg:mx-0 mx-auto">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
                    <input
                      type="url"
                      placeholder="https://yourproject.com"
                      value={projectUrl}
                      onChange={e => setProjectUrl(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && roastConsent && handleRoast()}
                      className="w-full h-12 pl-10 pr-4 rounded-lg border bg-card text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleRoast}
                    disabled={!projectUrl.trim() || !roastConsent}
                    className="h-12 px-6 bg-primary text-primary-foreground font-bold rounded-lg text-sm flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <Flame className="w-4 h-4" /> Roast It
                  </button>
                </div>

                {/* Consent checkbox */}
                <label className="flex items-start gap-2 mt-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={roastConsent}
                    onChange={e => setRoastConsent(e.target.checked)}
                    className="mt-0.5 flex-shrink-0 accent-orange-500 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] text-muted-foreground/70 leading-relaxed group-hover:text-muted-foreground transition-colors">
                    I own this project (or have the owner's permission) and understand this roast is{" "}
                    <strong className="text-muted-foreground/90">AI-generated satire</strong>, not factual assessment.{" "}
                    <Link to="/terms#ai-roast" className="text-primary/70 hover:text-primary underline transition-colors">Learn more</Link>.
                  </span>
                </label>

                <p className="text-sm font-semibold text-foreground/80 mt-2 flex items-center gap-1">
                  Free. No signup required to try. Loki AI will be honest &mdash; <span className="text-primary font-bold italic">walang awa</span>. &#x1F525;
                </p>
              </div>


            </div>

            {/* â”€â”€ Right: ASCII Linus (35%) â€” native size, overflow OK â”€â”€ */}
            <div className="hidden lg:flex lg:w-[35%] flex-shrink-0 items-center justify-center">
              <Mascot />
            </div>

            {/* Mobile: show mascot above (centered, smaller) */}
            <div className="flex lg:hidden justify-center mb-6 -order-1">
              <Mascot className="scale-[0.6] origin-top" />
            </div>
          </div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/*  ROAST MARQUEE TICKER                                            */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}

      <section className="py-8 sm:py-12 border-y overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-4">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            LIVE ROASTS &mdash; what Loki thinks of your projects
          </p>
        </div>

        <div className="relative overflow-hidden mb-3">
          <div className="flex gap-3 animate-scroll-right" style={{ width: "max-content" }}>
            {doubled.map((c, i) => <MarqueeCard key={`r1-${i}`} card={c} />)}
          </div>
        </div>
        <div className="relative overflow-hidden">
          <div className="flex gap-3 animate-scroll-left" style={{ width: "max-content" }}>
            {reversed.map((c, i) => <MarqueeCard key={`r2-${i}`} card={c} />)}
          </div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/*  FEATURES                                                        */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}

      <section id="features" className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <FadeIn className="text-center mb-14">
            <p className="text-xs font-bold text-primary tracking-widest uppercase mb-2">The Platform</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              The roaster. The feed. The launchpad. Your dev home.
            </h2>
            <p className="text-muted-foreground mt-3 max-w-lg mx-auto text-sm">
              The social platform Facebook groups wish they were. Built by devs, for devs &mdash; walang censorship.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 80}>
                <TermCard
                  title={f.title.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-")}
                  accent={f.highlighted || f.tier2}
                >
                  {f.highlighted && (
                    <div className="mb-3">
                      <span className="px-2 py-0.5 rounded bg-primary text-primary-foreground text-[10px] font-bold tracking-wide uppercase">
                        flagship
                      </span>
                    </div>
                  )}
                  {f.tier2 && (
                    <div className="mb-3">
                      <span className="px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 text-[10px] font-bold tracking-wide uppercase">
                        key feature
                      </span>
                    </div>
                  )}

                  <h3 className="font-bold text-sm mb-1.5 text-foreground">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                </TermCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/*  MANIFESTO                                                       */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}

      <section id="manifesto" className="py-16 sm:py-24 border-t bg-muted/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <FadeIn>
            <div className="text-center mb-8">
              <p className="text-xs font-bold text-primary tracking-widest uppercase mb-2">Manifesto</p>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                This is for the builders. &#x1F6E0;&#xFE0F;
              </h2>
            </div>

            <TermCard title="cat manifesto.md" className="mb-8">
              <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>
                  <span className="text-muted-foreground/50">01</span> You spent weeks building a project. You post it to a Facebook group.
                  <span className="text-red-500 font-semibold"> &quot;Your post is pending approval.&quot;</span> Three days later &mdash; still pending. Or worse: <span className="text-red-500 font-semibold">removed</span>.
                </p>
                <p>
                  <span className="text-muted-foreground/50">02</span> You shared your portfolio link on IT Philippines. <span className="text-red-500 font-semibold">Account suspended.</span>{" "}
                  For what? Sharing a website you built? Since when is that spam?
                </p>
                <p className="text-foreground/80 font-medium">
                  <span className="text-muted-foreground/50">03</span> We built lokalhost.club because we were tired of it.
                </p>
                <p>
                  <span className="text-muted-foreground/50">04</span> This is a platform where you can <span className="text-primary font-semibold">post your projects freely</span>,
                  get <span className="text-primary font-semibold">real feedback</span> (not empty &quot;nice po&quot; comments),
                  and actually <span className="text-primary font-semibold">grow as a developer</span> &mdash; without some random mod deciding your work isn&apos;t worthy of being seen.
                </p>
                <p className="text-foreground font-bold text-base">
                  <span className="text-muted-foreground/50">05</span> Developers deserve a social platform that doesn&apos;t treat them like spammers.
                  <span className="text-primary"> That&apos;s lokalhost.club.</span>
                </p>
              </div>
            </TermCard>

            <div className="flex flex-wrap gap-2 justify-center">
              {["IT Philippines", "Programming Philippines", "Developer Tambayan", "Pinoy Programmers", "Web Developers PH", "UI/UX Philippines"].map((g) => (
                <span key={g} className="px-3 py-1 rounded border border-border text-xs text-muted-foreground font-mono line-through decoration-red-500/40">
                  {g}
                </span>
              ))}
              <span className="px-3 py-1 rounded border-2 border-primary text-xs text-primary font-bold font-mono">
                lokalhost.club &#x2713;
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {/*  BETA CTA                                                        */}
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}

      <section id="beta" className="py-16 sm:py-24 border-t">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <FadeIn>
            <div className="w-16 h-16 rounded-lg bg-muted/50 border border-border flex items-center justify-center mx-auto mb-6">
              <span className="text-primary font-mono font-bold text-3xl">&gt;_</span>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-amber-500/30 bg-amber-500/5 text-xs text-amber-600 dark:text-amber-400 font-mono font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Early Access
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
              Founding members get roasted first. And ranked forever.
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-2 max-w-lg mx-auto">
              Get the <span className="text-foreground font-bold">Founding Lodi badge</span>,
              locked-in pricing for life, and your name in the first-ever lokalhost leaderboard.
            </p>
            <p className="text-xs text-muted-foreground mb-8 italic font-mono">
              Drop your email. We&apos;ll hit you up when it&apos;s time. No spam &mdash; ironic, we know. &#x1F60F;
            </p>


            {/* Primary CTA - roast now, instant value */}
            <div className="max-w-lg mx-auto mb-8">
              <p className="text-sm font-semibold text-foreground mb-3">
                Try the roaster right now &mdash; no signup needed:
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
                  <input
                    type="url"
                    placeholder="https://yourproject.com"
                    value={projectUrl}
                    onChange={e => setProjectUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && roastConsent && handleRoast()}
                    className="w-full h-12 pl-10 pr-4 rounded-lg border bg-card text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
                <button
                  onClick={handleRoast}
                  disabled={!projectUrl.trim() || !roastConsent}
                  className="h-12 px-6 bg-primary text-primary-foreground font-bold rounded-lg text-sm flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <Flame className="w-4 h-4" /> Roast It
                </button>
              </div>
              {/* Consent checkbox */}
              <label className="flex items-start gap-2 mt-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={roastConsent}
                  onChange={e => setRoastConsent(e.target.checked)}
                  className="mt-0.5 flex-shrink-0 accent-orange-500 w-3.5 h-3.5"
                />
                <span className="text-[11px] text-muted-foreground/70 leading-relaxed group-hover:text-muted-foreground transition-colors">
                  I own this project (or have the owner&apos;s permission) and understand this roast is{" "}
                  <strong className="text-muted-foreground/90">AI-generated satire</strong>, not factual assessment.{" "}
                  <Link to="/terms#ai-roast" className="text-primary/70 hover:text-primary underline transition-colors">Learn more</Link>.
                </span>
              </label>
            </div>

            {/* Secondary CTA - join early access */}
            <div className="border-t pt-8 mt-2">
              <p className="text-sm text-muted-foreground mb-4">
                Want the Founding Lodi badge? Drop your email and we&apos;ll let you know when spots open:
              </p>
              <div className="max-w-md mx-auto mb-6">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleBetaSignup()}
                    className="flex-1 h-12 px-4 rounded-lg border bg-card text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                  <button
                    onClick={handleBetaSignup}
                    disabled={!email.trim()}
                    className="h-12 px-6 bg-primary text-primary-foreground font-bold rounded-lg text-sm flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {joined ? <><span className="font-mono font-bold">&#x2713;</span> Joined!</> : <><span className="font-mono font-bold">&gt;_</span> Claim My Spot</>}
                  </button>
                </div>
                {joined && (
                  <p className="text-xs text-green-500 mt-2 font-semibold">
                    &#x2705; You&apos;re in! We&apos;ll notify you when early access opens.
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Or explore what&apos;s already live &rarr;{" "}
                <a href={APP_URL} className="text-primary font-semibold hover:underline">
                  Open the app
                </a>
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/*  FOOTER                                                          */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <footer className="border-t py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BrandLogo size="sm" showText={false} />
              <div className="text-left">
                <span className="font-semibold text-sm block">lokalhost<span style={{ color: "#ff6600" }}>.club</span></span>
                <span className="text-[10px] text-muted-foreground">The dev social platform. No BS.</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <Link to="/terms"          className="hover:text-foreground transition-colors">Terms</Link>
              <Link to="/privacy"        className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/cookie-policy"  className="hover:text-foreground transition-colors">Cookies</Link>
              <Link to="/acceptable-use" className="hover:text-foreground transition-colors">Acceptable Use</Link>
              <a href="mailto:legal@lokalhost.club" className="hover:text-foreground transition-colors">Legal</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1">
                <Github className="w-3.5 h-3.5" /> GitHub
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              Made with &#x1F525; by Filipino developers &middot; &copy; 2026
            </p>
          </div>

          {/* Legal micro-note */}
          <p className="text-center text-[10px] text-muted-foreground/40 mt-4">
            AI Roast outputs are satirical and do not represent factual assessments.{" "}
            <Link to="/terms#ai-content" className="hover:text-muted-foreground/70 underline transition-colors">AI Disclaimer</Link>
          </p>
        </div>
      </footer>

    </div>
  );
}
