import { useState, useEffect } from "react";
import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Flame,
  Link2,
  AlertTriangle,
  Laugh,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { useAuth } from "../../contexts/AuthContext";

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_RECENT_ROASTS = gql`
  query GetRecentRoasts {
    roasts(limit: 20) {
      id
      overallScore
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
  overallScore: number;
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
    <div className="flex-shrink-0 w-[280px] rounded-lg border border-border/60 overflow-hidden transition-all hover:scale-[1.02] hover:border-primary/30">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40 bg-muted/30">
        <span className="text-primary font-mono font-bold text-[10px]">&gt;_</span>
        <span className="text-[9px] font-mono text-muted-foreground truncate">{displayUrl} has been roasted</span>
      </div>
      <div className="bg-card p-3 font-mono">
        <a
          href={roast.projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-xs text-primary hover:underline truncate block mb-1.5"
        >
          {roast.projectName}
        </a>
        {roast.quickRoast && (
          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
            <span className="text-primary/70">$ </span>{roast.quickRoast}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Static Fallback Cards (shown while loading or no data) ───────────────────

const STATIC_ROASTS = [
  { name: "MyAwesomeApp", snippet: "Design from 2005 called, it wants its gradients back." },
  { name: "Filipino Startup", snippet: "Too many fonts, too little sense. Pick a lane!" },
  { name: "TechBro SaaS", snippet: "Generic SaaS template #4729. Where's the personality?" },
  { name: "Super Portfolio", snippet: "Autoplay music in 2026? Brave but terrible choice." },
  { name: "LokalShop PH", snippet: "Actually decent! Still has room for improvement though." },
  { name: "BudgetBuddy", snippet: "The UI is functional but the colors? Questionable." },
  { name: "DevHub Manila", snippet: "Loading for 10 seconds? Users don't have all day." },
  { name: "CraftCafe PH", snippet: "Beautiful design, terrible UX. Beauty without brains." },
];

function StaticMarqueeCard({ name, snippet }: typeof STATIC_ROASTS[0]) {
  return (
    <div className="flex-shrink-0 w-[280px] rounded-lg border border-border/60 overflow-hidden transition-all hover:scale-[1.02] hover:border-primary/30">
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40 bg-muted/30">
        <span className="text-primary font-mono font-bold text-[10px]">&gt;_</span>
        <span className="text-[9px] font-mono text-muted-foreground truncate">{name.toLowerCase().replace(/\s+/g, '')} has been roasted</span>
      </div>
      <div className="bg-card p-3 font-mono">
        <span className="font-semibold text-xs text-primary truncate block mb-1.5">{name}</span>
        <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
          <span className="text-primary/70">$ </span>{snippet}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Roast() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projectUrl, setProjectUrl] = useState(() => searchParams.get("url") ?? "");
  const [roastConsent, setRoastConsent] = useState(false);

  // If url came in via query param, trigger immediately
  useEffect(() => {
    const url = searchParams.get("url");
    if (url) navigate("/roast/result", { state: { projectUrl: url }, replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: recentData } = useQuery<{ roasts: RecentRoast[] }>(GET_RECENT_ROASTS, {
    fetchPolicy: "cache-and-network",
  });

  const recentRoasts = recentData?.roasts ?? [];

  const marqueeItems = recentRoasts.length >= 4 ? recentRoasts : null;
  const rowOne = marqueeItems ? [...marqueeItems, ...marqueeItems] : [...STATIC_ROASTS, ...STATIC_ROASTS];
  const rowTwo = marqueeItems ? [...[...marqueeItems].reverse(), ...[...marqueeItems].reverse()] : [...[...STATIC_ROASTS].reverse(), ...[...STATIC_ROASTS].reverse()];

  const handleRoast = () => {
    const url = projectUrl.trim();
    if (!url) return;
    navigate("/roast/result", { state: { projectUrl: url } });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRoast();
  };

  return (
    <div className="py-4 sm:py-6">
      {/* ── Header + Form ── */}
      <div className="container mx-auto px-3 sm:px-4">
        <div className="max-w-4xl mx-auto">

          {/* ── Header ── */}
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-md flex items-center justify-center flex-shrink-0">
                <Flame className="w-4 h-4 sm:w-7 sm:h-7 text-white" strokeWidth={2} fill="currentColor" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-semibold flex items-center gap-2 flex-wrap">
                  Project Roaster
                  <Badge variant="secondary" className="text-xs rounded-md font-normal">
                    AI-Powered
                  </Badge>
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">
                  Get brutally honest AI feedback on your project. No feelings spared.
                </p>
              </div>
            </div>
          </div>

          {/* ── Input Form ── */}
          <Card className="border mb-6">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-base flex items-center gap-2 font-mono">
                <span className="text-primary font-mono font-bold">&gt;_</span>
                Submit Your Project for Roasting
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectUrl">Project URL</Label>
                <div className="relative">
                  <Link2
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                    strokeWidth={2}
                  />
                  <Input
                    id="projectUrl"
                    type="url"
                    placeholder="https://yourproject.com"
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="pl-10 border rounded-md h-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
                <AlertTriangle
                  className="w-4 h-4 text-orange-600 flex-shrink-0"
                  strokeWidth={2}
                />
                <p className="text-xs text-muted-foreground">
                  Warning: Our AI doesn't hold back. Prepare for honest (and brutal) Pinoy Style feedback.
                  {!user && (
                    <span className="ml-1">
                      <Link to="/login" className="text-primary hover:underline">
                        Sign in
                      </Link>{" "}
                      to save and share your roast.
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-md border border-orange-500/20 bg-orange-500/5">
                <Checkbox
                  id="roastConsent"
                  checked={roastConsent}
                  onCheckedChange={(v) => setRoastConsent(v as boolean)}
                  className="mt-0.5 flex-shrink-0"
                />
                <label
                  htmlFor="roastConsent"
                  className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
                >
                  I own this project (or have the owner's permission to submit it) and I understand this
                  roast is <strong>AI-generated satire</strong> — not factual assessment. I submitted
                  this work voluntarily.{" "}
                  <Link to="/terms#ai-roast" className="text-primary hover:underline">Learn more</Link>.
                </label>
              </div>

              <Button
                onClick={handleRoast}
                disabled={!projectUrl.trim() || !roastConsent}
                className="w-full gap-2"
              >
                <Flame className="w-4 h-4" strokeWidth={2} />
                Roast My Project
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ── Full-bleed Marquee ── */}
      <div className="w-full overflow-hidden border-y py-6 space-y-3">
        <div className="container mx-auto px-3 sm:px-4 mb-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Recent Roasts 🔥 — what Loki thinks of your projects
            </p>
            {recentRoasts.length > 0 && (
              <Badge variant="outline" className="text-xs rounded-md font-normal">
                {recentRoasts.length} projects roasted
              </Badge>
            )}
          </div>
        </div>

        {/* Row 1 – scrolls right */}
        <div className="relative overflow-hidden">
          <div className="flex gap-3 animate-scroll-right" style={{ width: "max-content" }}>
            {marqueeItems
              ? rowOne.map((r, i) => (
                  <RoastMarqueeCard key={`r1-${i}`} roast={r as RecentRoast} />
                ))
              : rowOne.map((r, i) => (
                  <StaticMarqueeCard key={`r1-${i}`} {...(r as typeof STATIC_ROASTS[0])} />
                ))}
          </div>
        </div>

        {/* Row 2 – scrolls left */}
        <div className="relative overflow-hidden">
          <div className="flex gap-3 animate-scroll-left" style={{ width: "max-content" }}>
            {marqueeItems
              ? rowTwo.map((r, i) => (
                  <RoastMarqueeCard key={`r2-${i}`} roast={r as RecentRoast} />
                ))
              : rowTwo.map((r, i) => (
                  <StaticMarqueeCard key={`r2-${i}`} {...(r as typeof STATIC_ROASTS[0])} />
                ))}
          </div>
        </div>
      </div>

      {/* ── Empty state ── */}
      {recentRoasts.length === 0 && (
        <div className="container mx-auto px-3 sm:px-4 mt-4">
          <div className="max-w-4xl mx-auto">
            <Card className="border">
              <CardContent className="p-10 text-center">
                <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Laugh className="w-7 h-7 text-muted-foreground" strokeWidth={2} />
                </div>
                <h3 className="font-semibold mb-1">No Saved Roasts Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Be the first — paste a URL above and let the AI rip. 🔥
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}