import { Plus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface FeaturedProject {
  id: string;
  projectName: string;
  thumbnail: string;
  author: {
    name: string;
    avatar: string;
  };
  isNew?: boolean;
}

const mockFeaturedProjects: FeaturedProject[] = [
  {
    id: "1",
    projectName: "FreelancerHub",
    thumbnail: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=400&fit=crop",
    author: {
      name: "Juan dela Cruz",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    isNew: true,
  },
  {
    id: "2",
    projectName: "FarmConnect",
    thumbnail: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=400&fit=crop",
    author: {
      name: "Maria Santos",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    isNew: true,
  },
  {
    id: "3",
    projectName: "LokalShop",
    thumbnail: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=400&h=400&fit=crop",
    author: {
      name: "Angela Torres",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    },
  },
  {
    id: "4",
    projectName: "AI Analytics",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=400&fit=crop",
    author: {
      name: "Carlos Reyes",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    },
  },
  {
    id: "5",
    projectName: "Crypto Wallet",
    thumbnail: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=400&fit=crop",
    author: {
      name: "Miguel Fernandez",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    },
  },
  {
    id: "6",
    projectName: "EdTech Platform",
    thumbnail: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400&h=400&fit=crop",
    author: {
      name: "Sofia Reyes",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    },
  },
];

export function FeaturedProjects() {
  return (
    <div className="px-4 py-1">
      {/* Scrollable container */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {/* Create Your Project Story */}
        <button className="flex-shrink-0 group cursor-pointer">
          <div className="relative">
            <div className="w-[120px] h-[180px] rounded-xl bg-muted border-2 border-dashed border-muted-foreground/20 overflow-hidden hover:border-muted-foreground/40 transition-all">
              <div className="h-[130px] bg-gradient-to-br from-muted to-muted-foreground/10 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div className="h-[50px] flex items-center justify-center px-2">
                <p className="text-xs font-medium text-center leading-tight">Create Story</p>
              </div>
            </div>
          </div>
        </button>

        {/* Featured Project Stories */}
        {mockFeaturedProjects.map((project) => (
          <button
            key={project.id}
            className="flex-shrink-0 group cursor-pointer relative"
          >
            <div className="relative">
              {/* Story ring - orange gradient border */}
              <div className={`w-[120px] h-[180px] rounded-xl p-[3px] ${
                project.isNew 
                  ? "bg-gradient-to-br from-primary via-orange-500 to-primary" 
                  : "bg-border"
              } transition-all group-hover:scale-[1.02]`}>
                {/* Inner content */}
                <div className="w-full h-full rounded-[10px] bg-card overflow-hidden relative">
                  {/* Project thumbnail */}
                  <div className="w-full h-full relative">
                    <img
                      src={project.thumbnail}
                      alt={project.projectName}
                      className="w-full h-full object-cover"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                    
                    {/* Author avatar at top */}
                    <div className="absolute top-3 left-3">
                      <Avatar className="w-9 h-9 border-2 border-white ring-2 ring-primary/30">
                        <AvatarImage src={project.author.avatar} />
                        <AvatarFallback>{project.author.name[0]}</AvatarFallback>
                      </Avatar>
                    </div>

                    {/* Project name at bottom */}
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-white text-xs font-semibold leading-tight line-clamp-2 drop-shadow-lg">
                        {project.projectName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* New badge */}
              {project.isNew && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary border-2 border-card flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Hide scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}