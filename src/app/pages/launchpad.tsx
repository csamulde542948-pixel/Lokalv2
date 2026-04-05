import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { 
  Rocket, 
  TestTube, 
  MessageSquare, 
  Users, 
  Calendar,
  Tag,
  ExternalLink,
  Plus,
  X
} from "lucide-react";
import { Separator } from "../components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

interface LaunchpadEvent {
  id: string;
  author: {
    name: string;
    avatar: string;
    username: string;
  };
  projectName: string;
  eventType: "beta_testers" | "feedback" | "launch" | "collaboration" | "hiring";
  title: string;
  description: string;
  tags: string[];
  deadline?: string;
  link?: string;
  timestamp: string;
  interested: number;
}

const mockEvents: LaunchpadEvent[] = [
  {
    id: "1",
    author: {
      name: "Angela Torres",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      username: "@angelat",
    },
    projectName: "LokalShop",
    eventType: "beta_testers",
    title: "Looking for Beta Testers for E-commerce Platform",
    description: "We're launching LokalShop next month and need beta testers to try out our platform. Looking for small business owners in the Philippines to test our features and provide feedback.",
    tags: ["e-commerce", "next.js", "stripe"],
    deadline: "2026-04-20",
    link: "https://lokalshop.ph",
    timestamp: "2 hours ago",
    interested: 24,
  },
  {
    id: "2",
    author: {
      name: "Carlos Reyes",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      username: "@carlosr",
    },
    projectName: "TaskFlow",
    eventType: "launch",
    title: "Launching TaskFlow - Project Management Tool",
    description: "Excited to announce that TaskFlow is officially launching this Friday! Built specifically for remote Filipino teams. Check it out and let me know what you think.",
    tags: ["saas", "productivity", "react"],
    deadline: "2026-04-08",
    link: "https://taskflow.app",
    timestamp: "5 hours ago",
    interested: 42,
  },
  {
    id: "3",
    author: {
      name: "Maria Santos",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      username: "@mariasantos",
    },
    projectName: "FarmConnect",
    eventType: "feedback",
    title: "Seeking Feedback on New Features",
    description: "Added marketplace features to FarmConnect. Would love to get feedback from farmers and buyers on the new UI and workflow before we push to production.",
    tags: ["agriculture", "mobile", "firebase"],
    timestamp: "1 day ago",
    interested: 18,
  },
  {
    id: "4",
    author: {
      name: "Juan dela Cruz",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      username: "@juandc",
    },
    projectName: "FreelancerHub PH",
    eventType: "collaboration",
    title: "Looking for Frontend Developer to Collaborate",
    description: "Building a comprehensive freelancer platform. Need someone skilled in React and Tailwind to help with the dashboard UI. Open source project with revenue sharing.",
    tags: ["open-source", "react", "tailwind"],
    timestamp: "2 days ago",
    interested: 31,
  },
];

const eventTypeConfig = {
  beta_testers: { label: "Beta Testers", icon: TestTube, color: "bg-blue-100 text-blue-700 border-blue-200" },
  feedback: { label: "Feedback", icon: MessageSquare, color: "bg-purple-100 text-purple-700 border-purple-200" },
  launch: { label: "Launch", icon: Rocket, color: "bg-green-100 text-green-700 border-green-200" },
  collaboration: { label: "Collaboration", icon: Users, color: "bg-orange-100 text-orange-700 border-orange-200" },
  hiring: { label: "Hiring", icon: Users, color: "bg-pink-100 text-pink-700 border-pink-200" },
};

export function Launchpad() {
  const [events, setEvents] = useState<LaunchpadEvent[]>(mockEvents);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    projectName: "",
    eventType: "beta_testers" as LaunchpadEvent["eventType"],
    title: "",
    description: "",
    tags: "",
    deadline: "",
    link: "",
  });

  const handleCreateEvent = () => {
    if (!formData.projectName || !formData.title || !formData.description) {
      return;
    }

    const newEvent: LaunchpadEvent = {
      id: Date.now().toString(),
      author: {
        name: "Your Name",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
        username: "@yourname",
      },
      projectName: formData.projectName,
      eventType: formData.eventType,
      title: formData.title,
      description: formData.description,
      tags: formData.tags.split(",").map(tag => tag.trim()).filter(Boolean),
      deadline: formData.deadline || undefined,
      link: formData.link || undefined,
      timestamp: "Just now",
      interested: 0,
    };

    setEvents([newEvent, ...events]);
    setFormData({
      projectName: "",
      eventType: "beta_testers",
      title: "",
      description: "",
      tags: "",
      deadline: "",
      link: "",
    });
    setShowCreateForm(false);
  };

  const handleInterested = (eventId: string) => {
    setEvents(events.map(event =>
      event.id === eventId
        ? { ...event, interested: event.interested + 1 }
        : event
    ));
  };

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
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="gap-2"
            >
              {showCreateForm ? (
                <>
                  <X className="w-4 h-4" strokeWidth={2} />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  Create Event
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Create Event Form */}
        {showCreateForm && (
          <Card className="border mb-6">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-base">Create Launch Event</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    placeholder="e.g. LokalShop"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    className="border rounded-md h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type</Label>
                  <Select
                    value={formData.eventType}
                    onValueChange={(value) => setFormData({ ...formData, eventType: value as LaunchpadEvent["eventType"] })}
                  >
                    <SelectTrigger className="border rounded-md h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beta_testers">Beta Testers</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="launch">Launch</SelectItem>
                      <SelectItem value="collaboration">Collaboration</SelectItem>
                      <SelectItem value="hiring">Hiring</SelectItem>
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
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="border rounded-md h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what you're looking for and what your project is about..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="border rounded-md h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline (optional)</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="border rounded-md h-9"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateEvent}>
                  Create Event
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Events List */}
        <div className="space-y-4">
          {events.map((event) => {
            const config = eventTypeConfig[event.eventType];
            const EventIcon = config.icon;

            return (
              <Card key={event.id} className="border hover:border-muted-foreground transition-colors">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="w-10 h-10 border-2 border-border flex-shrink-0">
                        <AvatarImage src={event.author.avatar} />
                        <AvatarFallback>{event.author.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{event.author.name}</span>
                          <span className="text-xs text-muted-foreground">{event.author.username}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{event.timestamp}</span>
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

                    {/* Content */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-base">{event.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {event.description}
                      </p>
                    </div>

                    {/* Tags */}
                    {event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {event.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs rounded-md font-normal"
                          >
                            <Tag className="w-2.5 h-2.5 mr-1" strokeWidth={2} />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      {event.deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
                          Deadline: {new Date(event.deadline).toLocaleDateString()}
                        </span>
                      )}
                      {event.link && (
                        <a
                          href={event.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                          Visit Project
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <Separator />
                  <div className="px-4 py-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {event.interested} interested
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs rounded-md hover:bg-muted"
                      onClick={() => handleInterested(event.id)}
                    >
                      I'm Interested
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}