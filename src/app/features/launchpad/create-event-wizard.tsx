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
      id
    }
  }
`;

const GET_LAUNCHPAD_EVENTS = gql`
  query WizardListForUpdate($limit: Int, $offset: Int) {
    launchpadEvents(limit: $limit, offset: $offset) { id }
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
    update(cache, { data }) {
      const existing: any = cache.readQuery({ query: GET_LAUNCHPAD_EVENTS, variables: { limit: 30 } });
      if (!existing || !data?.createLaunchpadEvent) return;
      cache.writeQuery({
        query: GET_LAUNCHPAD_EVENTS,
        variables: { limit: 30 },
        data: {
          launchpadEvents: [data.createLaunchpadEvent, ...existing.launchpadEvents],
        },
      });
    },
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

  const cfg = eventTypeConfig[eventType];

  const canNext = useMemo(() => {
    if (step === 1) return !!selectedProject;
    if (step === 2) return !!eventType;
    if (step === 3) return !!title.trim() && !!description.trim();
    return true;
  }, [step, selectedProject, eventType, title, description]);

  async function handleSubmit() {
    if (!selectedProject) return;
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
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden rounded-2xl">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Rocket className="w-4 h-4 text-primary" />
              </div>
              Create a launch event
            </DialogTitle>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
              step {step} / {WIZARD_STEPS.length}
            </span>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1.5">
            {WIZARD_STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex items-center gap-1.5 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors flex-shrink-0",
                      done    ? "bg-emerald-500 text-white"
                      : active ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                    )}>
                      {done ? <Check className="w-3 h-3" strokeWidth={3} /> : s.id}
                    </div>
                    <span className={cn(
                      "text-[11px] font-medium hidden sm:inline truncate",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {s.label}
                    </span>
                  </div>
                  {i < WIZARD_STEPS.length - 1 && (
                    <div className={cn(
                      "h-px flex-1 transition-colors",
                      done ? "bg-emerald-500" : "bg-border"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        {/* ── Step content (uniform height) ── */}
        <div className={cn("px-6 py-5", CONTENT_HEIGHT)}>
          {/* Step description */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">{stepDesc.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{stepDesc.sub}</p>
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
            <div className="mt-4 flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
        </div>

        {/* ── Footer / nav ── */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t bg-muted/20">
          <Button
            variant="ghost"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="gap-1.5 rounded-xl"
            disabled={creating}
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="gap-1.5 rounded-xl"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={creating || !selectedProject}
              className="gap-1.5 rounded-xl shadow-[0_4px_24px_-4px] shadow-primary/40"
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
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-2xl py-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
          <FolderGit2 className="w-6 h-6 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium">No projects yet</p>
        <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-xs mx-auto">
          You need a registered project before you can launch an event.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl gap-1.5"
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
              "flex items-center gap-3 p-3 rounded-xl border text-left transition-all h-[68px]",
              isSelected
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border hover:border-primary/40 hover:bg-muted/30"
            )}
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
              {p.iconUrl
                ? <img src={p.iconUrl} alt="" className="w-full h-full object-cover" />
                : <FolderGit2 className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{p.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {p.tagline || p.category || "No tagline"}
              </p>
            </div>
            {isSelected && (
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
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
    <div className="grid grid-cols-2 gap-2 max-h-[330px] overflow-y-auto pr-1">
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
              "relative flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all h-[88px]",
              isSelected
                ? cn("border-current", c.bg, c.accent, "ring-2", c.ring)
                : "border-border hover:border-primary/40 hover:bg-muted/30"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              isSelected ? c.bg : "bg-muted",
              "border", c.border
            )}>
              <Icon className={cn("w-4 h-4", c.accent)} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm leading-tight">{c.label}</p>
              <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">
                {c.description}
              </p>
            </div>
            {isSelected && (
              <div className={cn(
                "absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center",
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

  return (
    <div className="space-y-3 max-h-[330px] overflow-y-auto pr-1">
      <Field label="Event name" required>
        <Input
          id="wiz-title"
          placeholder={placeholder}
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="h-10 rounded-xl"
          maxLength={120}
        />
      </Field>

      <Field
        label="Description"
        required
        action={
          <button
            type="button"
            onClick={() => setDescription(generateDescription(eventType, selectedProject))}
            className="text-[11px] font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" />
            Generate with AI
          </button>
        }
      >
        <Textarea
          id="wiz-desc"
          placeholder="Describe what you're looking for…"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="min-h-[80px] resize-none text-sm rounded-xl"
          maxLength={2000}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={cfg.spotsLabel} optional>
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
              className="h-10 rounded-xl pl-9"
            />
          </div>
        </Field>
        <Field label="Deadline" optional>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              id="wiz-deadline"
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="h-10 rounded-xl pl-9"
            />
          </div>
        </Field>
      </div>

      <Field label="Project link" optional>
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            id="wiz-link"
            type="url"
            placeholder="https://yourproject.com"
            value={link}
            onChange={e => setLink(e.target.value)}
            className="h-10 rounded-xl pl-9"
          />
        </div>
      </Field>
    </div>
  );
}

function Field({ label, required, optional, action, children }: {
  label: string;
  required?: boolean;
  optional?: boolean;
  action?: React.ReactNode;
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
      <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/50">
        {rows.map(r => (
          <div key={r.label} className="flex items-start gap-3 px-4 py-2.5 text-sm">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/60 w-20 pt-0.5 flex-shrink-0">
              {r.label}
            </span>
            <div className="flex-1 min-w-0 text-foreground/90">{r.value}</div>
          </div>
        ))}
      </div>

      {optionals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {optionals.map(o => (
            <div key={o.label} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-muted text-foreground/80">
              <o.icon className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">{o.label}:</span>
              <span className="text-muted-foreground truncate max-w-[180px]">{o.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className={cn("flex items-start gap-2 p-3 rounded-xl border", cfg.bg, cfg.border)}>
        <Sparkles className={cn("w-3.5 h-3.5 flex-shrink-0 mt-0.5", cfg.accent)} />
        <p className="text-[11px] text-foreground/80 leading-relaxed">
          Once launched, your event appears in the launchpad feed and on your profile.
          You can edit details, post announcements, and close it anytime.
        </p>
      </div>
    </div>
  );
}
