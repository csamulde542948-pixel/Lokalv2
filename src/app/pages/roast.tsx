import { useState } from "react";
import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Flame,
  Link2,
  Sparkles,
  AlertTriangle,
  Laugh,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getScoreColor(score: number) {
  if (score <= 3) return "text-red-500";
  if (score <= 5) return "text-orange-500";
  if (score <= 7) return "text-yellow-500";
  return "text-green-500";
}

function getScoreBg(score: number) {
  if (score <= 3) return "bg-red-500/10 border-red-500/20";
  if (score <= 5) return "bg-orange-500/10 border-orange-500/20";
  if (score <= 7) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-green-500/10 border-green-500/20";
}

function getScoreLabel(score: number) {
  if (score <= 2) return "💀 Brutal";
  if (score <= 4) return "🔥 Roasted";
  if (score <= 6) return "😬 Meh";
  if (score <= 8) return "👍 Decent";
  return "✨ Solid";
}

// ─── Marquee Card ─────────────────────────────────────────────────────────────────────────────

function RoastMarqueeCard({ roast }: { roast: RecentRoast }) {
  const score = roast.overallScore;

  return (
    <Card className={`flex-shrink-0 w-[260px] border ${getScoreBg(score)} transition-all`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-semibold text-xs truncate flex-1">{roast.projectName}</h3>
          <span className={`text-sm font-bold ml-2 ${getScoreColor(score)}`}>
            {score.toFixed(1)}
          </span>
        </div>
        {roast.quickRoast && (
          <p className="text-xs text-muted-foreground leading-snug line-clamp-2 mb-1.5">
            {roast.quickRoast}
          </p>
        )}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Flame className="w-2.5 h-2.5 text-orange-500 flex-shrink-0" />
          <span>{getScoreLabel(score)}</span>
          <span className="ml-auto">by {roast.author.name}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Static Fallback Cards (shown while loading or no data) ───────────────────

const STATIC_ROASTS = [
  { name: "MyAwesomeApp", score: 3.5, snippet: "Design from 2005 called, it wants its gradients back.", reviewer: "ai-roaster" },
  { name: "Filipino Startup", score: 4.2, snippet: "Too many fonts, too little sense. Pick a lane!", reviewer: "ai-roaster" },
  { name: "TechBro SaaS", score: 5.8, snippet: "Generic SaaS template #4729. Where's the personality?", reviewer: "ai-roaster" },
  { name: "Super Portfolio", score: 2.8, snippet: "Autoplay music in 2026? Brave but terrible choice.", reviewer: "ai-roaster" },
  { name: "LokalShop PH", score: 6.5, snippet: "Actually decent! Still has room for improvement though.", reviewer: "ai-roaster" },
  { name: "BudgetBuddy", score: 5.2, snippet: "The UI is functional but the colors? Questionable.", reviewer: "ai-roaster" },
  { name: "DevHub Manila", score: 3.1, snippet: "Loading for 10 seconds? Users don't have all day.", reviewer: "ai-roaster" },
  { name: "CraftCafe PH", score: 4.8, snippet: "Beautiful design, terrible UX. Beauty without brains.", reviewer: "ai-roaster" },
];

function StaticMarqueeCard({ name, score, snippet, reviewer }: typeof STATIC_ROASTS[0]) {
  return (
    <Card className={`flex-shrink-0 w-[260px] border ${getScoreBg(score)} transition-all`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-semibold text-xs truncate flex-1">{name}</h3>
          <span className={`text-sm font-bold ml-2 ${getScoreColor(score)}`}>{score.toFixed(1)}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-snug line-clamp-2 mb-1.5">{snippet}</p>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Flame className="w-2.5 h-2.5 text-orange-500 flex-shrink-0" />
          <span>{getScoreLabel(score)}</span>
          <span className="ml-auto">by {reviewer}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Roast() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projectUrl, setProjectUrl] = useState("");

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
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-600 rounded-md flex items-center justify-center">
              <Flame className="w-7 h-7 text-white" strokeWidth={2} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                Project Roaster
                <Badge variant="secondary" className="text-xs rounded-md font-normal">
                  AI-Powered
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                Get brutally honest AI feedback on your project. No feelings spared.
              </p>
            </div>
          </div>
        </div>

        {/* ── Input Form ── */}
        <Card className="border mb-6">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" strokeWidth={2} />
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
                Warning: Our AI doesn't hold back. Prepare for honest (and brutal) Taglish feedback.
                {!user && (
                  <span className="ml-1">
                    <a href="/login" className="text-primary hover:underline">
                      Sign in
                    </a>{" "}
                    to save and share your roast.
                  </span>
                )}
              </p>
            </div>

            <Button
              onClick={handleRoast}
              disabled={!projectUrl.trim()}
              className="w-full gap-2"
            >
              <Flame className="w-4 h-4" strokeWidth={2} />
              Roast My Project
            </Button>
          </CardContent>
        </Card>

        {/* ── Marquee ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-muted-foreground">Recent Roasts 🔥</h2>
            {recentRoasts.length > 0 && (
              <Badge variant="outline" className="text-xs rounded-md font-normal">
                {recentRoasts.length} projects roasted
              </Badge>
            )}
          </div>

          {/* Row 1 – scrolls right */}
          <div className="relative overflow-hidden">
            <div className="flex gap-3 animate-scroll-right">
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
            <div className="flex gap-3 animate-scroll-left">
              {marqueeItems
                ? rowTwo.map((r, i) => (
                    <RoastMarqueeCard key={`r2-${i}`} roast={r as RecentRoast} />
                  ))
                : rowTwo.map((r, i) => (
                    <StaticMarqueeCard key={`r2-${i}`} {...(r as typeof STATIC_ROASTS[0])} />
                  ))}
            </div>
          </div>

          {recentRoasts.length === 0 && (
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
          )}
        </div>
      </div>
    </div>
  );
}