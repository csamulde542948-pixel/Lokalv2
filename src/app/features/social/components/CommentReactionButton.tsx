import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { COMMENT_REACTIONS, type ReactionOption } from "../reactions";
import { ReactionPicker } from "./ReactionPicker";

interface CommentReactionButtonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedReaction: ReactionOption | null;
  liked: boolean;
  count: number;
  label: string;
  colorClassName: string;
  onToggle: () => void;
  onPick: (reaction: ReactionOption) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onPickerMouseLeave: () => void;
}

export function CommentReactionButton({
  open,
  onOpenChange,
  selectedReaction,
  liked,
  count,
  label,
  colorClassName,
  onToggle,
  onPick,
  onMouseEnter,
  onMouseLeave,
  onPickerMouseLeave,
}: CommentReactionButtonProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className={`text-[10px] font-semibold transition-colors hover:underline flex items-center gap-0.5 ${
            liked ? colorClassName : "text-muted-foreground"
          }`}
        >
          {selectedReaction && <span className="text-xs leading-none">{selectedReaction.emoji}</span>}
          {label}
          {count > 0 ? ` · ${count}` : ""}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-auto p-1.5 rounded-full shadow-xl border bg-popover"
        onMouseLeave={onPickerMouseLeave}
      >
        <ReactionPicker
          reactions={COMMENT_REACTIONS}
          selectedLabel={selectedReaction?.label}
          onPick={onPick}
          className="flex gap-0.5 items-center"
          buttonClassName="text-xl p-1"
        />
      </PopoverContent>
    </Popover>
  );
}
