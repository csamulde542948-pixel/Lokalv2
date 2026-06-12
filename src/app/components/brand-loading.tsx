import { BrandLogo } from "./brand-logo";

export function BrandLoading({ label = "Loading lokalhost.club" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-md bg-primary/25 blur-xl animate-pulse" />
          <BrandLogo asLink={false} showText={false} size="lg" className="relative" />
        </div>
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
            {label}
          </p>
          <div className="mx-auto h-0.5 w-32 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-1/2 animate-[brand-loader_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
