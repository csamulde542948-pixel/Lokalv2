import { useState } from "react";
import { useParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { 
  Star, 
  Eye,
  Globe,
  ExternalLink,
  Calendar,
  Users,
  Download,
  MapPin,
  Clock,
  TrendingUp,
  Heart,
  Share2,
  Award,
  Monitor,
  Smartphone,
  Package,
  Code2,
  Lock,
  Link as LinkIcon,
  MessageSquare,
  Play
} from "lucide-react";

// Mock project data - in real app, this would come from API/database
const mockProjects: { [key: string]: any } = {
  "lokalshop": {
    id: "lokalshop",
    type: "github",
    name: "LokalShop",
    tagline: "E-commerce made easy for Philippine local businesses",
    owner: {
      name: "Angela Torres",
      username: "angelat",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    },
    icon: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&h=200&fit=crop",
    headerImage: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=400&fit=crop",
    screenshots: [
      { url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop", caption: "Dashboard Overview" },
      { url: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop", caption: "Product Management" },
      { url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop", caption: "Analytics Dashboard" },
      { url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop", caption: "Order Processing" },
      { url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop", caption: "Inventory Management" },
    ],
    description: "A comprehensive e-commerce solution designed specifically for Philippine local businesses. Features inventory management, multiple payment gateways, and advanced analytics.",
    fullDescription: "LokalShop is a complete e-commerce platform built from the ground up for Philippine businesses. It understands the unique needs of local merchants and provides tools to help them succeed online. From small sari-sari stores to growing retail businesses, LokalShop makes it easy to manage your inventory, process orders, and accept payments.",
    visibility: "public",
    category: "Web App",
    stars: 1240,
    likes: 890,
    views: 15420,
    downloads: "50K+",
    rating: 4.5,
    reviews: 1240,
    reviewCount: 1240,
    website: "https://lokalshop.ph",
    demoUrl: "https://demo.lokalshop.ph",
    githubUrl: "https://github.com/angelat/lokalshop",
    location: "Philippines",
    lastUpdated: "2 days ago",
    releaseDate: "Jan 2025",
    version: "v2.1.0",
    topics: ["nextjs", "react", "ecommerce", "typescript", "tailwindcss", "philippines", "stripe", "postgresql"],
    techStack: ["Next.js 14", "React", "TypeScript", "Tailwind CSS", "PostgreSQL", "Stripe", "Vercel"],
    features: [
      "Real-time inventory management with low stock alerts",
      "Multiple payment gateway integration (PayMaya, GCash, Stripe)",
      "Advanced analytics dashboard with sales insights",
      "Mobile-responsive design for on-the-go management",
      "Automated order processing and fulfillment tracking",
      "Multi-store support for business expansion",
      "Customer loyalty programs and discount codes",
      "SEO-optimized product pages",
    ],
    languages: [
      { name: "TypeScript", percentage: 67.3, color: "#3178c6" },
      { name: "JavaScript", percentage: 18.4, color: "#f1e05a" },
      { name: "CSS", percentage: 10.2, color: "#563d7c" },
      { name: "HTML", percentage: 4.1, color: "#e34c26" },
    ],
    team: [
      { name: "Angela Torres", username: "angelat", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop", role: "Creator & Lead Developer" },
      { name: "Carlos Reyes", username: "carlosr", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop", role: "Backend Developer" },
      { name: "Maria Santos", username: "mariasantos", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", role: "UI/UX Designer" },
      { name: "Juan dela Cruz", username: "juandc", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", role: "Frontend Developer" },
    ],
    leaderboardRank: 1,
    featured: true,
    trending: true,
  },
  "farmconnect": {
    id: "farmconnect",
    type: "personal",
    name: "FarmConnect",
    tagline: "Direct connection from farm to table",
    owner: {
      name: "Maria Santos",
      username: "mariasantos",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    icon: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=200&h=200&fit=crop",
    headerImage: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1200&h=400&fit=crop",
    screenshots: [
      { url: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&h=600&fit=crop", caption: "Mobile Home Screen" },
      { url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop", caption: "Farmer Marketplace" },
      { url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop", caption: "Product Listings" },
      { url: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=600&fit=crop", caption: "Order Tracking" },
      { url: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&h=600&fit=crop", caption: "Secure Checkout" },
    ],
    description: "Connecting local farmers directly with buyers across the Philippines. Helping farmers get better prices and consumers get fresher produce.",
    fullDescription: "FarmConnect is revolutionizing the way Filipinos buy fresh produce. By connecting farmers directly with consumers, we're eliminating middlemen and ensuring fair prices for farmers while providing the freshest possible products to buyers. Our mobile-first platform makes it easy for anyone to support local agriculture.",
    visibility: "private",
    category: "Mobile App",
    status: "In Progress",
    progress: 85,
    stars: 763,
    likes: 456,
    views: 8340,
    downloads: "10K+",
    rating: 4.7,
    reviews: 456,
    reviewCount: 456,
    website: "https://farmconnect.ph",
    demoUrl: "https://demo.farmconnect.ph",
    location: "Philippines",
    startDate: "Jan 2026",
    lastUpdated: "1 day ago",
    version: "Beta v0.8.5",
    topics: ["react-native", "firebase", "agriculture", "philippines", "marketplace", "mobile"],
    techStack: ["React Native", "Expo", "Firebase", "Google Maps API", "Stripe"],
    features: [
      "Direct connection between farmers and buyers",
      "Real-time marketplace with live pricing",
      "GPS-based location tracking for delivery",
      "Secure payment processing with multiple options",
      "Rating and review system for trust building",
      "Multi-language support (English, Filipino)",
      "In-app messaging between buyers and farmers",
      "Seasonal produce recommendations",
    ],
    languages: [
      { name: "JavaScript", percentage: 65.8, color: "#f1e05a" },
      { name: "TypeScript", percentage: 28.2, color: "#3178c6" },
      { name: "CSS", percentage: 6.0, color: "#563d7c" },
    ],
    team: [
      { name: "Maria Santos", username: "mariasantos", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", role: "Creator & Lead Developer" },
      { name: "Juan dela Cruz", username: "juandc", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", role: "Mobile Developer" },
      { name: "Sofia Garcia", username: "sofiag", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop", role: "UI/UX Designer" },
    ],
    leaderboardRank: 2,
    featured: true,
    trending: true,
  },
  "freelancerhub": {
    id: "freelancerhub",
    type: "github",
    name: "FreelancerHub PH",
    tagline: "Manage your freelance business like a pro",
    owner: {
      name: "Juan dela Cruz",
      username: "juandc",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    icon: "https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=200&h=200&fit=crop",
    headerImage: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&h=400&fit=crop",
    screenshots: [
      { url: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop", caption: "Project Dashboard" },
      { url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop", caption: "Client Management" },
      { url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop", caption: "Time Tracking" },
      { url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop", caption: "Financial Reports" },
      { url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop", caption: "Invoice Generation" },
    ],
    description: "Project management and collaboration tool designed specifically for Filipino freelancers. Track time, manage clients, and grow your freelance business.",
    fullDescription: "FreelancerHub PH is the ultimate toolkit for Filipino freelancers. Whether you're a designer, developer, writer, or any other type of freelancer, our platform helps you manage every aspect of your business. From tracking time and managing clients to generating professional invoices and analyzing your income, FreelancerHub has everything you need to succeed.",
    visibility: "public",
    category: "Web App",
    stars: 654,
    likes: 432,
    views: 6780,
    downloads: "25K+",
    rating: 4.3,
    reviews: 654,
    reviewCount: 654,
    website: "https://freelancerhub.ph",
    demoUrl: "https://demo.freelancerhub.ph",
    githubUrl: "https://github.com/juandc/freelancerhub-ph",
    location: "Philippines",
    lastUpdated: "5 hours ago",
    releaseDate: "Dec 2025",
    version: "v1.5.0",
    topics: ["nextjs", "supabase", "freelancing", "philippines", "project-management", "typescript"],
    techStack: ["Next.js 14", "Supabase", "TypeScript", "Tailwind CSS", "Stripe"],
    features: [
      "Comprehensive project and task management",
      "Time tracking with detailed reports",
      "Client relationship management (CRM)",
      "Professional invoice generation and sending",
      "Expense tracking and financial analytics",
      "Multi-currency support for international clients",
      "Calendar integration for scheduling",
      "Automated payment reminders",
    ],
    languages: [
      { name: "TypeScript", percentage: 72.5, color: "#3178c6" },
      { name: "JavaScript", percentage: 15.3, color: "#f1e05a" },
      { name: "CSS", percentage: 12.2, color: "#563d7c" },
    ],
    team: [
      { name: "Juan dela Cruz", username: "juandc", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop", role: "Creator & Lead Developer" },
      { name: "Carlos Reyes", username: "carlosr", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop", role: "Full Stack Developer" },
      { name: "Angela Torres", username: "angelat", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop", role: "Product Designer" },
    ],
    leaderboardRank: 3,
    featured: false,
    trending: true,
  },
};

export function ProjectDetail() {
  const { id } = useParams();
  const [interactions, setInteractions] = useState({
    isStarred: false,
    isLiked: false,
    selectedScreenshot: 0,
  });

  // Map numeric IDs from leaderboard to project keys
  const idMap: { [key: string]: string } = {
    "1": "lokalshop",
    "2": "farmconnect",
    "3": "freelancerhub",
    "gh-1": "lokalshop",
    "gh-2": "freelancerhub",
    "gh-3": "lokalshop",
    "p-1": "farmconnect",
    "p-2": "lokalshop",
    "p-3": "lokalshop",
    "p-4": "farmconnect",
    "4": "lokalshop",
    "5": "farmconnect",
    "6": "freelancerhub",
    "7": "lokalshop",
    "8": "farmconnect",
  };

  // Get the actual project key
  const projectKey = idMap[id || ""] || id || "lokalshop";
  
  // Get project data - default to lokalshop if not found
  const project = mockProjects[projectKey] || mockProjects["lokalshop"];
  const isGithubProject = project.type === "github";
  const isPersonalProject = project.type === "personal";

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Web App": return <Monitor className="w-4 h-4" strokeWidth={2} />;
      case "Mobile App": return <Smartphone className="w-4 h-4" strokeWidth={2} />;
      case "Library": return <Package className="w-4 h-4" strokeWidth={2} />;
      case "CLI Tool": return <Code2 className="w-4 h-4" strokeWidth={2} />;
      default: return <Package className="w-4 h-4" strokeWidth={2} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Play Store Style Hero Section */}
      <div className="bg-gradient-to-br from-card via-card to-primary/5 border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: App Info */}
            <div className="lg:col-span-1">
              <div className="flex items-start gap-4 mb-6">
                {/* App Icon */}
                <img
                  src={project.icon}
                  alt={project.name}
                  className="w-24 h-24 rounded-2xl border-2 border-border shadow-lg object-cover"
                />
                
                {/* Title & Meta */}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-1">{project.name}</h1>
                  <p className="text-sm text-muted-foreground mb-2">{project.tagline}</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={project.owner.avatar} />
                      <AvatarFallback>{project.owner.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-primary hover:underline cursor-pointer">
                      {project.owner.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rating & Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-card border rounded-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="w-4 h-4 text-primary fill-primary" strokeWidth={2} />
                    <span className="text-xl font-bold">{project.rating}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{project.reviewCount.toLocaleString()} reviews</p>
                </div>
                <div className="text-center border-l border-r">
                  <div className="text-xl font-bold mb-1">{project.downloads}</div>
                  <p className="text-xs text-muted-foreground">Downloads</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {project.visibility === "public" ? (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" strokeWidth={2} />
                          Public
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Lock className="w-3 h-3" strokeWidth={2} />
                          Private
                        </div>
                      )}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Visibility</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 mb-6">
                <Button 
                  size="lg" 
                  variant="default"
                  className="w-full gap-2"
                  onClick={() => window.open(project.website || project.demoUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" strokeWidth={2} />
                  View Project
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    size="sm" 
                    variant={interactions.isStarred ? "default" : "outline"}
                    className="gap-2"
                    onClick={() => setInteractions({ ...interactions, isStarred: !interactions.isStarred })}
                  >
                    <Star className="w-4 h-4" strokeWidth={2} fill={interactions.isStarred ? "currentColor" : "none"} />
                    {interactions.isStarred ? "Starred" : "Star"}
                  </Button>

                  <Button 
                    size="sm" 
                    variant={interactions.isLiked ? "default" : "outline"}
                    className="gap-2"
                    onClick={() => setInteractions({ ...interactions, isLiked: !interactions.isLiked })}
                  >
                    <Heart className="w-4 h-4" strokeWidth={2} fill={interactions.isLiked ? "currentColor" : "none"} />
                    {interactions.isLiked ? "Liked" : "Like"}
                  </Button>
                </div>

                <Button size="sm" variant="outline" className="w-full gap-2">
                  <Share2 className="w-4 h-4" strokeWidth={2} />
                  Share
                </Button>
              </div>

              {/* Progress Bar for Personal Projects */}
              {isPersonalProject && project.progress !== undefined && (
                <Card className="border mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-medium">Development Progress</span>
                      <span className="font-semibold text-primary">{project.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Leaderboard Badge */}
              {project.leaderboardRank && (
                <Card className="border border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Award className="w-6 h-6 text-primary" strokeWidth={2} />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-primary">
                          #{project.leaderboardRank}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          on lokalhost.club Leaderboard
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Screenshot Carousel */}
            <div className="lg:col-span-2">
              {/* Main Screenshot */}
              <div className="mb-4 rounded-xl overflow-hidden border-2 border-border shadow-2xl bg-card">
                <img
                  src={project.screenshots[interactions.selectedScreenshot].url}
                  alt={project.screenshots[interactions.selectedScreenshot].caption}
                  className="w-full h-[400px] object-cover"
                />
                <div className="p-3 bg-card border-t">
                  <p className="text-sm font-medium text-center">
                    {project.screenshots[interactions.selectedScreenshot].caption}
                  </p>
                </div>
              </div>

              {/* Thumbnail Strip */}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {project.screenshots.map((screenshot: any, index: number) => (
                  <div
                    key={index}
                    onClick={() => setInteractions({ ...interactions, selectedScreenshot: index })}
                    className={`flex-shrink-0 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                      interactions.selectedScreenshot === index
                        ? "border-primary shadow-lg scale-105"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={screenshot.url}
                      alt={screenshot.caption}
                      className="w-32 h-24 object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* About This Project */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  About this project
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {project.fullDescription}
                </p>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold">{project.stars}</div>
                    <div className="text-xs text-muted-foreground">Stars</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold">{project.likes}</div>
                    <div className="text-xs text-muted-foreground">Likes</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold">{(project.views / 1000).toFixed(1)}K</div>
                    <div className="text-xs text-muted-foreground">Views</div>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold">{project.downloads}</div>
                    <div className="text-xs text-muted-foreground">Downloads</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Features */}
            <Card className="border">
              <CardHeader>
                <CardTitle>Key Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {project.features.map((feature: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tech Stack */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="w-5 h-5" strokeWidth={2} />
                  Tech Stack
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech: string) => (
                    <Badge key={tech} variant="secondary" className="text-sm py-1.5 px-3">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Team */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" strokeWidth={2} />
                  Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {project.team.map((member: any) => (
                    <div key={member.username} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="w-12 h-12 border-2 border-border">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        @{member.username}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" strokeWidth={2} />
                  Reviews & Ratings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="w-8 h-8 text-primary fill-primary" strokeWidth={2} />
                    <span className="text-4xl font-bold">{project.rating}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Based on {project.reviewCount.toLocaleString()} reviews
                  </p>
                  <Button variant="outline" size="sm">
                    Write a Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Project Info */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <Badge variant="outline" className="gap-1">
                      {getCategoryIcon(project.category)}
                      {project.category}
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Version</span>
                    <span className="font-medium">{project.version}</span>
                  </div>
                  
                  <Separator />
                  
                  {project.releaseDate && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Released</span>
                        <span className="font-medium">{project.releaseDate}</span>
                      </div>
                      <Separator />
                    </>
                  )}
                  
                  {project.startDate && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Started</span>
                        <span className="font-medium">{project.startDate}</span>
                      </div>
                      <Separator />
                    </>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="font-medium">{project.lastUpdated}</span>
                  </div>
                  
                  <Separator />
                  
                  {project.location && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Location</span>
                        <span className="font-medium flex items-center gap-1">
                          <MapPin className="w-3 h-3" strokeWidth={2} />
                          {project.location}
                        </span>
                      </div>
                      <Separator />
                    </>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Downloads</span>
                    <span className="font-medium">{project.downloads}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Links */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {project.website && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start gap-2"
                    onClick={() => window.open(project.website, '_blank')}
                  >
                    <Globe className="w-4 h-4" strokeWidth={2} />
                    Website
                    <ExternalLink className="w-3 h-3 ml-auto" strokeWidth={2} />
                  </Button>
                )}
                
                {project.demoUrl && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start gap-2"
                    onClick={() => window.open(project.demoUrl, '_blank')}
                  >
                    <Play className="w-4 h-4" strokeWidth={2} />
                    Live Demo
                    <ExternalLink className="w-3 h-3 ml-auto" strokeWidth={2} />
                  </Button>
                )}
                
                {project.githubUrl && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start gap-2"
                    onClick={() => window.open(project.githubUrl, '_blank')}
                  >
                    <Code2 className="w-4 h-4" strokeWidth={2} />
                    Source Code
                    <ExternalLink className="w-3 h-3 ml-auto" strokeWidth={2} />
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.topics.map((topic: string) => (
                    <Badge 
                      key={topic} 
                      variant="secondary" 
                      className="text-xs rounded-full hover:bg-primary/20 cursor-pointer transition-colors"
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Badges */}
            {(project.featured || project.trending) && (
              <Card className="border border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Badges</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {project.featured && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
                      <Award className="w-4 h-4 text-primary" strokeWidth={2} />
                      <span className="text-sm font-medium">Featured Project</span>
                    </div>
                  )}
                  {project.trending && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
                      <TrendingUp className="w-4 h-4 text-primary" strokeWidth={2} />
                      <span className="text-sm font-medium">Trending</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}