import type { ReactionOption } from "../reactions";

/**
 * Stats summary that appears between the body and the action bar
 * on every post card / modal. Hidden entirely when nothing is positive
 * to show.
 */
interface PostStatsRowProps {
  likes: number;
  comments: number;
  shares: number;
  selectedReaction: ReactionOption | null;
  variant?: "card" | "modal";
  onCommentClick?: () => void;
}

export function PostStatsRow({
  likes,
  comments,
  shares,
  selectedReaction,
  variant = "card",
  onCommentClick,
}: PostStatsRowProps) {
  if (likes <= 0 && comments <= 0 && shares <= 0) return null;

  const isModal = variant === "modal";
  const likeTextSize  = isModal ? "text-[13px]" : "text-[12px]";
  const metaTextSize  = isModal ? "text-[13px]" : "text-[12px]";
  const likeTextColor = isModal ? "text-foreground" : "text-muted-foreground";
  const likeFont      = isModal ? "font-medium" : "";
  const containerPad  = isModal ? "px-4 py-2" : "px-4 py-2";

  return (
    <div className={`${containerPad} flex items-center justify-between`}>
      {likes > 0 ? (
        <span className={`flex items-center gap-1 ${likeTextSize} ${likeTextColor} ${likeFont}`}>
          <span className="text-sm leading-none">
            {selectedReaction ? selectedReaction.emoji : "👍"}
          </span>
          <span>{likes.toLocaleString()}</span>
        </span>
      ) : <span />}

      <div className={`flex items-center gap-3 ${metaTextSize} text-muted-foreground`}>
        {comments > 0 && (
          <button
            onClick={onCommentClick}
            className="hover:underline hover:text-foreground transition-colors"
          >
            {comments.toLocaleString()}{" "}
            {comments === 1 ? "comment" : "comments"}
          </button>
        )}
        {shares > 0 && (
          <span>
            {shares} {shares === 1 ? "share" : "shares"}
          </span>
        )}
      </div>
    </div>
  );
}
