// ─── Create Event Wizard ──────────────────────────────────────────────────────
// 4-step modal wizard. Every step lives in the same `min-h-[440px]` content
// area so the modal never jumps in height as you advance.
//
//   1. Project — pick a registered project
//   2. Type    — pick one of 4 event types (Hiring is intentionally excluded)
//   3. Details — title, description, spots, deadline, link
//   4. Review  — summary list (no card preview → uniform size)
//
// Submit calls `createLaunchpadEvent` via Apollo and closes on success.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { gql } from "@apollo/client/core";
import { useQuery, useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import {
  Rocket, Plus, Sparkles, Check, AlertCircle, Loader2, ChevronLeft, ChevronRight,
  FolderGit2, Calendar, Link2, Users, ArrowRight, FileText, Hash, Layers, X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Skeleton } from "../../components/ui/skeleton";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "../../components/ui/dialog";
import { cn } from "../../components/ui/utils";
import { useAuth } from "../../../contexts/AuthContext";
import {
  eventTypeConfig, generateDescription,
  type LaunchpadEventType,
} from "./index";

// ─── Form event types (Hiring excluded by spec) ──────────────────────────────

const FORM_EVENT_TYPES: LaunchpadEventType[] = [
  "BETA_TESTERS",
  "FEEDBACK",
  "LAUNCH",
  "COLLABORATION",
];

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const GET_MY_PROJECTS = gql`
  query GetMyProjectsForLaunchpadWizard($userId: ID!) {
    userProjects(userId: $userId) {
      id name tagline iconUrl screenshotUrl projectUrl category status
    }
  }
`;

const CREATE_LAUNCHPAD_EVENT = gql`
  mutation CreateLaunchpadEventWizard($input: CreateLaunchpadEventInput!) {
    createLaunchpadEvent(input: $input) {
      id projectName iconUrl screenshotUrl projectTagline projectCategory projectStatus
      eventType title description deadline link spotsTotal interestedCount interestedByMe
      tags { name } createdAt
      author { id name username avatarUrl isVerified }
    }
  }
`;

const GET_LAUNCHPAD_EVENTS = gql`
  query WizardListForUpdate($limit: Int, $offset: Int) {
    launchpadEvents(limit: $limit, offset: $offset) {
      id projectName iconUrl screenshotUrl projectTagline projectCategory projectStatus
      eventType title description deadline link spotsTotal interestedCount interestedByMe
      tags { name } createdAt
      author { id name username avatarUrl isVerified }
    }
  }
`;

// ─── Steps ────────────────────────────────────────────────────────────────────

const WIZARD_STEPS = [
  { id: 1, label: "Project" },
  { id: 2, label: "Type"    },
  { id: 3, label: "Details" },
  { id: 4, label: "Review"  },
] as const;

const STEP_DESCRIPTIONS: Record<number, { title: string; sub: string }> = {
  1: { title: "Pick a project",     sub: "The event inherits the project's branding." },
  2: { title: "What kind of event?", sub: "Sets the card style and commitment prompt." },
  3: { title: "Event details",       sub: "Title and description are required." },
  4: { title: "Review and launch",   sub: "Last look before it goes live." },
};

// Uniform content height — every step must fit inside this.
const CONTENT_HEIGHT = "min-h-[420px]";
const TITLE_LIMIT = 120;
const DESCRIPTION_LIMIT = 1200;

function isValidHttpUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function todayInputValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CreateEventWizardProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (eventId: string) => void;
}

export function CreateEventWizard({ open, onClose, onCreated }: CreateEventWizardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [eventType, setEventType] = useState<LaunchpadEventType>("BETA_TESTERS");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [link, setLink] = useState("");
  const [spotsTotal, setSpotsTotal] = useState("");
  const [error, setError] = useState("");

  const { data: projectsData, loading: loadingProjects } = useQuery(GET_MY_PROJECTS, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });
  const myProjects: any[] = projectsData?.userProjects ?? [];

  const [createEvent, { loading: creating }] = useMutation(CREATE_LAUNCHPAD_EVENT, {
    refetchQueries: [{ query: GET_LAUNCHPAD_EVENTS, variables: { limit: 30 } }],
    awaitRefetchQueries: true,
  });

  useEffect(() => {
    if (selectedProject?.projectUrl && !link) setLink(selectedProject.projectUrl);
  }, [selectedProject]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedProject(null);
      setEventType("BETA_TESTERS");
      setTitle("");
      setDescription("");
      setDeadline("");
      setLink("");
      setSpotsTotal("");
      setError("");
    }
  }, [open]);

  useEffect(() => {
    setError("");
  }, [step]);

  const cfg = eventTypeConfig[eventType];
  const spotsValue = spotsTotal ? Number(spotsTotal) : null;
  const detailsValid =
    !!title.trim()
    && !!description.trim()
    && isValidHttpUrl(link)
    && (spotsValue === null || (Number.isInteger(spotsValue) && spotsValue >= 1 && spotsValue <= 10_000))
    && (!deadline || deadline >= todayInputValue());

  const canNext = useMemo(() => {
    if (step === 1) return !!selectedProject;
    if (step === 2) return !!eventType;
    if (step === 3) return detailsValid;
    return true;
  }, [step, selectedProject, eventType, detailsValid]);

  async function handleSubmit() {
    if (!selectedProject) return;
    if (!detailsValid) {
      setStep(3);
      setError("Review the event details before launching.");
      return;
    }
    setError("");
    try {
      const res = await createEvent({
        variables: {
          input: {
            projectName: selectedProject.name,
            iconUrl: selectedProject.iconUrl ?? null,
            screenshotUrl: selectedProject.screenshotUrl ?? null,
            projectTagline: selectedProject.tagline ?? null,
            projectCategory: selectedProject.category ?? null,
            projectStatus: selectedProject.status ?? null,
            eventType,
            title: title.trim(),
            description: description.trim(),
            deadline: deadline || undefined,
            link: link || undefined,
            spotsTotal: spotsTotal ? parseInt(spotsTotal, 10) : undefined,
          },
        },
      });
      const newId = res.data?.createLaunchpadEvent?.id;
      onCreated?.(newId);
      onClose();
      toast.success("Event launched! 🚀", { description: "Your event is now live." });
      if (newId) navigate(`/launchpad/${newId}`);
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      if (msg.toLowerCase().includes("limit") || msg.toLowerCase().includes("quota")) {
        toast.error("Launchpad limit reached", {
          description: "Upgrade your rank to unlock more event slots.",
          action: { label: "View Ranks", onClick: () => window.location.href = "/rank-role" },
        });
      } else {
        toast.error("Failed to create event", { description: msg || "Something went wrong." });
      }
      setError(msg);
    }
  }

  const stepDesc = STEP_DESCRIPTIONS[step];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-3rem)] gap-0 p-0 overflow-hidden rounded-lg border-border/70 bg-background shadow-2xl"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border) / 0.28) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.28) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* ── Header ── */}
        <DialogHeader className="relative px-4 sm:px-6 pt-4 pb-4 border-b border-border/70 space-y-4 bg-background/92 backdrop-blur">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="w-8 h-8 rounded-md bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                <Rocket className="w-4 h-4 text-primary" />
              </div>
              <span>
                <span className="block text-[9px] font-mono uppercase tracking-[0.24em] text-orange-500/80 mb-0.5">// event setup</span>
                Create launch event
              </span>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
                [{String(step).padStart(2, "0")} / {String(WIZARD_STEPS.length).padStart(2, "0")}]
              </span>
              <button
                type="button"
                onClick={onClose}
                disabled={creating}
                className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-50"
                aria-label="Close create event"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stepper */}
          <div className="grid grid-cols-4 gap-px rounded-md overflow-hidden border border-border/70 bg-border/70">
            {WIZARD_STEPS.map((s) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => done && setStep(s.id)}
                  disabled={!done}
                  className={cn(
                    "min-w-0 h-11 px-2 sm:px-3 flex items-center gap-2 bg-background/95 text-left transition-colors",
                    active && "bg-foreground text-background",
                    done && !active && "hover:bg-muted/80 cursor-pointer",
                    !done && !active && "text-muted-foreground"
                  )}
                >
                  <span className="text-[10px] font-mono flex-shrink-0">
                    {done ? <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={3} /> : `0${s.id}`}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-mono uppercase truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* ── Step content (uniform height) ── */}
        <div className={cn("relative px-4 sm:px-6 py-5 overflow-y-auto", CONTENT_HEIGHT, "max-h-[calc(100dvh-230px)]")}>
          {/* Step description */}
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-muted-foreground mb-1">step_0{step}</p>
              <h3 className="text-base font-semibold text-foreground">{stepDesc.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{stepDesc.sub}</p>
            </div>
            {selectedProject && step > 1 && (
              <div className="hidden sm:flex items-center gap-2 border border-border/60 bg-background/80 rounded-md px-2.5 py-2 min-w-0 max-w-[220px]">
                <div className="w-7 h-7 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                  {selectedProject.iconUrl
                    ? <img src={selectedProject.iconUrl} alt="" className="w-full h-full object-cover" />
                    : <FolderGit2 className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-mono uppercase text-muted-foreground">project</p>
                  <p className="text-xs font-medium truncate">{selectedProject.name}</p>
                </div>
              </div>
            )}
          </div>

          {step === 1 && (
            <StepProject
              loading={loadingProjects}
              projects={myProjects}
              selected={selectedProject}
              onSelect={setSelectedProject}
            />
          )}

          {step === 2 && (
            <StepType
              value={eventType}
              onChange={setEventType}
            />
          )}

          {step === 3 && (
            <StepDetails
              eventType={eventType}
              cfg={cfg}
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              spotsTotal={spotsTotal}
              setSpotsTotal={setSpotsTotal}
              deadline={deadline}
              setDeadline={setDeadline}
              link={link}
              setLink={setLink}
              selectedProject={selectedProject}
            />
          )}

          {step === 4 && (
            <StepReview
              project={selectedProject}
              eventType={eventType}
              title={title}
              description={description}
              spotsTotal={spotsTotal}
              deadline={deadline}
              link={link}
            />
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
        </div>

        {/* ── Footer / nav ── */}
        <div className="relative flex items-center justify-between gap-2 px-4 sm:px-6 py-3.5 border-t border-border/70 bg-background/95 backdrop-blur">
          <Button
            variant="ghost"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="gap-1.5 rounded-md font-mono"
            disabled={creating}
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step === 3 && !canNext && (
            <span className="hidden sm:block text-[10px] font-mono text-muted-foreground">
              Complete required fields and resolve errors.
            </span>
          )}
          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="gap-1.5 rounded-md font-mono"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={creating || !selectedProject}
              className="gap-1.5 rounded-md font-mono shadow-[0_4px_24px_-4px] shadow-primary/30"
            >
              {creating
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Rocket className="w-4 h-4" />}
              Launch event
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Step 1: Project ──────────────────────────────────────────────────────────

function StepProject({ loading, projects, selected, onSelect }: {
  loading: boolean;
  projects: any[];
  selected: any;
  onSelect: (p: any) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-md" />)}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg py-10 text-center bg-background/70">
        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center mx-auto mb-3">
          <FolderGit2 className="w-6 h-6 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium">No projects yet</p>
        <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-xs mx-auto">
          You need a registered project before you can launch an event.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="rounded-md gap-1.5 font-mono"
          onClick={() => window.location.href = "/projects"}
        >
          <Plus className="w-3.5 h-3.5" />
          Create a project
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[330px] overflow-y-auto pr-1">
      {projects.map((p: any) => {
        const isSelected = selected?.id === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-md border text-left transition-all min-h-[72px] bg-background/75",
              isSelected
                ? "border-orange-500/70 bg-orange-500/5 ring-1 ring-orange-500/30"
                : "border-border/70 hover:border-orange-500/40 hover:bg-muted/30"
            )}
          >
            <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center border border-border/50">
              {p.iconUrl
                ? <img src={p.iconUrl} alt="" className="w-full h-full object-cover" />
                : <FolderGit2 className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{p.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {p.tagline || p.category || "No tagline"}
              </p>
              <p className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70 mt-0.5">
                {p.status || "project"}{p.category ? ` / ${p.category}` : ""}
              </p>
            </div>
            {isSelected && (
              <div className="w-5 h-5 rounded-sm bg-orange-500 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Step 2: Type ─────────────────────────────────────────────────────────────

function StepType({ value, onChange }: {
  value: LaunchpadEventType;
  onChange: (v: LaunchpadEventType) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[330px] overflow-y-auto pr-1">
      {FORM_EVENT_TYPES.map((key) => {
        const c = eventTypeConfig[key];
        const Icon = c.icon;
        const isSelected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn(
              "relative flex items-start gap-3 p-3 rounded-md border text-left transition-all min-h-[112px] bg-background/75",
              isSelected
                ? cn("border-current", c.bg, c.accent, "ring-1", c.ring)
                : "border-border/70 hover:border-orange-500/40 hover:bg-muted/30"
            )}
          >
            <div className={cn(
              "w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0",
              isSelected ? c.bg : "bg-muted",
              "border", c.border
            )}>
              <Icon className={cn("w-4 h-4", c.accent)} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm leading-tight">{c.label}</p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-1">
                {c.description}
              </p>
              <p className="text-[10px] text-foreground/65 leading-snug mt-2 line-clamp-2">
                <span className="font-mono uppercase text-muted-foreground">commitment:</span> {c.commitment}
              </p>
            </div>
            {isSelected && (
              <div className={cn(
                "absolute top-2 right-2 w-4 h-4 rounded-sm flex items-center justify-center",
                c.solidBg
              )}>
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Step 3: Details ──────────────────────────────────────────────────────────

function StepDetails({ eventType, cfg, title, setTitle, description, setDescription, spotsTotal, setSpotsTotal, deadline, setDeadline, link, setLink, selectedProject }: {
  eventType: LaunchpadEventType;
  cfg: any;
  title: string;
  setTitle: (s: string) => void;
  description: string;
  setDescription: (s: string) => void;
  spotsTotal: string;
  setSpotsTotal: (s: string) => void;
  deadline: string;
  setDeadline: (s: string) => void;
  link: string;
  setLink: (s: string) => void;
  selectedProject: any;
}) {
  const placeholder = eventType === "BETA_TESTERS" ? "e.g. Beta Testers Wanted"
    : eventType === "LAUNCH" ? "e.g. v1.0 Live on Product Hunt"
    : eventType === "FEEDBACK" ? "e.g. Need 30 Honest Reviews"
    : "e.g. Looking for a Co-founder";
  const spotsNumber = spotsTotal ? Number(spotsTotal) : null;
  const spotsError = spotsNumber !== null
    && (!Number.isInteger(spotsNumber) || spotsNumber < 1 || spotsNumber > 10_000);
  const linkError = !!link.trim() && !isValidHttpUrl(link);
  const deadlineError = !!deadline && deadline < todayInputValue();

  return (
    <div className="space-y-3 max-h-[330px] overflow-y-auto pr-1">
      <Field
        label="Event name"
        required
        action={<span className="text-[10px] font-mono text-muted-foreground">{title.length}/{TITLE_LIMIT}</span>}
      >
        <Input
          id="wiz-title"
          placeholder={placeholder}
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="h-10 rounded-md bg-background/80"
          maxLength={TITLE_LIMIT}
        />
      </Field>

      <Field
        label="Description"
        required
        action={
          <button
            type="button"
            onClick={() => setDescription(generateDescription(eventType, selectedProject))}
            className="text-[11px] font-mono font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            Use template
          </button>
        }
      >
        <Textarea
          id="wiz-desc"
          placeholder="Describe what you're looking for…"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="min-h-[96px] resize-none text-sm rounded-md bg-background/80"
          maxLength={DESCRIPTION_LIMIT}
        />
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Explain the expected contribution and what happens after joining.</span>
          <span className="font-mono">{description.length}/{DESCRIPTION_LIMIT}</span>
        </div>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label={cfg.spotsLabel} optional error={spotsError ? "Enter a whole number from 1 to 10,000." : undefined}>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="wiz-spots"
              type="number"
              min="1"
              max="10000"
              placeholder="20"
              value={spotsTotal}
              onChange={e => setSpotsTotal(e.target.value)}
              className={cn("h-10 rounded-md pl-9 bg-background/80", spotsError && "border-destructive")}
            />
          </div>
        </Field>
        <Field label="Deadline" optional error={deadlineError ? "Deadline cannot be in the past." : undefined}>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="wiz-deadline"
              type="date"
              min={todayInputValue()}
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className={cn("h-10 rounded-md pl-9 bg-background/80", deadlineError && "border-destructive")}
            />
          </div>
        </Field>
      </div>

      <Field label="Project link" optional error={linkError ? "Use a complete http:// or https:// URL." : undefined}>
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            id="wiz-link"
            type="url"
            placeholder="https://yourproject.com"
            value={link}
            onChange={e => setLink(e.target.value)}
            className={cn("h-10 rounded-md pl-9 bg-background/80", linkError && "border-destructive")}
          />
        </div>
      </Field>
    </div>
  );
}

function Field({ label, required, optional, action, error, children }: {
  label: string;
  required?: boolean;
  optional?: boolean;
  action?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between min-h-[16px]">
        <Label className="text-xs font-medium text-foreground/80">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
          {optional && <span className="text-[10px] text-muted-foreground ml-1.5 font-normal">(optional)</span>}
        </Label>
        {action}
      </div>
      {children}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────

function StepReview({ project, eventType, title, description, spotsTotal, deadline, link }: {
  project: any;
  eventType: LaunchpadEventType;
  title: string;
  description: string;
  spotsTotal: string;
  deadline: string;
  link: string;
}) {
  const cfg = eventTypeConfig[eventType];
  const Icon = cfg.icon;

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Project",
      value: (
        <span className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
            {project?.iconUrl
              ? <img src={project.iconUrl} alt="" className="w-full h-full object-cover" />
              : <FolderGit2 className="w-3 h-3 text-muted-foreground" />}
          </span>
          <span className="font-medium">{project?.name ?? "—"}</span>
        </span>
      ),
    },
    {
      label: "Type",
      value: (
        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border", cfg.bg, cfg.accent, cfg.border)}>
          <Icon className="w-3 h-3" strokeWidth={2.5} />
          {cfg.label}
        </span>
      ),
    },
    { label: "Title",       value: <span className="font-medium">{title || "—"}</span> },
    { label: "Description", value: <span className="text-muted-foreground line-clamp-2">{description || "—"}</span> },
  ];

  const optionals: { label: string; value: string; icon: any }[] = [];
  if (spotsTotal) optionals.push({ label: cfg.spotsLabel, value: `${spotsTotal}`, icon: Users });
  if (deadline)   optionals.push({ label: "Deadline",     value: new Date(deadline).toLocaleDateString(), icon: Calendar });
  if (link)       optionals.push({ label: "Link",         value: link, icon: Link2 });

  return (
    <div className="space-y-3 max-h-[330px] overflow-y-auto pr-1">
      <div className="rounded-md border border-border/60 bg-background/75 overflow-hidden">
        {project?.screenshotUrl && (
          <div className="h-24 border-b border-border/60 overflow-hidden bg-muted">
            <img src={project.screenshotUrl} alt="" className="w-full h-full object-cover object-top" />
          </div>
        )}
        <div className={cn("px-4 py-3 border-b border-border/60", cfg.bg)}>
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-md overflow-hidden bg-background border border-border/60 flex-shrink-0 flex items-center justify-center">
              {project?.iconUrl
                ? <img src={project.iconUrl} alt="" className="w-full h-full object-cover" />
                : <Icon className={cn("w-5 h-5", cfg.accent)} />}
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">public event preview</p>
              <h4 className="font-semibold text-sm truncate mt-0.5">{title}</h4>
              <p className="text-[11px] text-muted-foreground truncate">{project?.name}</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-border/50">
        {rows.map(r => (
          <div key={r.label} className="flex items-start gap-3 px-4 py-2.5 text-sm">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 w-20 pt-0.5 flex-shrink-0">
              {r.label}
            </span>
            <div className="flex-1 min-w-0 text-foreground/90">{r.value}</div>
          </div>
        ))}
        </div>
      </div>

      {optionals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {optionals.map(o => (
            <div key={o.label} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-sm border border-border/60 bg-background/75 text-foreground/80">
              <o.icon className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">{o.label}:</span>
              <span className="text-muted-foreground truncate max-w-[180px]">{o.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className={cn("flex items-start gap-2 p-3 rounded-md border", cfg.bg, cfg.border)}>
        <Sparkles className={cn("w-3.5 h-3.5 flex-shrink-0 mt-0.5", cfg.accent)} />
        <p className="text-[11px] text-foreground/80 leading-relaxed">
          Once launched, your event appears in the launchpad feed and on your profile.
          You can edit details, post announcements, and close it anytime.
        </p>
      </div>
    </div>
  );
}
