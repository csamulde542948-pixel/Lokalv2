-- Migration: Create roast_likes table for idempotent roast likes
-- Security Finding #8: Prevents infinite like farming on roasts

CREATE TABLE IF NOT EXISTS roast_likes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "roastId" TEXT NOT NULL REFERENCES roasts(id) ON DELETE CASCADE,
  "profileId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT roast_likes_roastId_profileId_key UNIQUE ("roastId", "profileId")
);

CREATE INDEX IF NOT EXISTS idx_roast_likes_roastId ON roast_likes ("roastId");

-- Enable RLS on roast_likes
ALTER TABLE roast_likes ENABLE ROW LEVEL SECURITY;

-- Drop policies first so re-running this migration is idempotent
DROP POLICY IF EXISTS "Users can view own roast likes"   ON roast_likes;
DROP POLICY IF EXISTS "Users can create own roast likes" ON roast_likes;
DROP POLICY IF EXISTS "Users can delete own roast likes" ON roast_likes;

-- Users can only see their own likes
CREATE POLICY "Users can view own roast likes"
  ON roast_likes FOR SELECT
  USING (auth.uid() = "profileId");

-- Users can insert their own likes
CREATE POLICY "Users can create own roast likes"
  ON roast_likes FOR INSERT
  WITH CHECK (auth.uid() = "profileId");

-- Users can delete their own likes
CREATE POLICY "Users can delete own roast likes"
  ON roast_likes FOR DELETE
  USING (auth.uid() = "profileId");
