-- ============================================================
-- Migration 18: Roast Token System
-- Adds daily token tracking to profiles + RoastReaction table
-- ============================================================

-- 1. Add ROAST_REACTION to notification type enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ROAST_REACTION';

-- 2. Add daily token tracking columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS "roastTokensUsed"    INT          NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "roastTokensResetAt" TIMESTAMPTZ;

-- 3. Add roastReactionCount counter to posts
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS "roastReactionCount" INT NOT NULL DEFAULT 0;

-- 4. Create roast_reactions table
CREATE TABLE IF NOT EXISTS roast_reactions (
  id           TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "postId"     TEXT        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  "reactorId"  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT roast_reactions_post_reactor_unique UNIQUE ("postId", "reactorId")
);

-- 5. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS roast_reactions_post_idx    ON roast_reactions ("postId");
CREATE INDEX IF NOT EXISTS roast_reactions_reactor_idx ON roast_reactions ("reactorId");

-- 6. RLS: authenticated users can insert their own reaction
ALTER TABLE roast_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roast_reactions_insert_own"
  ON roast_reactions FOR INSERT
  WITH CHECK (auth.uid() = "reactorId");

CREATE POLICY "roast_reactions_select_all"
  ON roast_reactions FOR SELECT
  USING (true);

CREATE POLICY "roast_reactions_delete_none"
  ON roast_reactions FOR DELETE
  USING (false);  -- one-way spend, no deletes allowed at DB level
