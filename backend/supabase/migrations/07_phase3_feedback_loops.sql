-- ============================================================
-- Phase 3: Feedback Loops & Online Learning
-- ============================================================
-- Adds:
-- 1. feed_score_logs   — full score breakdown per post per feed request
-- 2. feed_config       — externalized multiplier weights (tunable without deploys)
-- 3. feed_sessions     — session-level CTR + engagement tracking
-- 4. PostView enhancements: position, engaged, sessionId columns
-- 5. Profile.feedEngagementCount for interest embedding recomputation trigger
-- ============================================================

-- 1. FeedScoreLog — logs the full score breakdown for every ranked post
CREATE TABLE IF NOT EXISTS feed_score_logs (
  id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  "postId"             TEXT NOT NULL,
  "sessionId"          VARCHAR(60),
  "feedVariant"        VARCHAR(20) NOT NULL,
  position             INT NOT NULL DEFAULT 0,

  -- Score breakdown
  "finalScore"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "engagementScore"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "decayFactor"        DOUBLE PRECISION NOT NULL DEFAULT 1,
  "rankBoost"          DOUBLE PRECISION NOT NULL DEFAULT 1,
  "socialBoost"        DOUBLE PRECISION NOT NULL DEFAULT 1,
  "typeBoost"          DOUBLE PRECISION NOT NULL DEFAULT 1,
  "interestBoost"      DOUBLE PRECISION NOT NULL DEFAULT 1,
  "followingBoost"     DOUBLE PRECISION NOT NULL DEFAULT 1,
  "authorAffinityBoost" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "velocityBoost"      DOUBLE PRECISION NOT NULL DEFAULT 1,
  "semanticBoost"      DOUBLE PRECISION NOT NULL DEFAULT 1,
  "dwellBoost"         DOUBLE PRECISION NOT NULL DEFAULT 1,
  "notInterestedPenalty" DOUBLE PRECISION NOT NULL DEFAULT 1,

  -- Context signals for offline analysis
  "postType"           VARCHAR(20) NOT NULL DEFAULT 'post',
  "authorId"           UUID NOT NULL,
  "likesCount"         INT NOT NULL DEFAULT 0,
  "commentsCount"      INT NOT NULL DEFAULT 0,
  "sharesCount"        INT NOT NULL DEFAULT 0,

  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_score_logs_user_created
  ON feed_score_logs ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_feed_score_logs_session
  ON feed_score_logs ("sessionId");
CREATE INDEX IF NOT EXISTS idx_feed_score_logs_variant_created
  ON feed_score_logs ("feedVariant", "createdAt" DESC);

-- 2. FeedConfig — externalized multiplier weights
CREATE TABLE IF NOT EXISTS feed_config (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key         VARCHAR(100) UNIQUE NOT NULL,
  value       DOUBLE PRECISION NOT NULL,
  label       VARCHAR(200),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default values
INSERT INTO feed_config (key, value, label) VALUES
  ('engagementLikeWeight',      1.5,   'Weight for likes in engagement score'),
  ('engagementCommentWeight',   2.0,   'Weight for comments in engagement score'),
  ('engagementShareWeight',     3.0,   'Weight for shares in engagement score'),
  ('typeProjectMultiplier',     1.4,   'Boost multiplier for project posts'),
  ('typeRoastMultiplier',       1.3,   'Boost multiplier for roast posts'),
  ('typeEventMultiplier',       1.2,   'Boost multiplier for event posts'),
  ('typePostMultiplier',        1.0,   'Base multiplier for regular posts'),
  ('followingBoostValue',       1.5,   'Boost for posts from followed users'),
  ('notInterestedPenaltyValue', 0.05,  'Penalty multiplier for not-interested posts'),
  ('decayLambda',               0.029, 'Time decay constant (0.029 = ~24h half-life)'),
  ('lowCtrSemanticMultiplier',  1.5,   'Extra semantic boost when session CTR is low'),
  ('lowCtrThreshold',           0.10,  'CTR threshold below which semantic boost kicks in')
ON CONFLICT (key) DO NOTHING;

-- 3. FeedSession — session-level tracking
CREATE TABLE IF NOT EXISTS feed_sessions (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  "feedVariant"   VARCHAR(20) NOT NULL,
  "postsShown"    INT NOT NULL DEFAULT 0,
  "postsEngaged"  INT NOT NULL DEFAULT 0,
  "totalDwellMs"  INT NOT NULL DEFAULT 0,
  "avgDwellMs"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  ctr             DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_sessions_user_created
  ON feed_sessions ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_feed_sessions_variant_created
  ON feed_sessions ("feedVariant", "createdAt" DESC);

-- 4. PostView enhancements: add position, engaged, sessionId columns
ALTER TABLE post_views ADD COLUMN IF NOT EXISTS position INT;
ALTER TABLE post_views ADD COLUMN IF NOT EXISTS engaged BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE post_views ADD COLUMN IF NOT EXISTS "sessionId" VARCHAR(60);

CREATE INDEX IF NOT EXISTS idx_post_views_session
  ON post_views ("sessionId");

-- 5. Profile.feedEngagementCount for interest embedding recomputation trigger
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "feedEngagementCount" INT NOT NULL DEFAULT 0;

-- Auto-update updatedAt on feed_sessions
CREATE OR REPLACE FUNCTION update_feed_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  -- Also recompute avgDwellMs
  IF NEW."postsShown" > 0 THEN
    NEW."avgDwellMs" = NEW."totalDwellMs"::float / NEW."postsShown";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feed_session_updated_at ON feed_sessions;
CREATE TRIGGER trg_feed_session_updated_at
  BEFORE UPDATE ON feed_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_feed_session_updated_at();

-- Auto-deactivate old sessions (>30 min without update) via a cron or manual cleanup
-- For now, the application layer handles session lifecycle.

-- RLS policies for new tables
ALTER TABLE feed_score_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_sessions ENABLE ROW LEVEL SECURITY;

-- feed_score_logs: users can read their own logs, service role can write
CREATE POLICY "Users can read own score logs"
  ON feed_score_logs FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "Service role can insert score logs"
  ON feed_score_logs FOR INSERT
  WITH CHECK (true);

-- feed_config: everyone can read, only service role can write
CREATE POLICY "Anyone can read feed config"
  ON feed_config FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage feed config"
  ON feed_config FOR ALL
  USING (true);

-- feed_sessions: users can read their own sessions
CREATE POLICY "Users can read own sessions"
  ON feed_sessions FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "Service role can manage sessions"
  ON feed_sessions FOR ALL
  USING (true);
