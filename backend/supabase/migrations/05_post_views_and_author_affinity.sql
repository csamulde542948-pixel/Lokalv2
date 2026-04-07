-- ============================================================
-- 05: Post Views + User Author Affinity tables
-- Phase 1 of Facebook-style personalized feed ranking
-- ============================================================

-- Tracks every post view with dwell time (most important ranking signal)
CREATE TABLE IF NOT EXISTS post_views (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id    TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  viewer_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dwell_ms   INTEGER NOT NULL DEFAULT 0,
  source     VARCHAR(30) NOT NULL DEFAULT 'feed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_views_viewer_created ON post_views (viewer_id, created_at DESC);
CREATE INDEX idx_post_views_post ON post_views (post_id);

-- Per-user affinity score for each author (interaction history between user pairs)
CREATE TABLE IF NOT EXISTS user_author_affinities (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  like_count    INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  share_count   INTEGER NOT NULL DEFAULT 0,
  view_count    INTEGER NOT NULL DEFAULT 0,
  score         DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, author_id)
);

CREATE INDEX idx_user_author_aff_user_score ON user_author_affinities (user_id, score DESC);

-- RLS policies
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_author_affinities ENABLE ROW LEVEL SECURITY;

-- Users can read their own views
CREATE POLICY "Users can read own post views"
  ON post_views FOR SELECT
  USING (viewer_id = auth.uid());

-- Service role can insert/update
CREATE POLICY "Service can manage post views"
  ON post_views FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can read their own affinities
CREATE POLICY "Users can read own author affinities"
  ON user_author_affinities FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service can manage author affinities"
  ON user_author_affinities FOR ALL
  USING (true)
  WITH CHECK (true);
