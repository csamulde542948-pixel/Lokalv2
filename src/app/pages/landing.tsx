import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Code2,
  Flame,
  Github,
  Globe2,
  MessageSquareText,
  Moon,
  Rocket,
  ShieldCheck,
  Sun,
  Trophy,
  Users,
} from "lucide-react";
import { BrandLogo } from "../components/brand-logo";

const surfaceRows = [
  { label: "feed", title: "Progress log", text: "Post what changed, what broke, and what you want reviewed." },
  { label: "roast", title: "AI critique", text: "Submit your own project URL and get satire-labeled feedback." },
  { label: "launchpad", title: "Demo room", text: "Create small launch windows for feedback and community drops." },
  { label: "jobs", title: "Opportunity board", text: "Keep jobs, events, and project leads close to the builders." },
];

const bulletinItems = [
  "Post project updates without waiting on a group admin to approve your work.",
  "Get sharper feedback on landing pages, portfolios, launches, and product ideas.",
  "Build a public trail of projects, roasts, events, jobs, messages, and reputation.",
];

const manifest = [
  "No approval queue just to show your work.",
  "No empty applause when what you need is sharper feedback.",
  "No fake enterprise gloss over a community that is still being built in public.",
];

const stats = [
  ["for", "builders"],
  ["origin", "PH-first"],
  ["use it for", "projects + feedback"],
  ["community", "early public beta"],
];

function ThemeToggleButton() {
  const [dark, setDark] = useState(() =>
    typeof document === "undefined" ? true : document.documentElement.classList.contains("dark"),
  );

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-primary/60 hover:text-foreground"
      aria-label="Toggle theme"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function FeedWall() {
  return (
    <div className="relative rounded-lg border border-border bg-card text-card-foreground shadow-[10px_10px_0_#ff6600]">
      <div className="grid grid-cols-[1fr_auto] border-b border-border">
        <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          live community surface
        </div>
        <div className="border-l border-border px-4 py-3 text-[11px] text-muted-foreground">
          2026
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="border-b border-border p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                pinned post
              </p>
              <h2 className="mt-2 text-3xl font-bold leading-tight tracking-normal sm:text-5xl">
                Ship notes from the club floor.
              </h2>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-border bg-card">
              <BrandLogo size="lg" showText={false} asLink={false} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-md border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-4">
                <p className="text-xs font-semibold text-primary">@mika shipped</p>
                <p className="text-[11px] text-muted-foreground">2 min ago</p>
              </div>
              <p className="text-sm leading-6">
                Reworked the onboarding copy. Need brutal feedback on whether the value prop lands before the screenshot.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-sm border border-border px-2 py-1">landing</span>
                <span className="rounded-sm border border-border px-2 py-1">needs roast</span>
                <span className="rounded-sm border border-primary bg-primary px-2 py-1 text-primary-foreground">open</span>
              </div>
            </div>

            <div className="grid grid-cols-2 rounded-md border border-border bg-foreground text-background">
              <div className="border-r border-background/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] opacity-70">rank pulse</p>
                <p className="mt-2 text-2xl font-bold">+42 XP</p>
              </div>
              <div className="p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] opacity-70">next room</p>
                <p className="mt-2 text-2xl font-bold">Launchpad</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              product surfaces
            </p>
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div className="divide-y divide-border border-y border-border">
            {surfaceRows.map((item) => (
              <div key={item.label} className="grid grid-cols-[86px_1fr] gap-3 py-4">
                <p className="text-[11px] font-semibold uppercase text-primary">
                  {item.label}
                </p>
                <div>
                  <h3 className="text-sm font-bold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-md border border-primary bg-primary p-4 text-primary-foreground">
            <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">roast lab</p>
            <p className="mt-2 text-sm font-semibold leading-6">
              Satirical AI feedback is labeled, consent-gated, and routed through the terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SurfaceIcon({ name }: { name: string }) {
  const className = "h-5 w-5";
  if (name === "Feed") return <MessageSquareText className={className} />;
  if (name === "Roast") return <Flame className={className} />;
  if (name === "Projects") return <Rocket className={className} />;
  if (name === "Launchpad") return <CalendarDays className={className} />;
  if (name === "Jobs") return <BriefcaseBusiness className={className} />;
  return <Trophy className={className} />;
}

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 sm:px-6">
          <BrandLogo size="sm" linkTo="/" />
          <nav className="hidden items-center gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground md:flex">
            <a href="#lobby" className="rounded-md border border-transparent px-3 py-2 transition hover:border-border hover:bg-card hover:text-foreground">Lobby</a>
            <a href="#surfaces" className="rounded-md border border-transparent px-3 py-2 transition hover:border-border hover:bg-card hover:text-foreground">Surfaces</a>
            <a href="#community" className="rounded-md border border-transparent px-3 py-2 transition hover:border-border hover:bg-card hover:text-foreground">Community</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <Link
              to="/login"
              className="hidden h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-xs font-semibold uppercase tracking-[0.12em] transition hover:border-primary/60 hover:text-primary sm:inline-flex"
            >
              Login
            </Link>
            <Link
              to="/feed"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
            >
              Join
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="lobby" className="border-b border-border">
          <div className="mx-auto grid max-w-[1480px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:py-12">
            <div className="flex flex-col justify-between gap-8">
              <div>
                <div className="mb-5 inline-flex rounded-md border border-border bg-card px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary shadow-[4px_4px_0_#ff6600]">
                  public beta / builder community
                </div>
                <h1 className="max-w-2xl text-5xl font-bold leading-[0.95] tracking-normal sm:text-7xl lg:text-8xl">
                  The dev club with receipts.
                </h1>
                <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground">
                  Lokalhost.club is a public lobby for builders: post progress, collect project proof,
                  ask for sharp feedback, and meet the next people who care about what you ship.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  to="/feed"
                  className="group inline-flex h-12 items-center justify-between rounded-md border border-primary bg-primary px-4 text-primary-foreground transition hover:opacity-90"
                >
                  <span className="text-xs font-bold uppercase tracking-[0.18em]">Enter the club</span>
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </Link>
                <button
                  type="button"
                  onClick={() => navigate("/roast")}
                  className="group inline-flex h-12 items-center justify-between rounded-md border border-border bg-card px-4 text-left transition hover:border-primary/60 hover:text-primary"
                >
                  <span className="text-xs font-bold uppercase tracking-[0.18em]">Try a roast</span>
                  <Flame className="h-5 w-5 text-primary transition group-hover:scale-110" />
                </button>
              </div>
            </div>

            <FeedWall />
          </div>
        </section>

        <section className="border-b border-border bg-foreground text-background">
          <div className="mx-auto grid max-w-[1480px] divide-y divide-background/20 px-4 sm:px-6 md:grid-cols-4 md:divide-x md:divide-y-0">
            {stats.map(([label, value]) => (
              <div key={label} className="py-5 md:px-5">
                <p className="text-[11px] uppercase tracking-[0.18em] opacity-70">{label}</p>
                <p className="mt-2 text-base font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="surfaces" className="border-b border-border py-14 sm:py-20">
          <div className="mx-auto grid max-w-[1480px] gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                not a brochure
              </p>
              <h2 className="mt-4 max-w-xl text-4xl font-bold leading-tight sm:text-6xl">
                The homepage should feel like the product is already alive.
              </h2>
                <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">
                  Lokalhost is for developers who want their work seen before it is perfect:
                  share a project, ask for feedback, join launches, and find people building nearby.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {["Feed", "Roast", "Projects", "Launchpad", "Jobs", "Ranks"].map((name, index) => (
                <article
                  key={name}
                  className={`rounded-md border border-border bg-card p-5 ${
                    index === 0 ? "md:col-span-2" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-primary">
                      <SurfaceIcon name={name} />
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold">{name}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {name === "Feed" && "A public activity stream for project updates, questions, milestones, and feedback requests."}
                    {name === "Roast" && "A consent-first AI roast flow for product, landing, and brand critique."}
                    {name === "Projects" && "Project profiles collect links, screenshots, and social proof."}
                    {name === "Launchpad" && "Small rooms for launch events, demos, and focused community feedback."}
                    {name === "Jobs" && "Opportunities stay near the people already shipping and reviewing work."}
                    {name === "Ranks" && "Reputation is visible through participation, feedback, and project activity."}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto grid max-w-[1480px] gap-0 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-l-lg border border-border bg-card p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                why it exists
              </p>
              <h2 className="mt-4 text-4xl font-bold leading-tight sm:text-6xl">
                A place to post the thing before it is perfect.
              </h2>
            </div>
            <div className="rounded-r-lg border-x border-b border-border bg-muted/30 lg:border-l-0 lg:border-t">
              {manifest.map((item) => (
                <div key={item} className="border-b border-border p-6 last:border-b-0 sm:p-8">
                  <p className="text-xl font-bold leading-8">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="community" className="py-14 sm:py-20">
          <div className="mx-auto grid max-w-[1480px] gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                what the club is for
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
                Build in public without sounding like a billboard.
              </h2>
            </div>
            <div className="space-y-3">
              {bulletinItems.map((item, index) => (
                <div key={item} className="grid grid-cols-[52px_1fr] rounded-md border border-border bg-card">
                  <div className="flex items-center justify-center border-r border-border text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <p className="p-4 text-sm font-semibold leading-6 text-muted-foreground">
                    {item}
                  </p>
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  [ShieldCheck, "Terms"],
                  [Globe2, "Privacy"],
                  [BadgeCheck, "Acceptable use"],
                ].map(([Icon, label]) => {
                  const ActualIcon = Icon as typeof ShieldCheck;
                  return (
                    <div key={label as string} className="rounded-md border border-border bg-card p-4">
                      <ActualIcon className="h-5 w-5 text-primary" />
                      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em]">{label as string}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-8 text-card-foreground">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showText={false} asLink={false} />
            <div>
              <p className="text-sm font-bold">lokalhost.club</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                public beta / builders welcome
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/cookie-policy" className="hover:text-foreground">Cookies</Link>
            <Link to="/acceptable-use" className="hover:text-foreground">Acceptable Use</Link>
            <Link to="/refund-policy" className="hover:text-foreground">Refund</Link>
            <a href="mailto:legal@lokalhost.club" className="hover:text-foreground">Contact</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
              <Github className="h-3.5 w-3.5" />
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}


