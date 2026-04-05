import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Globe,
  Share2,
  ArrowLeft,
  TrendingUp,
  Bell,
  BellOff,
  ExternalLink,
  DollarSign,
} from "lucide-react";

// Mock events data
const mockEvents = [
  {
    id: 1,
    title: "React Manila Meetup: Building Scalable Apps",
    description: "Join us for an evening of talks and networking about building scalable React applications. We'll cover state management, performance optimization, and more!",
    fullDescription: "React Manila is excited to host our monthly meetup focused on building scalable React applications.\n\n🎤 Speakers:\n• John Doe - Lead Engineer at TechCorp: 'Advanced State Management with Zustand'\n• Jane Smith - Senior Developer at StartupXYZ: 'Performance Optimization Techniques'\n• Carlos Reyes - Full Stack Developer: 'Building Real-time Features with WebSockets'\n\n📋 Agenda:\n6:00 PM - Registration & Networking\n6:30 PM - Opening Remarks\n6:45 PM - Talk 1: Advanced State Management\n7:15 PM - Talk 2: Performance Optimization\n7:45 PM - Break & Snacks\n8:00 PM - Talk 3: Real-time Features\n8:30 PM - Q&A Session\n9:00 PM - Networking & Closing\n\n🎁 What You'll Get:\n• Free pizza and drinks\n• Networking opportunities with fellow developers\n• Access to exclusive developer resources\n• Swag bag (for early registrants)\n\n⚡ Requirements:\n• Bring your laptop for live coding demos\n• Basic knowledge of React recommended\n• Open mind and enthusiasm to learn!\n\nLooking forward to seeing you there! 🚀",
    date: "April 15, 2026",
    time: "6:00 PM - 9:00 PM",
    location: "The Grid, Makati City",
    banner: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop",
    organizer: {
      name: "React Manila",
      username: "reactmnl",
      avatar: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop",
      bio: "The largest React community in Metro Manila. We organize monthly meetups, workshops, and hackathons.",
    },
    attendees: 156,
    capacity: 200,
    price: "Free",
    type: "Meetup",
    tags: ["React", "JavaScript", "Web Development", "Networking"],
    featured: true,
  },
  {
    id: 2,
    title: "Philippine Startup Week 2026",
    description: "A week-long celebration of entrepreneurship and innovation in the Philippines. Connect with founders, investors, and ecosystem builders.",
    fullDescription: "Philippine Startup Week is the country's largest startup and innovation event, bringing together entrepreneurs, investors, developers, and ecosystem builders for a week of inspiration, learning, and connection.\n\n🎯 Event Highlights:\n• 50+ speakers from leading startups and VCs\n• Startup pitch competition with ₱1M in prizes\n• Workshops on fundraising, product development, and growth\n• Startup expo with 100+ exhibitors\n• Networking sessions with investors and mentors\n• Job fair featuring top tech companies\n\n📅 Week Schedule:\nDay 1 (Mon) - Opening Keynote & Founder Stories\nDay 2 (Tue) - Product & Tech Track\nDay 3 (Wed) - Growth & Marketing Track\nDay 4 (Thu) - Funding & Investment Track\nDay 5 (Fri) - Pitch Competition Finals & Closing Party\n\n🎫 Ticket Includes:\n• Access to all talks and workshops\n• Lunch and refreshments\n• Networking events\n• Startup Week swag bag\n• Digital resource kit\n\n💡 Who Should Attend:\n• Startup founders and co-founders\n• Aspiring entrepreneurs\n• Developers looking to join startups\n• Investors and VCs\n• Corporate innovation teams\n\nEarly bird tickets available until March 31!",
    date: "May 20-24, 2026",
    time: "9:00 AM - 6:00 PM",
    location: "SMX Convention Center, Manila",
    banner: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=400&fit=crop",
    organizer: {
      name: "QBO Innovation Hub",
      username: "qboph",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
      bio: "The leading innovation hub in the Philippines, supporting startups through programs, events, and community building.",
    },
    attendees: 847,
    capacity: 1000,
    price: "₱2,500",
    type: "Conference",
    tags: ["Startups", "Entrepreneurship", "Innovation", "Networking", "VC"],
    featured: true,
  },
  {
    id: 3,
    title: "Cebu Developers Hackathon 2026",
    description: "48-hour hackathon where developers build innovative solutions for local problems. Great prizes and mentorship opportunities!",
    fullDescription: "Join the biggest hackathon in Visayas! Build innovative tech solutions that solve real problems in our local community.\n\n🏆 Prizes:\n1st Place: ₱100,000 + Incubation Program\n2nd Place: ₱50,000 + Mentorship\n3rd Place: ₱25,000\nBest Design: ₱15,000\nBest Social Impact: ₱15,000\n\n🎯 Challenge Tracks:\n• HealthTech - Digital health solutions\n• EdTech - Educational technology\n• AgriTech - Agriculture innovation\n• FinTech - Financial inclusion\n• Open Category - Your creative solution\n\n📋 What's Included:\n• Free meals throughout the event\n• Snacks and energy drinks\n• Workspace with high-speed internet\n• Mentorship from industry experts\n• API credits and cloud resources\n• Swag from sponsors\n\n👥 Team Requirements:\n• 2-5 members per team\n• At least one developer\n• Students and professionals welcome\n\n🛠️ Tech Stack:\nAny! Use your favorite tools and frameworks. Popular choices include React, Node.js, Python, Flutter, etc.\n\n📅 Schedule:\nFriday 6PM - Registration & Team Formation\nFriday 7PM - Kick-off & Dinner\nSaturday - Hacking Day 1 (meals provided)\nSunday - Hacking Day 2 (meals provided)\nSunday 4PM - Presentations\nSunday 6PM - Awards & Closing\n\nLimited slots! Register early to secure your spot.",
    date: "June 7-9, 2026",
    time: "6:00 PM Friday - 7:00 PM Sunday",
    location: "IEC Pavillon, Cebu IT Park",
    banner: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=400&fit=crop",
    organizer: {
      name: "Cebu Tech Community",
      username: "cebutech",
      avatar: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=100&h=100&fit=crop",
      bio: "Building the tech community in Cebu through events, workshops, and hackathons. Join our 5,000+ developer community!",
    },
    attendees: 234,
    capacity: 300,
    price: "₱500",
    type: "Hackathon",
    tags: ["Hackathon", "Coding", "Competition", "Innovation"],
    featured: false,
  },
];

export function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isRegistered, setIsRegistered] = useState(false);

  // Find the event by ID
  const event = mockEvents.find((e) => e.id === Number(id));

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="border max-w-md w-full">
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" strokeWidth={2} />
            <h3 className="font-semibold mb-2">Event not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The event you're looking for doesn't exist.
            </p>
            <Button onClick={() => navigate("/events")}>
              Back to Events
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const attendancePercentage = Math.round((event.attendees / event.capacity) * 100);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="gap-2 mb-6"
          onClick={() => navigate("/events")}
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          Back to Events
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card with Banner */}
            <Card className="border overflow-hidden">
              {/* Banner Image */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={event.banner}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  {event.featured && (
                    <Badge className="gap-1 bg-primary">
                      <TrendingUp className="w-3 h-3" strokeWidth={2} />
                      Featured
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-card/90 backdrop-blur">
                    {event.type}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-6">
                <h1 className="text-3xl font-bold mb-3">{event.title}</h1>
                <p className="text-lg text-muted-foreground mb-4">
                  {event.description}
                </p>

                <Separator className="my-4" />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    className="gap-2"
                    variant={isRegistered ? "outline" : "default"}
                    onClick={() => setIsRegistered(!isRegistered)}
                  >
                    {isRegistered ? (
                      <>
                        <Bell className="w-4 h-4" strokeWidth={2} />
                        Registered
                      </>
                    ) : (
                      <>
                        <BellOff className="w-4 h-4" strokeWidth={2} />
                        Register Now
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="lg" className="gap-2">
                    <Share2 className="w-4 h-4" strokeWidth={2} />
                    Share
                  </Button>
                  <Button variant="outline" size="lg" className="gap-2">
                    <ExternalLink className="w-4 h-4" strokeWidth={2} />
                    Add to Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Event Details */}
            <Card className="border">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">About This Event</h2>
                <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {event.fullDescription}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="border">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Topics</h2>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Event Info Card */}
            <Card className="border">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-lg mb-4">Event Details</h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Date</p>
                      <p className="font-medium">{event.date}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Time</p>
                      <p className="font-medium">{event.time}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    {event.location.includes("Online") ? (
                      <Globe className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
                    ) : (
                      <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Location</p>
                      <p className="font-medium">{event.location}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Price</p>
                      <Badge
                        variant={event.price === "Free" ? "default" : "secondary"}
                        className="text-sm"
                      >
                        {event.price}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Attendees</p>
                      <p className="font-medium mb-2">
                        {event.attendees} / {event.capacity}
                      </p>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${attendancePercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {attendancePercentage}% filled
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organizer Card */}
            <Card className="border">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Organized By</h3>
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={event.organizer.avatar} />
                    <AvatarFallback>{event.organizer.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{event.organizer.name}</p>
                    <Link
                      to={`/profile?user=${event.organizer.username}`}
                      className="text-sm text-primary hover:underline"
                    >
                      @{event.organizer.username}
                    </Link>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {event.organizer.bio}
                </p>
                <Button variant="outline" className="w-full gap-2">
                  <ExternalLink className="w-4 h-4" strokeWidth={2} />
                  View Profile
                </Button>
              </CardContent>
            </Card>

            {/* Register CTA Card */}
            {!isRegistered && (
              <Card className="border border-primary/30 bg-primary/5">
                <CardContent className="p-6 text-center">
                  <h3 className="font-bold text-lg mb-2">Don't miss out!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Only {event.capacity - event.attendees} spots remaining
                  </p>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() => setIsRegistered(true)}
                  >
                    Register Now
                  </Button>
                </CardContent>
              </Card>
            )}

            {isRegistered && (
              <Card className="border border-green-500/30 bg-green-500/5">
                <CardContent className="p-6 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-green-500" strokeWidth={2} />
                  <h3 className="font-bold text-lg mb-2">You're Registered!</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    We'll send you a reminder before the event
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsRegistered(false)}
                  >
                    Cancel Registration
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
