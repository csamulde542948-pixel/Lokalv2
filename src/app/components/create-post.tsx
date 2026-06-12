import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bug,
  Code2,
  Coffee,
  ExternalLink,
  Film,
  Flame,
  Hash,
  ImageIcon,
  List,
  Loader2,
  MapPin,
  Rocket,
  Smile,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { gql } from "@apollo/client/core";
import { useQuery } from "@apollo/client/react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { avatarSrc } from "../../lib/defaults";
import { BACKEND_URL } from "../../lib/env";

const MAX_POST_CHARS = 2500;
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_TAGS = 10;

const PROMPTS = [
  "What are you building?",
  "What's happening?",
  "Shipping something new?",
  "Share a tiny win.",
  "Debugging anything interesting?",
];

const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%";

const FEELING_CATEGORIES = [
  {
    label: "Mood",
    items: [
      { label: "focused", Icon: Target },
      { label: "excited", Icon: Sparkles },
      { label: "confident", Icon: Flame },
      { label: "thoughtful", Icon: Smile },
    ],
  },
  {
    label: "Activity",
    items: [
      { label: "coding", Icon: Code2 },
      { label: "shipping", Icon: Rocket },
      { label: "debugging", Icon: Bug },
      { label: "caffeinating", Icon: Coffee },
    ],
  },
];

type Feeling = { label: string; Icon: LucideIcon } | null;
type MediaImage = { file: File; preview: string };
type VideoPreview = { file: File; preview: string } | null;

const GET_ME_AVATAR = gql`
  query GetMeAvatar {
    me { id name displayName username avatarUrl }
  }
`;

interface CreatePostProps {
  onPost: (content: string, images?: string[], videoUrl?: string, tags?: string[]) => void | Promise<void>;
  variant?: "card" | "timeline";
}

function formatBytes(bytes: number) {
  return `${Math.round((bytes / 1024 / 1024) * 10) / 10}MB`;
}

function normalizeTag(value: string) {
  return value
    .trim()
    .replace(/^#/, "")
    .replace(/[^\w-]/g, "")
    .slice(0, 32)
    .toLowerCase();
}

function useScrambledPrompt(enabled: boolean) {
  const [index, setIndex] = useState(0);
  const [display, setDisplay] = useState(PROMPTS[0]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(() => {
      const nextIndex = (index + 1) % PROMPTS.length;
      const next = PROMPTS[nextIndex];
      let frame = 0;
      const frames = 10;
      const scramble = window.setInterval(() => {
        frame += 1;
        if (frame >= frames) {
          window.clearInterval(scramble);
          setIndex(nextIndex);
          setDisplay(next);
          return;
        }
        setDisplay(
          next
            .split("")
            .map((char, charIndex) => {
              if (char === " ") return " ";
              if (charIndex / next.length < frame / frames) return char;
              return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
            })
            .join(""),
        );
      }, 28);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [enabled, index]);

  return display;
}

export function CreatePost({ onPost, variant = "card" }: CreatePostProps) {
  const { user } = useAuth();
  const { data: meData } = useQuery(GET_ME_AVATAR, {
    skip: !user,
    fetchPolicy: "cache-first",
  });

  const [content, setContent] = useState("");
  const [images, setImages] = useState<MediaImage[]>([]);
  const [video, setVideo] = useState<VideoPreview>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [feeling, setFeeling] = useState<Feeling>(null);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dismissedUrl, setDismissedUrl] = useState<string | null>(null);
  const [ogData, setOgData] = useState<Record<string, string> | null>(null);
  const [ogLoading, setOgLoading] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const me = meData?.me;
  const prompt = useScrambledPrompt(content.length === 0);
  const remaining = MAX_POST_CHARS - content.length;
  const hasBody = content.trim().length > 0 || images.length > 0 || !!video || !!feeling;
  const overLimit = remaining < 0;
  const wrapperClass = variant === "timeline"
    ? "border-b bg-background"
    : "rounded-lg border bg-card";

  const selectedFeelingIcon = useMemo(() => feeling?.Icon ?? Smile, [feeling]);
  const SelectedFeelingIcon = selectedFeelingIcon;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const match = content.match(new RegExp('https?://[^\\s\\)\\]>"\']+', "i"));
      const found = match ? match[0] : null;
      if (found && found !== previewUrl && found !== dismissedUrl) {
        setPreviewUrl(found);
        setOgData(null);
      } else if (!found) {
        setPreviewUrl(null);
        setOgData(null);
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [content, dismissedUrl, previewUrl]);

  useEffect(() => {
    if (!previewUrl || previewUrl === dismissedUrl) return;
    const ctrl = new AbortController();
    setOgLoading(true);
    fetch(`${BACKEND_URL}/og?url=${encodeURIComponent(previewUrl)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (d.title || d.image) setOgData(d);
      })
      .catch(() => {})
      .finally(() => setOgLoading(false));
    return () => ctrl.abort();
  }, [previewUrl, dismissedUrl]);

  function setError(message: string) {
    setUploadError(message);
  }

  function handleImagesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    if (video) {
      setError("Remove the video before adding images.");
      return;
    }

    const nextCount = images.length + files.length;
    if (nextCount > MAX_IMAGES) {
      setError(`You can add up to ${MAX_IMAGES} images per post.`);
      return;
    }

    const tooLarge = files.find((file) => file.size > MAX_IMAGE_BYTES);
    if (tooLarge) {
      setError(`${tooLarge.name} is ${formatBytes(tooLarge.size)}. Images must be 5MB or less.`);
      return;
    }

    setUploadError(null);
    setImages((current) => [
      ...current,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (images.length > 0) {
      setError("A post can have images or one video, not both.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`${file.name} is ${formatBytes(file.size)}. Videos must be 25MB or less.`);
      return;
    }
    if (video) URL.revokeObjectURL(video.preview);
    setUploadError(null);
    setVideo({ file, preview: URL.createObjectURL(file) });
  }

  function removeImage(idx: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function removeVideo() {
    if (video) URL.revokeObjectURL(video.preview);
    setVideo(null);
  }

  function addTag() {
    const tag = normalizeTag(tagInput);
    if (!tag) return;
    if (tags.includes(tag)) {
      setTagInput("");
      return;
    }
    if (tags.length >= MAX_TAGS) {
      setError(`You can add up to ${MAX_TAGS} tags.`);
      return;
    }
    setTags((current) => [...current, tag]);
    setTagInput("");
    setUploadError(null);
  }

  async function uploadImagesToSupabase(items: MediaImage[]): Promise<string[]> {
    const urls: string[] = [];
    for (const { file } of items) {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("post-images")
        .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("post-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function uploadVideoToSupabase(item: NonNullable<VideoPreview>): Promise<string> {
    const ext = item.file.name.split(".").pop() ?? "mp4";
    const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("post-videos")
      .upload(path, item.file, { cacheControl: "3600", contentType: item.file.type, upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from("post-videos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handlePost() {
    if (!hasBody || overLimit || isPosting) return;
    setIsPosting(true);
    setUploadError(null);
    try {
      const permanentUrls = images.length > 0 ? await uploadImagesToSupabase(images) : undefined;
      const permanentVideoUrl = video ? await uploadVideoToSupabase(video) : undefined;
      const text = content.trim();
      const finalContent = feeling
        ? `${text}${text ? "\n" : ""}-- feeling ${feeling.label}`
        : text;

      await onPost(finalContent, permanentUrls, permanentVideoUrl, tags);
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      if (video) URL.revokeObjectURL(video.preview);
      setContent("");
      setImages([]);
      setVideo(null);
      setFeeling(null);
      setShowFeelingPicker(false);
      setShowTagEditor(false);
      setTags([]);
      setTagInput("");
      setPreviewUrl(null);
      setOgData(null);
      setDismissedUrl(null);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes("Bucket not found")) {
        setUploadError('Storage bucket missing. Create public buckets named "post-images" and "post-videos" in Supabase.');
      } else {
        setUploadError(`Post upload failed: ${msg}`);
      }
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <div className={wrapperClass}>
      <div className="px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex gap-2.5 sm:gap-3">
          <Avatar className="h-9 w-9 shrink-0 border sm:h-10 sm:w-10">
            <AvatarImage src={avatarSrc(me?.avatarUrl)} />
            <AvatarFallback>
              {(me?.displayName ?? me?.username ?? me?.name ?? user?.email ?? "?")[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="relative">
              {content.length === 0 && (
                <div className="pointer-events-none absolute left-0 top-0.5 text-lg text-muted-foreground sm:top-1 sm:text-xl">
                  {prompt}
                </div>
              )}
              <Textarea
                aria-label="Create post"
                value={content}
                maxLength={MAX_POST_CHARS}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[48px] resize-none border-0 bg-transparent p-0 text-lg leading-6 shadow-none outline-none focus-visible:ring-0 sm:min-h-[72px] sm:text-xl sm:leading-7"
              />
            </div>

            {(feeling || tags.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {feeling && (
                  <button
                    type="button"
                    onClick={() => setFeeling(null)}
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <SelectedFeelingIcon className="h-3.5 w-3.5" />
                    feeling {feeling.label}
                    <X className="h-3 w-3" />
                  </button>
                )}
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                  >
                    #{tag}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            {previewUrl && previewUrl !== dismissedUrl && images.length === 0 && !video && (
              <div className="mt-3 overflow-hidden rounded-lg border bg-card">
                {ogLoading ? (
                  <div className="h-20 animate-pulse bg-muted/50" />
                ) : ogData ? (
                  <div className="flex">
                    {ogData.image && (
                      <div className="w-24 shrink-0 bg-muted">
                        <img src={ogData.image} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 px-3 py-2">
                      <p className="truncate text-[11px] font-medium uppercase text-muted-foreground">
                        {ogData.siteName ?? ogData.domain}
                      </p>
                      <p className="line-clamp-2 text-sm font-semibold">{ogData.title}</p>
                      {ogData.description && (
                        <p className="line-clamp-2 text-xs text-muted-foreground">{ogData.description}</p>
                      )}
                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {ogData.domain}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDismissedUrl(previewUrl);
                        setOgData(null);
                      }}
                      className="m-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                      title="Remove link preview"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {images.map((img, idx) => (
                  <div key={img.preview} className="relative overflow-hidden rounded-lg border bg-muted">
                    <img src={img.preview} alt="" className="h-auto max-h-64 w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {video && (
              <div className="relative mt-3 overflow-hidden rounded-lg border bg-black">
                <video src={video.preview} controls className="max-h-80 w-full" />
                <button
                  type="button"
                  onClick={removeVideo}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {showFeelingPicker && (
              <div className="mt-3 rounded-lg border bg-card p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  {FEELING_CATEGORIES.map((category) => (
                    <div key={category.label}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {category.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {category.items.map((item) => {
                          const Icon = item.Icon;
                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => {
                                setFeeling(item);
                                setShowFeelingPicker(false);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm hover:border-primary hover:text-primary"
                            >
                              <Icon className="h-4 w-4" />
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showTagEditor && (
              <div className="mt-3 rounded-lg border bg-card p-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Tags
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="ai, design, launch"
                    className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <Button type="button" variant="outline" className="h-9 rounded-full" onClick={addTag}>
                    Add
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {tags.length}/{MAX_TAGS} tags
                </p>
              </div>
            )}

            {uploadError && (
              <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {uploadError}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between gap-2 sm:mt-3">
              <div className="flex min-w-0 items-center gap-0.5 text-primary sm:gap-1">
                <button
                  type="button"
                  title={`Add images (${MAX_IMAGES} max, 5MB each)`}
                  onClick={() => imageInputRef.current?.click()}
                  disabled={!!video || images.length >= MAX_IMAGES}
                  className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9"
                >
                  <ImageIcon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                </button>
                <button
                  type="button"
                  title="Add one video (25MB max)"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={images.length > 0 || !!video}
                  className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:w-9"
                >
                  <Film className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                </button>
                <button
                  type="button"
                  title="Add feeling or activity"
                  onClick={() => setShowFeelingPicker((value) => !value)}
                  className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-primary/10 sm:h-9 sm:w-9"
                >
                  <Smile className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                </button>
                <button
                  type="button"
                  title="Add tags"
                  onClick={() => setShowTagEditor((value) => !value)}
                  className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-primary/10 sm:h-9 sm:w-9"
                >
                  <Hash className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                </button>
                <button type="button" title="Polls coming soon" disabled className="hidden h-8 w-8 cursor-not-allowed items-center justify-center rounded-md opacity-35 min-[380px]:flex sm:h-9 sm:w-9">
                  <List className="h-5 w-5" />
                </button>
                <button type="button" title="Location coming soon" disabled className="hidden h-9 w-9 cursor-not-allowed items-center justify-center rounded-md opacity-35 sm:flex">
                  <MapPin className="h-5 w-5" />
                </button>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <span className={`text-xs tabular-nums ${remaining < 0 ? "text-destructive" : remaining <= 25 ? "text-primary" : "text-muted-foreground"}`}>
                  {remaining}
                </span>
                <Button
                  type="button"
                  onClick={handlePost}
                  disabled={isPosting || !hasBody || overLimit}
                  className="h-8 rounded-full px-4 text-sm font-semibold sm:h-9 sm:px-5"
                >
                  {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                </Button>
              </div>
            </div>

            <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagesChange} />
            <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
