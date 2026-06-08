import { useEffect, useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { LIKE_POST, UNLIKE_POST } from "../graphql";
import { REACTIONS, findReaction, type ReactionOption } from "../reactions";

interface UsePostReactionOptions {
  postId?: string | null;
  liked?: boolean;
  likes: number;
  reaction?: string | null;
  hoverDelayMs?: number;
}

export function usePostReaction({
  postId,
  liked = false,
  likes,
  reaction,
  hoverDelayMs = 400,
}: UsePostReactionOptions) {
  const [localLiked, setLocalLiked] = useState(liked);
  const [localLikes, setLocalLikes] = useState(likes);
  const [selectedReaction, setSelectedReaction] = useState<ReactionOption | null>(findReaction(reaction));
  const [reactionOpen, setReactionOpen] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [likePost] = useMutation(LIKE_POST);
  const [unlikePost] = useMutation(UNLIKE_POST);

  useEffect(() => {
    setLocalLiked(liked);
    setLocalLikes(likes);
    setSelectedReaction(findReaction(reaction));
  }, [liked, likes, reaction]);

  function closeReactionPicker() {
    setReactionOpen(false);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }

  function onReactionMouseEnter() {
    hoverTimer.current = setTimeout(() => setReactionOpen(true), hoverDelayMs);
  }

  function onReactionMouseLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }

  function onReactionPickerMouseLeave() {
    closeReactionPicker();
  }

  function persistReaction(nextLiked: boolean, nextReaction?: string) {
    if (!postId) return;
    if (nextLiked) {
      likePost({ variables: { postId, reaction: nextReaction ?? "Like" } }).catch(console.error);
    } else {
      unlikePost({ variables: { postId } }).catch(console.error);
    }
  }

  function toggleReaction() {
    const next = !localLiked;
    setLocalLiked(next);
    setLocalLikes((count) => (next ? count + 1 : Math.max(0, count - 1)));
    setSelectedReaction(next ? findReaction("Like") : null);
    persistReaction(next, next ? "Like" : undefined);
  }

  function pickReaction(nextReaction: ReactionOption) {
    closeReactionPicker();

    if (selectedReaction?.label === nextReaction.label) {
      setSelectedReaction(null);
      setLocalLiked(false);
      setLocalLikes((count) => Math.max(0, count - 1));
      persistReaction(false);
      return;
    }

    setSelectedReaction(nextReaction);
    if (!localLiked) {
      setLocalLiked(true);
      setLocalLikes((count) => count + 1);
    }
    persistReaction(true, nextReaction.label);
  }

  return {
    localLiked,
    localLikes,
    selectedReaction,
    reactionOpen,
    setReactionOpen,
    reactionLabel: selectedReaction?.label ?? "Like",
    reactionColor: selectedReaction
      ? selectedReaction.color
      : "text-muted-foreground hover:text-foreground",
    reactions: REACTIONS,
    toggleReaction,
    pickReaction,
    onReactionMouseEnter,
    onReactionMouseLeave,
    onReactionPickerMouseLeave,
  };
}
