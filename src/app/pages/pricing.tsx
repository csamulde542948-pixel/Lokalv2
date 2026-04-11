import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Moon, Sun, Github } from "lucide-react";
import { BrandLogo } from "../components/brand-logo";

// ─── Force dark mode on this standalone page ───────────────────────────────────
function useForceDark() {
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.className;
    root.classList.add("dark");
    return () => {
      root.className = prev;
      const saved = localStorage.getItem("theme");
      root.classList.toggle("dark", saved === "dark" || (!saved));
    };
  }, []);
}

// ─── Theme toggle (mirrors landing.tsx) ────────────────────────────────────────
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

// ─── Data ───────────────────────────────────────────────────────────────────────

const TIERS = [
  {
    id: "entry",
    slug: "launchpad.slot --duration=1d",
    label: "Entry",
    duration: "24 hours",
    price: 99,
    dailyRate: 99,
    savings: null as string | null,
    savingsAmount: null as number | null,
    originalTotal: null as number | null,
    tagline: "Launch day energy. No commitment. Ship it and see.",
    badge: null as string | null,
    highlight: false,
    bestValue: false,
  },
  {
    id: "standard",
    slug: "launchpad.slot --duration=7d",
    label: "Standard",
    duration: "7 days",
    price: 499,
    dailyRate: 71,
    savings: "28% off" as string | null,
    savingsAmount: 194 as number | null,
    originalTotal: 693 as number | null,
    tagline: "One week of prime placement. Good for beta feedback runs.",
    badge: null as string | null,
    highlight: false,
    bestValue: false,
  },
  {
    id: "presko",
    slug: "launchpad.slot --duration=15d --flag=presko",
    label: "Hot Seat",
    duration: "15 days",
    price: 899,
    dailyRate: 60,
    savings: "39% off" as string | null,
    savingsAmount: 586 as number | null,
    originalTotal: 1485 as number | null,
    tagline: "Sweet spot. Two weeks is where most projects get traction.",
    badge: "most popular" as string | null,
    highlight: true,
    bestValue: false,
  },
  {
    id: "best-value",
    slug: "launchpad.slot --duration=30d --flag=best-value",
    label: "Best Value",
    duration: "30 days",
    price: 1499,
    dailyRate: 50,
    savings: "50% off" as string | null,
    savingsAmount: 1471 as number | null,
    originalTotal: 2970 as number | null,
    tagline: "Full month of visibility. Serious projects, maximum ROI.",
    badge: "best roi" as string | null,
    highlight: false,
    bestValue: true,
  },
];

const INCLUDED = [
  "Featured position in the Launchpad feed",
  "Pinned to top for your entire slot duration",
  "Visible to all lokalhost members",
  "Interest tracking & engagement analytics",
  "Direct link to your project or external URL",
  "Community comments & reaction support",
];

const FAQS = [
  {
    q: "When does my slot go live?",
    a: "Immediately after payment is confirmed by Paddle. No manual review needed.",
  },
  {
    q: "Can I extend or stack slots?",
    a: "Yes — buy a new slot before your current one expires and it stacks seamlessly on top.",
  },
  {
    q: "What currency are prices in?",
    a: "Philippine Pesos (PHP / ₱). Paddle handles currency conversion automatically for international buyers.",
  },
  {
    q: "Is there a refund if my slot hasn't started?",
    a: "Yes — slots that haven't gone live yet are fully refundable. Once impressions begin, no refund is available.",
  },
  {
    q: "Who processes my payment?",
    a: "Paddle.com acts as Merchant of Record. Your card details never touch lokalhost servers.",
  },
  {
    q: "Can I target a specific audience?",
    a: "Your project reaches the entire lokalhost community — every active Filipino dev and builder on the platform. No algorithmic filtering, no demographic gates. Direct visibility.",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function peso(n: number) {
  return `₱${n.toLocaleString("en-PH")}`;
}

// ─── TermCard — CMD/terminal window card (mirrors landing.tsx) ─────────────────

function TermCard({
  title = "terminal",
  children,
  className = "",
  variant = "default",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "popular" | "best";
}) {
  const wrapperCls =
    variant === "popular"
      ? "border-primary/50 ring-1 ring-primary/25 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.55),0_0_40px_-5px] shadow-primary/25 bg-card/60 backdrop-blur-sm"
      : variant === "best"
      ? "border-blue-500/40 ring-1 ring-blue-500/20 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.55),0_0_30px_-5px] shadow-blue-500/15 bg-card/60 backdrop-blur-sm"
      : "border-border/60 hover:border-primary/30 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.45)] hover:shadow-[0_8px_28px_-4px_rgba(0,0,0,0.55)] bg-card/50 backdrop-blur-sm transition-shadow";

  const headerCls =
    variant === "popular"
      ? "bg-primary/15 border-primary/30"
      : variant === "best"
      ? "bg-blue-500/10 border-blue-500/20"
      : "bg-muted/30 border-border/40";

  const hashCls =
    variant === "popular"
      ? "text-primary"
      : variant === "best"
      ? "text-blue-400"
      : "text-muted-foreground/50";

  const titleCls =
    variant === "popular"
      ? "text-primary"
      : variant === "best"
      ? "text-blue-400"
      : "text-foreground";

  return (
    <div className={`rounded-lg border overflow-hidden transition-all h-full ${wrapperCls} ${className}`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${headerCls}`}>
        <span className={`font-mono font-black text-sm leading-none ${hashCls}`}>&gt;_</span>
        <span className={`text-sm font-bold font-mono tracking-wide ${titleCls}`}>{title}</span>
      </div>
      <div className="bg-transparent p-5 text-sm font-mono">{children}</div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export function Pricing() {
  useForceDark();
  const { theme, toggle } = useTheme();

  return (
    <div className="relative min-h-screen bg-background text-foreground font-mono overflow-x-hidden">
      {/* Page-level gradient — spans hero + cards */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/8 rounded-full blur-[130px]" />
      </div>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="sm" showText linkTo="/" />
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
            <a href="#plans" className="hover:text-foreground transition-colors">Plans</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px]" />}
            </button>
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 h-9 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:opacity-90 transition-opacity"
            >
              Launch App <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-16 pb-10 sm:pt-24 sm:pb-14">
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.1] mb-4">
            Get your project seen by{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-red-500">
              Filipino devs
            </span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Featured slots pin your project at the top of the Launchpad feed —
            lokalhost's discovery hub for indie builders. Pick your window and ship.
          </p>
        </div>
      </section>

      {/* ── Tier Cards ── */}
      <div id="plans" className="max-w-5xl mx-auto px-4 sm:px-6 pt-2 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
          {TIERS.map((tier) => {
            const variant = tier.highlight ? "popular" : tier.bestValue ? "best" : "default";
            return (
              <div key={tier.id} className={`flex flex-col ${tier.highlight ? "lg:-mt-6" : ""}`}>
                <TermCard
                  title={tier.badge ?? tier.label.toLowerCase()}
                  variant={variant}
                  className="flex flex-col"
                >
                  <div className={`flex flex-col flex-1 ${tier.highlight ? "gap-0" : ""}`}>
                    {/* Name + duration */}
                    <div className="flex items-baseline justify-between mb-3">
                      <p className="font-bold text-base text-foreground">{tier.label}</p>
                      <p className="text-[11px] text-muted-foreground">{tier.duration}</p>
                    </div>

                    {/* Price */}
                    <p className={`text-4xl font-black tracking-tight leading-none mb-2 ${
                      tier.highlight ? "text-primary" : tier.bestValue ? "text-blue-400" : "text-foreground"
                    }`}>
                      {peso(tier.price)}
                    </p>

                    {/* Daily rate + % off */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">{peso(tier.dailyRate)}/day</span>
                      {tier.savings && (
                        <span className="text-[10px] font-bold text-green-400">{tier.savings}</span>
                      )}
                    </div>

                    {/* Strikethrough + save — fixed height so all cards align */}
                    <div className="h-5 mb-4">
                      {tier.originalTotal && tier.savingsAmount && (
                        <p className="text-[11px] font-mono">
                          <span className="line-through text-muted-foreground/40">{peso(tier.originalTotal)}</span>
                          <span className="ml-2 text-green-400 font-semibold">save {peso(tier.savingsAmount)}</span>
                        </p>
                      )}
                    </div>

                    {/* Tagline */}
                    <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-5 min-h-[48px]">
                      {tier.tagline}
                    </p>

                    {/* CTA */}
                    <button
                      className={`w-full text-xs font-bold font-mono py-3 px-3 rounded-md transition-all ${
                        tier.highlight
                          ? "bg-primary text-primary-foreground hover:opacity-90 shadow-[0_4px_14px_rgba(255,102,0,0.35)]"
                          : tier.bestValue
                          ? "bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25"
                          : "border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
                      }`}
                    >
                      Get {tier.duration} slot
                    </button>
                  </div>
                </TermCard>
              </div>
            );
          })}
        </div>

        {/* Trust strip */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            Secure checkout via Paddle
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            Payment info never touches our servers
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            Full refund before slot goes live
          </span>
        </div>
      </div>

      {/* ── What's Included ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <TermCard title="cat slot-features.md" className="">
          <p className="text-[10px] font-bold text-primary tracking-widest uppercase mb-4">
            // every slot includes
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {INCLUDED.map((item) => (
              <p key={item} className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-primary">✓ </span>{item}
              </p>
            ))}
          </div>
        </TermCard>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <p className="text-xs font-bold text-primary tracking-widest uppercase mb-6">
          // frequently asked questions
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FAQS.map(({ q, a }) => (
            <TermCard key={q} title={`faq: ${q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`}>
              <p className="text-xs font-bold text-foreground mb-2">
                <span className="text-primary">Q</span> {q}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="text-muted-foreground/40">A </span>{a}
              </p>
            </TermCard>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
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
              <Link to="/refund-policy"  className="hover:text-foreground transition-colors">Refunds</Link>
              <a href="mailto:legal@lokalhost.club" className="hover:text-foreground transition-colors">Legal</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1">
                <Github className="w-3.5 h-3.5" /> GitHub
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              Made with &#x1F525; by Filipino developers &middot; &copy; 2026
            </p>
          </div>

          <p className="text-center text-[10px] text-muted-foreground/40 mt-4">
            Payments processed by Paddle.com &middot; AI Roast outputs are satirical and do not represent factual assessments.{" "}
            <Link to="/terms#ai-content" className="hover:text-muted-foreground/70 underline transition-colors">AI Disclaimer</Link>
          </p>
        </div>
      </footer>

    </div>
  );
}
