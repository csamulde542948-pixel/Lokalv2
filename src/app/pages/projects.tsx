// ─── Projects Page ──────────────────────────────────────────────────────────
// "Ship. Showcase. Get discovered." A portfolio wall for every project,
// startup, and side-project on the platform — GitHub repos, web apps,
// mobile apps, CLI tools. Brand-aligned: ASCII fire backdrop, monospace
// (JetBrains Mono) everywhere, orange primary, terminal-prefixed headings,
// corner crosshairs, scrim + dot-grid pattern over the fire.
import { useState, useEffect, useLayoutEffect, useMemo, useRef, forwardRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client/core";
import {
  Search,
  Star,
  GitFork,
  Github,
  Globe,
  Smartphone,
  Terminal,
  Package,
  Code2,
  Sparkles,
  TrendingUp,
  Plus,
  Layers,
  Award,
  Filter,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Crown,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../components/ui/sheet";
import { AddProjectDialog } from "../components/add-project-dialog";
import { AsciiFireAnimation } from "../components/ascii-fire";
import { useAuth } from "../../contexts/AuthContext";
import { adaptProjectAvatar } from "../../lib/defaults";

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GET_PROJECTS_PAGE = gql`
  query GetProjectsPage($filter: ProjectFilter, $category: ProjectCategory, $search: String, $limit: Int) {
    projects(filter: $filter, category: $category, search: $search, limit: $limit) {
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
      isVerified
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "ALL" | "WEB_APP" | "MOBILE_APP" | "LIBRARY" | "CLI_TOOL" | "PORTFOLIO" | "OTHER";
type QuickFilter = "FEATURED" | "TRENDING" | "GITHUB";

const CATEGORY_LABELS: Record<Category, string> = {
  ALL: "All",
  WEB_APP: "Web Apps",
  MOBILE_APP: "Mobile",
  LIBRARY: "Libraries",
  CLI_TOOL: "CLI Tools",
  PORTFOLIO: "Portfolios",
  OTHER: "Other",
};

const CATEGORY_ICONS: Record<Category, React.ElementType> = {
  ALL: Layers,
  WEB_APP: Globe,
  MOBILE_APP: Smartphone,
  LIBRARY: Package,
  CLI_TOOL: Terminal,
  PORTFOLIO: Award,
  OTHER: Code2,
};

// ─── Page ────────────────────────────────────────────────────────────────────

export function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const headerRef = useRef<HTMLElement>(null);

  // Measure the layout footer/tab bar so the fire layer's bottom edge
  // can sit flush with its top — preventing the footer from covering
  // the fire. Also measure the page header so the fixed sidebar can
  // start below it. Falls back to sensible defaults for SSR/no-JS.
  const [bottomOffset, setBottomOffset] = useState<number>(56);
  const [headerHeight, setHeaderHeight] = useState<number>(64);
  useLayoutEffect(() => {
    const measure = () => {
      const footer = document.querySelector<HTMLElement>("footer.fixed.bottom-0");
      const tabBar = document.querySelector<HTMLElement>("nav.fixed.bottom-0");
      const isDesktop = window.innerWidth >= 1024; // lg breakpoint
      const el = isDesktop ? footer : tabBar;
      if (el) {
        setBottomOffset(el.getBoundingClientRect().height);
      } else {
        setBottomOffset(isDesktop ? 60 : 56);
      }
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    if (headerRef.current) {
      const ro = new ResizeObserver(() => {
        if (headerRef.current) {
          setHeaderHeight(headerRef.current.offsetHeight);
        }
      });
      ro.observe(headerRef.current);
      return () => {
        window.removeEventListener("resize", measure);
        ro.disconnect();
      };
    }
    return () => window.removeEventListener("resize", measure);
  }, []);

  // URL-synced filter state — survives back/forward navigation
  const category = (searchParams.get("cat") as Category) ?? "ALL";
  const search = searchParams.get("q") ?? "";
  const quick = new Set<QuickFilter>(
    (searchParams.get("f")?.split(",").filter(Boolean) ?? []) as QuickFilter[]
  );

  const [searchInput, setSearchInput] = useState(search);

  // Filter updates flush to URL (replace, not push — no history spam)
  const setCategory = (c: Category) => {
    const sp = new URLSearchParams(searchParams);
    if (c === "ALL") sp.delete("cat"); else sp.set("cat", c);
    setSearchParams(sp, { replace: true });
  };
  const setQuick = (q: QuickFilter, on: boolean) => {
    const next = new Set(quick);
    if (on) next.add(q); else next.delete(q);
    const sp = new URLSearchParams(searchParams);
    if (next.size === 0) sp.delete("f"); else sp.set("f", [...next].join(","));
    setSearchParams(sp, { replace: true });
  };
  const setSearch = (q: string) => {
    const sp = new URLSearchParams(searchParams);
    if (!q.trim()) sp.delete("q"); else sp.set("q", q);
    setSearchParams(sp, { replace: true });
  };

  // Debounce search input → URL (200ms is the sweet spot for typing UX)
  useEffect(() => {
    if (searchInput === search) return;
    const t = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(t);
  }, [searchInput, search]);

  const filter = quick.has("FEATURED")
    ? "FEATURED"
    : quick.has("GITHUB")
      ? "GITHUB"
      : "ALL";

  const { data, loading, error, fetchMore } = useQuery(GET_PROJECTS_PAGE, {
    variables: {
      filter,
      category: category === "ALL" ? null : category,
      search: search.trim() || null,
      limit: 24,
    },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const projects: any[] = data?.projects ?? [];
  const trending = useMemo(
    () => projects.filter((p) => p.isTrending || p.isFeatured).slice(0, 6),
    [projects]
  );
  const rest = useMemo(
    () => projects.filter((p) => !trending.includes(p)),
    [projects, trending]
  );

  return (
    <div className="relative min-h-screen bg-background text-foreground font-mono overflow-x-hidden">
      {/* ── ATMOSPHERE LAYER ─────────────────────────────────────
          ASCII fire is a fixed background that fills the viewport
          area ABOVE the footer/tab bar. The fire's bottom edge is
          measured dynamically to sit flush with the top of the
          footer/tab bar — so the footer never covers the fire.
      ────────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-x-0 top-0 pointer-events-none z-0"
        style={{ bottom: `${bottomOffset}px` }}
      >
        <AsciiFireAnimation className="absolute inset-0" />
        <div className="absolute inset-0 bg-background/75" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* ── CONTENT LAYER (z-10) sits above the atmosphere ── */}
      <div className="relative z-10">
        <HeroHeader
          ref={headerRef}
          loading={loading}
          projectCount={projects.length}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          user={user}
          onCreated={(id) => navigate(`/project/${id}`)}
          trendingNames={trending.map((p) => p.name)}
        />

        <main
          className="w-full pb-8"
          style={{ paddingTop: `${headerHeight}px` }}
        >
          <div className="flex">
            {/* Desktop sidebar — fixed, starts below top nav + page header */}
            <FilterSidebar
              category={category}
              onCategory={setCategory}
              quick={quick}
              onQuick={setQuick}
              topOffset={64 + headerHeight}
              bottomOffset={bottomOffset}
            />

            <div className="flex-1 min-w-0 lg:pl-48 xl:pl-52">
              {/* Mobile filter button */}
              <MobileFilterButton
                category={category}
                onCategory={setCategory}
                quick={quick}
                onQuick={setQuick}
              />

              {/* Trending row (horizontal snap-scroll) */}
              <TrendingRow
                loading={loading && projects.length === 0}
                projects={trending}
              />

              {/* Project grid */}
              <ProjectGrid
                loading={loading}
                error={error}
                projects={rest}
                totalShown={projects.length}
                onLoadMore={() => fetchMore({ variables: { limit: (projects.length ?? 0) + 24 } })}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Hero Header ──────────────────────────────────────────────────────────────
// Page header: title + tagline + search + ship button.
// Fixed at the top of the page (below the 64px top nav).
// The ASCII fire lives in a fixed page-level atmosphere layer behind this.

const HeroHeader = forwardRef<
  HTMLElement,
  {
    loading: boolean;
    projectCount: number;
    searchInput: string;
    onSearchChange: (q: string) => void;
    user: any;
    onCreated: (id: string) => void;
    trendingNames: string[];
  }
>(function HeroHeader(
  { loading, projectCount, searchInput, onSearchChange, user, onCreated, trendingNames },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [shipOpen, setShipOpen] = useState(false);
  return (
    <section
      ref={ref}
      className="fixed left-0 right-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur-md"
      style={{ top: "4rem" }}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-2">
          <div className="flex items-baseline gap-2 min-w-0 flex-shrink-0">
            <span className="text-primary font-mono font-bold text-xs sm:text-sm select-none animate-pulse">
              {">_"}
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-none">
              <span className="text-foreground">projects</span>
              <span style={{ color: "#ff6600" }}>.wall</span>
            </h1>
          </div>

          {/* Trending text ticker — fills the space between title and ship button */}
          {trendingNames.length > 0 && (
            <div className="flex-1 min-w-0 hidden md:flex items-center gap-2 overflow-hidden border-l border-border/40 pl-4 h-6">
              <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-primary uppercase tracking-widest flex-shrink-0">
                <TrendingUp className="w-3 h-3" strokeWidth={2.5} />
                trending
              </span>
              <div className="relative flex-1 min-w-0 overflow-hidden">
                <div
                  className="flex gap-6 animate-scroll-left whitespace-nowrap"
                  style={{ width: "max-content" }}
                >
                  {[...trendingNames, ...trendingNames].map((name, i) => (
                    <span
                      key={i}
                      className="text-[11px] font-mono text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    >
                      <span className="text-primary/60 mr-1">›</span>
                      {name}
                    </span>
                  ))}
                </div>
                {/* Edge fade-out masks */}
                <div className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent pointer-events-none" />
              </div>
            </div>
          )}

          {/* Spacer pushes the ship button to the far right */}
          <div className="hidden md:block flex-1 min-w-0" />

          {user && (
            <button
              onClick={() => setShipOpen(true)}
              className="group flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground font-mono font-bold text-xs sm:text-sm shadow-[0_4px_24px_-4px] shadow-primary/40 hover:shadow-[0_8px_32px_-4px] hover:shadow-primary/60 transition-all hover:scale-[1.02] active:scale-[0.98] self-start sm:self-auto flex-shrink-0"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              ship your project
              <span className="hidden sm:inline text-[10px] opacity-70 font-normal ml-1">⌘N</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Search bar — terminal-styled (LEFT), wider, placeholder truncates */}
          <div
            className={`flex-1 sm:flex-none sm:w-96 lg:w-[28rem] flex items-center gap-2 bg-card/80 backdrop-blur-sm border rounded-md transition-all min-w-0 ${
              focused
                ? "border-primary/60 shadow-[0_0_0_3px] shadow-primary/15"
                : "border-border hover:border-primary/30"
            }`}
          >
            <span className="pl-3 text-primary font-mono font-bold text-sm select-none flex-shrink-0">
              {"$"}
            </span>
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0 relative h-10 flex items-center">
              <Input
                value={searchInput}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="grep projects by name, tag, or @owner..."
                className="w-full border-0 bg-transparent font-mono text-sm placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-10 text-ellipsis"
              />
            </div>
            {searchInput && (
              <button
                onClick={() => onSearchChange("")}
                className="mr-2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {loading && (
              <Loader2 className="w-4 h-4 text-primary animate-spin mr-3 flex-shrink-0" />
            )}
          </div>

          {/* Project counter (RIGHT) */}
          {projectCount > 0 && (
            <div className="sm:ml-auto flex items-baseline gap-2 text-xs font-mono text-muted-foreground whitespace-nowrap flex-shrink-0">
              <span className="text-primary font-bold text-base select-none">#</span>
              <span className="text-foreground font-bold tabular-nums text-base">
                {projectCount.toLocaleString()}
              </span>
              <span>
                project{projectCount !== 1 ? "s" : ""} shipped
              </span>
            </div>
          )}
        </div>
      </div>

      {user && (
        <AddProjectDialog
          open={shipOpen}
          onOpenChange={setShipOpen}
          onCreated={onCreated}
        />
      )}
    </section>
  );
});

// ─── Trending Row ─────────────────────────────────────────────────────────────

function TrendingRow({
  loading,
  projects,
}: {
  loading: boolean;
  projects: any[];
}) {
  if (loading) {
    return null;
  }
  if (projects.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="px-4 sm:px-6 mb-3">
        <SectionLabel icon={TrendingUp} label="trending now" badge={projects.length} />
      </div>
      <div
        className="flex gap-4 overflow-x-auto pb-3 px-4 sm:px-6 snap-x snap-mandatory"
        style={{ scrollbarWidth: "thin" }}
      >
        {projects.map((p, i) => (
          <div key={p.id} className="snap-start flex-shrink-0">
            <TrendingCard project={p} rank={i + 1} />
          </div>
        ))}
      </div>
    </section>
  );
}

function TrendingCard({ project: p, rank }: { project: any; rank: number }) {
  const Icon = CATEGORY_ICONS[(p.category as Category) ?? "OTHER"] ?? Code2;
  return (
    <Link
      to={`/project/${p.id}`}
      className="group flex flex-col w-80 sm:w-96 bg-card border border-border rounded-md overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-[0_4px_24px_-8px] hover:shadow-primary/30"
    >
      {/* Banner / screenshot area */}
      <div className="relative h-28 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden">
        {p.screenshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.screenshotUrl}
            alt={p.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-contain bg-card/50 group-hover:scale-[1.02] transition-all duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
              <Icon className="w-6 h-6 text-primary" strokeWidth={2} />
            </div>
          </div>
        )}
        {/* Rank badge */}
        {rank <= 3 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/85 backdrop-blur-sm border border-border/60">
            <Crown
              className={`w-3 h-3 ${
                rank === 1
                  ? "text-amber-400"
                  : rank === 2
                    ? "text-zinc-300"
                    : "text-orange-400"
              }`}
              strokeWidth={2.5}
            />
            <span className="text-[10px] font-mono font-bold text-foreground tabular-nums">
              #{rank}
            </span>
          </div>
        )}
        {/* Type badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {p.type === "GITHUB" && (
            <div className="px-1.5 py-0.5 rounded bg-background/85 backdrop-blur-sm border border-border/60">
              <Github className="w-3 h-3 text-foreground" />
            </div>
          )}
          {p.isTrending && (
            <div className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-mono font-bold text-emerald-500">
                HOT
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start gap-2 mb-1">
          <div className="w-8 h-8 rounded-md bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0 -mt-6 relative z-10 shadow-sm">
            {p.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.iconUrl}
                alt=""
                className="w-5 h-5 rounded"
              />
            ) : (
              <Icon className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-mono font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
              {p.name}
            </h3>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {p.tagline}
            </p>
          </div>
        </div>

        {/* Stats strip — pushed to bottom */}
        <div className="mt-auto flex items-center gap-3 text-[10px] text-muted-foreground font-mono pt-2">
          {p.starsCount > 0 && (
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="tabular-nums">{p.starsCount.toLocaleString()}</span>
            </span>
          )}
          {p.forksCount > 0 && (
            <span className="flex items-center gap-1">
              <GitFork className="w-3 h-3" />
              <span className="tabular-nums">{p.forksCount.toLocaleString()}</span>
            </span>
          )}
          {p.likesCount > 0 && (
            <span className="flex items-center gap-1 text-pink-500">
              <span className="tabular-nums">♥ {p.likesCount}</span>
            </span>
          )}
          <span className="ml-auto flex items-center gap-1">
            {p.owner?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={adaptProjectAvatar(p.owner.avatarUrl)}
                alt={p.owner.username}
                className="w-4 h-4 rounded-full"
              />
            ) : (
              <div className="w-4 h-4 rounded-full bg-muted-foreground/30" />
            )}
            <span className="text-muted-foreground truncate max-w-[80px]">
              @{p.owner?.username}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Filter Sidebar (desktop) + Mobile Filter Sheet ──────────────────────────
// Single FilterPanel is shared between the desktop sidebar and the mobile sheet.

function FilterPanel({
  category,
  onCategory,
  quick,
  onQuick,
}: {
  category: Category;
  onCategory: (c: Category) => void;
  quick: Set<QuickFilter>;
  onQuick: (q: QuickFilter, on: boolean) => void;
}) {
  return (
    <div className="space-y-5">
      <FilterGroup label="category">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => {
          const Icon = CATEGORY_ICONS[c];
          return (
            <FilterButton
              key={c}
              icon={Icon}
              label={CATEGORY_LABELS[c]}
              active={c === category}
              onClick={() => onCategory(c)}
            />
          );
        })}
      </FilterGroup>

      <FilterGroup label="quick">
        <FilterButton
          icon={Sparkles}
          label="Featured"
          active={quick.has("FEATURED")}
          onClick={() => onQuick("FEATURED", !quick.has("FEATURED"))}
        />
        <FilterButton
          icon={TrendingUp}
          label="Trending"
          active={quick.has("TRENDING")}
          onClick={() => onQuick("TRENDING", !quick.has("TRENDING"))}
        />
        <FilterButton
          icon={Github}
          label="GitHub"
          active={quick.has("GITHUB")}
          onClick={() => onQuick("GITHUB", !quick.has("GITHUB"))}
        />
      </FilterGroup>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-[10px] font-mono text-muted-foreground/50 tracking-widest uppercase px-2.5">
        {label}
      </h3>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function FilterButton({
  icon: Icon,
  dot,
  label,
  active,
  onClick,
}: {
  icon?: React.ElementType;
  dot?: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md font-mono text-[11px] text-left border transition-all w-full ${
        active
          ? "bg-primary/15 border-primary/40 text-primary"
          : "bg-transparent border-transparent text-muted-foreground hover:bg-card/40 hover:border-border/60 hover:text-foreground"
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />}
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />}
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

function FilterSidebar(
  props: React.ComponentProps<typeof FilterPanel> & { bottomOffset: number; topOffset: number }
) {
  const { bottomOffset, topOffset, ...rest } = props;
  return (
    <aside
      className="hidden lg:flex flex-col w-48 xl:w-52 border-r border-border/40 bg-background/85 backdrop-blur-md overflow-y-auto fixed left-0 z-20"
      style={{
        top: `${topOffset}px`,
        height: `calc(100dvh - ${topOffset}px - ${bottomOffset}px)`,
      }}
    >
      <div className="px-3 xl:px-4 py-5 space-y-5">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/50 tracking-widest uppercase">
          <Filter className="w-3 h-3" /> filter
        </div>
        <FilterPanel {...rest} />
      </div>
    </aside>
  );
}

function MobileFilterButton(props: React.ComponentProps<typeof FilterPanel>) {
  const [open, setOpen] = useState(false);
  const activeCount =
    (props.category !== "ALL" ? 1 : 0) +
    props.quick.size;
  return (
    <>
      <div className="lg:hidden px-4 sm:px-6 mb-4">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-card/80 backdrop-blur-sm border border-border font-mono text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
        >
          <Filter className="w-3.5 h-3.5" />
          filter
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold tabular-nums">
              {activeCount}
            </span>
          )}
        </button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="h-[80vh] overflow-y-auto rounded-t-lg"
        >
          <SheetHeader>
            <SheetTitle className="font-mono text-base flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              filter projects
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <FilterPanel {...props} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ─── Project Grid ────────────────────────────────────────────────────────────

function ProjectGrid({
  loading,
  error,
  projects,
  totalShown,
  onLoadMore,
}: {
  loading: boolean;
  error: any;
  projects: any[];
  totalShown: number;
  onLoadMore: () => void;
}) {
  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="couldn't load projects"
        message={String(error?.message ?? "Something went wrong. Try again.")}
        tone="error"
      />
    );
  }

  if (loading && projects.length === 0) {
    return (
      <section className="px-4 sm:px-6 mt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="no projects match these filters"
        message="Try clearing the search or switching the category. Or be the first to ship one."
        tone="muted"
      />
    );
  }

  return (
    <section className="px-4 sm:px-6 mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>

      {/* Load more sentinel */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={onLoadMore}
          className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 px-4 py-2 rounded border border-border hover:border-primary/40"
        >
          <Plus className="w-3.5 h-3.5" /> load more
        </button>
      </div>
    </section>
  );
}

function ProjectCard({ project: p }: { project: any }) {
  const Icon = CATEGORY_ICONS[(p.category as Category) ?? "OTHER"] ?? Code2;
  return (
    <Link
      to={`/project/${p.id}`}
      className="group flex flex-col bg-card border border-border rounded-md overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-[0_4px_24px_-8px] hover:shadow-primary/30 hover:-translate-y-0.5"
    >
      {/* Banner — image determines its own height */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-card to-card">
        {p.screenshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.screenshotUrl}
            alt={p.name}
            loading="lazy"
            className="w-full h-auto block group-hover:scale-[1.02] transition-all duration-300"
          />
        ) : (
          <div className="h-28 flex items-center justify-center">
            <Icon className="w-10 h-10 text-primary/30 group-hover:text-primary/50 transition-colors" strokeWidth={1.5} />
          </div>
        )}

        {/* Top-left: star count */}
        {p.starsCount > 0 && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/85 backdrop-blur-sm border border-border/60">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-mono font-bold text-foreground tabular-nums">
              {p.starsCount >= 1000 ? `${(p.starsCount / 1000).toFixed(1)}k` : p.starsCount}
            </span>
          </div>
        )}

        {/* Top-right: GITHUB + trending badges */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          {p.type === "GITHUB" && (
            <div className="w-4 h-4 rounded bg-background/85 backdrop-blur-sm border border-border/60 flex items-center justify-center">
              <Github className="w-2.5 h-2.5 text-foreground" />
            </div>
          )}
          {p.isTrending && (
            <div className="w-4 h-4 rounded bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
            </div>
          )}
        </div>
      </div>

      <div className="p-3 flex flex-col flex-1">
        {/* Icon avatar + name + tagline */}
        <div className="flex items-start gap-2.5 mb-2">
          <div className="w-16 h-16 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden">
            {p.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.iconUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Icon className="w-8 h-8 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0 self-center">
            <div className="flex items-center gap-1">
              <h3 className="font-mono font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                {p.name}
              </h3>
              {p.isVerified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
              {p.tagline}
            </p>
          </div>
        </div>

        {/* Description — more space than the tagline, multi-line */}
        {p.description && (
          <p className="text-[11px] leading-relaxed text-muted-foreground/80 line-clamp-3 mb-2.5">
            {p.description}
          </p>
        )}

        {/* Tags at bottom-left (above divider) */}
        {p.tags?.length > 0 && (
          <div className="mt-auto">
            <div className="flex flex-wrap gap-1 mb-2.5 min-h-[16px]">
              {p.tags.slice(0, 3).map((t: any) => (
                <span
                  key={t.name}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border text-muted-foreground"
                >
                  #{t.name}
                </span>
              ))}
              {p.tags.length > 3 && (
                <span className="text-[10px] font-mono text-muted-foreground/50 px-1 py-0.5">
                  +{p.tags.length - 3}
                </span>
              )}
            </div>

            <div className="h-px bg-border mb-2.5" />

            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <div className="flex items-center gap-2">
                {p.forksCount > 0 && (
                  <span className="flex items-center gap-0.5 tabular-nums">
                    <GitFork className="w-2.5 h-2.5" />
                    {p.forksCount}
                  </span>
                )}
              </div>
              {p.owner && (
                <div className="flex items-center gap-1 min-w-0">
                  {p.owner.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={adaptProjectAvatar(p.owner.avatarUrl)} alt={p.owner.username} className="w-3.5 h-3.5 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                  )}
                  <span className="truncate max-w-[70px]">@{p.owner.username}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* If no tags, still show the footer with owner */}
        {(!p.tags || p.tags.length === 0) && (
          <div className="mt-auto">
            <div className="h-px bg-border mb-2.5" />
            <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
              <div className="flex items-center gap-2">
                {p.forksCount > 0 && (
                  <span className="flex items-center gap-0.5 tabular-nums">
                    <GitFork className="w-2.5 h-2.5" />
                    {p.forksCount}
                  </span>
                )}
              </div>
              {p.owner && (
                <div className="flex items-center gap-1 min-w-0">
                  {p.owner.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={adaptProjectAvatar(p.owner.avatarUrl)} alt={p.owner.username} className="w-3.5 h-3.5 rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                  )}
                  <span className="truncate max-w-[70px]">@{p.owner.username}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="group flex flex-col bg-card border border-border rounded-md overflow-hidden">
      {/* Banner — matches real card height */}
      <div className="relative overflow-hidden">
        <Skeleton className="h-28 w-full rounded-none" />
        {/* Top-left: star count placeholder */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-background/85 border border-border/60">
          <Skeleton className="w-3 h-3 rounded-sm" />
          <Skeleton className="h-2.5 w-6" />
        </div>
        {/* Top-right: GITHUB + trending badges placeholder */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="w-4 h-4 rounded" />
        </div>
      </div>

      <div className="p-3 flex flex-col flex-1">
        {/* Icon avatar + name + tagline */}
        <div className="flex items-start gap-2.5 mb-2">
          <Skeleton className="w-16 h-16 rounded-md flex-shrink-0" />
          <div className="flex-1 min-w-0 self-center space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-2.5 w-full" />
          </div>
        </div>

        {/* Description — 3 lines, matching line-clamp-3 in real card */}
        <div className="space-y-1 mb-2.5">
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-11/12" />
          <Skeleton className="h-2.5 w-4/5" />
        </div>

        {/* Tags at bottom-left (above divider) */}
        <div className="mt-auto">
          <div className="flex flex-wrap gap-1 mb-2.5 min-h-[16px]">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-10" />
          </div>

          <div className="h-px bg-border mb-2.5" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-6" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="w-3.5 h-3.5 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  message,
  tone,
}: {
  icon: React.ElementType;
  title: string;
  message: string;
  tone: "error" | "muted";
}) {
  const color = tone === "error" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="border border-dashed border-border rounded-md py-16 px-6 text-center">
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full border border-border ${tone === "error" ? "bg-destructive/10" : "bg-card"} mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} strokeWidth={1.5} />
      </div>
      <h3 className={`font-mono font-bold text-sm mb-1 ${color}`}>
        <span className="opacity-60 select-none mr-1">{">_"}</span>
        {title}
      </h3>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">{message}</p>
    </div>
  );
}

// ─── Section Label ───────────────────────────────────────────────────────────

function SectionLabel({
  icon: Icon,
  label,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  badge?: number;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
      <h2 className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
        {label}
      </h2>
      {badge !== undefined && badge > 0 && (
        <span className="px-1.5 py-0.5 rounded bg-primary/15 border border-primary/30 text-[10px] font-mono font-bold text-primary tabular-nums">
          {badge}
        </span>
      )}
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent ml-2" />
    </div>
  );
}
