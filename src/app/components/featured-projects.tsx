import { Plus, Wrench } from "lucide-react";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";

// Fake story card skeleton that mirrors the real story shape
function FakeStoryCard({ hasRing = false }: { hasRing?: boolean }) {
  return (
    <div className="flex-shrink-0">
      <div
        className={`w-[120px] h-[180px] rounded-xl p-[3px] ${
          hasRing ? "bg-gradient-to-br from-muted-foreground/20 via-muted-foreground/10 to-muted-foreground/20" : "bg-border"
        }`}
      >
        <div className="w-full h-full rounded-[10px] bg-card overflow-hidden relative">
          {/* Thumbnail placeholder */}
          <Skeleton className="w-full h-full rounded-none" />
          {/* Avatar at top */}
          <div className="absolute top-3 left-3">
            <Skeleton className="w-9 h-9 rounded-full" />
          </div>
          {/* Name at bottom */}
          <div className="absolute bottom-2 left-2 right-2 space-y-1">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-2 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeaturedProjects() {
  return (
    <div className="relative rounded-xl border bg-card overflow-hidden">
      {/* Blurred skeleton stories row in the background */}
      <div className="pointer-events-none select-none px-4 py-3" aria-hidden>
        <div className="flex gap-3 overflow-hidden blur-[1.5px] opacity-50">
          {/* Create story placeholder — with orange circle + icon */}
          <div className="flex-shrink-0">
            <div className="w-[120px] h-[180px] rounded-xl bg-muted border-2 border-dashed border-muted-foreground/15 overflow-hidden">
              <div className="h-[130px] bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center shadow-md">
                  <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div className="h-[50px] flex items-center justify-center px-2">
                <p className="text-xs font-medium text-muted-foreground text-center leading-tight">Create Story</p>
              </div>
            </div>
          </div>
          {[true, false, true, false, true, false].map((ring, i) => (
            <FakeStoryCard key={i} hasRing={ring} />
          ))}
        </div>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/50 to-background/80 pointer-events-none" />

      {/* Centered under-development message */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
        <Badge variant="secondary" className="gap-1.5 px-2.5 py-0.5 text-xs">
          <Wrench className="w-3 h-3" strokeWidth={2} />
          Under Development
        </Badge>
        <p className="text-sm font-semibold mt-2">Stories Coming Soon</p>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-[260px]">
          Share project highlights and quick updates with the community.
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Building something great
        </div>
      </div>
    </div>
  );
}