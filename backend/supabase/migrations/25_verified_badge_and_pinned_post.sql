-- ============================================================
-- Migration 25: Verified badge + global pinned post
-- ============================================================
-- 1. Set isVerified = true for the hello@lokalhost.club account
-- 2. Add isPinnedToFeed column to posts table
-- 3. Enforce at most one pinned post at a time (partial unique index)
-- ============================================================

-- ── 1. Mark the Lokalhost brand account as verified ───────────────────────────
UPDATE public."profiles"
SET "isVerified" = true
WHERE "email" = 'hello@lokalhost.club';

-- ── 2. Add isPinnedToFeed to posts ────────────────────────────────────────────
ALTER TABLE public."posts"
  ADD COLUMN IF NOT EXISTS "isPinnedToFeed" BOOLEAN NOT NULL DEFAULT false;

-- ── 3. Only one post can be pinned at a time ─────────────────────────────────
-- Partial unique index: enforces uniqueness for rows where isPinnedToFeed = true
CREATE UNIQUE INDEX IF NOT EXISTS posts_single_pinned_idx
  ON public."posts" ("isPinnedToFeed")
  WHERE "isPinnedToFeed" = true;

-- ── 4. Index for fast lookup of the pinned post ──────────────────────────────
CREATE INDEX IF NOT EXISTS posts_pinned_feed_idx
  ON public."posts" ("isPinnedToFeed", "createdAt" DESC)
  WHERE "isPinnedToFeed" = true;
