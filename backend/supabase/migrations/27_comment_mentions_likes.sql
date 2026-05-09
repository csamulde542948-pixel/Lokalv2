-- Migration 27: Add missing post_comments columns and related tables
-- Adds: mentions[], likesCount, post_comment_edits table, comment_likes table

-- 1. Add missing columns to post_comments
ALTER TABLE public."post_comments"
  ADD COLUMN IF NOT EXISTS "mentions"   TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "likesCount" INTEGER NOT NULL DEFAULT 0;

-- 2. Create post_comment_edits table
CREATE TABLE IF NOT EXISTS public."post_comment_edits" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "comment_id"       TEXT NOT NULL,
  "previous_content" TEXT NOT NULL,
  "edited_at"        TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "post_comment_edits_comment_id_fkey"
    FOREIGN KEY ("comment_id") REFERENCES public."post_comments"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "post_comment_edits_comment_id_idx" ON public."post_comment_edits"("comment_id");

-- 3. Create comment_likes table
CREATE TABLE IF NOT EXISTS public."comment_likes" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "commentId" TEXT NOT NULL,
  "profileId" UUID NOT NULL,
  "reaction"  VARCHAR(20) NOT NULL DEFAULT 'Like',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "comment_likes_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES public."post_comments"("id") ON DELETE CASCADE,
  CONSTRAINT "comment_likes_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES public."profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "comment_likes_commentId_profileId_key"
    UNIQUE ("commentId", "profileId")
);

CREATE INDEX IF NOT EXISTS "comment_likes_commentId_idx" ON public."comment_likes"("commentId");
