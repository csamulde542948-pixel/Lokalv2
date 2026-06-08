-- ============================================================
-- Phase 0: Foundation fixes for the feed personalization engine
-- ============================================================
-- Adds:
--   1. POST_MODAL_OPEN enum value  (highest-intent engagement signal)
--   2. Per-user dwell aggregation table for the feed resolver
--   3. New feed_signal fields on FeedScoreLog for offline analysis
--   4. Indexes for retention cron and session deactivation
-- ============================================================

-- 1. Add POST_MODAL_OPEN to the InteractionType enum
--    Postgres enums are append-only: ALTER TYPE ... ADD VALUE.
ALTER TYPE "InteractionType" ADD VALUE IF NOT EXISTS 'POST_MODAL_OPEN';

-- 2. Per-user feed dwell aggregation
--    Lives next to feed_score_logs (a "session" is a feed request, an
--    "impression" is a single post the user saw). Aggregated per user so
--    the feed resolver can fetch "the user's own dwell on this post" in
--    a single indexed query.
CREATE TABLE IF NOT EXISTS user_post_impressions (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  "postId"     TEXT NOT NULL,
  "sessionId"  VARCHAR(60),
  "dwellMs"    INT NOT NULL DEFAULT 0,
  "engaged"    BOOLEAN NOT NULL DEFAULT false,
  "position"   INT,
  "source"     VARCHAR(20) NOT NULL DEFAULT 'feed',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_post_impressions_user_post
  ON user_post_impressions ("userId", "postId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_user_post_impressions_session
  ON user_post_impressions ("sessionId");
-- For the feed resolver's "latest impression per (user, post)" lookup
CREATE INDEX IF NOT EXISTS idx_user_post_impressions_user_created
  ON user_post_impressions ("userId", "createdAt" DESC);

-- 3. New FeedScoreLog fields for the Phase-0 signals we are now capturing.
--    Two new fields: ownDwellMs (the user's own dwell on this post in the
--    current feed request), and modalOpensRecent (count of POST_MODAL_OPEN
--    events for this post in the last 24h, scaled 0..1).
ALTER TABLE feed_score_logs
  ADD COLUMN IF NOT EXISTS "ownDwellMs"      INT NOT NULL DEFAULT 0;
ALTER TABLE feed_score_logs
  ADD COLUMN IF NOT EXISTS "ownDwellScore"   DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE feed_score_logs
  ADD COLUMN IF NOT EXISTS "modalOpenScore"   DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE feed_score_logs
  ADD COLUMN IF NOT EXISTS "commentQualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 4. Comment quality signal — per-post count of root comments, computed by
--    a daily refresh. Lives next to the post so the feed resolver can
--    include it in the candidate fetch with a single JOIN.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS "commentQualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 5. Session deactivation support: a background job (scheduled via cron
--    or pg_cron) marks sessions inactive after 30 minutes of no updates.
--    The 30-minute window matches the soft check at the resolver layer.
CREATE INDEX IF NOT EXISTS idx_feed_sessions_active_updated
  ON feed_sessions ("isActive", "updatedAt")
  WHERE "isActive" = true;

-- 6. FeedScoreLog retention: an index on createdAt to make the daily
--    DELETE WHERE createdAt < now() - INTERVAL '90 days' fast.
CREATE INDEX IF NOT EXISTS idx_feed_score_logs_created_at
  ON feed_score_logs ("createdAt");

-- 7. user_post_impressions retention (same 90 days as feed_score_logs)
CREATE INDEX IF NOT EXISTS idx_user_post_impressions_created_at
  ON user_post_impressions ("createdAt");

-- 8. Optional pg_cron jobs — only created if the extension is available.
--    If the deploy target does not have pg_cron, run the same logic from
--    the Node side via a scheduled endpoint.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Deactivate sessions that haven't been updated in 30 minutes
    PERFORM cron.schedule(
      'deactivate-stale-feed-sessions',
      '*/10 * * * *',  -- every 10 minutes
      $cron$UPDATE feed_sessions SET "isActive" = false WHERE "isActive" = true AND "updatedAt" < now() - INTERVAL '30 minutes'$cron$
    );

    -- Purge FeedScoreLog and user_post_impressions rows older than 90 days
    PERFORM cron.schedule(
      'purge-old-feed-logs',
      '0 3 * * *',  -- daily at 3am
      $cron$DELETE FROM feed_score_logs WHERE "createdAt" < now() - INTERVAL '90 days'; DELETE FROM user_post_impressions WHERE "createdAt" < now() - INTERVAL '90 days'$cron$
    );
  END IF;
END $$;
