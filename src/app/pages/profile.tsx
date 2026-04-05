import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { PostCard } from "../components/post-card";
import { CreatePost } from "../components/create-post";
import { 
  MapPin, 
  Link2, 
  Calendar, 
  Briefcase,
  Heart,
  Code2,
  Camera,
  Edit,
  UserPlus,
  MoreHorizontal,
  Star,
  Users,
  Image as ImageIcon,
  Grid3x3
} from "lucide-react";

const userPosts = [
  {
    id: "1",
    author: {
      name: "Your Name",
      username: "@yourname",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
      verified: true,
    },
    content: "Just shipped a new feature for my e-commerce platform! 🚀 Working with Next.js 14 has been amazing. The app router makes everything so much cleaner.",
    timestamp: "2h ago",
    likes: 89,
    comments: 12,
    shares: 5,
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=600&fit=crop",
  },
  {
    id: "2",
    author: {
      name: "Your Name",
      username: "@yourname",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
      verified: true,
    },
    content: "Looking for collaborators on an open-source project management tool for Filipino freelancers. DM me if interested! 💼",
    timestamp: "1d ago",
    likes: 156,
    comments: 28,
    shares: 15,
  },
  {
    id: "3",
    author: {
      name: "Your Name",
      username: "@yourname",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
      verified: true,
    },
    content: "Attending the Manila DevCon this weekend! Who else is going? Let's meet up! 🤝",
    timestamp: "3d ago",
    likes: 234,
    comments: 45,
    shares: 23,
  },
];

const userProjects = [
  {
    id: "1",
    name: "LokalShop",
    description: "E-commerce platform",
    stars: 847,
    tech: ["Next.js", "Stripe"],
  },
  {
    id: "2",
    name: "FreelancerHub",
    description: "Project management tool",
    stars: 654,
    tech: ["React", "Supabase"],
  },
];

const friends = [
  {
    name: "Angela Torres",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    mutualFriends: 12,
  },
  {
    name: "Carlos Reyes",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    mutualFriends: 8,
  },
  {
    name: "Maria Santos",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    mutualFriends: 15,
  },
  {
    name: "Juan dela Cruz",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    mutualFriends: 6,
  },
  {
    name: "Sofia Garcia",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    mutualFriends: 20,
  },
  {
    name: "Miguel Santos",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
    mutualFriends: 9,
  },
];

const photos = [
  "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1488590728505-e4f781b8c829?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1605379399642-870262d3d051?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1550439062-609e1531270e?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=400&fit=crop",
];

type Tab = "posts" | "about" | "friends" | "photos";

export function Profile() {
  const [activeTab, setActiveTab] = useState<Tab>("posts");

  return (
    <div className="min-h-screen">
      {/* Cover Photo */}
      <div className="relative">
        <div className="h-96 bg-gradient-to-br from-primary/20 via-muted to-primary/10 relative overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1639413665566-2f75adf7b7ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWNobm9sb2d5JTIwd29ya3NwYWNlJTIwZGVzayUyMG1pbmltYWx8ZW58MXx8fHwxNzc1MzIyOTcwfDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-4 right-4 gap-2 bg-card/95 hover:bg-card"
          >
            <Camera className="w-4 h-4" strokeWidth={2} />
            Edit Cover Photo
          </Button>
        </div>

        {/* Profile Info Container */}
        <div className="bg-card border-b">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 relative">
              {/* Profile Picture & Name */}
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-8 sm:-mt-16">
                <div className="relative">
                  <Avatar className="w-32 h-32 sm:w-40 sm:h-40 border-4 border-card ring-4 ring-background">
                    <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop" />
                    <AvatarFallback>YN</AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-muted hover:bg-muted/80"
                  >
                    <Camera className="w-4 h-4" strokeWidth={2} />
                  </Button>
                </div>
                <div className="text-center sm:text-left pb-4">
                  <h1 className="text-3xl font-bold">Your Name</h1>
                  <p className="text-muted-foreground">@yourname</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    342 friends · 12 projects
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pb-4 justify-center sm:justify-start">
                <Button size="sm" className="gap-2">
                  <Edit className="w-4 h-4" strokeWidth={2} />
                  Edit Profile
                </Button>
                <Button size="sm" variant="secondary" className="gap-2">
                  <UserPlus className="w-4 h-4" strokeWidth={2} />
                  Add Story
                </Button>
                <Button size="sm" variant="secondary">
                  <MoreHorizontal className="w-4 h-4" strokeWidth={2} />
                </Button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 mt-2 overflow-x-auto">
              <Button
                variant={activeTab === "posts" ? "default" : "ghost"}
                size="sm"
                className={`rounded-none border-b-2 rounded-t-md ${
                  activeTab === "posts" 
                    ? "border-primary" 
                    : "border-transparent"
                }`}
                onClick={() => setActiveTab("posts")}
              >
                Posts
              </Button>
              <Button
                variant={activeTab === "about" ? "default" : "ghost"}
                size="sm"
                className={`rounded-none border-b-2 rounded-t-md ${
                  activeTab === "about" 
                    ? "border-primary" 
                    : "border-transparent"
                }`}
                onClick={() => setActiveTab("about")}
              >
                About
              </Button>
              <Button
                variant={activeTab === "friends" ? "default" : "ghost"}
                size="sm"
                className={`rounded-none border-b-2 rounded-t-md ${
                  activeTab === "friends" 
                    ? "border-primary" 
                    : "border-transparent"
                }`}
                onClick={() => setActiveTab("friends")}
              >
                Friends
              </Button>
              <Button
                variant={activeTab === "photos" ? "default" : "ghost"}
                size="sm"
                className={`rounded-none border-b-2 rounded-t-md ${
                  activeTab === "photos" 
                    ? "border-primary" 
                    : "border-transparent"
                }`}
                onClick={() => setActiveTab("photos")}
              >
                Photos
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Intro Card */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Intro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">
                  Full-stack developer passionate about building products for the Filipino tech community 🚀
                </p>
                <Button variant="secondary" size="sm" className="w-full">
                  Edit Bio
                </Button>
                <Separator />
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Briefcase className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                    <span>Full-stack Developer at <span className="text-foreground font-medium">Startup Inc.</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                    <span>Lives in <span className="text-foreground font-medium">Manila, Philippines</span></span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Link2 className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                    <a href="https://yoursite.com" className="text-primary hover:underline">
                      yoursite.com
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
                    <span>Joined March 2024</span>
                  </div>
                </div>
                <Button variant="secondary" size="sm" className="w-full">
                  Edit Details
                </Button>
              </CardContent>
            </Card>

            {/* Projects Card */}
            <Card className="border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                    Projects
                  </CardTitle>
                  <Button variant="link" size="sm" className="h-auto p-0 text-primary text-xs">
                    See all
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {userProjects.map((project) => (
                  <div key={project.id} className="flex items-start gap-3 group cursor-pointer">
                    <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Code2 className="w-6 h-6 text-primary" strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold group-hover:text-primary transition-colors">
                        {project.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">{project.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Star className="w-3 h-3" strokeWidth={2} />
                          {project.stars}
                        </span>
                        <div className="flex gap-1">
                          {project.tech.slice(0, 2).map((tech) => (
                            <Badge key={tech} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Friends Card */}
            <Card className="border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                    Friends
                    <Badge variant="secondary" className="text-xs rounded-md font-normal">
                      342
                    </Badge>
                  </CardTitle>
                  <Button variant="link" size="sm" className="h-auto p-0 text-primary text-xs">
                    See all
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {friends.slice(0, 9).map((friend) => (
                    <div key={friend.name} className="cursor-pointer group">
                      <div className="w-full aspect-square rounded-md border-2 border-border group-hover:border-primary transition-colors overflow-hidden">
                        <img 
                          src={friend.avatar} 
                          alt={friend.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-xs font-medium mt-1 truncate group-hover:text-primary transition-colors">
                        {friend.name.split(" ")[0]}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Photos Card */}
            <Card className="border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                    Photos
                  </CardTitle>
                  <Button variant="link" size="sm" className="h-auto p-0 text-primary text-xs">
                    See all
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {photos.slice(0, 9).map((photo, index) => (
                    <div 
                      key={index} 
                      className="aspect-square rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <img 
                        src={photo} 
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {activeTab === "posts" && (
              <>
                {/* Create Post */}
                <CreatePost />

                {/* Posts Feed */}
                <div className="space-y-4">
                  {userPosts.map((post) => (
                    <PostCard key={post.id} post={post} onLike={() => {}} />
                  ))}
                </div>
              </>
            )}

            {activeTab === "about" && (
              <Card className="border">
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Overview</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Full-stack developer passionate about building products for the Filipino tech community. 
                      Love working with React, Next.js, and exploring new technologies. Always looking for 
                      opportunities to collaborate on interesting projects! 🚀
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Work and Education</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Briefcase className="w-5 h-5 text-muted-foreground mt-0.5" strokeWidth={2} />
                        <div>
                          <p className="text-sm">
                            Works as <span className="font-medium">Full-stack Developer</span> at{" "}
                            <span className="font-medium">Startup Inc.</span>
                          </p>
                          <p className="text-xs text-muted-foreground">2022 - Present</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Places Lived</h3>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" strokeWidth={2} />
                      <div>
                        <p className="text-sm">
                          Lives in <span className="font-medium">Manila, Philippines</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Contact Info</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Link2 className="w-5 h-5 text-muted-foreground mt-0.5" strokeWidth={2} />
                        <div>
                          <p className="text-sm font-medium">Website</p>
                          <a href="https://yoursite.com" className="text-sm text-primary hover:underline">
                            yoursite.com
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "friends" && (
              <Card className="border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Friends</CardTitle>
                    <div className="text-sm text-muted-foreground">342 friends</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {friends.map((friend) => (
                      <div key={friend.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                        <Avatar className="w-12 h-12 border-2 border-border flex-shrink-0">
                          <AvatarImage src={friend.avatar} />
                          <AvatarFallback>{friend.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold truncate hover:text-primary transition-colors">
                            {friend.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {friend.mutualFriends} mutual friends
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "photos" && (
              <Card className="border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Photos</CardTitle>
                    <Button variant="secondary" size="sm" className="gap-2">
                      <Camera className="w-4 h-4" strokeWidth={2} />
                      Add Photos
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                      <div 
                        key={index} 
                        className="aspect-square rounded-md overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <img 
                          src={photo} 
                          alt={`Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}