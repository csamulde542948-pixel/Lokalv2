-- Migration 41: Add X-style thread metadata to post_comments.
-- Keeps the existing comment table, but makes each comment/reply addressable
-- as thread-only content with a root post and depth.

ALTER TABLE public."post_comments"
  ADD COLUMN IF NOT EXISTS "rootPostId" TEXT,
  ADD COLUMN IF NOT EXISTS "depth" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "feedVisibility" VARCHAR(30) NOT NULL DEFAULT 'THREAD_ONLY';

UPDATE public."post_comments"
SET "rootPostId" = "postId"
WHERE "rootPostId" IS NULL;

WITH RECURSIVE comment_thread AS (
  SELECT
    pc."id",
    pc."postId" AS "rootPostId",
    1 AS "depth"
  FROM public."post_comments" pc
  WHERE pc."parentId" IS NULL

  UNION ALL

  SELECT
    child."id",
    parent_thread."rootPostId",
    parent_thread."depth" + 1 AS "depth"
  FROM public."post_comments" child
  JOIN comment_thread parent_thread
    ON child."parentId" = parent_thread."id"
)
UPDATE public."post_comments" pc
SET
  "rootPostId" = comment_thread."rootPostId",
  "depth" = comment_thread."depth"
FROM comment_thread
WHERE pc."id" = comment_thread."id";

UPDATE public."post_comments"
SET "feedVisibility" = 'THREAD_ONLY'
WHERE "feedVisibility" IS NULL OR "feedVisibility" = '';

CREATE INDEX IF NOT EXISTS "post_comments_rootPostId_idx" ON public."post_comments"("rootPostId");
CREATE INDEX IF NOT EXISTS "post_comments_feedVisibility_idx" ON public."post_comments"("feedVisibility");
CREATE INDEX IF NOT EXISTS "post_comments_rootPostId_depth_idx" ON public."post_comments"("rootPostId", "depth");
