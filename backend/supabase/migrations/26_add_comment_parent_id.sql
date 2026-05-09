-- Migration 26: Add parentId to post_comments for threaded replies
-- This column exists in production but was missing from staging.

ALTER TABLE public."post_comments"
  ADD COLUMN IF NOT EXISTS "parentId" TEXT REFERENCES public."post_comments"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "post_comments_parentId_idx" ON public."post_comments"("parentId");
