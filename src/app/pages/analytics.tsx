import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { Separator } from "../components/ui/separator";
import {
  BarChart3,
  TrendingUp,
  Heart,
  Users,
  Star,
  Zap,
  FolderGit2,
  FileText,
  GitFork,
  Flame,
  Construction,
  Bell,
} from "lucide-react";

// ── Skeleton helpers ───────────────────────────────────────────────────────

function StatSkeletonCard({ icon, color }: { icon: React.ReactNode; color: string }) {
  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
          {icon}
        </div>
        <Skeleton className="h-7 w-16 mb-1.5" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="w-full" style={{ height }}>
      <div className="flex gap-3 h-full">
        <div className="flex flex-col justify-between pb-6 w-8">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-2 pb-6">
          <Skeleton className="flex-1 w-full rounded-md opacity-40" />
          <div className="flex justify-between">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-3 w-10" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BarRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <Skeleton className="h-10 w-10 rounded-md flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  );
}

// ── Under development banner ───────────────────────────────────────────────

function UnderDevelopmentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
      <div className="relative overflow-hidden rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 p-5 mb-6">
        {/* Decorative dot grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-200 dark:border-amber-700 flex items-center justify-center flex-shrink-0">
            <Construction className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200">Under Development</h2>
              <Badge className="bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700 text-[10px] h-4 px-1.5 font-medium">
                Coming Soon
              </Badge>
            </div>
            <p className="text-sm text-amber-800/80 dark:text-amber-300/70 leading-relaxed">
              We're building a full-featured analytics dashboard — per-post insights, project performance breakdowns, XP trends, and engagement metrics. Check back soon.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-white/60 dark:bg-black/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 flex-shrink-0 text-xs text-amber-700 dark:text-amber-400 font-medium whitespace-nowrap">
            <Bell className="w-3.5 h-3.5" />
            We'll notify you
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function Analytics() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" strokeWidth={2} />
          <div>
            <h1 className="text-2xl font-semibold">Analytics</h1>
            <p className="text-sm text-muted-foreground">Track your performance and community engagement</p>
          </div>
        </div>

        {/* Under development banner */}
        <UnderDevelopmentBanner />

        {/* ── Static tab bar preview ── */}
        <div className="flex gap-1 mb-6 border-b pb-0">
          {[
            { label: "Overview", icon: <TrendingUp className="w-3.5 h-3.5" />, active: true },
            { label: "Posts", icon: <FileText className="w-3.5 h-3.5" />, active: false },
            { label: "Projects", icon: <FolderGit2 className="w-3.5 h-3.5" />, active: false },
            { label: "XP", icon: <Zap className="w-3.5 h-3.5" />, active: false },
          ].map(({ label, icon, active }) => (
            <div
              key={label}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px select-none transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {icon}
              {label}
            </div>
          ))}
        </div>

        {/* ── Overview skeleton ── */}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          <StatSkeletonCard icon={<FileText className="w-4 h-4 text-blue-600" />} color="bg-blue-50 dark:bg-blue-950" />
          <StatSkeletonCard icon={<Heart className="w-4 h-4 text-rose-600" />} color="bg-rose-50 dark:bg-rose-950" />
          <StatSkeletonCard icon={<FolderGit2 className="w-4 h-4 text-violet-600" />} color="bg-violet-50 dark:bg-violet-950" />
          <StatSkeletonCard icon={<Star className="w-4 h-4 text-amber-600" />} color="bg-amber-50 dark:bg-amber-950" />
          <StatSkeletonCard icon={<Users className="w-4 h-4 text-emerald-600" />} color="bg-emerald-50 dark:bg-emerald-950" />
          <StatSkeletonCard icon={<Zap className="w-4 h-4 text-orange-600" />} color="bg-orange-50 dark:bg-orange-950" />
        </div>

        {/* XP chart */}
        <Card className="border mb-5">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              XP earned over time
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ChartSkeleton height={220} />
          </CardContent>
        </Card>

        {/* Rank card skeleton */}
        <Card className="border mb-5">
          <CardContent className="p-4 flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* ── Posts section preview ── */}
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" /> Posts breakdown
        </p>

        {/* Best post skeleton */}
        <Card className="border border-primary/20 bg-primary/5 mb-4">
          <CardContent className="p-4 flex items-start gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-4 mt-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Post list rows */}
        <Card className="border mb-5">
          <CardContent className="p-4">
            {[...Array(5)].map((_, i) => <BarRowSkeleton key={i} />)}
          </CardContent>
        </Card>

        {/* Post engagement chart */}
        <Card className="border mb-5">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Post engagement breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ChartSkeleton height={200} />
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* ── Projects section preview ── */}
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <FolderGit2 className="w-3.5 h-3.5" /> Projects breakdown
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <div className="flex gap-1.5 mt-1">
                      <Skeleton className="h-4 w-16 rounded-sm" />
                      <Skeleton className="h-4 w-14 rounded-sm" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[Star, Heart, GitFork, Flame].map((Icon, j) => (
                    <div key={j} className="bg-muted/50 rounded-md p-1.5 flex flex-col items-center gap-1">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground/30" />
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-2.5 w-6" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border mb-5">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Projects comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ChartSkeleton height={220} />
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* ── XP section preview ── */}
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" /> XP breakdown
        </p>

        <Card className="border mb-5">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              XP by activity type
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ChartSkeleton height={180} />
          </CardContent>
        </Card>

        <Card className="border mb-8">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              Recent XP events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
