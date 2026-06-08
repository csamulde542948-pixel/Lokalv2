export type ReactionLabel =
  | "Like"
  | "Love"
  | "Haha"
  | "Wow"
  | "Sad"
  | "Angry"
  | "Fire";

export interface ReactionOption {
  emoji: string;
  label: string;
  color: string;
}

export const REACTIONS: ReactionOption[] = [
  { emoji: "\uD83D\uDC4D", label: "Like", color: "text-blue-500" },
  { emoji: "\u2764\uFE0F", label: "Love", color: "text-red-500" },
  { emoji: "\uD83D\uDE02", label: "Haha", color: "text-yellow-500" },
  { emoji: "\uD83D\uDE2E", label: "Wow", color: "text-yellow-500" },
  { emoji: "\uD83D\uDE22", label: "Sad", color: "text-blue-400" },
  { emoji: "\uD83D\uDE21", label: "Angry", color: "text-orange-600" },
  { emoji: "\uD83D\uDD25", label: "Fire", color: "text-orange-500" },
];

export const COMMENT_REACTIONS = REACTIONS;

export function findReaction(label?: string | null): ReactionOption | null {
  return REACTIONS.find((reaction) => reaction.label === label) ?? null;
}
