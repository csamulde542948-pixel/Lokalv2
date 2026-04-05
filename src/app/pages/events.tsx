import { useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Input } from "../components/ui/input";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users,
  Video,
  Search,
  Filter,
  Bell,
  ExternalLink,
  Plus,
  TrendingUp,
  Sparkles,
  Globe,
  Building2
} from "lucide-react";

// Mock events data
const mockEvents = [
  {
    id: 1,
    title: "React Philippines Meetup: Next.js 15 Deep Dive",
    banner: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop",
    organizer: {
      name: "React Philippines",
      username: "reactph",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    },
    date: "April 15, 2026",
    time: "7:00 PM - 9:00 PM",
    location: "Online (Zoom)",
    type: "Webinar",
    attendees: 245,
    maxAttendees: 500,
    price: "Free",
    description: "Join us for an in-depth exploration of Next.js 15's new features, including server actions, partial prerendering, and more!",
    tags: ["React", "Next.js", "Web Development", "JavaScript"],
    featured: true,
  },
  {
    id: 2,
    title: "lokalhost.club Hackathon 2026",
    banner: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=400&fit=crop",
    organizer: {
      name: "lokalhost.club",
      username: "lokalhostclub",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    date: "April 20-21, 2026",
    time: "48-hour hackathon",
    location: "Hybrid (BGC + Online)",
    type: "Hackathon",
    attendees: 156,
    maxAttendees: 200,
    price: "₱500",
    description: "Build innovative solutions for local problems! 48 hours of coding, networking, and learning. Prizes worth ₱100,000!",
    tags: ["Hackathon", "Innovation", "Networking", "Prizes"],
    featured: true,
  },
  {
    id: 3,
    title: "UI/UX Design Workshop: Figma to Code",
    banner: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=400&fit=crop",
    organizer: {
      name: "Design Studio PH",
      username: "designph",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    },
    date: "April 18, 2026",
    time: "2:00 PM - 5:00 PM",
    location: "Makati City",
    type: "Workshop",
    attendees: 42,
    maxAttendees: 50,
    price: "₱1,200",
    description: "Learn how to transform your Figma designs into production-ready React components. Hands-on workshop with real projects.",
    tags: ["Figma", "UI/UX", "React", "Design Systems"],
    featured: false,
  },
  {
    id: 4,
    title: "DevOps Manila: Kubernetes & Cloud Native",
    banner: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop",
    organizer: {
      name: "DevOps Manila",
      username: "devopsmnl",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    },
    date: "April 22, 2026",
    time: "6:00 PM - 8:00 PM",
    location: "Online (YouTube Live)",
    type: "Webinar",
    attendees: 312,
    maxAttendees: null,
    price: "Free",
    description: "Discover best practices for deploying and managing containerized applications in Kubernetes. Live Q&A with industry experts.",
    tags: ["DevOps", "Kubernetes", "Cloud", "Docker"],
    featured: false,
  },
  {
    id: 5,
    title: "Women in Tech PH: Career Panel Discussion",
    banner: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&h=400&fit=crop",
    organizer: {
      name: "Women in Tech PH",
      username: "womenintech",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    },
    date: "April 25, 2026",
    time: "7:00 PM - 9:00 PM",
    location: "Online (Google Meet)",
    type: "Panel",
    attendees: 189,
    maxAttendees: 300,
    price: "Free",
    description: "Hear from successful women in tech about their career journeys, challenges, and advice for aspiring technologists.",
    tags: ["Career", "Diversity", "Tech Industry", "Networking"],
    featured: true,
  },
  {
    id: 6,
    title: "GraphQL Philippines: Building Scalable APIs",
    banner: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop",
    organizer: {
      name: "Carlos Reyes",
      username: "carlosr",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    },
    date: "April 28, 2026",
    time: "3:00 PM - 6:00 PM",
    location: "Quezon City",
    type: "Workshop",
    attendees: 28,
    maxAttendees: 40,
    price: "₱800",
    description: "Hands-on workshop on building production-ready GraphQL APIs with Apollo Server. Bring your laptop!",
    tags: ["GraphQL", "API", "Backend", "Apollo"],
    featured: false,
  },
];

// Quick filters
const quickFilters = [
  { label: "All Events", value: "all", icon: Calendar },
  { label: "Webinars", value: "webinar", icon: Video },
  { label: "Workshops", value: "workshop", icon: Users },
  { label: "Free", value: "free", icon: Sparkles },
];

export function Events() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [registeredEvents, setRegisteredEvents] = useState<number[]>([]);

  const handleRegister = (e: React.MouseEvent, eventId: number) => {
    e.stopPropagation();
    if (registeredEvents.includes(eventId)) {
      setRegisteredEvents(registeredEvents.filter(id => id !== eventId));
    } else {
      setRegisteredEvents([...registeredEvents, eventId]);
    }
  };

  const handleViewDetails = (eventId: number) => {
    navigate(`/events/${eventId}`);
  };

  const filteredEvents = mockEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.organizer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeFilter === "all") return matchesSearch;
    if (activeFilter === "webinar") return matchesSearch && event.type === "Webinar";
    if (activeFilter === "workshop") return matchesSearch && event.type === "Workshop";
    if (activeFilter === "free") return matchesSearch && event.price === "Free";
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Community Events</h1>
              <p className="text-muted-foreground">
                Connect, learn, and grow with the Filipino developer community
              </p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" strokeWidth={2} />
              Create Event
            </Button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={2} />
              <Input
                placeholder="Search events, organizers, or topics..."
                className="pl-10 h-11"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2 h-11">
              <Filter className="w-4 h-4" strokeWidth={2} />
              Filters
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 mt-4">
            {quickFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <Button
                  key={filter.value}
                  variant={activeFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setActiveFilter(filter.value)}
                >
                  <Icon className="w-4 h-4" strokeWidth={2} />
                  {filter.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Stats Bar */}
        <Card className="mb-6 border">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{mockEvents.length}</div>
                <p className="text-xs text-muted-foreground">Upcoming Events</p>
              </div>
              <div className="border-l border-r">
                <div className="text-2xl font-bold text-primary">
                  {mockEvents.reduce((sum, event) => sum + event.attendees, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Total Attendees</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {mockEvents.filter(event => event.featured).length}
                </div>
                <p className="text-xs text-muted-foreground">Featured Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Listings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.length === 0 ? (
            <Card className="border col-span-full">
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" strokeWidth={2} />
                <h3 className="font-semibold mb-2">No events found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredEvents.map((event) => (
              <Card 
                key={event.id} 
                className={`border overflow-hidden transition-all hover:shadow-lg cursor-pointer flex flex-col ${
                  event.featured ? "border-primary/30" : ""
                }`}
                onClick={() => handleViewDetails(event.id)}
              >
                {/* Event Banner */}
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={event.banner}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    {event.featured && (
                      <Badge className="gap-1 bg-primary text-xs">
                        <TrendingUp className="w-3 h-3" strokeWidth={2} />
                        Featured
                      </Badge>
                    )}
                    <Badge variant="secondary" className="bg-card/90 backdrop-blur text-xs">
                      {event.type}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 flex flex-col flex-1">
                  {/* Event Title */}
                  <h3 className="font-bold text-base mb-2 line-clamp-2">{event.title}</h3>
                  
                  {/* Event Description */}
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {event.description}
                  </p>

                  {/* Event Meta */}
                  <div className="space-y-2 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" strokeWidth={2} />
                      <span className="truncate">{event.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" strokeWidth={2} />
                      <span className="truncate">{event.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {event.location.includes("Online") ? (
                        <Globe className="w-3 h-3" strokeWidth={2} />
                      ) : (
                        <MapPin className="w-3 h-3" strokeWidth={2} />
                      )}
                      <span className="truncate">{event.location}</span>
                    </div>
                  </div>

                  {/* Price & Attendees */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge 
                      variant={event.price === "Free" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {event.price}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" strokeWidth={2} />
                      <span>{event.attendees}</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {event.tags.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {event.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{event.tags.length - 2}
                      </Badge>
                    )}
                  </div>

                  <Separator className="mb-3" />

                  {/* Footer - Pushed to bottom */}
                  <div className="mt-auto space-y-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={event.organizer.avatar} />
                        <AvatarFallback>{event.organizer.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{event.organizer.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{event.organizer.username}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {registeredEvents.includes(event.id) ? (
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1 text-xs h-8 gap-1"
                          onClick={(e) => handleRegister(e, event.id)}
                        >
                          <Bell className="w-3 h-3" strokeWidth={2} />
                          Registered
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          className="flex-1 text-xs h-8"
                          onClick={(e) => handleRegister(e, event.id)}
                        >
                          Register
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                      >
                        <ExternalLink className="w-4 h-4" strokeWidth={2} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Load More */}
        {filteredEvents.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg">
              Load More Events
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}