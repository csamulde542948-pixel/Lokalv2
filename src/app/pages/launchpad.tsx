import { useState, useCallback } from "react";
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
  Rocket,
  TestTube,
  MessageSquare,
  Users,
  Calendar,
  Tag,
  ExternalLink,
  Plus,
  X,
} from "lucide-react";
import { Separator } from "../components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAuth } from "../../contexts/AuthContext";

// â”€â”€â”€ GraphQL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const GET_LAUNCHPAD_EVENTS = gql`
  query GetLaunchpadEvents($limit: Int, $offset: Int) {
    launchpadEvents(limit: $limit, offset: $offset) {
      id
      projectName
      eventType
      title
      description
      deadline
      link
      interestedCount
      interestedByMe
      tags { name }
      createdAt
      author {
        id
        name
        username
        avatarUrl
      }
    }
  }
`;

const CREATE_LAUNCHPAD_EVENT = gql`
  mutation CreateLaunchpadEvent($input: CreateLaunchpadEventInput!) {
    createLaunchpadEvent(input: $input) {
      id
      projectName
      eventType
      title
      description
      deadline
      link
      interestedCount
      interestedByMe
      tags { name }
      createdAt
      author {
        id
        name
        username
        avatarUrl
      }
    }
  }
`;

const MARK_INTERESTED = gql`
  mutation MarkInterested($launchpadEventId: ID!) {
    markInterested(launchpadEventId: $launchpadEventId) {
      id
      interestedCount
      interestedByMe
    }
  }
`;

const MARK_NOT_INTERESTED = gql`
  mutation MarkNotInterested($launchpadEventId: ID!) {
    markNotInterested(launchpadEventId: $launchpadEventId) {
      id
      interestedCount
      interestedByMe
    }
  }
`;

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type EventType = "BETA_TESTERS" | "FEEDBACK" | "LAUNCH" | "COLLABORATION" | "HIRING";

const eventTypeConfig: Record<EventType, { label: string; icon: React.ElementType; color: string }> = {
  BETA_TESTERS:  { label: "Beta Testers",  icon: TestTube,      color: "bg-blue-100 text-blue-700 border-blue-200" },
  FEEDBACK:      { label: "Feedback",       icon: MessageSquare, color: "bg-purple-100 text-purple-700 border-purple-200" },
  LAUNCH:        { label: "Launch",         icon: Rocket,        color: "bg-green-100 text-green-700 border-green-200" },
  COLLABORATION: { label: "Collaboration",  icon: Users,         color: "bg-orange-100 text-orange-700 border-orange-200" },
  HIRING:        { label: "Hiring",         icon: Users,         color: "bg-pink-100 text-pink-700 border-pink-200" },
};

function timeAgo(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// â”€â”€â”€ Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function EventSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-md" />
            <Skeleton className="h-5 w-24 rounded-md" />
          </div>
        </div>
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-1">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
    </div>
  );
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function Launchpad() {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    projectName: "", eventType: "BETA_TESTERS" as EventType,
    title: "", description: "", tags: "", deadline: "", link: "",
  });
  const [createError, setCreateError] = useState("");

  const { data, loading, error } = useQuery(GET_LAUNCHPAD_EVENTS, {
    variables: { limit: 20 },
    fetchPolicy: "cache-and-network",
  });

  const [createEvent, { loading: creating }] = useMutation(CREATE_LAUNCHPAD_EVENT, {
    update(cache, { data }) {
      const existing: any = cache.readQuery({ query: GET_LAUNCHPAD_EVENTS, variables: { limit: 20 } });
      if (!existing || !data) return;
      cache.writeQuery({
        query: GET_LAUNCHPAD_EVENTS,
        variables: { limit: 20 },
        data: {
          launchpadEvents: [data.createLaunchpadEvent, ...existing.launchpadEvents],
        },
      });
    },
  });

  const [markInterested]    = useMutation(MARK_INTERESTED);
  const [markNotInterested] = useMutation(MARK_NOT_INTERESTED);

  const events = data?.launchpadEvents ?? [];

  const handleCreateEvent = useCallback(async () => {
    if (!formData.projectName || !formData.title || !formData.description) return;
    setCreateError("");
    try {
      await createEvent({
        variables: {
          input: {
            projectName: formData.projectName,
            eventType: formData.eventType,
            title: formData.title,
            description: formData.description,
            tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
            deadline: formData.deadline || undefined,
            link: formData.link || undefined,
          },
        },
      });
      setFormData({ projectName: "", eventType: "BETA_TESTERS", title: "", description: "", tags: "", deadline: "", link: "" });
      setShowCreateForm(false);
    } catch (e: any) {
      setCreateError(e.message ?? "Failed to create event");
    }
  }, [formData, createEvent]);

  const handleInterested = useCallback(async (eventId: string, alreadyInterested: boolean) => {
    if (!user) return;
    try {
      if (alreadyInterested) {
        await markNotInterested({ variables: { launchpadEventId: eventId } });
      } else {
        await markInterested({ variables: { launchpadEventId: eventId } });
      }
    } catch (_) {}
  }, [user, markInterested, markNotInterested]);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Rocket className="w-8 h-8 text-primary" strokeWidth={2} />
              <div>
                <h1 className="text-2xl font-semibold">Launchpad</h1>
                <p className="text-sm text-muted-foreground">
                  Share your launches, find beta testers, and collaborate with the community
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)} className="gap-2">
              {showCreateForm ? (
                <><X className="w-4 h-4" strokeWidth={2} />Cancel</>
              ) : (
                <><Plus className="w-4 h-4" strokeWidth={2} />Create Event</>
              )}
            </Button>
          </div>
        </div>

        {/* Server Error */}
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-6 font-mono">
            âš  {error.message}
          </div>
        )}

        {/* Create Event Form */}
        {showCreateForm && (
          <Card className="border mb-6">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-base">Create Launch Event</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {createError && (
                <div className="text-sm text-destructive font-mono">âš  {createError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    placeholder="e.g. LokalShop"
                    value={formData.projectName}
                    onChange={e => setFormData(f => ({ ...f, projectName: e.target.value }))}
                    className="border rounded-md h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select
                    value={formData.eventType}
                    onValueChange={v => setFormData(f => ({ ...f, eventType: v as EventType }))}
                  >
                    <SelectTrigger className="border rounded-md h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BETA_TESTERS">Beta Testers</SelectItem>
                      <SelectItem value="FEEDBACK">Feedback</SelectItem>
                      <SelectItem value="LAUNCH">Launch</SelectItem>
                      <SelectItem value="COLLABORATION">Collaboration</SelectItem>
                      <SelectItem value="HIRING">Hiring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Looking for Beta Testers for E-commerce Platform"
                  value={formData.title}
                  onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                  className="border rounded-md h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what you're looking for and what your project is aboutâ€¦"
                  value={formData.description}
                  onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  className="min-h-[100px] border rounded-md resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    placeholder="e.g. react, nextjs, saas"
                    value={formData.tags}
                    onChange={e => setFormData(f => ({ ...f, tags: e.target.value }))}
                    className="border rounded-md h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline (optional)</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={e => setFormData(f => ({ ...f, deadline: e.target.value }))}
                    className="border rounded-md h-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="link">Link (optional)</Label>
                <Input
                  id="link"
                  type="url"
                  placeholder="https://yourproject.com"
                  value={formData.link}
                  onChange={e => setFormData(f => ({ ...f, link: e.target.value }))}
                  className="border rounded-md h-9"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                <Button
                  onClick={handleCreateEvent}
                  disabled={creating || !formData.projectName || !formData.title || !formData.description}
                >
                  {creating ? "Creatingâ€¦" : "Create Event"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Events List */}
        <div className="space-y-4">
          {loading && events.length === 0
            ? [...Array(3)].map((_, i) => <EventSkeleton key={i} />)
            : events.map((event: any) => {
              const et: EventType = event.eventType as EventType;
              const config = eventTypeConfig[et] ?? eventTypeConfig.FEEDBACK;
              const EventIcon = config.icon;

              return (
                <Card key={event.id} className="border hover:border-muted-foreground transition-colors">
                  <CardContent className="p-0">
                    <div className="p-4 pb-3">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="w-10 h-10 border-2 border-border flex-shrink-0">
                          <AvatarImage src={event.author.avatarUrl} />
                          <AvatarFallback>{event.author.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{event.author.name}</span>
                            <span className="text-xs text-muted-foreground">@{event.author.username}</span>
                            <span className="text-muted-foreground">Â·</span>
                            <span className="text-xs text-muted-foreground">{timeAgo(event.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs rounded-md font-normal">
                              {event.projectName}
                            </Badge>
                            <Badge variant="outline" className={`text-xs rounded-md font-normal border ${config.color}`}>
                              <EventIcon className="w-3 h-3 mr-1" strokeWidth={2} />
                              {config.label}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-semibold text-base">{event.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
                      </div>

                      {(event.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {event.tags.map((tag: any) => (
                            <Badge key={tag.name} variant="secondary" className="text-xs rounded-md font-normal">
                              <Tag className="w-2.5 h-2.5 mr-1" strokeWidth={2} />
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        {event.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
                            Deadline: {new Date(event.deadline).toLocaleDateString()}
                          </span>
                        )}
                        {event.link && (
                          <a href={event.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                            <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                            Visit Project
                          </a>
                        )}
                      </div>
                    </div>

                    <Separator />
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{event.interestedCount} interested</span>
                      <Button
                        variant={event.interestedByMe ? "default" : "ghost"}
                        size="sm"
                        className="h-7 text-xs rounded-md hover:bg-muted"
                        onClick={() => handleInterested(event.id, event.interestedByMe)}
                        disabled={!user}
                      >
                        {event.interestedByMe ? "Interested âœ“" : "I'm Interested"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

          {!loading && events.length === 0 && (
            <Card className="border">
              <CardContent className="py-12 text-center">
                <Rocket className="w-12 h-12 mx-auto mb-4 text-muted-foreground" strokeWidth={1.5} />
                <h3 className="font-semibold mb-2">No launch events yet</h3>
                <p className="text-sm text-muted-foreground">Be the first to share a launch!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
