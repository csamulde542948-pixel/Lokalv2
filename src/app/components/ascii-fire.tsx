// ─── ASCII Fire Animation ─────────────────────────────────────────────────────
// Canvas-based classic fire effect using ramped ASCII characters
// (`  . : ^ * x X $ # M`) propagating upward from seeded bottom rows.
// Shared by roast.tsx (full hero) and projects.tsx (smaller hero).
// Renders directly onto a <canvas> — no React state, no flicker.
import { useEffect, useRef, useState } from "react";

const FIRE_CHARS = [" ", ".", ":", "^", "*", "x", "X", "$", "#", "M"];
const FIRE_COLORS = [
  "transparent",
  "#1a0000",
  "#3d0000",
  "#7a1000",
  "#b02000",
  "#d44000",
  "#e86010",
  "#f09030",
  "#f8c050",
  "#fff8a0",
];

const CELL_PX = 7;

export function AsciiFireAnimation({
  className = "absolute inset-0 pointer-events-none z-[1]",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tick = () => {
      const W = canvas.width;
      const H = canvas.height;
      const COLS = Math.ceil(W / CELL_PX);
      const ROWS = Math.ceil(H / CELL_PX);

      if (
        !(tick as any).grid ||
        (tick as any).cols !== COLS ||
        (tick as any).rows !== ROWS
      ) {
        (tick as any).grid = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
        (tick as any).cols = COLS;
        (tick as any).rows = ROWS;
      }

      const grid: Uint8Array[] = (tick as any).grid;

      for (let x = 0; x < COLS; x++) {
        grid[ROWS - 1][x] = Math.random() < 0.92
          ? Math.floor(Math.random() * 2) + 8
          : Math.floor(Math.random() * 2);
        if (ROWS > 1)
          grid[ROWS - 2][x] = Math.random() < 0.85
            ? Math.floor(Math.random() * 2) + 7
            : 0;
        if (ROWS > 2)
          grid[ROWS - 3][x] = Math.random() < 0.70
            ? Math.floor(Math.random() * 2) + 6
            : 0;
        if (ROWS > 3)
          grid[ROWS - 4][x] = Math.random() < 0.55
            ? Math.floor(Math.random() * 2) + 5
            : 0;
      }

      for (let y = 0; y < ROWS - 4; y++) {
        for (let x = 0; x < COLS; x++) {
          const below = grid[y + 1][x];
          const left  = grid[y + 1][(x - 1 + COLS) % COLS];
          const right = grid[y + 1][(x + 1) % COLS];
          const avg   = (below + left + right) / 3;
          const decay = Math.random() * 0.45;
          grid[y][x] = Math.max(0, Math.round(avg - decay));
        }
      }

      ctx.clearRect(0, 0, W, H);
      ctx.font = `bold ${CELL_PX}px 'JetBrains Mono', monospace`;
      ctx.textBaseline = "top";

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const val = grid[y][x];
          if (val === 0) continue;
          ctx.fillStyle = FIRE_COLORS[Math.min(val, FIRE_COLORS.length - 1)];
          ctx.fillText(
            FIRE_CHARS[Math.min(val, FIRE_CHARS.length - 1)],
            x * CELL_PX,
            y * CELL_PX,
          );
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", ...(style ?? {}) }}
      aria-hidden
    />
  );
}

// ─── Text Scramble Hook ──────────────────────────────────────────────────────
// Loops a target string with random characters resolving left-to-right.
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*!?";

export function useScramble(target: string, trigger: number): string {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let iter = 0;
    const totalIters = Math.max(target.replace(/ /g, "").length * 2, 24);
    const throttle = 2;

    const animate = () => {
      if (iter % throttle === 0) {
        const i = Math.floor(iter / throttle);
        setDisplay(
          target
            .split("")
            .map((char, idx) => {
              if (char === " " || char === ".") return char;
              if (idx / target.length < i / totalIters) return char;
              return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            })
            .join("")
        );
      }
      iter++;
      if (iter >= totalIters * throttle) {
        setDisplay(target);
        return;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, trigger]);

  return display;
}

export function ScrambleLine({
  text,
  trigger,
  className,
  style,
}: {
  text: string;
  trigger: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const display = useScramble(text, trigger);
  return (
    <span className={`block ${className ?? ""}`} style={style}>
      {display}
    </span>
  );
}
