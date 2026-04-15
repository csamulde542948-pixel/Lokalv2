import { ReactNode } from "react";

interface AvatarFrameProps {
  children: ReactNode;
  roleName?: string | null;
  rankName?: string | null;
  size?: 32 | 40 | 48 | 96 | 128;
  className?: string;
}

const RANK_RING: Record<string, string> = {
  Newbie:       "#9ca3af",
  "Junior Dev": "#4ade80",
  Developer:    "#60a5fa",
  "Senior Dev": "#c084fc",
  "Tech Lead":  "#fb923c",
  Architect:    "#f87171",
  Principal:    "#facc15",
  Legend:       "#f59e0b",
};

interface FrameDef {
  defs: (id: string) => string;
  bg?: (id: string, cx: number, r: number) => string;
  fg: (id: string, cx: number, r: number) => string;
  animation?: (id: string) => string;
}

// Open Sourcerer - spinning code orbit + indigo aurora
const OPEN_SOURCERER: FrameDef = {
  animation: (id) => `
    @keyframes ${id}-spin { to { transform: rotate(360deg); } }
    @keyframes ${id}-spin2 { to { transform: rotate(-360deg); } }
    @keyframes ${id}-pulse { 0%,100% { opacity:.3; } 50% { opacity:.7; } }
    @keyframes ${id}-dash { to { stroke-dashoffset: -40; } }
    .${id}-o1 { animation: ${id}-spin 8s linear infinite; transform-box:fill-box; transform-origin:center; }
    .${id}-o2 { animation: ${id}-spin2 14s linear infinite; transform-box:fill-box; transform-origin:center; }
    .${id}-gl { animation: ${id}-pulse 2.5s ease-in-out infinite; }
    .${id}-d  { animation: ${id}-dash 2s linear infinite; }
  `,
  defs: (id) => `
    <linearGradient id="${id}-g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="50%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
    <filter id="${id}-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${id}-aura" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>`,
  fg: (id, cx, r) => {
    const rr = r + 7;
    const or = rr + 14;
    const brackets = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = cx + or * Math.cos(a);
      const y = cx + or * Math.sin(a);
      const s = i % 3 === 0 ? "{}" : i % 3 === 1 ? "<>" : "//";
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="7.5" font-family="monospace" fill="#818cf8" font-weight="bold">${s}</text>`;
    }).join("");
    const nodes = Array.from({ length: 4 }, (_, i) => {
      const a = (i / 4) * Math.PI * 2;
      const x = cx + (rr + 5) * Math.cos(a);
      const y = cx + (rr + 5) * Math.sin(a);
      return `<circle cx="${x}" cy="${y}" r="3" fill="#a78bfa" filter="url(#${id}-glow)"/>`;
    }).join("");
    return `
      <circle cx="${cx}" cy="${cx}" r="${rr + 8}" fill="none" stroke="#6366f1" stroke-width="10" opacity="0.1" class="${id}-gl" filter="url(#${id}-aura)"/>
      <circle cx="${cx}" cy="${cx}" r="${rr}" fill="none" stroke="url(#${id}-g)" stroke-width="3.5" filter="url(#${id}-glow)"/>
      <circle cx="${cx}" cy="${cx}" r="${rr - 3}" fill="none" stroke="#818cf8" stroke-width="1" opacity="0.4" stroke-dasharray="3 5" class="${id}-d"/>
      <g class="${id}-o1"><circle cx="${cx}" cy="${cx}" r="${or}" fill="none" stroke="#6366f1" stroke-width="0.75" opacity="0.3" stroke-dasharray="4 6"/>${brackets}</g>
      <g class="${id}-o2">${nodes}</g>`;
  },
};

// Launch King - golden crown + orbiting stars
const LAUNCH_KING: FrameDef = {
  animation: (id) => `
    @keyframes ${id}-spin { to { transform: rotate(360deg); } }
    @keyframes ${id}-sp { 0%,100%{opacity:0;} 50%{opacity:1;} }
    @keyframes ${id}-au { 0%,100%{opacity:.25;} 50%{opacity:.6;} }
    .${id}-os { animation: ${id}-spin 6s linear infinite; transform-box:fill-box; transform-origin:center; }
    .${id}-s1 { animation: ${id}-sp 1.4s ease-in-out infinite; }
    .${id}-s2 { animation: ${id}-sp 1.4s 0.5s ease-in-out infinite; }
    .${id}-s3 { animation: ${id}-sp 1.4s 0.9s ease-in-out infinite; }
    .${id}-au { animation: ${id}-au 2s ease-in-out infinite; }
  `,
  defs: (id) => `
    <linearGradient id="${id}-g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="40%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="${id}-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${id}-aura" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>`,
  fg: (id, cx, r) => {
    const rr = r + 7;
    const stars = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const x = cx + (rr + 13) * Math.cos(a);
      const y = cx + (rr + 13) * Math.sin(a);
      return `<circle cx="${x}" cy="${y}" r="${i % 2 === 0 ? 2.2 : 1.2}" fill="#fbbf24" opacity="${i % 2 === 0 ? 0.9 : 0.5}"/>`;
    }).join("");
    const cw = r < 48 ? 24 : 28;
    const ch = r < 48 ? 13 : 16;
    const crown = `<g transform="translate(${cx - cw / 2} ${cx - rr - ch - 4})">
      <polygon points="0,${ch} ${cw * 0.14},${ch * 0.25} ${cw * 0.5},${ch * 0.625} ${cw * 0.64},0 ${cw * 0.79},${ch * 0.625} ${cw},${ch * 0.25} ${cw},${ch}" fill="url(#${id}-g)" stroke="#92400e" stroke-width="0.7" filter="url(#${id}-glow)"/>
      <circle cx="${cw * 0.64}" cy="2" r="2.2" fill="#fef3c7"/>
      <circle cx="${cw * 0.14}" cy="${ch * 0.3}" r="1.6" fill="#fde68a"/>
      <circle cx="${cw}" cy="${ch * 0.3}" r="1.6" fill="#fde68a"/>
    </g>`;
    const sparkles = [
      { a: -45, d: rr + 16, c: `${id}-s1` },
      { a: 45,  d: rr + 14, c: `${id}-s2` },
      { a: 135, d: rr + 16, c: `${id}-s3` },
    ].map(({ a, d, c }) => {
      const rad = a * Math.PI / 180;
      const x = cx + d * Math.cos(rad);
      const y = cx + d * Math.sin(rad);
      return `<circle cx="${x}" cy="${y}" r="2.5" fill="#fde68a" class="${c}" filter="url(#${id}-glow)"/>`;
    }).join("");
    return `
      <circle cx="${cx}" cy="${cx}" r="${rr + 6}" fill="#fbbf24" filter="url(#${id}-aura)" opacity="0.22" class="${id}-au"/>
      <g class="${id}-os">${stars}</g>
      <circle cx="${cx}" cy="${cx}" r="${rr}" fill="none" stroke="url(#${id}-g)" stroke-width="4" filter="url(#${id}-glow)"/>
      <circle cx="${cx}" cy="${cx}" r="${rr - 4}" fill="none" stroke="#fde68a" stroke-width="0.8" opacity="0.4"/>
      ${crown}${sparkles}`;
  },
};

// Roast Master - fire ring + animated flames
const ROAST_MASTER: FrameDef = {
  animation: (id) => `
    @keyframes ${id}-flk { 0%,100%{opacity:.8;} 50%{opacity:1;} }
    @keyframes ${id}-r1 { to { transform: rotate(360deg); } }
    @keyframes ${id}-r2 { to { transform: rotate(-360deg); } }
    @keyframes ${id}-au { 0%,100%{opacity:.2;} 50%{opacity:.5;} }
    .${id}-f1 { animation: ${id}-flk 0.7s ease-in-out infinite; }
    .${id}-f2 { animation: ${id}-flk 0.7s 0.23s ease-in-out infinite; }
    .${id}-f3 { animation: ${id}-flk 0.7s 0.46s ease-in-out infinite; }
    .${id}-r1 { animation: ${id}-r1 5s linear infinite; transform-box:fill-box; transform-origin:center; }
    .${id}-r2 { animation: ${id}-r2 8s linear infinite; transform-box:fill-box; transform-origin:center; }
    .${id}-au { animation: ${id}-au 1.5s ease-in-out infinite; }
  `,
  defs: (id) => `
    <linearGradient id="${id}-g" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7f1d1d"/>
      <stop offset="35%" stop-color="#dc2626"/>
      <stop offset="70%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
    <filter id="${id}-fire" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="2.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${id}-aura" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="9"/>
    </filter>`,
  fg: (id, cx, r) => {
    const rr = r + 7;
    const flames = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const x = cx + (rr + 10) * Math.cos(a);
      const y = cx + (rr + 10) * Math.sin(a);
      const cls = [`${id}-f1`, `${id}-f2`, `${id}-f3`][i % 3];
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="12" class="${cls}" filter="url(#${id}-fire)">&#x1F525;</text>`;
    }).join("");
    const embers = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const x = cx + (rr + 19) * Math.cos(a);
      const y = cx + (rr + 19) * Math.sin(a);
      const colors = ["#dc2626", "#f97316", "#fbbf24"];
      return `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 2.2 : 1.2}" fill="${colors[i % 3]}" opacity="${0.4 + (i % 3) * 0.2}"/>`;
    }).join("");
    return `
      <circle cx="${cx}" cy="${cx}" r="${rr + 8}" fill="#ef4444" filter="url(#${id}-aura)" opacity="0.28" class="${id}-au"/>
      <g class="${id}-r2">${embers}</g>
      <circle cx="${cx}" cy="${cx}" r="${rr}" fill="none" stroke="url(#${id}-g)" stroke-width="4.5" filter="url(#${id}-fire)"/>
      <circle cx="${cx}" cy="${cx}" r="${rr - 4}" fill="none" stroke="#f97316" stroke-width="1.5" opacity="0.5" stroke-dasharray="3 4"/>
      <g class="${id}-r1">${flames}</g>`;
  },
};

// Event Organizer - cyan ring + orbiting confetti
const EVENT_ORGANIZER: FrameDef = {
  animation: (id) => `
    @keyframes ${id}-spin { to { transform: rotate(360deg); } }
    @keyframes ${id}-au { 0%,100%{opacity:.18;} 60%{opacity:.45;} }
    @keyframes ${id}-d { to { stroke-dashoffset: -32; } }
    .${id}-or { animation: ${id}-spin 10s linear infinite; transform-box:fill-box; transform-origin:center; }
    .${id}-au { animation: ${id}-au 2s ease-in-out infinite; }
    .${id}-d  { animation: ${id}-d 1.5s linear infinite; }
  `,
  defs: (id) => `
    <linearGradient id="${id}-g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0ea5e9"/>
      <stop offset="50%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#14b8a6"/>
    </linearGradient>
    <filter id="${id}-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="2.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${id}-aura" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>`,
  fg: (id, cx, r) => {
    const rr = r + 7;
    const notches = [0, 90, 180, 270].map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const x = cx + rr * Math.cos(rad);
      const y = cx + rr * Math.sin(rad);
      return `<circle cx="${x}" cy="${y}" r="4.5" fill="var(--background,#09090b)" stroke="url(#${id}-g)" stroke-width="1.5"/>`;
    }).join("");
    const cc = ["#0ea5e9", "#f472b6", "#a78bfa", "#34d399", "#fb923c", "#fbbf24", "#60a5fa", "#f87171"];
    const confetti = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const x = cx + (rr + 15) * Math.cos(a);
      const y = cx + (rr + 15) * Math.sin(a);
      const deg = (i / 8) * 360;
      if (i % 3 === 0) return `<rect x="${x - 2.5}" y="${y - 4}" width="5" height="8" rx="1.5" fill="${cc[i]}" transform="rotate(${deg} ${x} ${y})"/>`;
      if (i % 3 === 1) return `<circle cx="${x}" cy="${y}" r="3" fill="${cc[i]}"/>`;
      return `<polygon points="${x},${y - 4} ${x + 3.5},${y + 3} ${x - 3.5},${y + 3}" fill="${cc[i]}"/>`;
    }).join("");
    return `
      <circle cx="${cx}" cy="${cx}" r="${rr + 6}" fill="#06b6d4" filter="url(#${id}-aura)" opacity="0.2" class="${id}-au"/>
      <g class="${id}-or">${confetti}</g>
      <circle cx="${cx}" cy="${cx}" r="${rr}" fill="none" stroke="url(#${id}-g)" stroke-width="3.5" filter="url(#${id}-glow)"/>
      <circle cx="${cx}" cy="${cx}" r="${rr - 4}" fill="none" stroke="#22d3ee" stroke-width="1.2" opacity="0.5" stroke-dasharray="4 6" class="${id}-d"/>
      ${notches}`;
  },
};

// Hired! - emerald ring + animated checkmark badge
const HIRED: FrameDef = {
  animation: (id) => `
    @keyframes ${id}-spin { to { transform: rotate(360deg); } }
    @keyframes ${id}-au { 0%,100%{opacity:.15;} 50%{opacity:.4;} }
    @keyframes ${id}-d { to { stroke-dashoffset: -30; } }
    .${id}-or { animation: ${id}-spin 7s linear infinite; transform-box:fill-box; transform-origin:center; }
    .${id}-au { animation: ${id}-au 2.2s ease-in-out infinite; }
    .${id}-d  { animation: ${id}-d 2s linear infinite; }
  `,
  defs: (id) => `
    <linearGradient id="${id}-g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="50%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <filter id="${id}-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="2.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${id}-aura" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>`,
  fg: (id, cx, r) => {
    const rr = r + 7;
    const ticks = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      const x = cx + (rr + 14) * Math.cos(a);
      const y = cx + (rr + 14) * Math.sin(a);
      return `<circle cx="${x}" cy="${y}" r="${i % 2 === 0 ? 3 : 2}" fill="#34d399" opacity="${i % 2 === 0 ? 0.8 : 0.4}"/>`;
    }).join("");
    const cx2 = cx + rr * Math.cos(-Math.PI / 4);
    const cy2 = cx + rr * Math.sin(-Math.PI / 4);
    return `
      <circle cx="${cx}" cy="${cx}" r="${rr + 6}" fill="#10b981" filter="url(#${id}-aura)" opacity="0.2" class="${id}-au"/>
      <g class="${id}-or">${ticks}</g>
      <circle cx="${cx}" cy="${cx}" r="${rr}" fill="none" stroke="url(#${id}-g)" stroke-width="3.5" filter="url(#${id}-glow)"/>
      <circle cx="${cx}" cy="${cx}" r="${rr - 4}" fill="none" stroke="#34d399" stroke-width="1" opacity="0.4" stroke-dasharray="3 5" class="${id}-d"/>
      <circle cx="${cx2}" cy="${cy2}" r="10" fill="#10b981" stroke="var(--background,#09090b)" stroke-width="2" filter="url(#${id}-glow)"/>
      <polyline points="${cx2 - 4},${cy2} ${cx2 - 1},${cy2 + 3.5} ${cx2 + 5},${cy2 - 4}" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  },
};

// Top Contributor - rainbow prism double ring
const TOP_CONTRIBUTOR: FrameDef = {
  animation: (id) => `
    @keyframes ${id}-r1 { to { transform: rotate(360deg); } }
    @keyframes ${id}-r2 { to { transform: rotate(-360deg); } }
    @keyframes ${id}-au { 0%,100%{opacity:.22;} 50%{opacity:.55;} }
    @keyframes ${id}-d  { to { stroke-dashoffset: -40; } }
    .${id}-h1 { animation: ${id}-r1 6s linear infinite; transform-box:fill-box; transform-origin:center; }
    .${id}-h2 { animation: ${id}-r2 9s linear infinite; transform-box:fill-box; transform-origin:center; }
    .${id}-au { animation: ${id}-au 2s ease-in-out infinite; }
    .${id}-d  { animation: ${id}-d 1.8s linear infinite; }
  `,
  defs: (id) => `
    <linearGradient id="${id}-g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="25%" stop-color="#ef4444"/>
      <stop offset="50%" stop-color="#a855f7"/>
      <stop offset="75%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <linearGradient id="${id}-g2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#f87171"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
    <filter id="${id}-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${id}-aura" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>`,
  fg: (id, cx, r) => {
    const rr = r + 7;
    const cols = ["#f59e0b", "#ef4444", "#a855f7", "#3b82f6", "#10b981", "#f97316"];
    const stars = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      const x = cx + (rr + 10) * Math.cos(a);
      const y = cx + (rr + 10) * Math.sin(a);
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="9" fill="${cols[i]}">&#x2605;</text>`;
    }).join("");
    const dots = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      const x = cx + (rr + 20) * Math.cos(a);
      const y = cx + (rr + 20) * Math.sin(a);
      return `<circle cx="${x}" cy="${y}" r="${i % 2 === 0 ? 2.5 : 1.5}" fill="${cols[i % 6]}" opacity="${i % 2 === 0 ? 0.85 : 0.45}"/>`;
    }).join("");
    return `
      <circle cx="${cx}" cy="${cx}" r="${rr + 10}" fill="url(#${id}-g)" filter="url(#${id}-aura)" opacity="0.18" class="${id}-au"/>
      <g class="${id}-h2">${dots}</g>
      <g class="${id}-h1">${stars}</g>
      <circle cx="${cx}" cy="${cx}" r="${rr}" fill="none" stroke="url(#${id}-g)" stroke-width="4.5" filter="url(#${id}-glow)"/>
      <circle cx="${cx}" cy="${cx}" r="${rr - 5}" fill="none" stroke="url(#${id}-g2)" stroke-width="1.5" opacity="0.6" stroke-dasharray="5 4" class="${id}-d"/>
      <text x="${cx}" y="${cx + rr + 16}" text-anchor="middle" font-size="16" filter="url(#${id}-glow)">&#x1F3C6;</text>`;
  },
};

// Mentor - violet wisdom ring + graduation cap + pulsing dots
const MENTOR: FrameDef = {
  animation: (id) => `
    @keyframes ${id}-spin { to { transform: rotate(360deg); } }
    @keyframes ${id}-dp { 0%,100%{opacity:.25;} 50%{opacity:.85;} }
    @keyframes ${id}-au { 0%,100%{opacity:.2;} 50%{opacity:.5;} }
    @keyframes ${id}-d  { to { stroke-dashoffset: -36; } }
    .${id}-or { animation: ${id}-spin 11s linear infinite; transform-box:fill-box; transform-origin:center; }
    .${id}-dp { animation: ${id}-dp 2s ease-in-out infinite; }
    .${id}-au { animation: ${id}-au 2.5s ease-in-out infinite; }
    .${id}-d  { animation: ${id}-d 2s linear infinite; }
  `,
  defs: (id) => `
    <linearGradient id="${id}-g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="50%" stop-color="#6d28d9"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
    <filter id="${id}-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="2.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="${id}-aura" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="8"/>
    </filter>`,
  fg: (id, cx, r) => {
    const rr = r + 7;
    const kdots = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const d = rr + 10 + (i % 3) * 4;
      const x = cx + d * Math.cos(a);
      const y = cx + d * Math.sin(a);
      return `<circle cx="${x}" cy="${y}" r="${i % 4 === 0 ? 2.5 : 1.5}" fill="#a78bfa" opacity="${i % 4 === 0 ? 0.8 : 0.4}" style="animation-delay:${(i / 12) * 2}s" class="${id}-dp"/>`;
    }).join("");
    const syms = Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const x = cx + (rr + 17) * Math.cos(a);
      const y = cx + (rr + 17) * Math.sin(a);
      const s = ["&#x2736;", "&#x2737;", "&#x22C6;", "&#x2736;", "&#x2737;"][i];
      return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="9" fill="#a78bfa" opacity="0.8">${s}</text>`;
    }).join("");
    const cy2 = cx - rr - 15;
    const cap = `<g filter="url(#${id}-glow)">
      <polygon points="${cx - 14},${cy2 + 7} ${cx},${cy2} ${cx + 14},${cy2 + 7} ${cx},${cy2 + 14}" fill="url(#${id}-g)"/>
      <rect x="${cx + 6}" y="${cy2 + 7}" width="3" height="7" fill="#5b21b6" rx="1"/>
      <circle cx="${cx + 7}" cy="${cy2 + 15}" r="3" fill="#7c3aed"/>
    </g>`;
    return `
      <circle cx="${cx}" cy="${cx}" r="${rr + 8}" fill="#7c3aed" filter="url(#${id}-aura)" opacity="0.2" class="${id}-au"/>
      ${kdots}
      <g class="${id}-or">${syms}</g>
      <circle cx="${cx}" cy="${cx}" r="${rr}" fill="none" stroke="url(#${id}-g)" stroke-width="3.5" filter="url(#${id}-glow)"/>
      <circle cx="${cx}" cy="${cx}" r="${rr + 5}" fill="none" stroke="#7c3aed" stroke-width="0.8" opacity="0.3" stroke-dasharray="3 5" class="${id}-d"/>
      ${cap}`;
  },
};

const ROLE_FRAMES: Record<string, FrameDef> = {
  "Open Sourcerer":  OPEN_SOURCERER,
  "Launch King":     LAUNCH_KING,
  "Roast Master":    ROAST_MASTER,
  "Event Organizer": EVENT_ORGANIZER,
  "Hired!":          HIRED,
  "Top Contributor": TOP_CONTRIBUTOR,
  "Mentor":          MENTOR,
};

const ROLE_PRIORITY = [
  "Top Contributor",
  "Launch King",
  "Roast Master",
  "Mentor",
  "Open Sourcerer",
  "Event Organizer",
  "Hired!",
];

// Scale helper — returns thinner values for small avatars
function scale(size: number, full: number, small: number) {
  return size <= 48 ? small : full;
}

export function AvatarFrame({ children, roleName, rankName, size = 128, className = "" }: AvatarFrameProps) {
  const isSmall  = size <= 48;
  const padding  = isSmall ? 8 : 32;
  const viewSize = size + padding * 2;
  const cx       = viewSize / 2;
  const avatarR  = size / 2;
  // Pass a scale hint to fg via a modified radius offset so orbits stay proportional
  const frameId  = `af${(roleName ?? rankName ?? "def").replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
  const frame    = roleName ? ROLE_FRAMES[roleName] : null;
  const ringColor = rankName ? (RANK_RING[rankName] ?? "#6b7280") : "#6b7280";

  // For small sizes, render into a scaled SVG so stroke widths + ornaments shrink automatically
  const svgScale = isSmall ? size / 128 : 1;
  // Logical size at which we always compute geometry (full size)
  const logicalR = isSmall ? 64 : avatarR;
  const logicalPad = isSmall ? 32 : padding;
  const logicalVS  = isSmall ? 128 + logicalPad * 2 : viewSize;
  const logicalCX  = logicalVS / 2;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: viewSize, height: viewSize }}>
      {frame?.animation && <style dangerouslySetInnerHTML={{ __html: frame.animation(frameId) }} />}
      <div className="absolute rounded-full overflow-hidden" style={{ width: size, height: size, top: padding, left: padding }}>
        {children}
      </div>
      <svg
        width={viewSize} height={viewSize}
        viewBox={`0 0 ${logicalVS} ${logicalVS}`}
        className="absolute inset-0 pointer-events-none"
        style={{ overflow: "visible" }}
        aria-hidden
      >
        <defs dangerouslySetInnerHTML={{ __html: frame ? frame.defs(frameId) : "" }} />
        {frame?.bg && <g dangerouslySetInnerHTML={{ __html: frame.bg(frameId, logicalCX, logicalR) }} />}
        {frame ? (
          <g dangerouslySetInnerHTML={{ __html: frame.fg(frameId, logicalCX, logicalR) }} />
        ) : (
          <>
            <circle cx={logicalCX} cy={logicalCX} r={logicalR + 7} fill="none" stroke={ringColor}
              strokeWidth={scale(size, 3.5, 2)}
              style={{ filter: `drop-shadow(0 0 6px ${ringColor}88)` }} />
            <circle cx={logicalCX} cy={logicalCX} r={logicalR + 13} fill="none" stroke={ringColor}
              strokeWidth={scale(size, 1, 0.6)} opacity={0.25} strokeDasharray="4 6" />
          </>
        )}
      </svg>
    </div>
  );
}

export function pickFrameRole(roleNames: string[]): string | null {
  for (const p of ROLE_PRIORITY) { if (roleNames.includes(p)) return p; }
  return roleNames[0] ?? null;
}