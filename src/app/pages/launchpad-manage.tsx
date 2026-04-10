import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "../components/ui/dialog";
import {
  ArrowLeft, Users, Megaphone, Settings, BarChart3, Search, Download,
  Trash2, ToggleLeft, ToggleRight, Send, Calendar, ExternalLink,
  AlertTriangle, CheckCircle2, Clock, TrendingUp,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { format, formatDistanceToNow } from "date-fns";

// ─── GQL ──────────────────────────────────────────────────────────────────────

const GET_EVENT = gql`
  query GetLaunchpadEventManage($id: ID!) {
    launchpadEvent(id: $id) {
      id projectName iconUrl screenshotUrl eventType title description
      deadline link spotsTotal interestedCount isOpen createdAt updatedAt
      author { id name username avatarUrl }
      tags { name }
    }
  }
`;

const GET_PARTICIPANTS = gql`
  query GetLaunchpadParticipants($eventId: ID!) {
    launchpadEventParticipants(eventId: $eventId) {
      id commitmentEmail commitmentNote joinedAt
      profile { id name username avatarUrl }
    }
  }
`;

const GET_STATS = gql`
  query GetLaunchpadEventStats($eventId: ID!) {
    launchpadEventStats(eventId: $eventId) {
      totalJoined spotsTotal fillRate
      joinsByDay { date count }
    }
  }
`;

const GET_ANNOUNCEMENTS = gql`
  query GetLaunchpadAnnouncements($eventId: ID!) {
    launchpadAnnouncements(eventId: $eventId) {
      id message createdAt
      creator { id name username avatarUrl }
    }
  }
`;

const UPDATE_EVENT = gql`
  mutation UpdateLaunchpadEvent($id: ID!, $input: UpdateLaunchpadEventInput!) {
    updateLaunchpadEvent(id: $id, input: $input) {
      id title description deadline link spotsTotal isOpen updatedAt
    }
  }
`;

const DELETE_EVENT = gql`
  mutation DeleteLaunchpadEvent($id: ID!) {
    deleteLaunchpadEvent(id: $id)
  }
`;

const CREATE_ANNOUNCEMENT = gql`
  mutation CreateLaunchpadAnnouncement($eventId: ID!, $message: String!) {
    createLaunchpadAnnouncement(eventId: $eventId, message: $message) {
      id message createdAt
      creator { id name username avatarUrl }
    }
  }
`;

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "participants" | "announcements" | "settings";

// ─── Tab button ────────────────────────────────────────────────────────────────

function TabBtn({ id, active, icon: Icon, label, onClick }: {
  id: Tab; active: boolean; icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ eventId, event }: { eventId: string; event: any }) {
  const { data, loading } = useQuery(GET_STATS, { variables: { eventId } });
  const stats = data?.launchpadEventStats;

  const daysLeft = event?.deadline
    ? Math.max(0, Math.ceil((new Date(event.deadline).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Joined",
            value: loading ? "—" : stats?.totalJoined ?? 0,
            icon: Users,
            color: "text-blue-500",
          },
          {
            label: "Fill Rate",
            value: loading ? "—" : stats?.spotsTotal ? `${Math.round(stats.fillRate)}%` : "—",
            icon: TrendingUp,
            color: "text-emerald-500",
          },
          {
            label: "Spots Left",
            value: loading ? "—"
              : stats?.spotsTotal
              ? Math.max(0, stats.spotsTotal - (stats.totalJoined ?? 0))
              : "∞",
            icon: CheckCircle2,
            color: "text-violet-500",
          },
          {
            label: "Days Left",
            value: daysLeft == null ? "—" : daysLeft === 0 ? "Expired" : `${daysLeft}d`,
            icon: Clock,
            color: "text-orange-500",
          },
        ].map((s) => (
          <Card key={s.label} className="border border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      {stats?.spotsTotal && (
        <Card className="border border-border/50">
          <CardContent className="p-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Capacity</span>
              <span className="text-sm text-muted-foreground">
                {stats.totalJoined} / {stats.spotsTotal}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all"
                style={{ width: `${Math.min(100, stats.fillRate)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Join velocity chart */}
      {!loading && stats?.joinsByDay && stats.joinsByDay.length > 0 && (
        <Card className="border border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Join Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-end gap-1.5 h-24">
              {(() => {
                const max = Math.max(...stats.joinsByDay.map((d: any) => d.count), 1);
                return stats.joinsByDay.map((d: any) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                    <div
                      className="w-full rounded-t bg-blue-500/70 hover:bg-blue-500 transition-all relative"
                      style={{ height: `${(d.count / max) * 80}px` }}
                      title={`${d.date}: ${d.count} join${d.count !== 1 ? "s" : ""}`}
                    />
                    <span className="text-[9px] text-muted-foreground rotate-45 origin-left truncate w-6 hidden sm:block">
                      {d.date.slice(5)}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Participants Tab ──────────────────────────────────────────────────────────

function ParticipantsTab({ eventId }: { eventId: string }) {
  const { data, loading } = useQuery(GET_PARTICIPANTS, { variables: { eventId } });
  const [search, setSearch] = useState("");

  const participants: any[] = data?.launchpadEventParticipants ?? [];
  const filtered = participants.filter(
    (p) =>
      !search ||
      p.profile.name.toLowerCase().includes(search.toLowerCase()) ||
      p.profile.username.toLowerCase().includes(search.toLowerCase()) ||
      (p.commitmentEmail ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function exportCsv() {
    const rows = [
      ["Name", "Username", "Email", "Note", "Joined"],
      ...participants.map((p) => [
        p.profile.name,
        p.profile.username,
        p.commitmentEmail ?? "",
        p.commitmentNote ?? "",
        new Date(p.joinedAt).toISOString(),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "participants.csv";
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, username or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={participants.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search ? "No participants match your search." : "No one has joined yet."}
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Participant</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Note</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={p.profile.avatarUrl} />
                        <AvatarFallback className="text-xs">
                          {p.profile.name?.[0] ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium leading-none">{p.profile.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">@{p.profile.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {p.commitmentEmail ? (
                      <a href={`mailto:${p.commitmentEmail}`} className="hover:text-foreground underline underline-offset-2">
                        {p.commitmentEmail}
                      </a>
                    ) : (
                      <span className="text-muted-foreground/40 italic text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                    {p.commitmentNote || <span className="text-muted-foreground/40 italic text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {formatDistanceToNow(new Date(p.joinedAt), { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Announcements Tab ─────────────────────────────────────────────────────────

function AnnouncementsTab({ eventId }: { eventId: string }) {
  const { data, loading, refetch } = useQuery(GET_ANNOUNCEMENTS, { variables: { eventId } });
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [createAnnouncement] = useMutation(CREATE_ANNOUNCEMENT, {
    onCompleted() {
      setMessage("");
      setSending(false);
      refetch();
    },
    onError() {
      setSending(false);
    },
  });

  async function send() {
    if (!message.trim()) return;
    setSending(true);
    await createAnnouncement({ variables: { eventId, message: message.trim() } });
  }

  const announcements: any[] = data?.launchpadAnnouncements ?? [];

  return (
    <div className="space-y-6">
      {/* Compose */}
      <Card className="border border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            Send Announcement
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            All participants who joined will receive a notification.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Write a message to all participants…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{message.length}/1000</span>
            <Button size="sm" onClick={send} disabled={!message.trim() || sending}>
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Sending…" : "Send to All"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No announcements sent yet.
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a: any) => (
            <Card key={a.id} className="border border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                    <AvatarImage src={a.creator.avatarUrl} />
                    <AvatarFallback className="text-xs">{a.creator.name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{a.creator.name}</p>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                      {a.message}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab({ eventId, event, onDeleted }: {
  eventId: string; event: any; onDeleted: () => void;
}) {
  const [form, setForm] = useState({
    title: event?.title ?? "",
    description: event?.description ?? "",
    link: event?.link ?? "",
    spotsTotal: event?.spotsTotal?.toString() ?? "",
    deadline: event?.deadline ? new Date(event.deadline).toISOString().slice(0, 16) : "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [updateEvent] = useMutation(UPDATE_EVENT);
  const [deleteEvent] = useMutation(DELETE_EVENT);

  async function save() {
    setSaving(true);
    await updateEvent({
      variables: {
        id: eventId,
        input: {
          title: form.title,
          description: form.description,
          link: form.link || null,
          spotsTotal: form.spotsTotal ? parseInt(form.spotsTotal) : null,
          deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        },
      },
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function toggleOpen() {
    await updateEvent({ variables: { id: eventId, input: { isOpen: !event.isOpen } } });
  }

  async function doDelete() {
    setDeleting(true);
    await deleteEvent({ variables: { id: eventId } });
    setDeleting(false);
    onDeleted();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Edit form */}
      <Card className="border border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="spots">Spots Total</Label>
              <Input
                id="spots"
                type="number"
                min={1}
                value={form.spotsTotal}
                onChange={(e) => setForm((f) => ({ ...f, spotsTotal: e.target.value }))}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link">Link</Label>
            <Input
              id="link"
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              placeholder="https://…"
            />
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            {saved ? (
              <><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> Saved!</>
            ) : saving ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Open / Close toggle */}
      <Card className="border border-border/50">
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-sm">Event Status</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {event?.isOpen
                ? "Your event is open — new participants can join."
                : "Your event is closed — no new participants can join."}
            </p>
          </div>
          <Button
            variant={event?.isOpen ? "outline" : "default"}
            size="sm"
            onClick={toggleOpen}
            className="shrink-0"
          >
            {event?.isOpen ? (
              <><ToggleRight className="w-4 h-4 mr-2 text-emerald-500" /> Open</>
            ) : (
              <><ToggleLeft className="w-4 h-4 mr-2 text-muted-foreground" /> Closed</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border border-destructive/40 bg-destructive/5">
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-sm text-destructive">Delete Event</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently removes this event and all participant data. This cannot be undone.
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialog(true)} className="shrink-0">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </CardContent>
      </Card>

      {/* Delete confirm dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Event?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>"{event?.title}"</strong> and all participant data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Yes, Delete Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export function LaunchpadManage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data, loading, error } = useQuery(GET_EVENT, {
    variables: { id },
    skip: !id,
  });

  const event = data?.launchpadEvent;

  // Redirect if not the creator once loaded
  if (!loading && event && event.author.id !== user?.id) {
    navigate("/launchpad", { replace: true });
    return null;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
        <AlertTriangle className="w-10 h-10 text-destructive/60" />
        <p>Failed to load event.</p>
        <Button variant="outline" onClick={() => navigate("/launchpad")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Launchpad
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/launchpad")} className="mt-1 shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          {loading ? (
            <Skeleton className="h-7 w-64 mb-2" />
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold truncate">{event?.title}</h1>
                <Badge variant={event?.isOpen ? "default" : "secondary"} className="shrink-0">
                  {event?.isOpen ? "🟢 Open" : "🔴 Closed"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {event?.projectName} · {event?.interestedCount} joined
                {event?.spotsTotal ? ` / ${event.spotsTotal} spots` : ""}
              </p>
            </>
          )}
        </div>
        {event?.link && (
          <a href={event.link} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="shrink-0">
              <ExternalLink className="w-4 h-4 mr-2" />
              Visit
            </Button>
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        <TabBtn id="overview"       active={activeTab === "overview"}       icon={BarChart3}   label="Overview"       onClick={() => setActiveTab("overview")} />
        <TabBtn id="participants"   active={activeTab === "participants"}   icon={Users}       label="Participants"   onClick={() => setActiveTab("participants")} />
        <TabBtn id="announcements"  active={activeTab === "announcements"}  icon={Megaphone}   label="Announcements"  onClick={() => setActiveTab("announcements")} />
        <TabBtn id="settings"       active={activeTab === "settings"}       icon={Settings}    label="Settings"       onClick={() => setActiveTab("settings")} />
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : (
        <>
          {activeTab === "overview"      && <OverviewTab eventId={id!} event={event} />}
          {activeTab === "participants"  && <ParticipantsTab eventId={id!} />}
          {activeTab === "announcements" && <AnnouncementsTab eventId={id!} />}
          {activeTab === "settings"      && (
            <SettingsTab
              eventId={id!}
              event={event}
              onDeleted={() => navigate("/launchpad", { replace: true })}
            />
          )}
        </>
      )}
    </div>
  );
}
