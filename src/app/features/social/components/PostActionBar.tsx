import { Bookmark, BookmarkCheck, MessageSquare, Share2 } from "lucide-react";
import type { ReactionOption } from "../reactions";
import { ReactionButton } from "./ReactionButton";

type PostActionBarVariant = "card" | "modal";

interface PostActionBarProps {
  variant?: PostActionBarVariant;
  reactionOpen: boolean;
  onReactionOpenChange: (open: boolean) => void;
  selectedReaction: ReactionOption | null;
  reactionLabel: string;
  reactionColorClassName: string;
  reactions: ReactionOption[];
  onReactionToggle: () => void;
  onReactionPick: (reaction: ReactionOption) => void;
  onReactionMouseEnter?: () => void;
  onReactionMouseLeave?: () => void;
  onReactionPickerMouseLeave?: () => void;
  onComment: () => void;
  onShare: () => void;
  bookmarked?: boolean;
  onBookmarkToggle?: () => void;
}

export function PostActionBar({
  variant = "card",
  reactionOpen,
  onReactionOpenChange,
  selectedReaction,
  reactionLabel,
  reactionColorClassName,
  reactions,
  onReactionToggle,
  onReactionPick,
  onReactionMouseEnter,
  onReactionMouseLeave,
  onReactionPickerMouseLeave,
  onComment,
  onShare,
  bookmarked = false,
  onBookmarkToggle,
}: PostActionBarProps) {
  const isModal = variant === "modal";
  const runAction = (event: React.MouseEvent<HTMLButtonElement>, action: () => void) => {
    event.stopPropagation();
    action();
  };
  const containerClassName = isModal ? "flex items-stretch flex-shrink-0" : "flex items-stretch";
  const actionClassName = isModal
    ? "flex-1 flex items-center justify-center gap-2 py-2.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-semibold text-[13px]"
    : "flex-1 flex items-center justify-center gap-2 py-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground font-medium text-[13px] rounded-none";
  const reactionClassName = isModal
    ? `flex-1 flex items-center justify-center gap-2 py-2.5 cursor-pointer select-none hover:bg-muted transition-colors font-semibold text-[13px] ${reactionColorClassName}`
    : `flex-1 flex items-center justify-center gap-2 py-2 cursor-pointer select-none rounded-none hover:bg-muted transition-colors font-medium text-[13px] ${reactionColorClassName}`;

  return (
    <div className={containerClassName}>
      <ReactionButton
        open={reactionOpen}
        onOpenChange={onReactionOpenChange}
        selectedReaction={selectedReaction}
        label={reactionLabel}
        className={reactionClassName}
        iconClassName={isModal ? "text-lg leading-none" : "text-base leading-none"}
        reactions={reactions}
        onToggle={onReactionToggle}
        onPick={onReactionPick}
        onMouseEnter={onReactionMouseEnter}
        onMouseLeave={onReactionMouseLeave}
        onPickerMouseLeave={onReactionPickerMouseLeave}
      />

      <div className="w-px bg-border self-stretch" />

      <button type="button" onClick={(event) => runAction(event, onComment)} className={actionClassName}>
        <MessageSquare className="w-[18px] h-[18px]" strokeWidth={2} />
        <span>Comment</span>
      </button>

      <div className="w-px bg-border self-stretch" />

      <button type="button" onClick={(event) => runAction(event, onShare)} className={actionClassName}>
        <Share2 className="w-[18px] h-[18px]" strokeWidth={2} />
        <span>Share</span>
      </button>

      {onBookmarkToggle && (
        <>
          <div className="w-px bg-border self-stretch" />

          <button type="button" onClick={(event) => runAction(event, onBookmarkToggle)} className={actionClassName}>
            {bookmarked
              ? <BookmarkCheck className="w-[18px] h-[18px] fill-primary text-primary" strokeWidth={2} />
              : <Bookmark className="w-[18px] h-[18px]" strokeWidth={2} />}
            <span>Bookmark</span>
          </button>
        </>
      )}
    </div>
  );
}
