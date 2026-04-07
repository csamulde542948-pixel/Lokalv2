-- ============================================================
-- Phase 4: P0 + P1 Fixes Migration
-- ============================================================

-- P1 #2: UserNotInterested table — tracks posts users marked "not interested"
-- Used by feed ranking to apply notInterested penalty (default 0.05x multiplier)
CREATE TABLE IF NOT EXISTS user_not_interested (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  "postId"   TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE ("userId", "postId")
);

CREATE INDEX IF NOT EXISTS idx_user_not_interested_user
  ON user_not_interested ("userId");

-- P1 #5: Index to support exploreFeed time-filtered query
-- exploreFeed now filters createdAt >= 7 days ago + orders by likesCount, createdAt
CREATE INDEX IF NOT EXISTS idx_posts_explore_feed
  ON posts ("createdAt" DESC, "likesCount" DESC);

-- Enable RLS on new table
ALTER TABLE user_not_interested ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see/manage their own "not interested" records
CREATE POLICY "user_not_interested_select" ON user_not_interested
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "user_not_interested_insert" ON user_not_interested
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "user_not_interested_delete" ON user_not_interested
  FOR DELETE USING (auth.uid() = "userId");
