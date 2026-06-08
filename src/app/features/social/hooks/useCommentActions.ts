import type { Dispatch, SetStateAction } from "react";
import { useMutation } from "@apollo/client/react";
import {
  DELETE_COMMENT,
  EDIT_COMMENT,
  LIKE_COMMENT,
  UNLIKE_COMMENT,
} from "../graphql";
import {
  countCommentAndReplies,
  findCommentById,
  removeCommentById,
  updateCommentById,
} from "../commentTree";
import type { CommentData } from "../types";

interface UseCommentActionsOptions {
  comments: CommentData[];
  setComments: Dispatch<SetStateAction<CommentData[]>>;
  setCommentCount: Dispatch<SetStateAction<number>>;
  editHistoryIdPrefix?: string;
}

export function useCommentActions({
  comments,
  setComments,
  setCommentCount,
  editHistoryIdPrefix = "temp-edit",
}: UseCommentActionsOptions) {
  const [likeCommentMutation] = useMutation(LIKE_COMMENT);
  const [unlikeCommentMutation] = useMutation(UNLIKE_COMMENT);
  const [editCommentMutation] = useMutation(EDIT_COMMENT);
  const [deleteCommentMutation] = useMutation(DELETE_COMMENT);

  async function handleLikeComment(commentId: string, wasLiked: boolean, reaction?: string) {
    try {
      if (wasLiked) {
        await unlikeCommentMutation({ variables: { commentId } });
      } else {
        await likeCommentMutation({ variables: { commentId, reaction: reaction ?? "Like" } });
      }
    } catch {
      // CommentItem already applied the optimistic reaction state.
    }
  }

  async function handleEditComment(commentId: string, newContent: string) {
    setComments((prev) =>
      updateCommentById(prev, commentId, (comment) => ({
        ...comment,
        content: newContent,
        isEdited: true,
        editHistory: [{
          id: `${editHistoryIdPrefix}-${Date.now()}`,
          previousContent: comment.content,
          editedAt: new Date().toISOString(),
        }, ...(comment.editHistory ?? [])],
      }))
    );

    try {
      await editCommentMutation({ variables: { commentId, content: newContent } });
    } catch {
      // Keep the optimistic edit visible; server refreshes can reconcile later.
    }
  }

  async function handleDeleteComment(commentId: string) {
    const target = findCommentById(comments, commentId);
    const deletedCount = target ? countCommentAndReplies(target) : 1;
    setComments((prev) => removeCommentById(prev, commentId));
    setCommentCount((count) => Math.max(0, count - deletedCount));

    try {
      await deleteCommentMutation({ variables: { commentId } });
    } catch {
      // Preserve existing behavior: deletion is optimistic and not reverted.
    }
  }

  return {
    handleLikeComment,
    handleEditComment,
    handleDeleteComment,
  };
}
