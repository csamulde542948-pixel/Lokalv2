-- ============================================================
-- Migration 04: Feed Ranking Signals
-- Adds PostView and UserAuthorAffinity tables
-- for Phase 1 of the personalized feed recommendation system.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- PostView: records every meaningful dwell on a post
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.post_views (
  id         TEXT         NOT NULL DEFAULT gen_random_uuid()::TEXT,
  post_id    TEXT         NOT NULL,
  viewer_id  UUID         NOT NULL,
  dwell_ms   INTEGER      NOT NULL DEFAULT 0,
  source     VARCHAR(20)  NOT NULL DEFAULT 'feed',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT post_views_pkey PRIMARY KEY (id),
  CONSTRAINT post_views_post_fk
    FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
  CONSTRAINT post_views_viewer_fk
    FOREIGN KEY (viewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS post_views_viewer_idx
  ON public.post_views (viewer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS post_views_post_idx
  ON public.post_views (post_id);

-- ────────────────────────────────────────────────────────────
-- UserAuthorAffinity: tracks per-user interaction history
-- with each author (core social signal for ranking)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_author_affinities (
  id            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  user_id       UUID        NOT NULL,
  author_id     UUID        NOT NULL,
  like_count    INTEGER     NOT NULL DEFAULT 0,
  comment_count INTEGER     NOT NULL DEFAULT 0,
  share_count   INTEGER     NOT NULL DEFAULT 0,
  view_count    INTEGER     NOT NULL DEFAULT 0,
  -- Composite affinity score, recomputed on each update:
  -- score = like_count * 1.5 + comment_count * 3.0 + share_count * 5.0 + view_count * 0.2
  score         FLOAT       NOT NULL DEFAULT 0.0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_author_affinities_pkey PRIMARY KEY (id),
  CONSTRAINT user_author_affinities_unique UNIQUE (user_id, author_id),
  CONSTRAINT user_author_affinities_user_fk
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_author_affinities_author_fk
    FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_author_affinities_user_idx
  ON public.user_author_affinities (user_id, score DESC);

-- ────────────────────────────────────────────────────────────
-- RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- Users can insert their own views
CREATE POLICY "Users can insert own post views"
  ON public.post_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- Users can read their own views
CREATE POLICY "Users can read own post views"
  ON public.post_views FOR SELECT
  USING (auth.uid() = viewer_id);

-- Service role can do anything (for backend)
CREATE POLICY "Service role full access to post_views"
  ON public.post_views
  USING (auth.role() = 'service_role');


ALTER TABLE public.user_author_affinities ENABLE ROW LEVEL SECURITY;

-- Users can read their own affinities
CREATE POLICY "Users can read own author affinities"
  ON public.user_author_affinities FOR SELECT
  USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access to user_author_affinities"
  ON public.user_author_affinities
  USING (auth.role() = 'service_role');
