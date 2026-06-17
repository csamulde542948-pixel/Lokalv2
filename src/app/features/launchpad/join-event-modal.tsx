import { useEffect, useState } from "react";
import { AlertCircle, Check, ClipboardCheck, Loader2, Mail } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { cn } from "../../components/ui/utils";
import { eventTypeConfig, isValidEmail, type LaunchpadEventType } from ".";

type JoinEventModalEvent = {
  title?: string | null;
  projectName?: string | null;
};

export function JoinEventModal({
  open,
  onClose,
  onConfirm,
  event,
  eventType,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (email: string, note: string) => void;
  event: JoinEventModalEvent;
  eventType: LaunchpadEventType;
  loading: boolean;
}) {
  const cfg = eventTypeConfig[eventType] ?? eventTypeConfig.LAUNCH;
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [committed, setCommitted] = useState(false);
  const [err, setErr] = useState("");
  const EventIcon = cfg.icon;

  useEffect(() => {
    if (!open) {
      setEmail("");
      setNote("");
      setCommitted(false);
      setErr("");
    }
  }, [open]);

  function submit() {
    if (!email.trim() || !isValidEmail(email)) {
      setErr("Please enter a valid email address.");
      return;
    }
    if (!committed) {
      setErr("Please check the commitment box to proceed.");
      return;
    }
    setErr("");
    onConfirm(email.trim(), note.trim());
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden rounded-2xl">
        <DialogHeader className={cn("px-6 py-5 border-b", cfg.bg, cfg.border)}>
          <DialogTitle className="flex items-center gap-2.5 text-base">
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", cfg.bg, cfg.border, "border")}>
              <EventIcon className={cn("w-4 h-4", cfg.accent)} strokeWidth={2} />
            </div>
            Join {event.projectName || event.title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            The host will see your interest. Genuine applicants only.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <Badge className={cn("gap-1.5 w-fit", cfg.bg, cfg.accent, cfg.border, "border")}>
            <EventIcon className="w-3 h-3" strokeWidth={2.5} />
            {cfg.label} application
          </Badge>

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
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 rounded-xl"
            />
            <p className="text-[11px] text-muted-foreground">
              The host may contact you here directly.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="join-note" className="flex items-center gap-1.5 text-sm">
              <ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground" />
              Why you? <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="join-note"
              placeholder="Tell them briefly about your background or why you're a great fit..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="min-h-[80px] resize-none text-sm rounded-xl"
            />
          </div>

          <div
            onClick={() => setCommitted((value) => !value)}
            className={cn(
              "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
              committed ? cn(cfg.bg, cfg.border) : "border-border bg-muted/20 hover:bg-muted/40",
            )}
          >
            <div className={cn(
              "mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors",
              committed ? cn(cfg.bar, "border-transparent") : "border-muted-foreground/40 bg-background",
            )}>
              {committed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed select-none">
              <span className="font-semibold text-foreground">I commit: </span>{cfg.commitment}
            </p>
          </div>

          {err && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {err}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button className="flex-1 gap-2 rounded-xl" onClick={submit} disabled={loading}>
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><EventIcon className="w-4 h-4" /> Join Event</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
