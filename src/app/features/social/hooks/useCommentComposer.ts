import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { COMMENT_ON_POST, REPLY_TO_COMMENT } from "../graphql";
import { adaptComment, makeOptimisticComment } from "../adapters";
import { appendReply, appendTopLevelComment, removeCommentById, replaceCommentById } from "../commentTree";
import { useMeProfile } from "./useMeProfile";
import type { CommentData } from "../types";

export interface ReplyTarget {
  id: string;
  name: string;
  visualParentId?: string;
  topLevelId?: string;
}

interface UseCommentComposerOptions {
  postId?: string | null;
  /** @deprecated pass `user` removed — composer now reads profile from `useMeProfile` */
  user?: unknown;
  replyingTo: ReplyTarget | null;
  setReplyingTo: Dispatch<SetStateAction<ReplyTarget | null>>;
  setComments: Dispatch<SetStateAction<CommentData[]>>;
  setCommentCount: Dispatch<SetStateAction<number>>;
  rollbackReplyOnError?: boolean;
  onCommentSuccess?: (comment: CommentData, tempId: string) => void | Promise<void>;
  onReplySuccess?: (reply: CommentData, tempId: string) => void | Promise<void>;
}

export function useCommentComposer({
  postId,
  replyingTo,
  setReplyingTo,
  setComments,
  setCommentCount,
  rollbackReplyOnError = true,
  onCommentSuccess,
  onReplySuccess,
}: UseCommentComposerOptions) {
  const { me, isAuthenticated } = useMeProfile();
  const [commentOnPost, { loading: submittingComment }] = useMutation(COMMENT_ON_POST);
  const [replyToComment,    { loading: submittingReply }]    = useMutation(REPLY_TO_COMMENT);
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);

  /**
   * Maps the central `useMeProfile` data into the shape `makeOptimisticComment`
   * expects. Falls back to a real-looking "You" only when we have no profile
   * data at all (e.g. the user is not authenticated) — in that case the
   * composer should be disabled at the UI layer, but we keep the fallback
   * for defence in depth.
   */
  const optimisticAuthor = me
    ? {
        id: me.id,
        name: me.displayName ?? me.username ?? me.name,
        displayName: me.displayName ?? undefined,
        username: me.username,
        avatarUrl: me.avatarUrl ?? undefined,
      }
    : { id: "anonymous", name: "You", username: "you" };

  async function handleComment(text: string, mentions?: string[]) {
    if (!text.trim() || !postId || !isAuthenticated) return;

    const temp = makeOptimisticComment({
      id: `temp-${Date.now()}`,
      content: text,
      rootPostId: postId,
      depth: 1,
      mentions: mentions ?? [],
      user: optimisticAuthor as any,
    });

    setComments((prev) => appendTopLevelComment(prev, temp));
    setCommentCount((count) => count + 1);

    try {
      const { data } = await commentOnPost({
        variables: { input: { postId, content: text, mentions: mentions ?? [] } },
      });
      if (data?.commentOnPost) {
        const saved = adaptComment({ ...data.commentOnPost, replies: [] });
        setComments((prev) => replaceCommentById(prev, temp.id, saved));
        await onCommentSuccess?.(saved, temp.id);
      }
    } catch {
      setComments((prev) => removeCommentById(prev, temp.id));
      setCommentCount((count) => Math.max(0, count - 1));
    }
  }

  async function handleReply(text: string, mentions?: string[]) {
    if (!text.trim() || !postId || !replyingTo || !isAuthenticated) return;

    const parentId = replyingTo.id;
    const visualParentId = replyingTo.visualParentId;
    const topId = replyingTo.topLevelId ?? parentId;
    const temp = makeOptimisticComment({
      id: `temp-reply-${Date.now()}`,
      content: text,
      parentId,
      rootPostId: postId,
      depth: visualParentId ? 3 : 2,
      mentions: mentions ?? [],
      user: optimisticAuthor as any,
    });

    setComments((prev) => appendReply(prev, { parentId, visualParentId, topLevelId: topId }, temp));
    setCommentCount((count) => count + 1);
    setReplyingTo(null);
    setSubmittingReplyId(parentId);

    try {
      const { data } = await replyToComment({
        variables: { input: { postId, parentId, content: text, mentions: mentions ?? [] } },
      });
      if (data?.replyToComment) {
        const saved = adaptComment({ ...data.replyToComment, replies: [] });
        setComments((prev) => replaceCommentById(prev, temp.id, saved));
        await onReplySuccess?.(saved, temp.id);
      }
    } catch {
      if (rollbackReplyOnError) {
        setComments((prev) => removeCommentById(prev, temp.id));
        setCommentCount((count) => Math.max(0, count - 1));
      }
    } finally {
      setSubmittingReplyId(null);
    }
  }

  return {
    handleComment,
    handleReply,
    submittingComment,
    submittingReply,
    submittingReplyId,
    meLoaded: !!me,
  };
}
