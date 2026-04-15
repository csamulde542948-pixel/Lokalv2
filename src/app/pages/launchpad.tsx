import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import {
  Rocket, TestTube, MessageSquare, Users, Calendar, ExternalLink,
  Plus, X, FolderGit2, Link2, Sparkles, CheckCircle2, Mail,
  ClipboardCheck, AlertCircle, TrendingUp, Briefcase, ImageIcon, Settings,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "../components/ui/dialog";
import { useAuth } from "../../contexts/AuthContext";

// ─── GQL ──────────────────────────────────────────────────────────────────────

const GET_MY_PROJECTS = gql`
  query GetMyProjectsForLaunchpad($userId: ID!) {
    userProjects(userId: $userId) {
      id name tagline iconUrl screenshotUrl projectUrl category status
    }
  }
`;

const GET_LAUNCHPAD_EVENTS = gql`
  query GetLaunchpadEvents($limit: Int, $offset: Int) {
    launchpadEvents(limit: $limit, offset: $offset) {
      id projectName iconUrl screenshotUrl projectTagline projectCategory projectStatus eventType title description deadline link
      spotsTotal interestedCount interestedByMe tags { name } createdAt
      author { id name username avatarUrl }
    }
  }
`;

const CREATE_LAUNCHPAD_EVENT = gql`
  mutation CreateLaunchpadEvent($input: CreateLaunchpadEventInput!) {
      createLaunchpadEvent(input: $input) {
      id projectName iconUrl screenshotUrl projectTagline projectCategory projectStatus eventType title description deadline link
      spotsTotal interestedCount isOpen interestedByMe tags { name } createdAt
      author { id name username avatarUrl }
    }
  }
`;

const MARK_INTERESTED = gql`
  mutation MarkInterested($launchpadEventId: ID!, $commitmentEmail: String, $commitmentNote: String) {
    markInterested(launchpadEventId: $launchpadEventId, commitmentEmail: $commitmentEmail, commitmentNote: $commitmentNote) {
      id interestedCount interestedByMe
    }
  }
`;

const MARK_NOT_INTERESTED = gql`
  mutation MarkNotInterested($launchpadEventId: ID!) {
    markNotInterested(launchpadEventId: $launchpadEventId) {
      id interestedCount interestedByMe
    }
  }
`;

// ─── Types ─────────────────────────────────────────────────────────────────────

type EventType = "BETA_TESTERS" | "FEEDBACK" | "LAUNCH" | "COLLABORATION" | "HIRING";

interface EventCfg {
  label: string;
  icon: React.ElementType;
  accentFrom: string;
  accentTo: string;
  accentBorder: string;
  accentText: string;
  accentRing: string;
  dot: string;
  badgeBg: string;
  progressBar: string;
  bannerOverlay: string;
  // Spots label for create form
  spotsLabel: string;
  spotsPlaceholder: string;
  spotsHelp: string;
}

const eventTypeConfig: Record<EventType, EventCfg> = {
  BETA_TESTERS: {
    label: "Beta Testers",
    icon: TestTube,
    accentFrom: "from-blue-500/12", accentTo: "to-blue-400/6",
    accentBorder: "border-blue-200/70 dark:border-blue-800/50",
    accentText: "text-blue-600 dark:text-blue-400",
    accentRing: "ring-blue-500/30",
    dot: "bg-blue-500",
    badgeBg: "bg-blue-50 dark:bg-blue-950/60",
    progressBar: "bg-blue-500",
    bannerOverlay: "from-blue-900/60 via-blue-900/30 to-transparent",
    spotsLabel: "Testers Needed",
    spotsPlaceholder: "e.g. 20",
    spotsHelp: "How many beta testers are you looking for?",
  },
  FEEDBACK: {
    label: "Feedback",
    icon: MessageSquare,
    accentFrom: "from-violet-500/12", accentTo: "to-violet-400/6",
    accentBorder: "border-violet-200/70 dark:border-violet-800/50",
    accentText: "text-violet-600 dark:text-violet-400",
    accentRing: "ring-violet-500/30",
    dot: "bg-violet-500",
    badgeBg: "bg-violet-50 dark:bg-violet-950/60",
    progressBar: "bg-violet-500",
    bannerOverlay: "from-violet-900/60 via-violet-900/30 to-transparent",
    spotsLabel: "Responses Needed",
    spotsPlaceholder: "e.g. 30",
    spotsHelp: "How many feedback responses are you targeting?",
  },
  LAUNCH: {
    label: "Launch",
    icon: Rocket,
    accentFrom: "from-emerald-500/12", accentTo: "to-emerald-400/6",
    accentBorder: "border-emerald-200/70 dark:border-emerald-800/50",
    accentText: "text-emerald-600 dark:text-emerald-400",
    accentRing: "ring-emerald-500/30",
    dot: "bg-emerald-500",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/60",
    progressBar: "bg-emerald-500",
    bannerOverlay: "from-emerald-900/60 via-emerald-900/30 to-transparent",
    spotsLabel: "Launch Goal (supporters)",
    spotsPlaceholder: "e.g. 100",
    spotsHelp: "How many supporters are you aiming to gather at launch?",
  },
  COLLABORATION: {
    label: "Collaboration",
    icon: Users,
    accentFrom: "from-orange-500/12", accentTo: "to-orange-400/6",
    accentBorder: "border-orange-200/70 dark:border-orange-800/50",
    accentText: "text-orange-600 dark:text-orange-400",
    accentRing: "ring-orange-500/30",
    dot: "bg-orange-500",
    badgeBg: "bg-orange-50 dark:bg-orange-950/60",
    progressBar: "bg-orange-500",
    bannerOverlay: "from-orange-900/60 via-orange-900/30 to-transparent",
    spotsLabel: "Open Spots",
    spotsPlaceholder: "e.g. 3",
    spotsHelp: "How many collaborators do you need?",
  },
  HIRING: {
    label: "Hiring",
    icon: Briefcase,
    accentFrom: "from-rose-500/12", accentTo: "to-rose-400/6",
    accentBorder: "border-rose-200/70 dark:border-rose-800/50",
    accentText: "text-rose-600 dark:text-rose-400",
    accentRing: "ring-rose-500/30",
    dot: "bg-rose-500",
    badgeBg: "bg-rose-50 dark:bg-rose-950/60",
    progressBar: "bg-rose-500",
    bannerOverlay: "from-rose-900/60 via-rose-900/30 to-transparent",
    spotsLabel: "Open Positions",
    spotsPlaceholder: "e.g. 2",
    spotsHelp: "How many roles are you hiring for?",
  },
};

// ─── Commitment modal questions per event type ─────────────────────────────────
const commitmentQuestions: Record<EventType, string> = {
  BETA_TESTERS:  "I commit to actively testing this product and submitting detailed bug reports and feedback within a reasonable time.",
  FEEDBACK:      "I commit to providing honest, constructive feedback — not just generic comments.",
  LAUNCH:        "I commit to trying out this product and sharing it within my network to support the launch.",
  COLLABORATION: "I am genuinely interested in contributing to this project and have relevant skills to offer.",
  HIRING:        "I am seriously interested in this role and will respond promptly if contacted by the team.",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function generateDescription(eventType: EventType, project: any): string {
  const name = project?.name ?? "my project";
  const tagline = project?.tagline ?? "";
  const tag = tagline ? ` — ${tagline}` : "";
  const templates: Record<EventType, string[]> = {
    BETA_TESTERS: [
      `I'm looking for beta testers for ${name}${tag}. Help us find bugs and shape the product before our official launch. Your feedback will directly influence our roadmap.`,
      `${name} is entering beta and we need real users to put it through its paces. Developers, creators, and early adopters — join us and make ${name} better.`,
    ],
    FEEDBACK: [
      `We just shipped a new version of ${name}${tag} and we'd love honest feedback. Design, usability, features — all input welcome. Takes less than 5 minutes.`,
      `Seeking real feedback on ${name}. We're at a crossroads on a few UX decisions and want genuine user perspective before we commit.`,
    ],
    LAUNCH: [
      `${name} is officially live!${tag ? " " + tagline + "." : ""} After months of building, we're ready for the world. Check it out and let us know what you think.`,
      `${name} is now public! We've been building quietly and we're thrilled to finally share it. Give it a spin and tell us what you think.`,
    ],
    COLLABORATION: [
      `Looking for collaborators to join the ${name} team${tag}. We need developers, designers, and problem-solvers. If this sounds like you, let's talk!`,
      `${name} is growing and we need motivated people to join. Skills in dev, design, or product thinking? Reach out!`,
    ],
    HIRING: [
      `${name} is hiring! We're looking for passionate builders${tag}. Work on challenging problems and ship products people love.`,
      `We're building the team behind ${name} and looking for exceptional talent. Competitive, flexible, and meaningful work. See the link for open roles.`,
    ],
  };
  const opts = templates[eventType];
  return opts[Math.floor(Math.random() * opts.length)];
}

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function EventSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      <Skeleton className="w-full h-36" />
      <div className="px-5 pt-3 pb-4">
        <div className="flex items-end gap-4 -mt-8 mb-3">
          <Skeleton className="w-16 h-16 rounded-2xl flex-shrink-0 border-4 border-card" />
          <div className="flex-1 pb-1 space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-3 w-full mb-1.5" />
        <Skeleton className="h-3 w-5/6 mb-4" />
        <Skeleton className="h-2 w-full rounded-full mb-3" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ─── Project Picker ───────────────────────────────────────────────────────────

function ProjectPicker({ projects, loadingProjects, selectedProject, onSelect }: {
  projects: any[]; loadingProjects: boolean; selectedProject: any; onSelect: (p: any) => void;
}) {
  if (loadingProjects) return <Skeleton className="h-10 w-full rounded-md" />;
  if (!projects.length) {
    return (
      <div className="h-10 flex items-center gap-2 border rounded-md px-3 text-sm text-muted-foreground bg-muted/30">
        <FolderGit2 className="w-4 h-4" /> No projects yet — create one first
      </div>
    );
  }
  return (
    <Select value={selectedProject?.id ?? ""} onValueChange={val => {
      const p = projects.find((p: any) => p.id === val);
      if (p) onSelect(p);
    }}>
      <SelectTrigger className="border rounded-md h-10 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedProject?.iconUrl
            ? <img src={selectedProject.iconUrl} className="w-6 h-6 rounded-lg object-cover flex-shrink-0" alt="" />
            : <FolderGit2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
          <span className="truncate">{selectedProject ? selectedProject.name : "Pick a project…"}</span>
        </div>
      </SelectTrigger>
      <SelectContent>
        {projects.map((p: any) => (
          <SelectItem key={p.id} value={p.id}>
            <div className="flex items-center gap-2.5 py-0.5">
              {p.iconUrl
                ? <img src={p.iconUrl} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" alt="" />
                : <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><FolderGit2 className="w-4 h-4 text-muted-foreground" /></div>}
              <div>
                <p className="font-medium text-sm">{p.name}</p>
                {p.tagline && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.tagline}</p>}
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Join Modal ────────────────────────────────────────────────────────────────

function JoinEventModal({ event, cfg, open, onClose, onConfirm, loading }: {
  event: any; cfg: EventCfg; open: boolean;
  onClose: () => void; onConfirm: (email: string, note: string) => void; loading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [committed, setCommitted] = useState(false);
  const [err, setErr] = useState("");
  const EventIcon = cfg.icon;
  const commitment = commitmentQuestions[event.eventType as EventType] ?? "";

  function handleSubmit() {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setErr("Please enter a valid email address."); return; }
    if (!committed) { setErr("Please check the commitment box to proceed."); return; }
    setErr("");
    onConfirm(email.trim(), note.trim());
  }

  useEffect(() => { if (!open) { setEmail(""); setNote(""); setCommitted(false); setErr(""); } }, [open]);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className={`border-b ${cfg.accentBorder} px-6 py-4 bg-gradient-to-r ${cfg.accentFrom} ${cfg.accentTo}`}>
          <DialogHeader className="gap-1">
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className={`w-8 h-8 rounded-lg ${cfg.badgeBg} border ${cfg.accentBorder} flex items-center justify-center flex-shrink-0`}>
                <EventIcon className={`w-4 h-4 ${cfg.accentText}`} strokeWidth={2} />
              </div>
              Join: {event.projectName || event.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              The project owner will review your interest. Only genuine applicants get through.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Event type badge */}
          <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full w-fit border ${cfg.accentText} ${cfg.badgeBg} ${cfg.accentBorder}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label} Application
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="join-email" className="flex items-center gap-1.5 text-sm">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              Your email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="join-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-9"
            />
            <p className="text-[11px] text-muted-foreground">The project owner may contact you here directly.</p>
          </div>

          {/* Optional note */}
          <div className="space-y-1.5">
            <Label htmlFor="join-note" className="flex items-center gap-1.5 text-sm">
              <ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground" />
              Why you? <span className="text-xs text-muted-foreground font-normal">(optional but recommended)</span>
            </Label>
            <Textarea
              id="join-note"
              placeholder="Tell them briefly about your background or why you're a great fit…"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="min-h-[80px] resize-none text-sm"
            />
          </div>

          {/* Commitment checkbox */}
          <div
            onClick={() => setCommitted(v => !v)}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              committed ? `${cfg.badgeBg} ${cfg.accentBorder}` : "border-border bg-muted/20 hover:bg-muted/40"
            }`}
          >
            <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
              committed ? `${cfg.dot} border-transparent` : "border-muted-foreground/40 bg-background"
            }`}>
              {committed && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed select-none">
              <span className="font-semibold text-foreground">I commit: </span>{commitment}
            </p>
          </div>

          {err && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {err}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button
              className={`flex-1 gap-2 font-semibold`}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Joining…" : <><EventIcon className="w-4 h-4" /> Join Event</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Event Card ────────────────────────────────────────────────────────────────

function EventCard({ event, user, onJoin, onLeave, joining }: {
  event: any; user: any;
  onJoin: (eventId: string, email: string, note: string) => void;
  onLeave: (eventId: string) => void;
  joining: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const navigate = useNavigate();

  const isCreator = user && event.author?.id === user.id;

  const et: EventType = event.eventType as EventType;
  const cfg = eventTypeConfig[et] ?? eventTypeConfig.FEEDBACK;
  const EventIcon = cfg.icon;

  const initials = (event.author?.name ?? "?")
    .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const deadlineDate = event.deadline ? new Date(event.deadline) : null;
  const isPast = deadlineDate ? deadlineDate < new Date() : false;
  const daysLeft = deadlineDate
    ? Math.ceil((deadlineDate.getTime() - Date.now()) / 86_400_000)
    : null;

  const spotsTotal: number | null = event.spotsTotal ?? null;
  const joined: number = event.interestedCount ?? 0;
  const pct = spotsTotal && spotsTotal > 0 ? clamp(Math.round((joined / spotsTotal) * 100), 0, 100) : null;
  const isFull = pct !== null && pct >= 100;

  const screenshotUrl: string | null = (!imgError && event.screenshotUrl) ? event.screenshotUrl : null;
  const iconUrl: string | null = event.iconUrl ?? null;

  function handleJoinConfirm(email: string, note: string) {
    onJoin(event.id, email, note);
    setModalOpen(false);
  }

  return (
    <>
      <Card className={`overflow-hidden border ${cfg.accentBorder} bg-card shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl group`}>
        <CardContent className="p-0 pb-0">

          {/* ── Banner / Wallpaper ───────────────────────────────────── */}
          <div className="relative w-full h-36 overflow-hidden flex-shrink-0">
            {screenshotUrl ? (
              <img
                src={screenshotUrl}
                alt={`${event.projectName} screenshot`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${cfg.accentFrom} ${cfg.accentTo} flex items-center justify-center bg-muted`}>
                <EventIcon className={`w-14 h-14 ${cfg.accentText} opacity-15`} strokeWidth={1} />
              </div>
            )}
            {/* Bottom-to-top dark scrim so logo pops */}
            <div className={`absolute inset-0 bg-gradient-to-t ${cfg.bannerOverlay} pointer-events-none`} />

            {/* Event type pill — top left */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm bg-black/50 text-white border border-white/20 z-10">
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>

            {/* Time ago — bottom right */}
            <span className="absolute bottom-2 right-3 text-[10px] text-white/60 z-10 select-none">
              {timeAgo(event.createdAt)}
            </span>
          </div>

          {/* ── Profile row ──────────────────────────────────────────── */}
          <div className="px-5 pt-2 pb-2 flex items-center gap-3">
            {/* Brand logo — negative margin on logo only so it lifts into banner */}
            <div className="w-16 h-16 rounded-2xl border-4 border-card overflow-hidden bg-muted flex-shrink-0 shadow-lg flex items-center justify-center relative z-10 -mt-10">
              {iconUrl ? (
                <img src={iconUrl} alt={event.projectName} className="w-full h-full object-cover" />
              ) : (
                <EventIcon className={`w-7 h-7 ${cfg.accentText}`} strokeWidth={1.5} />
              )}
            </div>
            {/* Project name + author — sits fully below the banner, always visible */}
            <div className="flex-1 min-w-0">
              {event.link ? (
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[18px] leading-tight truncate block hover:underline hover:text-primary transition-colors"
                >
                  {event.projectName || event.title}
                </a>
              ) : (
                <h3 className="font-bold text-[18px] leading-tight truncate">
                  {event.projectName || event.title}
                </h3>
              )}
              <div className="flex items-center gap-1.5 mt-0.5">
                <Avatar className="w-4 h-4 flex-shrink-0">
                  <AvatarImage src={event.author?.avatarUrl} />
                  <AvatarFallback className="text-[8px] font-bold bg-muted">{initials}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate">
                  <span className="font-medium text-foreground/80">{event.author?.name}</span>
                  {" · "}@{event.author?.username}
                </span>
              </div>
            </div>
          </div>

          {/* ── Body ─────────────────────────────────────────────────── */}
          <div className="px-5 pb-4 space-y-3">

            {/* Deadline + spots-full badges */}
            {(deadlineDate || isFull) && (
              <div className="flex items-center gap-2 flex-wrap">
                {deadlineDate && (
                  <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                    isPast
                      ? "text-muted-foreground border-border bg-muted/50"
                      : daysLeft !== null && daysLeft <= 3
                      ? "text-orange-700 border-orange-300 bg-orange-50 dark:bg-orange-950/40"
                      : `${cfg.accentText} ${cfg.badgeBg} ${cfg.accentBorder}`
                  }`}>
                    <Calendar className="w-3 h-3" />
                    {isPast ? "Closed" : daysLeft === 0 ? "Closes today" : daysLeft === 1 ? "1 day left" : `${daysLeft}d left`}
                  </span>
                )}
                {isFull && !event.interestedByMe && (
                  <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border text-muted-foreground border-border bg-muted/40">
                    Spots full
                  </span>
                )}
              </div>
            )}

            {/* Event title (if different from project name) + description */}
            <div>
              {event.title && event.title !== event.projectName && (
                <p className="font-semibold text-sm mb-1">{event.title}</p>
              )}
              {event.projectTagline && (
                <p className="text-xs text-muted-foreground italic mb-2">{event.projectTagline}</p>
              )}
              {/* Project category / status chips */}
              {(event.projectCategory || event.projectStatus) && (
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  {event.projectCategory && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                      {event.projectCategory.replace(/_/g, " ")}
                    </span>
                  )}
                  {event.projectStatus && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      event.projectStatus === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50"
                      : event.projectStatus === "IN_DEVELOPMENT" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50"
                      : "bg-muted text-muted-foreground border-border/60"
                    }`}>
                      {event.projectStatus.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              )}
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {event.description}
              </p>
            </div>

            {/* ── Progress bar ────────────────────────────────────── */}
            {spotsTotal !== null && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span className="font-semibold text-foreground">{joined}</span>
                    <span>/ {spotsTotal} {cfg.spotsLabel.toLowerCase()}</span>
                  </span>
                  <span className={`font-semibold ${isFull ? "text-emerald-600" : cfg.accentText}`}>
                    {isFull ? "Full!" : `${pct}%`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${cfg.progressBar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* ── Footer ──────────────────────────────────────────── */}
            <div className={`flex items-center justify-between pt-3 border-t ${cfg.accentBorder}`}>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span className="font-semibold text-foreground">{joined}</span>
                <span>{joined === 1 ? "person joined" : "people joined"}</span>
              </div>

              {isCreator ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/launchpad/${event.id}/manage`)}
                  className="h-8 text-xs rounded-full px-4 gap-1.5 font-semibold"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Manage
                </Button>
              ) : event.interestedByMe ? (
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 text-xs font-semibold ${cfg.accentText}`}>
                    <CheckCircle2 className="w-4 h-4" /> Joined
                  </span>
                  <button
                    onClick={() => onLeave(event.id)}
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors underline underline-offset-2"
                  >
                    Leave
                  </button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => user ? setModalOpen(true) : undefined}
                  disabled={!user || (isFull && !event.interestedByMe) || isPast}
                  className={`h-8 text-xs rounded-full px-4 gap-1.5 font-semibold ${
                    isFull || isPast ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <EventIcon className="w-3.5 h-3.5" />
                  {isPast ? "Closed" : isFull ? "Full" : "Join Event"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <JoinEventModal
        event={event}
        cfg={cfg}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleJoinConfirm}
        loading={joining}
      />
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function Launchpad() {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [formData, setFormData] = useState({
    eventType: "BETA_TESTERS" as EventType,
    title: "",
    description: "",
    deadline: "",
    link: "",
    spotsTotal: "",
  });
  const [createError, setCreateError] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_LAUNCHPAD_EVENTS, {
    variables: { limit: 20 },
    fetchPolicy: "cache-and-network",
  });

  const { data: projectsData, loading: loadingProjects } = useQuery(GET_MY_PROJECTS, {
    variables: { userId: user?.id },
    skip: !user?.id || !showCreateForm,
  });

  const myProjects: any[] = projectsData?.userProjects ?? [];

  useEffect(() => {
    if (selectedProject) {
      setFormData(f => ({ ...f, link: selectedProject.projectUrl ?? f.link }));
    }
  }, [selectedProject]);

  const activeCfg = eventTypeConfig[formData.eventType];

  const [createEvent, { loading: creating }] = useMutation(CREATE_LAUNCHPAD_EVENT, {
    update(cache, { data }) {
      const existing: any = cache.readQuery({ query: GET_LAUNCHPAD_EVENTS, variables: { limit: 20 } });
      if (!existing || !data) return;
      cache.writeQuery({
        query: GET_LAUNCHPAD_EVENTS,
        variables: { limit: 20 },
        data: { launchpadEvents: [data.createLaunchpadEvent, ...existing.launchpadEvents] },
      });
    },
  });

  const [markInterested] = useMutation(MARK_INTERESTED);
  const [markNotInterested] = useMutation(MARK_NOT_INTERESTED);

  const events = data?.launchpadEvents ?? [];

  const handleGenerateDescription = () => {
    setFormData(f => ({ ...f, description: generateDescription(f.eventType, selectedProject) }));
  };

  const handleCreateEvent = useCallback(async () => {
    if (!selectedProject || !formData.title || !formData.description) return;
    setCreateError("");
    try {
      await createEvent({
        variables: {
          input: {
            projectName: selectedProject.name,
            iconUrl: selectedProject.iconUrl ?? null,
            screenshotUrl: selectedProject.screenshotUrl ?? null,
            projectTagline: selectedProject.tagline ?? null,
            projectCategory: selectedProject.category ?? null,
            projectStatus: selectedProject.status ?? null,
            eventType: formData.eventType,
            title: formData.title,
            description: formData.description,
            deadline: formData.deadline || undefined,
            link: formData.link || undefined,
            spotsTotal: formData.spotsTotal ? parseInt(formData.spotsTotal, 10) : undefined,
          },
        },
      });
      setFormData({ eventType: "BETA_TESTERS", title: "", description: "", deadline: "", link: "", spotsTotal: "" });
      setSelectedProject(null);
      setShowCreateForm(false);
      toast.success("Launchpad event created! 🚀", { description: "Your event is now live." });
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      if (msg.toLowerCase().includes("launchpad limit") || msg.toLowerCase().includes("quota")) {
        toast.error("Launchpad limit reached 🗂", {
          description: "You've used all your launchpad event slots for your current rank. Level up to unlock more!",
          duration: 6000,
          action: { label: "View Ranks", onClick: () => window.location.href = "/rank-role" },
        });
      } else {
        toast.error("Failed to create event", { description: msg || "Something went wrong. Please try again." });
      }
      setCreateError(msg || "Failed to create event");
    }
  }, [formData, selectedProject, createEvent]);

  const handleJoin = useCallback(async (eventId: string, email: string, note: string) => {
    if (!user) return;
    setJoiningId(eventId);
    try {
      await markInterested({
        variables: { launchpadEventId: eventId, commitmentEmail: email, commitmentNote: note || undefined },
        update(cache, { data }) {
          if (!data?.markInterested) return;
          cache.modify({
            id: cache.identify({ __typename: "LaunchpadEvent", id: eventId }),
            fields: {
              interestedCount: () => data.markInterested.interestedCount,
              interestedByMe: () => true,
            },
          });
        },
      });
    } catch (_) {} finally {
      setJoiningId(null);
    }
  }, [user, markInterested]);

  const handleLeave = useCallback(async (eventId: string) => {
    if (!user) return;
    try {
      await markNotInterested({
        variables: { launchpadEventId: eventId },
        update(cache, { data }) {
          if (!data?.markNotInterested) return;
          cache.modify({
            id: cache.identify({ __typename: "LaunchpadEvent", id: eventId }),
            fields: {
              interestedCount: () => data.markNotInterested.interestedCount,
              interestedByMe: () => false,
            },
          });
        },
      });
    } catch (_) {}
  }, [user, markNotInterested]);

  const canSubmit = !creating && !!selectedProject && !!formData.title && !!formData.description;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <div className="max-w-3xl mx-auto">

        {/* ── Page header ── */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Rocket icon — smaller on mobile */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-primary" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold leading-tight">Launchpad</h1>
              <p className="text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">Find beta testers, get feedback & collaborate</p>
            </div>
          </div>
          {user && (
            <>
              {/* Mobile: compact circle + button */}
              <Button
                size="icon"
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="sm:hidden rounded-full w-9 h-9 flex-shrink-0"
                variant={showCreateForm ? "secondary" : "default"}
                title={showCreateForm ? "Cancel" : "Create Event"}
              >
                {showCreateForm ? <X className="w-4 h-4" strokeWidth={2.5} /> : <Plus className="w-4 h-4" strokeWidth={2.5} />}
              </Button>
              {/* Desktop: full labelled button */}
              <Button onClick={() => setShowCreateForm(!showCreateForm)} className="hidden sm:flex gap-2 rounded-full flex-shrink-0">
                {showCreateForm ? <><X className="w-4 h-4" />Cancel</> : <><Plus className="w-4 h-4" />Create Event</>}
              </Button>
            </>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-6">
            {error.message}
          </div>
        )}

        {/* ── Create form ── */}
        {showCreateForm && (
          <Card className="border-2 border-border mb-7 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="pb-4 border-b bg-muted/20">
              <CardTitle className="text-base flex items-center gap-2">
                <Rocket className="w-4 h-4 text-primary" />
                Create a Launch Event
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              {createError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{createError}
                </div>
              )}

              {/* Row 1: Title + Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Name <span className="text-destructive">*</span></Label>
                  <Input id="title" placeholder="e.g. Beta Testers Wanted" value={formData.title}
                    onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type <span className="text-destructive">*</span></Label>
                  <Select value={formData.eventType} onValueChange={v => setFormData(f => ({ ...f, eventType: v as EventType }))}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(eventTypeConfig) as [EventType, EventCfg][]).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                            <cfg.icon className="w-3.5 h-3.5" />
                            {cfg.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Project + Spots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-1">
                  <Label>Project <span className="text-destructive">*</span></Label>
                  <ProjectPicker projects={myProjects} loadingProjects={loadingProjects}
                    selectedProject={selectedProject} onSelect={setSelectedProject} />
                  {selectedProject?.tagline && (
                    <p className="text-xs text-muted-foreground truncate">{selectedProject.tagline}</p>
                  )}
                  {selectedProject && (
                    <div className="flex items-center gap-2 mt-1 p-2 rounded-lg border border-border/50 bg-muted/20">
                      <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                        {selectedProject.screenshotUrl
                          ? <img src={selectedProject.screenshotUrl} className="w-full h-full object-cover" alt="preview" />
                          : <ImageIcon className="w-5 h-5 text-muted-foreground/40" />}
                        {selectedProject.iconUrl && (
                          <img src={selectedProject.iconUrl}
                            className="absolute bottom-1 right-1 w-7 h-7 rounded-lg border-2 border-card object-cover shadow"
                            alt="icon" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{selectedProject.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {selectedProject.screenshotUrl ? "Screenshot ready" : "No screenshot — gradient used"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {selectedProject.iconUrl ? "Logo ready" : "No icon — event icon used"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spots" className="flex items-center gap-1.5">
                    {activeCfg.spotsLabel}
                    <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input id="spots" type="number" min="1" max="10000"
                    placeholder={activeCfg.spotsPlaceholder}
                    value={formData.spotsTotal}
                    onChange={e => setFormData(f => ({ ...f, spotsTotal: e.target.value }))}
                    className="h-10" />
                  <p className="text-[11px] text-muted-foreground">{activeCfg.spotsHelp}</p>
                </div>
              </div>

              {/* Row 3: Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                  <Button type="button" variant="outline" size="sm"
                    className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                    onClick={handleGenerateDescription}>
                    <Sparkles className="w-3.5 h-3.5" />Generate with AI
                  </Button>
                </div>
                <Textarea id="description" placeholder="Describe what you're looking for…"
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  className="min-h-[110px] resize-none text-sm" />
              </div>

              {/* Row 4: Link + Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="link" className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                    Project Link
                    {selectedProject?.projectUrl && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 font-normal">auto-filled</Badge>
                    )}
                  </Label>
                  <Input id="link" type="url" placeholder="https://yourproject.com"
                    value={formData.link} onChange={e => setFormData(f => ({ ...f, link: e.target.value }))}
                    className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline" className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Deadline
                    <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input id="deadline" type="date" value={formData.deadline}
                    onChange={e => setFormData(f => ({ ...f, deadline: e.target.value }))}
                    className="h-10" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => { setShowCreateForm(false); setSelectedProject(null); }}>Cancel</Button>
                <Button onClick={handleCreateEvent} disabled={!canSubmit} className="gap-2">
                  <Rocket className="w-4 h-4" />
                  {creating ? "Creating…" : "Launch Event"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Events grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
          {loading && events.length === 0
            ? [...Array(3)].map((_, i) => <EventSkeleton key={i} />)
            : events.map((event: any) => (
              <EventCard
                key={event.id}
                event={event}
                user={user}
                onJoin={handleJoin}
                onLeave={handleLeave}
                joining={joiningId === event.id}
              />
            ))}

          {!loading && events.length === 0 && (
            <Card className="border-2 border-dashed border-border rounded-2xl">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-4">
                  <Rocket className="w-8 h-8 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-lg mb-2">No launch events yet</h3>
                <p className="text-sm text-muted-foreground mb-5">Be the first to share a launch or find collaborators.</p>
                {user && (
                  <Button onClick={() => setShowCreateForm(true)} className="gap-2 rounded-full">
                    <Plus className="w-4 h-4" />Create Event
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}