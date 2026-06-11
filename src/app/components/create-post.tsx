import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { Images, X, Loader2, ExternalLink, Smile, ChevronLeft } from "lucide-react";
import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { avatarSrc } from "../../lib/defaults";

const FEELING_CATEGORIES = [
  {
    label: "Feelings",
    items: [
      { emoji: "😊", label: "happy" },
      { emoji: "😢", label: "sad" },
      { emoji: "😍", label: "loved" },
      { emoji: "😎", label: "cool" },
      { emoji: "😤", label: "determined" },
      { emoji: "😴", label: "sleepy" },
      { emoji: "🥳", label: "celebrating" },
      { emoji: "😂", label: "amused" },
      { emoji: "🤔", label: "thoughtful" },
      { emoji: "😅", label: "nervous" },
      { emoji: "🥰", label: "grateful" },
      { emoji: "😡", label: "frustrated" },
      { emoji: "🤩", label: "excited" },
      { emoji: "😭", label: "overwhelmed" },
      { emoji: "🤯", label: "mind blown" },
      { emoji: "😏", label: "confident" },
    ],
  },
  {
    label: "Activities",
    items: [
      { emoji: "💻", label: "coding" },
      { emoji: "🚀", label: "shipping" },
      { emoji: "🐛", label: "debugging" },
      { emoji: "☕", label: "caffeinating" },
      { emoji: "🎯", label: "focused" },
      { emoji: "🔥", label: "grinding" },
      { emoji: "📚", label: "learning" },
      { emoji: "🏗️", label: "building" },
      { emoji: "🎨", label: "designing" },
      { emoji: "🧪", label: "testing" },
      { emoji: "📦", label: "deploying" },
      { emoji: "🤝", label: "collaborating" },
      { emoji: "🎤", label: "presenting" },
      { emoji: "🧠", label: "thinking" },
      { emoji: "🌙", label: "late-nighting" },
      { emoji: "🏆", label: "winning" },
    ],
  },
];

type Feeling = { emoji: string; label: string } | null;

const GET_ME_AVATAR = gql`
  query GetMeAvatar {
    me { id name displayName username avatarUrl }
  }
`;

interface CreatePostProps {
  onPost: (content: string, images?: string[], videoUrl?: string) => void;
  variant?: "card" | "timeline";
}

type VideoPreview = { url: string } | null;

export function CreatePost({ onPost, variant = "card" }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [video, setVideo] = useState<VideoPreview>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [feeling, setFeeling] = useState<Feeling>(null);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [feelingCategory, setFeelingCategory] = useState<number | null>(null);
  const [feelingSearch, setFeelingSearch] = useState("");
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dismissedUrl, setDismissedUrl] = useState<string | null>(null);
  const [ogData, setOgData] = useState<Record<string, string> | null>(null);
  const [ogLoading, setOgLoading] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    const timer = setTimeout(() => {
      const match = content.match(new RegExp('https?://[^\\s\\)\\]>"\']+', 'i'));
      const found = match ? match[0] : null;
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

  useEffect(() => {
    if (!previewUrl || previewUrl === dismissedUrl) return;
    const ctrl = new AbortController();
    setOgLoading(true);
    const base = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:4000";
    fetch(`${base}/og?url=${encodeURIComponent(previewUrl)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (d.title || d.image) setOgData(d); })
      .catch(() => {})
      .finally(() => setOgLoading(false));
    return () => ctrl.abort();
  }, [previewUrl, dismissedUrl]);

  function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const videoFile = files.find((f) => f.type.startsWith("video/"));
    if (videoFile) {
      setVideo({ url: URL.createObjectURL(videoFile) });
      setImages([]);
    } else {
      const entries = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
      setImages((prev) => [...prev, ...entries].slice(0, 10));
      setVideo(null);
    }
    e.target.value = "";
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
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
    if (!content.trim() && images.length === 0 && !video && !feeling) return;
    setIsPosting(true);
    setUploadError(null);
    try {
      let permanentUrls: string[] | undefined;
      if (images.length > 0) {
        permanentUrls = await uploadImagesToSupabase(images);
      }
      const finalContent = feeling
        ? `${content.trim()}${content.trim() ? "\n" : ""}— feeling ${feeling.emoji} ${feeling.label}`
        : content;
      onPost(finalContent, permanentUrls, video?.url);
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setContent("");
      setImages([]);
      setVideo(null);
      setFeeling(null);
      setIsExpanded(false);
      setPreviewUrl(null);
      setOgData(null);
      setDismissedUrl(null);
      setShowFeelingPicker(false);
      setFeelingCategory(null);
      setFeelingSearch("");
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes("Bucket not found")) {
        setUploadError(
          'Storage bucket missing. Go to Supabase > Storage and create a public bucket named "post-images".'
        );
      } else {
        setUploadError(`Image upload failed: ${msg}`);
      }
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className={variant === "timeline" ? "border-0 rounded-none shadow-none bg-transparent" : "border"}>
      <CardContent className={variant === "timeline" ? "p-4" : "p-3 sm:p-4"}>
        {showFeelingPicker && (
          <div className="mb-3 rounded-xl border bg-card shadow-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b">
              {feelingCategory !== null && (
                <button
                  onClick={() => { setFeelingCategory(null); setFeelingSearch(""); }}
                  className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center flex-shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                </button>
              )}
              <span className="text-sm font-semibold flex-1">
                {feelingCategory !== null
                  ? FEELING_CATEGORIES[feelingCategory].label
                  : "How are you feeling?"}
              </span>
              <button
                onClick={() => { setShowFeelingPicker(false); setFeelingCategory(null); setFeelingSearch(""); }}
                className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            {feelingCategory !== null && (
              <div className="px-3 pt-2">
                <input
                  type="text"
                  placeholder="Search feelings..."
                  value={feelingSearch}
                  onChange={(e) => setFeelingSearch(e.target.value)}
                  className="w-full text-sm rounded-lg bg-muted px-3 py-1.5 outline-none placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
            )}
            {feelingCategory === null ? (
              <div className="p-2 space-y-1">
                {FEELING_CATEGORIES.map((cat, idx) => (
                  <button
                    key={cat.label}
                    onClick={() => setFeelingCategory(idx)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-left transition-colors"
                  >
                    <span className="text-xl">{cat.items[0].emoji}</span>
                    <span className="text-sm font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1 p-3 max-h-52 overflow-y-auto">
                {FEELING_CATEGORIES[feelingCategory].items
                  .filter(
                    (f) =>
                      !feelingSearch ||
                      f.label.toLowerCase().includes(feelingSearch.toLowerCase())
                  )
                  .map((f) => (
                    <button
                      key={f.label}
                      onClick={() => {
                        setFeeling(f);
                        setShowFeelingPicker(false);
                        setFeelingCategory(null);
                        setFeelingSearch("");
                      }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-muted transition-colors ${
                        feeling?.label === f.label ? "bg-primary/10 ring-1 ring-primary" : ""
                      }`}
                    >
                      <span className="text-2xl">{f.emoji}</span>
                      <span className="text-[10px] text-muted-foreground font-medium capitalize leading-tight text-center">
                        {f.label}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 items-center">
          <Avatar className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-border flex-shrink-0">
            <AvatarImage src={avatarSrc(me?.avatarUrl)} />
            <AvatarFallback>
              {(me?.displayName ?? me?.username ?? me?.name ?? user?.email ?? "?")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-3">
            {!isExpanded ? (
              <div
                onClick={() => setIsExpanded(true)}
                className="bg-muted hover:bg-border rounded-full px-3 sm:px-4 py-2 sm:py-2.5 cursor-text transition-colors border flex items-center gap-2 overflow-hidden"
              >
                <span className="text-sm text-muted-foreground truncate flex-1 min-w-0">
                  {feeling
                    ? `${feeling.emoji} feeling ${feeling.label}...`
                    : "What are you building?"}
                </span>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <span className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground">
                    <Images className="w-4 h-4" strokeWidth={2} />
                  </span>
                  <span className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground">
                    <Smile className="w-4 h-4" strokeWidth={2} />
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Textarea
                    placeholder="Share your progress, ask questions, or discuss your project..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[90px] resize-none border rounded-xl px-3 pt-3 pb-10 text-sm focus-visible:ring-1"
                    autoFocus
                  />
                  {feeling && (
                    <div className="absolute bottom-10 left-3 flex items-center gap-1.5 pointer-events-none">
                      <span className="pointer-events-auto inline-flex items-center gap-1 text-xs text-primary font-medium bg-primary/10 rounded-full px-2 py-0.5">
                        {feeling.emoji} feeling {feeling.label}
                        <button
                          onClick={() => setFeeling(null)}
                          className="ml-0.5 text-primary/70 hover:text-primary"
                        >
                          <X className="w-2.5 h-2.5" strokeWidth={3} />
                        </button>
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => mediaInputRef.current?.click()}
                      disabled={images.length >= 10}
                      title="Add photo or video"
                      className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors disabled:opacity-40 ${
                        images.length > 0 || !!video
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Images className="w-4 h-4" strokeWidth={2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFeelingPicker((v) => !v)}
                      title="Add a feeling / activity"
                      className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                        feeling
                          ? "text-primary bg-primary/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Smile className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                </div>
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleMediaChange}
                />
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
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
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
                        onClick={() => mediaInputRef.current?.click()}
                        className="w-20 h-20 flex-shrink-0 flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors gap-1"
                      >
                        <Images className="w-5 h-5" />
                        <span className="text-[10px] font-medium">Add more</span>
                      </button>
                    )}
                  </div>
                )}
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
              <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">(!) </span>
                <span>{uploadError}</span>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={() => {
                  images.forEach((img) => URL.revokeObjectURL(img.preview));
                  setIsExpanded(false);
                  setContent("");
                  setImages([]);
                  setVideo(null);
                  setFeeling(null);
                  setPreviewUrl(null);
                  setOgData(null);
                  setDismissedUrl(null);
                  setShowFeelingPicker(false);
                  setFeelingCategory(null);
                  setFeelingSearch("");
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
                disabled={isPosting || (!content.trim() && images.length === 0 && !video && !feeling)}
                size="sm"
                className="px-4 rounded-md h-8 gap-2"
              >
                {isPosting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isPosting ? "Posting..." : "Post"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
