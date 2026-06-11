import { useState, useEffect, useMemo } from "react";
import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Flame, Palette, Globe, Languages } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { useAuth } from "../../contexts/AuthContext";
import { AsciiFireAnimation, ScrambleLine, useScramble } from "../components/ascii-fire";

const ROAST_MAINTENANCE = import.meta.env.PROD;

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_RECENT_ROASTS = gql`
  query GetRecentRoasts {
    recentRoastGenerations(limit: 10) {
      id
      quickRoast
      projectName
      projectUrl
      faviconUrl
      createdAt
      author {
        id
        name
        avatarUrl
      }
    }
  }
`;

const GET_RECENT_BRAND_ANALYSES = gql`
  query GetRecentBrandAnalyses {
    recentBrandAnalyses(limit: 10) {
      id
      title
      projectName
      projectUrl
      faviconUrl
      createdAt
      author {
        id
        name
        avatarUrl
      }
    }
  }
`;

// Lightweight viewer-geo probe — returns the CDN-injected ISO country
// code. Always resolves (falls back to "PH" server-side) so we can
// safely default the roast language on first paint.
const GET_VIEWER_GEO = gql`
  query GetViewerGeo {
    viewerGeo {
      country
    }
  }
`;

// All-time platform totals — powers the rotating category counter
// (shows "# 1.2k <noun> roasted & analyzed").
const GET_ROAST_STATS = gql`
  query GetRoastStats {
    roastStats {
      totalRoasts
      totalBrandAnalyses
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecentRoast {
  id: string;
  quickRoast: string;
  projectName: string;
  projectUrl: string;
  faviconUrl: string | null;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
}

interface RecentBrandAnalysis {
  id: string;
  title: string;
  projectName: string;
  projectUrl: string;
  faviconUrl: string | null;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
}

type RoastLanguage = "taglish" | "english";
const LANG_STORAGE_KEY = "lokal_roast_language_v1";
const PH_COUNTRIES = new Set(["PH"]);

/** Read the user's saved language override, or null if not set. */
function readSavedLanguage(): RoastLanguage | null {
  try {
    const v = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (v === "taglish" || v === "english") return v;
  } catch {}
  return null;
}

/** Persist the user's language override so the choice survives reloads. */
function writeSavedLanguage(lang: RoastLanguage) {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {}
}

/** Pick the default language from the viewer's country. */
function defaultLanguageFor(country: string | null | undefined): RoastLanguage {
  if (!country) return "taglish";
  return PH_COUNTRIES.has(country.toUpperCase()) ? "taglish" : "english";
}

// ─── Animated Category Counter ─────────────────────────────────────────────────
// Shows the all-time total of roasted+analysed URLs (# 1.2k) and
// animates the noun after the number — cycling through websites →
// startups → portfolios → repos on a 2.4s loop with a scramble-text
// transition matching the hero tagline animation.

const ROTATING_NOUNS = [
  { word: "websites",  colorClass: "text-orange-400" },
  { word: "startups",  colorClass: "text-amber-400"  },
  { word: "portfolios", colorClass: "text-cyan-400"  },
  { word: "repos",     colorClass: "text-emerald-400" },
] as const;

const NOUN_ROTATION_MS = 2400;

function AnimatedCategoryCounter({ total, favicons }: { total: number; favicons: { url: string; domain: string }[] }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % ROTATING_NOUNS.length);
    }, NOUN_ROTATION_MS);
    return () => clearInterval(t);
  }, []);

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : n.toLocaleString();

  const { word, colorClass } = ROTATING_NOUNS[idx];
  const display = useScramble(word, idx);
  const favSrc = (f: { url: string; domain: string }) =>
    f.url || `https://www.google.com/s2/favicons?domain=${f.domain}&sz=32`;

  return (
    <div
      className="flex items-center gap-2 font-mono text-sm text-muted-foreground/60 w-fit mx-auto"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Stacked favicon circles */}
      {favicons.length > 0 && (
        <div className="flex items-center -space-x-1.5 mr-1.5">
          {favicons.map((f, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full border border-border/50 bg-card overflow-hidden flex-shrink-0"
              style={{ zIndex: favicons.length - i }}
            >
              <img
                src={favSrc(f)}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          ))}
          <span className="text-[10px] font-black text-orange-400 ml-0.5 flex-shrink-0" style={{ zIndex: 0 }}>
            +
          </span>
        </div>
      )}
      <span className="text-orange-400 font-bold tabular-nums">{fmt(total)}+</span>
      <span className={`${colorClass} font-semibold normal-case tracking-wider`}>
        {display}
      </span>
      <span>roasted & analyzed</span>
    </div>
  );
}

// Small inline tag for the current roast language (🇵🇭 taglish / 🇬🇧 english).
function LanguageTag({ lang }: { lang: RoastLanguage }) {
  if (lang === "taglish") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-orange-500/30 bg-orange-500/10 text-orange-300 font-bold uppercase tracking-wider text-[9px]">
        <span aria-hidden>🇵🇭</span> taglish
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-bold uppercase tracking-wider text-[9px]">
      <Globe className="w-2.5 h-2.5" /> english
    </span>
  );
}


// ─── Marquee Card ─────────────────────────────────────────────────────────────────────────────

function RoastMarqueeCard({ roast }: { roast: RecentRoast }) {
  const displayUrl = roast.projectUrl.replace(/^https?:\/\//, '');
  const faviconSrc = roast.faviconUrl
    ?? `https://www.google.com/s2/favicons?domain=${displayUrl}&sz=32`;
  return (
    <Link
      to={`/roast/result/${roast.id}`}
      className="flex-shrink-0 w-[260px] rounded-none border border-border/50 overflow-hidden bg-card/80 hover:border-orange-500/30 transition-colors block"
    >
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40 bg-muted/20">
        <span className="text-orange-500 font-mono font-bold text-[10px]">&gt;_</span>
        <span className="text-[9px] font-mono text-muted-foreground truncate">{displayUrl}</span>
      </div>
      <div className="p-3 font-mono">
        <div className="flex items-center gap-2 mb-1.5">
          <img
            src={faviconSrc}
            alt=""
            className="w-4 h-4 flex-shrink-0"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <span className="font-semibold text-xs text-orange-400 truncate">
            {roast.projectName}
          </span>
        </div>
        {roast.quickRoast && (
          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
            <span className="text-orange-500/50">$ </span>{roast.quickRoast}
          </p>
        )}
      </div>
    </Link>
  );
}

function BrandMarqueeCard({ analysis }: { analysis: RecentBrandAnalysis }) {
  const displayUrl = analysis.projectUrl.replace(/^https?:\/\//, '');
  const faviconSrc = analysis.faviconUrl
    ?? `https://www.google.com/s2/favicons?domain=${displayUrl}&sz=32`;
  return (
    <Link
      to={`/roast/brand/${analysis.id}`}
      className="flex-shrink-0 w-[260px] rounded-none border border-border/50 overflow-hidden bg-card/80 hover:border-cyan-500/30 transition-colors block"
    >
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40 bg-muted/20">
        <span className="text-cyan-500 font-mono font-bold text-[10px]">#</span>
        <span className="text-[9px] font-mono text-muted-foreground truncate">{displayUrl}</span>
      </div>
      <div className="p-3 font-mono">
        <div className="flex items-center gap-2 mb-1.5">
          <img
            src={faviconSrc}
            alt=""
            className="w-4 h-4 flex-shrink-0"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <span className="font-semibold text-xs text-cyan-400 truncate">
            {analysis.projectName}
          </span>
        </div>
        {analysis.title && (
          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
            <span className="text-cyan-500/50">$ </span>{analysis.title}
          </p>
        )}
      </div>
    </Link>
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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projectUrl, setProjectUrl] = useState(() => searchParams.get("url") ?? "");
  const [toolMode, setToolMode] = useState<"roast" | "brand">("roast");
  const [roastConsent, setRoastConsent] = useState(false);
  const [consentShake, setConsentShake] = useState(false);

  // Roast language: defaults from viewer country (PH → taglish, else → english).
  // User override is persisted in localStorage so the choice survives reloads.
  const [language, setLanguageState] = useState<RoastLanguage>(() => {
    return readSavedLanguage() ?? "taglish";
  });
  const [languageAuto, setLanguageAuto] = useState<boolean>(() => readSavedLanguage() === null);

  const { data: geoData } = useQuery<{ viewerGeo: { country: string } }>(GET_VIEWER_GEO, {
    fetchPolicy: "cache-first",
  });

  // Once we know the viewer's country, auto-pick a default the first time
  // the user visits the page. We only auto-switch while the user hasn't
  // expressed an explicit preference (languageAuto = true).
  useEffect(() => {
    if (!languageAuto) return;
    const country = geoData?.viewerGeo?.country;
    if (!country) return;
    const next = defaultLanguageFor(country);
    if (next !== language) setLanguageState(next);
  }, [geoData, languageAuto, language]);

  const setLanguage = (next: RoastLanguage) => {
    setLanguageState(next);
    setLanguageAuto(false);
    writeSavedLanguage(next);
  };

  const triggerConsentShake = () => {
    setConsentShake(true);
    setTimeout(() => setConsentShake(false), 600);
  };

  // If url came in via query param, trigger immediately
  useEffect(() => {
    if (ROAST_MAINTENANCE) return;
    if (authLoading) return;
    let url = searchParams.get("url");
    if (url) {
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
      if (user) {
        navigate("/roast/result", { state: { projectUrl: url, tool: toolMode, language }, replace: true });
      }
    }
  }, [authLoading, navigate, searchParams, toolMode, user, language]);

  const { data: recentData } = useQuery<{ recentRoastGenerations: RecentRoast[] }>(GET_RECENT_ROASTS, {
    fetchPolicy: "cache-and-network",
  });

  const { data: recentBrandData } = useQuery<{ recentBrandAnalyses: RecentBrandAnalysis[] }>(GET_RECENT_BRAND_ANALYSES, {
    fetchPolicy: "cache-and-network",
  });

  const { data: statsData } = useQuery<{
    roastStats: { totalRoasts: number; totalBrandAnalyses: number };
  }>(GET_ROAST_STATS, { fetchPolicy: "cache-and-network" });

  const recentRoasts = recentData?.recentRoastGenerations ?? [];
  const recentBrands = recentBrandData?.recentBrandAnalyses ?? [];
  const loading = !recentData || !recentBrandData;

  // Duplicate for smooth infinite marquee
  const roastRow = recentRoasts.length >= 2
    ? [...recentRoasts, ...recentRoasts]
    : recentRoasts;
  const brandRow = recentBrands.length >= 2
    ? [...recentBrands, ...recentBrands]
    : recentBrands;

  // Collect up to 10 unique favicon sources for the counter bubble stack,
  // preferring actual favicon URLs and falling back to Google favicons.
  const faviconStack = useMemo(() => {
    const seen = new Set<string>();
    const stack: { url: string; domain: string }[] = [];
    const items = [...recentRoasts, ...recentBrands].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    for (const item of items) {
      const domain = item.projectUrl.replace(/^https?:\/\//, "").split("/")[0];
      if (seen.has(domain)) continue;
      seen.add(domain);
      stack.push({ url: item.faviconUrl ?? "", domain });
      if (stack.length >= 10) break;
    }
    return stack;
  }, [recentRoasts, recentBrands]);

  const handleRoast = () => {
    if (ROAST_MAINTENANCE) return;
    let url = projectUrl.trim();
    if (!url) return;
    // Auto-prepend https:// if the user omitted the protocol (common on mobile)
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    if (!roastConsent) {
      triggerConsentShake();
      return;
    }
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/roast", search: `?url=${encodeURIComponent(url)}` } } });
      return;
    }
    navigate("/roast/result", { state: { projectUrl: url, tool: toolMode, language } });
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
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setToolMode("roast")}
                className={`h-10 border font-mono text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
                  toolMode === "roast"
                    ? "border-orange-500/50 bg-orange-500/15 text-orange-300"
                    : "border-border/50 bg-background/30 text-muted-foreground/50 hover:text-foreground"
                }`}
              >
                <Flame className="w-3.5 h-3.5" /> Roast
              </button>
              <button
                type="button"
                onClick={() => setToolMode("brand")}
                className={`h-10 border font-mono text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
                  toolMode === "brand"
                    ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                    : "border-border/50 bg-background/30 text-muted-foreground/50 hover:text-foreground"
                }`}
              >
                <Palette className="w-3.5 h-3.5" /> Brand Analyzer
              </button>
            </div>
            {ROAST_MAINTENANCE && (
              <div className="mb-4 border border-orange-500/30 bg-orange-500/[0.08] px-4 py-3 text-left">
                <div className="flex items-start gap-3">
                  <Flame className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" strokeWidth={2} />
                  <div className="space-y-1">
                    <p className="font-mono text-xs font-black uppercase tracking-widest text-orange-300">
                      Roast engine under maintenance
                    </p>
                    <p className="font-mono text-[11px] leading-relaxed text-muted-foreground/70">
                      We are fixing bugs and preparing new tools and upcoming features.
                      Roast generation is temporarily disabled.
                    </p>
                  </div>
                </div>
              </div>
            )}
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
                disabled={ROAST_MAINTENANCE || !projectUrl.trim()}
                className="bg-orange-600 hover:bg-orange-500 active:bg-orange-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono font-bold text-xs sm:text-sm px-3 sm:px-5 py-3.5 flex items-center gap-1.5 sm:gap-2 transition-colors whitespace-nowrap flex-shrink-0"
                style={{ boxShadow: "0 0 18px rgba(234,88,12,0.35)" }}
              >
                <Flame className="w-4 h-4" strokeWidth={2} />
                <span className="hidden sm:inline">
                  {ROAST_MAINTENANCE ? "MAINTENANCE" : toolMode === "brand" ? "ANALYZE BRAND" : "GET ROASTED"}
                </span>
              </button>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground/40 mt-2 text-left pl-1">
              {toolMode === "brand"
                ? "Generate a formal design.md brand analysis from the landing page."
                : "Enter your landing page URL (e.g., your-sh*t.com)"}
            </p>

            {/* Roast language indicator — auto-picked from viewer country, user-overridable */}
            {toolMode === "roast" && (
              <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/50 pl-1">
                <Languages className="w-3 h-3" />
                <span>auto:</span>
                <LanguageTag lang={language} />
                {geoData?.viewerGeo?.country && (
                  <span className="text-muted-foreground/40">
                    ({languageAuto ? "detected" : "set"})
                  </span>
                )}
                <span className="text-muted-foreground/30">·</span>
                <button
                  type="button"
                  onClick={() => setLanguage(language === "taglish" ? "english" : "taglish")}
                  className="text-[10px] font-mono text-orange-400/80 hover:text-orange-300 underline-offset-2 hover:underline transition-colors"
                >
                  switch to {language === "taglish" ? "english" : "taglish"}
                </button>
              </div>
            )}

            {/* All-time rotating category counter — replaces the old credit pill */}
            {statsData?.roastStats && (
              <div className="mt-3">
                <AnimatedCategoryCounter
                  total={statsData.roastStats.totalRoasts + statsData.roastStats.totalBrandAnalyses}
                  favicons={faviconStack}
                />
              </div>
            )}

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
                      {" "}to generate and save your roast.{" "}
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
      <section id="live-roasts" className="relative z-[4] w-full border-t border-border/30 py-8 space-y-4 bg-background">
        <div className="container mx-auto px-4 mb-2">
          <div className="max-w-4xl mx-auto flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <p className="text-[10px] font-mono font-semibold text-muted-foreground uppercase tracking-widest">
              Recently Roasted & Analyzed
            </p>
          </div>
        </div>

        {/* Empty state */}
        {!loading && recentRoasts.length === 0 && recentBrands.length === 0 && (
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-12 border border-dashed border-border/40 text-center gap-3">
              <Flame className="w-8 h-8 text-orange-500/30" />
              <p className="font-mono text-xs text-muted-foreground/50 uppercase tracking-widest">No roasts yet</p>
              <p className="font-mono text-[11px] text-muted-foreground/40">Be the first to roast a project 🔥</p>
            </div>
          </div>
        )}

        {/* Row 1 – Roasted (scrolls right) */}
        {recentRoasts.length > 0 && (
          <div className="relative overflow-hidden">
            <div className="flex gap-3 animate-scroll-right" style={{ width: "max-content" }}>
              {roastRow.map((r, i) => <RoastMarqueeCard key={`r1-${i}`} roast={r} />)}
            </div>
          </div>
        )}

        {/* Row 2 – Brand Analyzed (scrolls left) */}
        {recentBrands.length > 0 && (
          <div className="relative overflow-hidden">
            <div className="flex gap-3 animate-scroll-left" style={{ width: "max-content" }}>
              {brandRow.map((b, i) => <BrandMarqueeCard key={`b1-${i}`} analysis={b} />)}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
