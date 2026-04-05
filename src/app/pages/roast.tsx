import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { 
  Flame, 
  Link2, 
  Sparkles, 
  AlertTriangle,
  Laugh,
  ExternalLink
} from "lucide-react";
import { Badge } from "../components/ui/badge";

interface RoastResult {
  projectUrl: string;
  projectName: string;
  timestamp: string;
  roast: {
    title: string;
    overallScore: number;
    quickRoast: string;
  };
}

export function Roast() {
  const [projectUrl, setProjectUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [roasts, setRoasts] = useState<RoastResult[]>([
    {
      projectUrl: "https://myawesomeapp.com",
      projectName: "MyAwesomeApp",
      timestamp: "5 min ago",
      roast: {
        title: "Oh honey...",
        overallScore: 3.5,
        quickRoast: "Design from 2005 called, it wants its gradients back. 🎨",
      },
    },
    {
      projectUrl: "https://filipinostartup.co",
      projectName: "Filipino Startup",
      timestamp: "15 min ago",
      roast: {
        title: "Yikes...",
        overallScore: 4.2,
        quickRoast: "Too many fonts, too little sense. Pick a lane! 📝",
      },
    },
    {
      projectUrl: "https://techbro-saas.io",
      projectName: "TechBro SaaS",
      timestamp: "1 hour ago",
      roast: {
        title: "Meh...",
        overallScore: 5.8,
        quickRoast: "Generic SaaS template #4729. Where's the personality? 💼",
      },
    },
    {
      projectUrl: "https://super-portfolio.dev",
      projectName: "Super Portfolio",
      timestamp: "2 hours ago",
      roast: {
        title: "Oof...",
        overallScore: 2.8,
        quickRoast: "Autoplay music in 2026? Brave but terrible choice. 🎵",
      },
    },
    {
      projectUrl: "https://lokalshop-ph.com",
      projectName: "LokalShop PH",
      timestamp: "3 hours ago",
      roast: {
        title: "Not bad!",
        overallScore: 6.5,
        quickRoast: "Actually decent! Still has room for improvement though. 👍",
      },
    },
    {
      projectUrl: "https://budgetbuddy.app",
      projectName: "BudgetBuddy",
      timestamp: "4 hours ago",
      roast: {
        title: "Could be worse...",
        overallScore: 5.2,
        quickRoast: "The UI is functional but the colors? Questionable. 🎨",
      },
    },
    {
      projectUrl: "https://devhub-manila.io",
      projectName: "DevHub Manila",
      timestamp: "5 hours ago",
      roast: {
        title: "Seriously?",
        overallScore: 3.1,
        quickRoast: "Loading for 10 seconds? Users don't have all day. ⏰",
      },
    },
    {
      projectUrl: "https://craftcafe.ph",
      projectName: "CraftCafe",
      timestamp: "6 hours ago",
      roast: {
        title: "Nice try...",
        overallScore: 4.8,
        quickRoast: "Beautiful design, terrible UX. Beauty without brains. 💅",
      },
    },
    {
      projectUrl: "https://taskmaster-pro.com",
      projectName: "TaskMaster Pro",
      timestamp: "7 hours ago",
      roast: {
        title: "Almost there...",
        overallScore: 6.2,
        quickRoast: "Good functionality, needs polish. You're on the right track! ✨",
      },
    },
    {
      projectUrl: "https://foodie-finder.ph",
      projectName: "Foodie Finder",
      timestamp: "8 hours ago",
      roast: {
        title: "Hungry for better code...",
        overallScore: 4.5,
        quickRoast: "Spaghetti code for a food app? How fitting. 🍝",
      },
    },
  ]);

  const handleRoast = async () => {
    if (!projectUrl.trim()) return;

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const quickRoasts = [
        "Your code quality is giving amateur hour. 💻",
        "Design choices? More like design crimes. ⚖️",
        "Performance slower than a snail on vacation. 🐌",
        "UX so confusing, even you get lost. 🗺️",
        "Colors clashing harder than my relatives at dinner. 🌈",
      ];

      const newRoast: RoastResult = {
        projectUrl: projectUrl,
        projectName: new URL(projectUrl).hostname.split('.')[0],
        timestamp: "Just now",
        roast: {
          title: generateRandomRoastTitle(),
          overallScore: Math.random() * 5 + 3,
          quickRoast: quickRoasts[Math.floor(Math.random() * quickRoasts.length)],
        },
      };

      setRoasts([newRoast, ...roasts]);
      setProjectUrl("");
      setIsLoading(false);
    }, 2000);
  };

  const generateRandomRoastTitle = () => {
    const titles = [
      "Yikes...",
      "Oh honey...",
      "Barely passing...",
      "Let's talk...",
      "Could be worse...",
      "Needs work...",
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  };

  const getScoreColor = (score: number) => {
    if (score <= 3) return "text-red-600";
    if (score <= 5) return "text-orange-600";
    if (score <= 7) return "text-yellow-600";
    return "text-green-600";
  };

  // Duplicate roasts for infinite scroll effect
  const rowOneRoasts = [...roasts, ...roasts];
  const rowTwoRoasts = [...roasts.slice().reverse(), ...roasts.slice().reverse()];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
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

        {/* Submit Form */}
        <Card className="border mb-6">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" strokeWidth={2} />
              Submit Your Project for Roasting
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="projectUrl">Project URL *</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={2} />
                <Input
                  id="projectUrl"
                  type="url"
                  placeholder="https://yourproject.com"
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                  className="pl-10 border rounded-md h-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
              <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" strokeWidth={2} />
              <p className="text-xs text-muted-foreground">
                Warning: Our AI doesn't hold back. Prepare for honest (and hilarious) feedback.
              </p>
            </div>

            <Button
              onClick={handleRoast}
              disabled={!projectUrl.trim() || isLoading}
              className="w-full gap-2"
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" strokeWidth={2} />
                  Getting Roasted...
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4" strokeWidth={2} />
                  Roast My Project
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Infinite Scrolling Results */}
        {roasts.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Recent Roasts 🔥</h2>
              <Badge variant="outline" className="text-xs rounded-md font-normal">
                {roasts.length} projects roasted
              </Badge>
            </div>

            {/* Row 1 - Scrolls Right */}
            <div className="relative overflow-hidden">
              <div className="flex gap-4 animate-scroll-right">
                {rowOneRoasts.map((roast, index) => (
                  <Card
                    key={`row1-${index}`}
                    className="flex-shrink-0 w-[280px] border hover:border-primary/50 transition-all cursor-pointer group"
                  >
                    <CardContent className="p-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-xs truncate">{roast.projectName}</h3>
                        </div>
                        <div className={`text-sm font-bold ml-2 ${getScoreColor(roast.roast.overallScore)}`}>
                          {roast.roast.overallScore.toFixed(1)}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground leading-tight mb-1 line-clamp-2">
                        {roast.roast.quickRoast}
                      </p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <Flame className="w-2.5 h-2.5 text-orange-600 flex-shrink-0" strokeWidth={2} />
                          <span className="italic truncate">{roast.roast.title}</span>
                        </span>
                        <a
                          href={roast.projectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex-shrink-0 ml-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Row 2 - Scrolls Left */}
            <div className="relative overflow-hidden">
              <div className="flex gap-4 animate-scroll-left">
                {rowTwoRoasts.map((roast, index) => (
                  <Card
                    key={`row2-${index}`}
                    className="flex-shrink-0 w-[280px] border hover:border-primary/50 transition-all cursor-pointer group"
                  >
                    <CardContent className="p-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-xs truncate">{roast.projectName}</h3>
                        </div>
                        <div className={`text-sm font-bold ml-2 ${getScoreColor(roast.roast.overallScore)}`}>
                          {roast.roast.overallScore.toFixed(1)}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground leading-tight mb-1 line-clamp-2">
                        {roast.roast.quickRoast}
                      </p>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 truncate">
                          <Flame className="w-2.5 h-2.5 text-orange-600 flex-shrink-0" strokeWidth={2} />
                          <span className="italic truncate">{roast.roast.title}</span>
                        </span>
                        <a
                          href={roast.projectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex-shrink-0 ml-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Empty State */
          <Card className="border">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Laugh className="w-8 h-8 text-muted-foreground" strokeWidth={2} />
              </div>
              <h3 className="font-semibold mb-2">No Roasts Yet</h3>
              <p className="text-sm text-muted-foreground">
                Submit your project URL above and let our AI tear it apart... constructively!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}