// ─── Community Events — Under Development ────────────────────────────────────
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { ArrowLeft, Calendar, Wrench } from "lucide-react";

// Fake card shapes that mirror a real event card
function FakeEventCard({ tall = false }: { tall?: boolean }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden opacity-60 flex flex-col">
      {/* banner */}
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="p-4 flex flex-col flex-1 space-y-3">
        <Skeleton className={`h-4 ${tall ? "w-4/5" : "w-3/5"}`} />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-5 w-14 rounded-md" />
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
        <Separator />
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function Events() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-20">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          Back
        </Button>
      </div>

      {/* Blurred skeleton grid in the background */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden>
        <div className="container mx-auto px-4 pt-24 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 blur-[2px]">
            {[false, true, false, true, false, true].map((t, i) => (
              <FakeEventCard key={i} tall={t} />
            ))}
          </div>
        </div>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background pointer-events-none" aria-hidden />

      {/* Centered coming-soon message */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-6">
          <Calendar className="w-10 h-10 text-primary" strokeWidth={1.5} />
        </div>

        <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1">
          <Wrench className="w-3.5 h-3.5" strokeWidth={2} />
          Under Development
        </Badge>

        <h1 className="text-4xl font-black mb-3">Community Events</h1>
        <p className="text-muted-foreground text-lg max-w-md">
          Event listings are on their way. Discover workshops, webinars, and
          hackathons for the local dev community.
        </p>

        <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          We&apos;re building something great — check back soon
        </div>
      </div>
    </div>
  );
}
