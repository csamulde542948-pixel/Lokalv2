-- ============================================================
-- Migration 17: Leaderboard Tracking Tables
-- Adds ShippingStreak and WeeklyXpSnapshot for new boards
-- ============================================================

-- Tracks per-profile shipping streak (days of consecutive activity)
CREATE TABLE IF NOT EXISTS shipping_streaks (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  profile_id       UUID        NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak   INT         NOT NULL DEFAULT 0,
  longest_streak   INT         NOT NULL DEFAULT 0,
  last_shipped_at  TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipping_streaks_profile ON shipping_streaks(profile_id);
CREATE INDEX IF NOT EXISTS idx_shipping_streaks_current ON shipping_streaks(current_streak DESC);

-- Weekly XP snapshot for Underdog board calculation
CREATE TABLE IF NOT EXISTS weekly_xp_snapshots (
  id                  TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  profile_id          UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start          TIMESTAMPTZ NOT NULL, -- Monday 00:00 UTC
  xp_at_week_start    INT         NOT NULL DEFAULT 0,
  rank_at_week_start  INT         NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_xp_snapshots_profile ON weekly_xp_snapshots(profile_id);
CREATE INDEX IF NOT EXISTS idx_weekly_xp_snapshots_week   ON weekly_xp_snapshots(week_start DESC);

-- ── RLS Policies ─────────────────────────────────────────────────────────────

ALTER TABLE shipping_streaks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_xp_snapshots  ENABLE ROW LEVEL SECURITY;

-- Public read access (leaderboard is public)
CREATE POLICY "shipping_streaks_public_read"
  ON shipping_streaks FOR SELECT USING (true);

CREATE POLICY "weekly_xp_snapshots_public_read"
  ON weekly_xp_snapshots FOR SELECT USING (true);

-- Service role only for inserts/updates (backend handles writes)
CREATE POLICY "shipping_streaks_service_write"
  ON shipping_streaks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "weekly_xp_snapshots_service_write"
  ON weekly_xp_snapshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
