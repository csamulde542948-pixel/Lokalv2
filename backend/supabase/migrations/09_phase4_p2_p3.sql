-- ============================================================
-- Phase 4: P2 + P3 Fixes Migration
-- ============================================================

-- P2 #12: Add SHARE to NotificationType enum
-- Allows proper notification typing for shared posts instead of reusing LIKE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'SHARE'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
  ) THEN
    ALTER TYPE "NotificationType" ADD VALUE 'SHARE';
  END IF;
END$$;

-- P3 #16: Add rankScore column to posts
-- Caches the latest feed ranking finalScore for use in exploreFeed sorting
ALTER TABLE posts ADD COLUMN IF NOT EXISTS "rankScore" FLOAT;

-- Index for exploreFeed to sort by rankScore efficiently
CREATE INDEX IF NOT EXISTS idx_posts_rank_score
  ON posts ("rankScore" DESC NULLS LAST);

-- Combined index for the updated exploreFeed query
CREATE INDEX IF NOT EXISTS idx_posts_explore_ranked
  ON posts ("createdAt" DESC, "rankScore" DESC NULLS LAST, "likesCount" DESC);

-- P2 #6: Auto-cleanup policy for feed_score_logs
-- Create a scheduled function to delete logs older than 30 days
-- This can be called via pg_cron or the cleanupOldScoreLogs mutation
CREATE OR REPLACE FUNCTION cleanup_old_feed_score_logs(days_to_keep INT DEFAULT 30)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM feed_score_logs
  WHERE "createdAt" < NOW() - (days_to_keep || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- P2 #8: Index for reaction-weighted aggregation query
-- Ensure reaction column exists first
ALTER TABLE post_likes ADD COLUMN IF NOT EXISTS reaction VARCHAR(20) NOT NULL DEFAULT 'Like';
CREATE INDEX IF NOT EXISTS idx_post_likes_reaction
  ON post_likes ("postId", reaction);

-- P3 #13: Position-weighted engagement quality stored on post_views
ALTER TABLE post_views ADD COLUMN IF NOT EXISTS "engagementWeight" FLOAT;
