import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X as XIcon } from "lucide-react";

function Lightbox({ imgs, startIndex, onClose }: {
  imgs: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const prev = useCallback(() => setIdx((i) => (i - 1 + imgs.length) % imgs.length), [imgs.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % imgs.length), [imgs.length]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")      onClose();
      if (e.key === "ArrowLeft")   prev();
      if (e.key === "ArrowRight")  next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black"
      style={{ zIndex: 99999 }}
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
        style={{ zIndex: 100001 }}
      >
        <XIcon className="w-5 h-5" />
      </button>

      {/* Counter */}
      {imgs.length > 1 && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium select-none"
          style={{ zIndex: 100001 }}
        >
          {idx + 1} / {imgs.length}
        </div>
      )}

      {/* Prev arrow */}
      {imgs.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
          style={{ zIndex: 100001 }}
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
      )}

      {/* Main image — fills as much of the viewport as possible */}
      <img
        key={idx}
        src={imgs[idx]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        draggable={false}
        className="select-none object-contain"
        style={{
          maxWidth: "calc(100vw - 120px)",
          maxHeight: "calc(100vh - 120px)",
          width: "auto",
          height: "auto",
          zIndex: 100000,
        }}
      />

      {/* Next arrow */}
      {imgs.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
          style={{ zIndex: 100001 }}
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      )}

      {/* Thumbnail strip (2+ images) */}
      {imgs.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2"
          style={{ zIndex: 100001 }}
          onClick={(e) => e.stopPropagation()}
        >
          {imgs.map((src, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-12 h-12 rounded overflow-hidden border-2 flex-shrink-0 transition-all duration-150 ${
                i === idx ? "border-white scale-110" : "border-white/30 opacity-50 hover:opacity-90"
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

/* ─── MediaGrid ───────────────────────────────────────────────────────────── */
// Facebook-style photo grid with lightbox on click
export function MediaGrid({ imgs }: { imgs: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  if (!imgs.length) return null;
  const total = imgs.length;
  const extra = total - 5;

  const Img = ({
    src, index, className, overlay,
  }: { src: string; index: number; className?: string; overlay?: number }) => (
    <div
      className={`relative overflow-hidden bg-muted cursor-pointer ${className ?? ""}`}
      onClick={() => setLightboxIdx(index)}
    >
      <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 hover:scale-105" />
      {overlay !== undefined && overlay > 0 && (
        <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
          <span className="text-white text-2xl font-bold">+{overlay}</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox imgs={imgs} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      {/* ── 1 image ──────────────────────────────────────────────────── */}
      {total === 1 && (
        <div className="px-2 sm:px-4 py-2">
          <div
            className="relative overflow-hidden cursor-pointer"
            style={{ maxHeight: 500 }}
            onClick={() => setLightboxIdx(0)}
          >
            <img
              src={imgs[0]}
              alt=""
              className="w-full object-cover transition-transform duration-200 hover:scale-105"
              style={{ maxHeight: 500 }}
            />
          </div>
        </div>
      )}

      {/* ── 2 images ─────────────────────────────────────────────────── */}
      {total === 2 && (
        <div className="px-2 sm:px-4 py-2">
          <div className="flex gap-1.5" style={{ height: 280 }}>
            <Img src={imgs[0]} index={0} className="flex-1" />
            <Img src={imgs[1]} index={1} className="flex-1" />
          </div>
        </div>
      )}

      {/* ── 3 images ─────────────────────────────────────────────────── */}
      {total === 3 && (
        <div className="px-2 sm:px-4 py-2">
          <div className="flex gap-1.5" style={{ height: 320 }}>
            <Img src={imgs[0]} index={0} className="flex-1" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Img src={imgs[1]} index={1} className="flex-1" />
              <Img src={imgs[2]} index={2} className="flex-1" />
            </div>
          </div>
        </div>
      )}

      {/* ── 4 images ─────────────────────────────────────────────────── */}
      {total === 4 && (
        <div className="px-2 sm:px-4 py-2">
          <div className="flex flex-col gap-1.5" style={{ height: 360 }}>
            <div className="flex gap-1.5 flex-1">
              <Img src={imgs[0]} index={0} className="flex-1" />
              <Img src={imgs[1]} index={1} className="flex-1" />
            </div>
            <div className="flex gap-1.5 flex-1">
              <Img src={imgs[2]} index={2} className="flex-1" />
              <Img src={imgs[3]} index={3} className="flex-1" />
            </div>
          </div>
        </div>
      )}

      {/* ── 5+ images ────────────────────────────────────────────────── */}
      {total >= 5 && (
        <div className="px-2 sm:px-4 py-2">
          <div className="flex gap-1.5" style={{ height: 360 }}>
            <div className="flex flex-col gap-1.5 flex-1">
              <Img src={imgs[0]} index={0} className="flex-1" />
              <Img src={imgs[1]} index={1} className="flex-1" />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Img src={imgs[2]} index={2} className="flex-1" />
              <Img src={imgs[3]} index={3} className="flex-1" />
              <Img src={imgs[4]} index={4} className="flex-1" overlay={extra > 0 ? extra : undefined} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}


