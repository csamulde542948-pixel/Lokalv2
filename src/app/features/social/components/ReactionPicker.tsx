import type { ReactionOption } from "../reactions";

interface ReactionPickerProps {
  reactions: ReactionOption[];
  selectedLabel?: string | null;
  onPick: (reaction: ReactionOption) => void;
  className?: string;
  buttonClassName?: string;
}

export function ReactionPicker({
  reactions,
  selectedLabel,
  onPick,
  className = "flex gap-1 items-center",
  buttonClassName = "text-2xl p-1",
}: ReactionPickerProps) {
  return (
    <div className={className}>
      {reactions.map((reaction) => (
        <button
          key={reaction.label}
          type="button"
          title={reaction.label}
          onClick={() => onPick(reaction)}
          className={`${buttonClassName} rounded-full transition-all duration-150 hover:scale-150 hover:-translate-y-2 ${
            selectedLabel === reaction.label ? "scale-125 -translate-y-1" : "scale-100"
          }`}
        >
          {reaction.emoji}
        </button>
      ))}
    </div>
  );
}
