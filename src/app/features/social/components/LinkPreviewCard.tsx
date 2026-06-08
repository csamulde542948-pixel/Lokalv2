import { useEffect, useState } from "react";

const OG_BASE = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";
const URL_REGEX = /https?:\/\/[^\s\)\]>"']+/gi;

interface OgData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  domain: string;
}

export function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

export function LinkPreviewCard({ url }: { url: string }) {
  const [og, setOg] = useState<OgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    setOg(null);
    const controller = new AbortController();
    fetch(`${OG_BASE}/og?url=${encodeURIComponent(url)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data: OgData) => {
        if (!data.title && !data.image) {
          setFailed(true);
          return;
        }
        setOg(data);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setFailed(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [url]);

  if (failed) return null;

  if (loading) {
    return <div className="mx-4 mb-3 rounded-xl border bg-muted/40 h-24 animate-pulse" />;
  }

  if (!og) return null;

  return (
    <a
      href={og.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mx-4 mb-3 flex overflow-hidden rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
    >
      {og.image && (
        <div className="w-28 flex-shrink-0 bg-muted">
          <img
            src={og.image}
            alt=""
            className="w-full h-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}
      <div className="flex flex-col justify-center px-3 py-2.5 min-w-0 gap-0.5">
        {(og.siteName || og.domain) && (
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">
            {og.siteName ?? og.domain}
          </span>
        )}
        {og.title && (
          <span className="text-sm font-semibold leading-snug text-foreground line-clamp-2 group-hover:underline">
            {og.title}
          </span>
        )}
        {og.description && (
          <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-0.5">
            {og.description}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground truncate mt-0.5">{og.domain}</span>
      </div>
    </a>
  );
}
