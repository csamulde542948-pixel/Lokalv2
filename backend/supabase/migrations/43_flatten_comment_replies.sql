-- Migration 43: Flatten existing nested comment replies.
--
-- The product model is now:
--   - parentId NULL = a top-level comment on a post
--   - parentId = top-level comment id = a flat reply shown inside that comment card
--
-- This rewrites old depth-3+ nested replies so they become direct children of
-- the top-level comment while keeping the original post ownership.

WITH RECURSIVE comment_roots AS (
  SELECT
    pc."id",
    pc."id" AS "topLevelCommentId",
    pc."postId" AS "rootPostId",
    1 AS "depth"
  FROM public."post_comments" pc
  WHERE pc."parentId" IS NULL

  UNION ALL

  SELECT
    child."id",
    comment_roots."topLevelCommentId",
    comment_roots."rootPostId",
    comment_roots."depth" + 1 AS "depth"
  FROM public."post_comments" child
  JOIN comment_roots
    ON child."parentId" = comment_roots."id"
)
UPDATE public."post_comments" pc
SET
  "parentId" = CASE
    WHEN comment_roots."depth" = 1 THEN NULL
    ELSE comment_roots."topLevelCommentId"
  END,
  "rootPostId" = comment_roots."rootPostId",
  "depth" = CASE
    WHEN comment_roots."depth" = 1 THEN 1
    ELSE 2
  END,
  "feedVisibility" = 'THREAD_ONLY'
FROM comment_roots
WHERE pc."id" = comment_roots."id";

CREATE INDEX IF NOT EXISTS "post_comments_parentId_createdAt_idx"
  ON public."post_comments"("parentId", "createdAt");
