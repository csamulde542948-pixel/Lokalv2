// ─── Launchpad shared module ──────────────────────────────────────────────────
// Event type styling, shared types, and helpers reused across the Launchpad
// pages (grid, detail, manage, chat).

import {
  Rocket, TestTube, MessageSquare, Users, Briefcase,
  type LucideIcon,
} from "lucide-react";

export type LaunchpadEventType =
  | "BETA_TESTERS"
  | "FEEDBACK"
  | "LAUNCH"
  | "COLLABORATION"
  | "HIRING";

export interface EventTypeConfig {
  label: string;
  short: string;
  icon: LucideIcon;
  accent: string;
  bg: string;
  border: string;
  ring: string;
  bar: string;
  gradient: string;
  solidBg: string;
  spotsLabel: string;
  spotsHelp: string;
  commitment: string;
  description: string;
}

export const EVENT_TYPES: LaunchpadEventType[] = [
  "BETA_TESTERS",
  "FEEDBACK",
  "LAUNCH",
  "COLLABORATION",
  "HIRING",
];

export const eventTypeConfig: Record<LaunchpadEventType, EventTypeConfig> = {
  BETA_TESTERS: {
    label: "Beta Testers",
    short: "Beta",
    icon: TestTube,
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200/70 dark:border-blue-800/50",
    ring: "ring-blue-500/30",
    bar: "bg-blue-500",
    gradient: "from-blue-500/20 via-blue-400/10 to-cyan-400/10",
    solidBg: "bg-blue-500",
    spotsLabel: "Testers needed",
    spotsHelp: "How many beta testers are you looking for?",
    commitment: "I'll actively test the product and submit detailed bug reports within a reasonable time.",
    description: "Recruit testers for an early build of your product.",
  },
  FEEDBACK: {
    label: "Feedback",
    short: "Feedback",
    icon: MessageSquare,
    accent: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200/70 dark:border-violet-800/50",
    ring: "ring-violet-500/30",
    bar: "bg-violet-500",
    gradient: "from-violet-500/20 via-violet-400/10 to-pink-400/10",
    solidBg: "bg-violet-500",
    spotsLabel: "Responses needed",
    spotsHelp: "How many feedback responses are you targeting?",
    commitment: "I'll provide honest, constructive feedback — not just generic comments.",
    description: "Get honest opinions on a feature, design, or idea.",
  },
  LAUNCH: {
    label: "Launch",
    short: "Launch",
    icon: Rocket,
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200/70 dark:border-emerald-800/50",
    ring: "ring-emerald-500/30",
    bar: "bg-emerald-500",
    gradient: "from-emerald-500/20 via-emerald-400/10 to-teal-400/10",
    solidBg: "bg-emerald-500",
    spotsLabel: "Supporters goal",
    spotsHelp: "How many supporters are you aiming to gather?",
    commitment: "I'll try out the product and share it within my network to support the launch.",
    description: "Showcase a product going live and rally supporters.",
  },
  COLLABORATION: {
    label: "Collaboration",
    short: "Collab",
    icon: Users,
    accent: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    border: "border-orange-200/70 dark:border-orange-800/50",
    ring: "ring-orange-500/30",
    bar: "bg-orange-500",
    gradient: "from-orange-500/20 via-orange-400/10 to-amber-400/10",
    solidBg: "bg-orange-500",
    spotsLabel: "Open spots",
    spotsHelp: "How many collaborators do you need?",
    commitment: "I'm genuinely interested in contributing and have relevant skills to offer.",
    description: "Find co-builders, designers, or contributors to join your team.",
  },
  HIRING: {
    label: "Hiring",
    short: "Hiring",
    icon: Briefcase,
    accent: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200/70 dark:border-rose-800/50",
    ring: "ring-rose-500/30",
    bar: "bg-rose-500",
    gradient: "from-rose-500/20 via-rose-400/10 to-pink-400/10",
    solidBg: "bg-rose-500",
    spotsLabel: "Open positions",
    spotsHelp: "How many roles are you hiring for?",
    commitment: "I'm seriously interested in this role and will respond promptly if contacted.",
    description: "Hire talent for a role on your team.",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export type DeadlineTone = "muted" | "urgent" | "soon" | "normal";

export function deadlineLabel(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isPastDate(d)) return { text: "Closed", tone: "muted" as DeadlineTone };
  if (isTodayDate(d)) return { text: "Closes today", tone: "urgent" as DeadlineTone };
  if (isTomorrowDate(d)) return { text: "Closes tomorrow", tone: "soon" as DeadlineTone };
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (days <= 7) return { text: `${days}d left`, tone: "soon" as DeadlineTone };
  return { text: formatShortDate(d), tone: "normal" as DeadlineTone };
}

function isPastDate(d: Date) {
  return d.getTime() < Date.now() - 86_400_000;
}
function isTodayDate(d: Date) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}
function isTomorrowDate(d: Date) {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return d.getFullYear() === t.getFullYear()
    && d.getMonth() === t.getMonth()
    && d.getDate() === t.getDate();
}
function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function deadlineToneClasses(tone?: DeadlineTone) {
  switch (tone) {
    case "muted":  return "text-muted-foreground";
    case "urgent": return "text-red-500";
    case "soon":   return "text-orange-500";
    default:       return "text-muted-foreground";
  }
}

export function generateDescription(
  eventType: LaunchpadEventType,
  project: { name?: string; tagline?: string } | null,
): string {
  const name = project?.name ?? "my project";
  const tag = project?.tagline ? ` — ${project.tagline}` : "";
  const templates: Record<LaunchpadEventType, string> = {
    BETA_TESTERS:
      `I'm looking for beta testers for ${name}${tag}. Help us find bugs and shape the product before our official launch. Your feedback will directly influence our roadmap.`,
    FEEDBACK:
      `We just shipped a new version of ${name}${tag} and we'd love honest feedback. Design, usability, features — all input welcome.`,
    LAUNCH:
      `${name} is officially live${tag ? ` — ${project!.tagline}.` : ""} After months of building, we're ready for the world. Check it out and let us know what you think.`,
    COLLABORATION:
      `Looking for collaborators to join the ${name} team${tag}. We need developers, designers, and problem-solvers. If this sounds like you, let's talk!`,
    HIRING:
      `${name} is hiring${tag}! We're looking for passionate builders. Work on challenging problems and ship products people love.`,
  };
  return templates[eventType];
}

export function isValidEmail(s: string) {
  return /\S+@\S+\.\S+/.test(s);
}

export { useLayoutBottomOffset } from "./use-layout-bottom-offset";

// ─── Filter tab config (reused by main grid) ──────────────────────────────────

export interface FilterTab {
  id: LaunchpadEventType | "ALL";
  label: string;
}

export const FILTER_TABS: FilterTab[] = [
  { id: "ALL", label: "All" },
  { id: "BETA_TESTERS", label: "Beta" },
  { id: "LAUNCH", label: "Launches" },
  { id: "FEEDBACK", label: "Feedback" },
  { id: "COLLABORATION", label: "Collab" },
  { id: "HIRING", label: "Hiring" },
];
