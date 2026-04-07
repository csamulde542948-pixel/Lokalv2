import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  ThumbsUp, MessageCircle, Share2, Flame, Check, Link as LinkIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "./ui/dropdown-menu";

// ─── Public Post shape (what the feed gives us) ───────────────────────────────
export interface FeedPost {
  id: string;
  author: {
    id?: string;
    name: string;
    username: string;
    avatar?: string;
    avatarUrl?: string;
  };
  content: string;
  projectName?: string;
  tags?: { id: number | string; name: string }[];
  likesCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  timestamp?: string;
  likedByMe?: boolean;
  myReaction?: string | null;
  images?: string[];
  image?: string;
}

// ─── Legacy static interface kept for backwards compatibility ─────────────────
export interface RoastedProject {
  id: string;
  author: { name: string; username: string; avatar: string };
  project: { name: string; description: string; url?: string; image: string; tags: string[] };
  roast: { rating: number; text: string; strengths: string[]; improvements: string[] };
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
}

function legacyToFeedPost(p: RoastedProject): FeedPost {
  return {
    id: p.id,
    author: { name: p.author.name, username: p.author.username, avatar: p.author.avatar },
    content: p.roast.text,
    projectName: p.project.name,
    tags: p.project.tags.map((t, i) => ({ id: i, name: t })),
    likes: p.likes,
    comments: p.comments,
    shares: p.shares,
    timestamp: p.timestamp,
    image: p.project.image,
  };
}

interface RoastedProjectCardProps {
  post: FeedPost | RoastedProject;
  onLike?: (wantsLike: boolean, reaction?: string) => void;
  onDelete?: () => void;
}

function isFeedPost(p: FeedPost | RoastedProject): p is FeedPost {
  return "content" in p;
}

function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s\)\]>"']+/i);
  return m ? m[0] : null;
}

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function getFaviconUrl(url: string): string {
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=64`;
  } catch {
    return "";
  }
}

const REACTIONS = [
  { emoji: "👍", label: "Like",  color: "text-blue-500" },
  { emoji: "❤️",  label: "Love",  color: "text-red-500" },
  { emoji: "🔥",  label: "Fire",  color: "text-orange-500" },
  { emoji: "😂",  label: "Haha",  color: "text-yellow-500" },
  { emoji: "😮",  label: "Wow",   color: "text-yellow-500" },
  { emoji: "😢",  label: "Sad",   color: "text-blue-400" },
];

const READ_MORE_THRESHOLD = 280;

export function RoastedProjectCard({ post, onLike }: RoastedProjectCardProps) {
  const navigate = useNavigate();

  const p: FeedPost = isFeedPost(post) ? post : legacyToFeedPost(post as RoastedProject);

  const authorName     = p.author.name;
  const authorUsername = p.author.username.startsWith("@") ? p.author.username : `@${p.author.username}`;
  const authorAvatar   = p.author.avatar ?? (p.author as any).avatarUrl;
  const projectName    = p.projectName ?? "Unknown Project";
  const roastText      = p.content;
  const timestamp      = p.timestamp ?? "";
  const coverImage     = p.images?.[0] ?? p.image;
  const projectUrl     = extractUrl(roastText) ?? undefined;
  const displayTags    = (p.tags ?? []).filter((t) => !["roast", "ai", "lokal"].includes(t.name));
  const faviconUrl     = projectUrl ? getFaviconUrl(projectUrl) : "";
  const projectDomain  = projectUrl ? getDomain(projectUrl) : "";

  const [expanded, setExpanded] = useState(false);
  const needsReadMore = roastText.length > READ_MORE_THRESHOLD;
  const displayText   = !expanded && needsReadMore
    ? roastText.slice(0, READ_MORE_THRESHOLD).trimEnd() + "…"
    : roastText;

  const [optimisticLiked,  setOptimisticLiked]  = useState(p.likedByMe ?? false);
  const [optimisticLikes,  setOptimisticLikes]  = useState(p.likesCount ?? p.likes ?? 0);

  useEffect(() => {
    setOptimisticLiked(p.likedByMe ?? false);
    setOptimisticLikes(p.likesCount ?? p.likes ?? 0);
    setSelectedReaction(p.myReaction ? (REACTIONS.find(r => r.label === p.myReaction) ?? null) : null);
  }, [p.likedByMe, p.likesCount, p.likes, p.myReaction]);
  const [selectedReaction, setSelectedReaction] = useState<typeof REACTIONS[0] | null>(
    p.myReaction ? (REACTIONS.find(r => r.label === p.myReaction) ?? null) : null
  );
  const [reactionOpen,     setReactionOpen]     = useState(false);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentsCount = p.commentsCount ?? p.comments ?? 0;
  const sharesCount   = p.sharesCount  ?? p.shares  ?? 0;
  const [copied, setCopied] = useState(false);

  function toggleLike() {
    if (selectedReaction) {
      setSelectedReaction(null);
      setOptimisticLiked(false);
      setOptimisticLikes((n) => Math.max(0, n - 1));
      onLike?.(false);
    } else {
      const next = !optimisticLiked;
      setOptimisticLiked(next);
      setOptimisticLikes((n) => next ? n + 1 : Math.max(0, n - 1));
      onLike?.(next, next ? "Like" : undefined);
    }
  }

  function pickReaction(r: typeof REACTIONS[0]) {
    const switching = selectedReaction?.label !== r.label;
    setSelectedReaction(switching ? r : null);
    setOptimisticLiked(switching);
    if (!optimisticLiked && switching) setOptimisticLikes((n) => n + 1);
    if (!switching) setOptimisticLikes((n) => Math.max(0, n - 1));
    setReactionOpen(false);
    onLike?.(switching, switching ? r.label : undefined);
  }

  function onReactMouseEnter() {
    reactionTimer.current = setTimeout(() => setReactionOpen(true), 500);
  }
  function onReactMouseLeave() {
    if (reactionTimer.current) clearTimeout(reactionTimer.current);
  }
  function onPickerMouseLeave() { setReactionOpen(false); }

  function copyLink() {
    navigator.clipboard
      .writeText(projectUrl ?? `${window.location.origin}/posts/${p.id}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const reactLabel = selectedReaction?.label ?? "Like";
  const reactColor = selectedReaction
    ? selectedReaction.color
    : "text-muted-foreground hover:text-foreground";

  return (
    <Card className="overflow-hidden border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm rounded-xl gap-0">
      <CardContent className="p-0 [&:last-child]:pb-0">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(`/profile/${authorUsername.replace("@", "")}`)}
            className="flex-shrink-0"
          >
            <Avatar className="w-10 h-10 border-2 border-border">
              <AvatarImage src={authorAvatar} />
              <AvatarFallback>{authorName[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate(`/profile/${authorUsername.replace("@", "")}`)}
                className="font-semibold text-sm hover:underline leading-tight text-left"
              >
                {authorName}
              </button>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 h-4 gap-1">
                <Flame className="w-2.5 h-2.5" strokeWidth={2.5} />
                Got Roasted
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <span>{timestamp}</span>
              <span>·</span>
              <span className="text-[10px]">🌐</span>
            </div>
          </div>
        </div>

        {/* ── Roast card ──────────────────────────────────────────────────── */}
        <div className="mx-4 mb-3 border-2 border-primary/25 rounded-xl overflow-hidden bg-card shadow-sm">

          {/* Project header */}
          <div className="bg-gradient-to-r from-primary/12 via-primary/8 to-primary/4 border-b border-primary/20 px-4 py-3">
            <div className="flex items-center gap-3">

              {/* Favicon / brand logo */}
              <div className="relative w-8 h-8 flex-shrink-0">
                {faviconUrl && (
                  <img
                    src={faviconUrl}
                    alt=""
                    className="w-8 h-8 rounded-md object-contain bg-muted/30 p-0.5 absolute inset-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className={`w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center ${faviconUrl ? "opacity-0" : "opacity-100"}`}>
                  <Flame className="w-4 h-4 text-primary" strokeWidth={2.5} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                {projectUrl ? (
                  <a
                    href={projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-sm truncate hover:underline text-foreground block"
                  >
                    {projectName}
                  </a>
                ) : (
                  <span className="font-bold text-sm truncate block">{projectName}</span>
                )}
                {projectDomain && (
                  <span className="text-[11px] text-muted-foreground truncate block">{projectDomain}</span>
                )}
              </div>

              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 h-5 gap-1 flex-shrink-0">
                <Flame className="w-2.5 h-2.5" strokeWidth={2.5} />
                AI Roast
              </Badge>
            </div>
          </div>

          {/* Cover image */}
          {coverImage && (
            <img
              src={coverImage}
              alt={projectName}
              className="w-full aspect-[2/1] object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}

          {/* Roast body */}
          <div className="p-4 bg-gradient-to-b from-transparent to-primary/5">
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {displayText}
            </p>
            {needsReadMore && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs font-semibold text-primary hover:underline mt-1 block"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
            {displayTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {displayTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 bg-muted/50 border-primary/20 hover:border-primary/40 transition-colors"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Stats row ───────────────────────────────────────────────────── */}
        {(optimisticLikes > 0 || commentsCount > 0 || sharesCount > 0) && (
          <div className="px-4 py-2 flex items-center justify-between">
            {optimisticLikes > 0 ? (
              <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                <span className="text-sm leading-none">
                  {selectedReaction ? selectedReaction.emoji : "👍"}
                </span>
                <span>{optimisticLikes.toLocaleString()}</span>
              </span>
            ) : <span />}
            <div className="flex items-center gap-3">
              {commentsCount > 0 && (
                <span className="text-[12px] text-muted-foreground">
                  {commentsCount.toLocaleString()}{" "}
                  {commentsCount === 1 ? "comment" : "comments"}
                </span>
              )}
              {sharesCount > 0 && (
                <span className="text-[12px] text-muted-foreground">
                  {sharesCount} {sharesCount === 1 ? "share" : "shares"}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Action bar ──────────────────────────────────────────────────── */}
        <Separator />
        <div className="flex items-stretch">

          {/* Like / React */}
          <Popover open={reactionOpen} onOpenChange={setReactionOpen}>
            <PopoverTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                onClick={toggleLike}
                onMouseEnter={onReactMouseEnter}
                onMouseLeave={onReactMouseLeave}
                onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") toggleLike(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 cursor-pointer select-none rounded-none hover:bg-muted transition-colors font-medium text-[13px] ${reactColor}`}
              >
                {selectedReaction ? (
                  <span className="text-base leading-none">{selectedReaction.emoji}</span>
                ) : (
                  <ThumbsUp className="w-[18px] h-[18px]" strokeWidth={2} />
                )}
                <span>{reactLabel}</span>
              </div>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="w-auto p-2 rounded-full shadow-xl border bg-popover"
              onMouseLeave={onPickerMouseLeave}
            >
              <div className="flex gap-1 items-center">
                {REACTIONS.map((r) => (
                  <button
                    key={r.label}
                    title={r.label}
                    onClick={() => pickReaction(r)}
                    className={`text-2xl p-1 rounded-full transition-all duration-150 hover:scale-150 hover:-translate-y-2 ${
                      selectedReaction?.label === r.label ? "scale-125 -translate-y-1" : "scale-100"
                    }`}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-px bg-border self-stretch" />

          {/* Comment */}
          <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-medium text-[13px] rounded-none">
            <MessageCircle className="w-[18px] h-[18px]" strokeWidth={2} />
            <span>Comment</span>
          </button>

          <div className="w-px bg-border self-stretch" />

          {/* Share */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-medium text-[13px] rounded-none">
                <Share2 className="w-[18px] h-[18px]" strokeWidth={2} />
                <span>Share</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" className="w-52">
              <DropdownMenuItem onClick={copyLink} className="gap-2.5 cursor-pointer py-2.5">
                {copied
                  ? <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  : <LinkIcon className="w-4 h-4 flex-shrink-0" />}
                <div>
                  <div className="text-sm font-medium">{copied ? "Link copied!" : "Copy link"}</div>
                  <div className="text-xs text-muted-foreground">Share anywhere</div>
                </div>
              </DropdownMenuItem>
              {projectUrl && (
                <DropdownMenuItem
                  onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(projectUrl)}`, "_blank")}
                  className="gap-2.5 cursor-pointer py-2.5"
                >
                  <Share2 className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium">Share to X</div>
                    <div className="text-xs text-muted-foreground">Post on X / Twitter</div>
                  </div>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </CardContent>
    </Card>
  );
}
