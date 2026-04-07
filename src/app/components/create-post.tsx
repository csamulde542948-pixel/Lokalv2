import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Image as ImageIcon, Video, X, Loader2, ExternalLink } from "lucide-react";
import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

const GET_ME_AVATAR = gql`
  query GetMeAvatar {
    me { id name username avatarUrl }
  }
`;

interface CreatePostProps {
  onPost: (content: string, images?: string[], videoUrl?: string) => void;
}

type VideoPreview = { url: string } | null;

export function CreatePost({ onPost }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [images, setImages]   = useState<{ file: File; preview: string }[]>([]);
  const [video, setVideo]     = useState<VideoPreview>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // ── Link preview state ──────────────────────────────────────────────────────
  const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);
  const [dismissedUrl,   setDismissedUrl]   = useState<string | null>(null);
  const [ogData,         setOgData]         = useState<Record<string,string> | null>(null);
  const [ogLoading,      setOgLoading]      = useState(false);

  // Debounce URL detection from content
  useEffect(() => {
    if (!isExpanded) return;
    const timer = setTimeout(() => {
      const match = content.match(/https?:\/\/[^\s\)\]>"']+/i);
      const found = match ? match[0] : null;
      // Only update if url changed and not dismissed
      if (found !== previewUrl && found !== dismissedUrl) {
        setPreviewUrl(found);
        setOgData(null);
      } else if (!found) {
        setPreviewUrl(null);
        setOgData(null);
      }
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, isExpanded]);

  // Fetch OG data when previewUrl changes
  useEffect(() => {
    if (!previewUrl || previewUrl === dismissedUrl) return;
    const ctrl = new AbortController();
    setOgLoading(true);
    const base = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
    fetch(`${base}/og?url=${encodeURIComponent(previewUrl)}`, { signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => { if (d.title || d.image) setOgData(d); })
      .catch(() => {})
      .finally(() => setOgLoading(false));
    return () => ctrl.abort();
  }, [previewUrl, dismissedUrl]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const entries = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setImages((prev) => [...prev, ...entries].slice(0, 10));
    e.target.value = "";
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideo({ url: URL.createObjectURL(file) });
    e.target.value = "";
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // revoke the blob URL to avoid memory leaks
      URL.revokeObjectURL(prev[idx].preview);
      return next;
    });
  }

  async function uploadImagesToSupabase(items: { file: File; preview: string }[]): Promise<string[]> {
    const urls: string[] = [];
    for (const { file } of items) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("post-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }
  const { user } = useAuth();
  const { data: meData } = useQuery(GET_ME_AVATAR, {
    skip: !user,
    fetchPolicy: "cache-first",
  });
  const me = meData?.me;

  const handlePost = async () => {
    if (!content.trim() && images.length === 0 && !video) return;
    setIsPosting(true);
    setUploadError(null);
    try {
      let permanentUrls: string[] | undefined;
      if (images.length > 0) {
        permanentUrls = await uploadImagesToSupabase(images);
      }
      onPost(content, permanentUrls, video?.url);
      // Revoke blob previews
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setContent("");
      setImages([]);
      setVideo(null);
      setIsExpanded(false);
      setPreviewUrl(null);
      setOgData(null);
      setDismissedUrl(null);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes("Bucket not found")) {
        setUploadError('Storage bucket missing. Go to Supabase → Storage and create a public bucket named “post-images”.');
      } else {
        setUploadError(`Image upload failed: ${msg}`);
      }
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10 border-2 border-border flex-shrink-0">
            <AvatarImage src={me?.avatarUrl ?? undefined} />
            <AvatarFallback>{(me?.name ?? user?.email ?? "?")[0]?.toUpperCase()}</AvatarFallback>
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

                {/* ── Live link preview card ─────────────────────────────── */}
                {previewUrl && previewUrl !== dismissedUrl && images.length === 0 && !video && (
                  <div className="rounded-xl border bg-card overflow-hidden">
                    {ogLoading ? (
                      <div className="h-20 animate-pulse bg-muted/50" />
                    ) : ogData ? (
                      <div className="flex">
                        {ogData.image && (
                          <div className="w-24 flex-shrink-0 bg-muted">
                            <img
                              src={ogData.image}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          </div>
                        )}
                        <div className="flex-1 flex flex-col justify-center px-3 py-2.5 min-w-0 gap-0.5">
                          {(ogData.siteName || ogData.domain) && (
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate">
                              {ogData.siteName ?? ogData.domain}
                            </span>
                          )}
                          {ogData.title && (
                            <span className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                              {ogData.title}
                            </span>
                          )}
                          {ogData.description && (
                            <span className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {ogData.description}
                            </span>
                          )}
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary flex items-center gap-1 mt-0.5 hover:underline w-fit"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            {ogData.domain}
                          </a>
                        </div>
                        <button
                          onClick={() => { setDismissedUrl(previewUrl); setOgData(null); }}
                          className="self-start m-2 w-5 h-5 rounded-full bg-muted hover:bg-border flex items-center justify-center flex-shrink-0"
                          title="Remove link preview"
                        >
                          <X className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Image thumbnails strip */}
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group w-20 h-20 flex-shrink-0">
                        <img
                          src={img.preview}
                          alt=""
                          className="w-full h-full object-cover rounded-md border"
                        />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-foreground text-background rounded-full flex items-center justify-center shadow hover:bg-foreground/80 transition-colors"
                        >
                          <X className="w-3 h-3" strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                    {images.length < 10 && (
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="w-20 h-20 flex-shrink-0 flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors gap-1"
                      >
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Add more</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Video preview */}
                {video && (
                  <div className="relative rounded-md overflow-hidden border">
                    <video src={video.url} controls className="w-full max-h-64 bg-black" />
                    <button
                      onClick={() => setVideo(null)}
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

            {uploadError && (
              <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/8 px-3 py-2 text-xs text-destructive flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">⚠️</span>
                <span>{uploadError}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              {/* Hidden file inputs */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageChange}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoChange}
              />

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={images.length >= 10 || !!video}
                  className="gap-2 hover:bg-muted rounded-md h-8 text-muted-foreground hover:text-foreground"
                >
                  <ImageIcon className="w-4 h-4" strokeWidth={2} />
                  <span className="text-xs font-medium">Photo{images.length > 0 ? ` (${images.length})` : ""}</span>
                  
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={!!video || images.length > 0}
                  className="gap-2 hover:bg-muted rounded-md h-8 text-muted-foreground hover:text-foreground"
                >
                  <Video className="w-4 h-4" strokeWidth={2} />
                  <span className="text-xs font-medium">Video</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    images.forEach((img) => URL.revokeObjectURL(img.preview));
                    setIsExpanded(false);
                    setContent("");
                    setImages([]);
                    setVideo(null);
                    setPreviewUrl(null);
                    setOgData(null);
                    setDismissedUrl(null);
                  }}
                  variant="ghost"
                  size="sm"
                  disabled={isPosting}
                  className="px-4 rounded-md h-8"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePost}
                  disabled={isPosting || (!content.trim() && images.length === 0 && !video)}
                  size="sm"
                  className="px-4 rounded-md h-8 gap-2"
                >
                  {isPosting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {isPosting ? "Posting…" : "Post"}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}