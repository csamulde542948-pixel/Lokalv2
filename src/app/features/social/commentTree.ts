import type { CommentData } from "./types";

export interface ReplyPlacement {
  parentId: string;
  visualParentId?: string;
  topLevelId?: string;
}

export function appendTopLevelComment(comments: CommentData[], comment: CommentData): CommentData[] {
  return [...comments, comment];
}

export function replaceCommentById(
  comments: CommentData[],
  commentId: string,
  replacement: CommentData
): CommentData[] {
  return comments.map((comment) => {
    if (comment.id === commentId) return replacement;
    return { ...comment, replies: replaceCommentById(comment.replies, commentId, replacement) };
  });
}

export function updateCommentById(
  comments: CommentData[],
  commentId: string,
  update: (comment: CommentData) => CommentData
): CommentData[] {
  return comments.map((comment) => {
    if (comment.id === commentId) return update(comment);
    return { ...comment, replies: updateCommentById(comment.replies, commentId, update) };
  });
}

export function appendReply(
  comments: CommentData[],
  placement: ReplyPlacement,
  reply: CommentData
): CommentData[] {
  const { parentId, visualParentId } = placement;
  const topLevelId = placement.topLevelId ?? parentId;

  return comments.map((comment) => {
    if (!visualParentId) {
      return comment.id === parentId
        ? { ...comment, replies: [...comment.replies, reply] }
        : comment;
    }

    if (comment.id !== topLevelId) return comment;
    return {
      ...comment,
      replies: comment.replies.map((child) =>
        child.id === visualParentId ? { ...child, replies: [...child.replies, reply] } : child
      ),
    };
  });
}

export function removeCommentById(comments: CommentData[], commentId: string): CommentData[] {
  return comments
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({
      ...comment,
      replies: removeCommentById(comment.replies, commentId),
    }));
}

export function countCommentAndReplies(comment: CommentData): number {
  return 1 + comment.replies.reduce((count, reply) => count + countCommentAndReplies(reply), 0);
}

export function findCommentById(comments: CommentData[], commentId: string): CommentData | null {
  for (const comment of comments) {
    if (comment.id === commentId) return comment;
    const reply = findCommentById(comment.replies, commentId);
    if (reply) return reply;
  }
  return null;
}
