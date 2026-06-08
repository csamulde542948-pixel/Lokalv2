import { ThumbsUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { REACTIONS, type ReactionOption } from "../reactions";
import { ReactionPicker } from "./ReactionPicker";

interface ReactionButtonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedReaction: ReactionOption | null;
  label: string;
  className: string;
  iconClassName?: string;
  reactions?: ReactionOption[];
  onToggle: () => void;
  onPick: (reaction: ReactionOption) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onPickerMouseLeave?: () => void;
}

export function ReactionButton({
  open,
  onOpenChange,
  selectedReaction,
  label,
  className,
  iconClassName = "text-base leading-none",
  reactions = REACTIONS,
  onToggle,
  onPick,
  onMouseEnter,
  onMouseLeave,
  onPickerMouseLeave,
}: ReactionButtonProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          onClick={onToggle}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter") onToggle();
          }}
          className={className}
        >
          {selectedReaction ? (
            <span className={iconClassName}>{selectedReaction.emoji}</span>
          ) : (
            <ThumbsUp className="w-[18px] h-[18px]" strokeWidth={2} />
          )}
          <span>{label}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-auto p-2 rounded-full shadow-xl border bg-popover"
        onMouseLeave={onPickerMouseLeave}
      >
        <ReactionPicker
          reactions={reactions}
          selectedLabel={selectedReaction?.label}
          onPick={onPick}
        />
      </PopoverContent>
    </Popover>
  );
}
