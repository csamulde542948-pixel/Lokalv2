import { useState } from "react";
import { CreatePost } from "../components/create-post";
import { PostCard } from "../components/post-card";
// import { RoastedPostCard } from "../components/roasted-post-card";
import { RoastedProjectCard, RoastedProject } from "../components/roasted-project-card";
import { LeftSidebar } from "../components/left-sidebar";
import { RightSidebar } from "../components/right-sidebar";
import { FeaturedProjects } from "../components/featured-projects";
import { FeaturedProjectCard, FeaturedProject } from "../components/featured-project-card";
import { Separator } from "../components/ui/separator";
import { Fragment } from "react";

// Mock data
const mockPosts = [
  {
    id: "1",
    author: {
      name: "Juan dela Cruz",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      username: "@juandc",
    },
    content: "Just shipped my first SaaS product built with Next.js and Supabase! 🚀 It's a project management tool specifically for Filipino freelancers. Check it out and let me know what you think!",
    image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=400&fit=crop",
    likes: 47,
    comments: 12,
    shares: 5,
    timestamp: "2h ago",
    projectName: "FreelancerHub PH",
  },
  {
    id: "2",
    author: {
      name: "Maria Santos",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
      username: "@mariasantos",
    },
    content: "Working on a mobile app for connecting local farmers with buyers. Built with React Native and Firebase. Any feedback from fellow devs?",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&h=400&fit=crop",
    likes: 63,
    comments: 8,
    shares: 3,
    timestamp: "4h ago",
    projectName: "FarmConnect",
  },
  {
    id: "3",
    author: {
      name: "Carlos Reyes",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
      username: "@carlosr",
    },
    content: "Finally finished my portfolio website! Used Three.js for some cool 3D effects. Would love to hear your thoughts on the design 💻✨",
    likes: 89,
    comments: 23,
    shares: 12,
    timestamp: "6h ago",
    projectName: "Portfolio 2026",
  },
  {
    id: "4",
    author: {
      name: "Angela Torres",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
      username: "@angelat",
    },
    content: "Been coding for 12 hours straight on this e-commerce platform for local businesses. The payment integration was tricky but we got it working! 🎉",
    image: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=800&h=400&fit=crop",
    likes: 124,
    comments: 31,
    shares: 18,
    timestamp: "1d ago",
    projectName: "LokalShop",
  },
  {
    id: "5",
    author: {
      name: "Miguel Fernandez",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      username: "@miguelf",
    },
    content: "Learning Rust and building a CLI tool for automating deployment tasks. Any Rustaceans here who can help me with lifetimes? 🦀",
    likes: 34,
    comments: 15,
    shares: 2,
    timestamp: "1d ago",
    projectName: "DeployMaster",
  },
];

// Roasted projects data
const roastedProjects: RoastedProject[] = [
  {
    id: "roast-1",
    author: {
      name: "Sofia Garcia",
      username: "@sofiag",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    },
    project: {
      name: "TaskMaster Pro",
      description: "AI-powered task management app with smart scheduling",
      url: "https://taskmaster.dev",
      image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&h=400&fit=crop",
      tags: ["React", "TypeScript", "AI", "Productivity"],
    },
    roast: {
      rating: 7.5,
      text: "Solid foundation but the UI looks like it time-traveled from 2015. The AI scheduling is impressive, but your landing page couldn't convince a goldfish to buy water. Also, 'TaskMaster Pro'? Really? Did you use AI to generate that name too?",
      strengths: [
        "AI scheduling algorithm is actually clever",
        "Clean code architecture",
        "Fast performance"
      ],
      improvements: [
        "UI needs a complete redesign",
        "Landing page is unconvincing",
        "Better marketing copy needed"
      ],
    },
    timestamp: "3h ago",
    likes: 156,
    comments: 34,
    shares: 12,
  },
  {
    id: "roast-2",
    author: {
      name: "Ricardo Tan",
      username: "@ricardot",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop",
    },
    project: {
      name: "DevChat",
      description: "Real-time chat for developer teams with code sharing",
      url: "https://devchat.ph",
      image: "https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=800&h=400&fit=crop",
      tags: ["WebRTC", "Node.js", "Socket.io", "Chat"],
    },
    roast: {
      rating: 8.2,
      text: "You built another chat app in 2026? Bold move. But I'll admit, the code sharing feature is slick. However, your onboarding flow has more steps than assembling IKEA furniture. Slack is shaking... with laughter.",
      strengths: [
        "Code sharing feature is innovative",
        "Smooth real-time performance",
        "Great mobile responsiveness"
      ],
      improvements: [
        "Simplify onboarding flow",
        "Add more unique features",
        "Improve competitive positioning"
      ],
    },
    timestamp: "1d ago",
    likes: 203,
    comments: 56,
    shares: 28,
  },
];

// Featured projects data (ads-like)
const featuredProjects: FeaturedProject[] = [
  {
    id: "featured-1",
    name: "CodeCollab PH",
    description: "Real-time collaborative coding platform built for Filipino developers. Features include live code editing, video chat, and project management tools all in one place.",
    author: {
      name: "TeamSync Studios",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop",
      username: "@teamsync",
    },
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop",
    category: "SaaS",
    stars: 2847,
    forks: 342,
    url: "https://codecollab.ph",
    tags: ["TypeScript", "WebRTC", "Next.js", "Collaboration"],
    isSponsored: true,
  },
  {
    id: "featured-2",
    name: "Pinoy DevTools",
    description: "Essential development tools and utilities designed for Filipino developers. Includes code snippets, deployment scripts, and productivity boosters.",
    author: {
      name: "DevTools Team",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop",
      username: "@devtools",
    },
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop",
    category: "Tools",
    stars: 1923,
    forks: 156,
    url: "https://pinoydevtools.com",
    tags: ["CLI", "Productivity", "Open Source", "Developer Tools"],
    isSponsored: false,
  },
  {
    id: "featured-3",
    name: "Manila Jobs Board",
    description: "Job marketplace connecting Filipino developers with local and international companies. Features remote work opportunities and salary transparency.",
    author: {
      name: "CareerHub",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
      username: "@careerhub",
    },
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=400&fit=crop",
    category: "Career",
    stars: 3421,
    url: "https://manilajobs.dev",
    tags: ["Jobs", "Remote Work", "Careers", "Marketplace"],
    isSponsored: true,
  },
];

export function Feed() {
  const [posts, setPosts] = useState(mockPosts);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());

  const handleNewPost = (content: string, image?: string) => {
    const newPost = {
      id: Date.now().toString(),
      author: {
        name: "You",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop",
        username: "@you",
      },
      content,
      image,
      likes: 0,
      comments: 0,
      shares: 0,
      timestamp: "Just now",
      projectName: undefined,
    };
    setPosts([newPost, ...posts]);
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, likes: post.likes + 1 }
        : post
    ));
  };

  const handleFollowToggle = (username: string) => {
    setFollowedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(username)) {
        newSet.delete(username);
      } else {
        newSet.add(username);
      }
      return newSet;
    });
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Sidebar - Hidden on mobile */}
      <LeftSidebar className="hidden xl:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto" />

      {/* Center Feed */}
      <div className="flex-1 border-x">
        <div className="max-w-[680px] mx-auto px-4 py-4 space-y-4">
          {/* Featured Projects Stories */}
          <FeaturedProjects />

          {/* Create Post */}
          <CreatePost onPost={handleNewPost} />

          <Separator />

          {/* Posts Feed */}
          <div className="space-y-4">
            {posts.map((post, index) => (
              <Fragment key={post.id}>
                <PostCard 
                  post={post}
                  onLike={() => handleLike(post.id)}
                  isFollowing={followedUsers.has(post.author.username)}
                  onFollowToggle={() => handleFollowToggle(post.author.username)}
                />
                {/* Insert roasted project after index 1 (2nd post) */}
                {index === 1 && roastedProjects[0] && (
                  <RoastedProjectCard 
                    post={roastedProjects[0]}
                    onLike={() => {}}
                  />
                )}
                {/* Insert featured project after every 3 posts (index 2, 5, etc.) */}
                {(index + 1) % 3 === 0 && featuredProjects[(Math.floor(index / 3)) % featuredProjects.length] && (
                  <FeaturedProjectCard 
                    project={featuredProjects[(Math.floor(index / 3)) % featuredProjects.length]}
                  />
                )}
                {/* Insert second roasted project after index 4 (5th post) */}
                {index === 4 && roastedProjects[1] && (
                  <RoastedProjectCard 
                    post={roastedProjects[1]}
                    onLike={() => {}}
                  />
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Hidden on mobile and tablet */}
      <RightSidebar category="home" className="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto" />
    </div>
  );
}