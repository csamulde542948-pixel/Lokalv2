import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Image as ImageIcon, X, FileCode, Link2 } from "lucide-react";
import { Separator } from "./ui/separator";

interface CreatePostProps {
  onPost: (content: string, image?: string) => void;
}

export function CreatePost({ onPost }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePost = () => {
    if (content.trim()) {
      onPost(content, imagePreview || undefined);
      setContent("");
      setImagePreview(null);
      setIsExpanded(false);
    }
  };

  const handleAddImage = () => {
    // Simulate image upload - in real app, this would be a file picker
    const randomImages = [
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop",
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&h=400&fit=crop",
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop",
    ];
    const randomImage = randomImages[Math.floor(Math.random() * randomImages.length)];
    setImagePreview(randomImage);
  };

  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 border-2 border-border flex-shrink-0">
            <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" />
            <AvatarFallback>ME</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            {!isExpanded ? (
              <div
                onClick={() => setIsExpanded(true)}
                className="bg-muted hover:bg-border rounded-md px-4 py-2.5 cursor-text transition-colors border"
              >
                <span className="text-sm text-muted-foreground">What are you building?</span>
              </div>
            ) : (
              <>
                <Textarea
                  placeholder="Share your progress, ask questions, or discuss your project..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[100px] resize-none border rounded-md p-3 text-sm focus-visible:ring-1"
                  autoFocus
                />

                {imagePreview && (
                  <div className="relative rounded-md overflow-hidden border">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-64 object-cover"
                    />
                    <button
                      onClick={() => setImagePreview(null)}
                      className="absolute top-2 right-2 w-7 h-7 bg-card/90 hover:bg-card rounded-md flex items-center justify-center transition-colors border"
                    >
                      <X className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {isExpanded && (
          <>
            <Separator className="my-3" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddImage}
                  disabled={!!imagePreview}
                  className="gap-2 hover:bg-muted rounded-md h-8 text-muted-foreground hover:text-foreground"
                >
                  <ImageIcon className="w-4 h-4" strokeWidth={2} />
                  <span className="text-xs font-medium">Image</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 hover:bg-muted rounded-md h-8 text-muted-foreground hover:text-foreground"
                >
                  <FileCode className="w-4 h-4" strokeWidth={2} />
                  <span className="text-xs font-medium">Code</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 hover:bg-muted rounded-md h-8 text-muted-foreground hover:text-foreground"
                >
                  <Link2 className="w-4 h-4" strokeWidth={2} />
                  <span className="text-xs font-medium">Link</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setIsExpanded(false);
                    setContent("");
                    setImagePreview(null);
                  }}
                  variant="ghost"
                  size="sm"
                  className="px-4 rounded-md h-8"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePost}
                  disabled={!content.trim()}
                  size="sm"
                  className="px-4 rounded-md h-8"
                >
                  Post
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}