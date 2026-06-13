import { useState } from "react";
import { LinkPreviewCard, extractFirstUrl } from "./LinkPreviewCard";
import { LinkedPostText } from "./LinkedPostText";
import { MediaGrid } from "./MediaGrid";

type PostContentBodyProps = {
  content: string;
  tags?: { id: string | number; name: string }[];
  image?: string;
  images?: string[];
  videoUrl?: string;
};

/**
 * Pure body — text, tags, link preview, and media grid. The parent
 * `PostCard` is responsible for rendering a nested `originalPost` (if any)
 * as a fully interactive PostCard; this component is the leaf that just
 * paints the textual + media content.
 */
export function PostContentBody({
  content,
  tags,
  image,
  images,
  videoUrl,
}: PostContentBodyProps) {
  const [contentExpanded, setContentExpanded] = useState(false);
  const clean = content.replace(/\[shared:[^\]]+\]/g, "").trim();
  const mediaImages = images && images.length > 0 ? images : image ? [image] : [];
  const detectedUrl = mediaImages.length === 0 ? extractFirstUrl(content) : null;
  const collapseLimit = 150;
  const maxLines = 10;
  const contentLines = clean.split("\n");
  const needsReadMore = clean.length > collapseLimit || contentLines.length > maxLines;
  const displayText = needsReadMore && !contentExpanded
    ? contentLines.slice(0, maxLines).join("\n").slice(0, collapseLimit).trimEnd() + "..."
    : clean;

  return (
    <>
      {clean && (
        <div className="px-4 pb-3 space-y-2.5">
          <LinkedPostText
            text={displayText}
            className="whitespace-pre-wrap text-sm leading-relaxed break-words"
          />
          {needsReadMore && (
            <button
              onClick={() => setContentExpanded((value) => !value)}
              className="text-xs font-semibold text-primary hover:underline mt-1 block"
            >
              {contentExpanded ? "See less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag.id} className="text-xs text-primary hover:underline cursor-pointer font-medium">
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {detectedUrl && <LinkPreviewCard url={detectedUrl} />}
      {mediaImages.length > 0 && <MediaGrid imgs={mediaImages} />}
      {videoUrl && mediaImages.length === 0 && (
        <div className="px-4 pb-3">
          <video
            src={videoUrl}
            controls
            className="max-h-[560px] w-full rounded-2xl border bg-black"
          />
        </div>
      )}
    </>
  );
}
