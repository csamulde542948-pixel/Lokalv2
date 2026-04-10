-- ─────────────────────────────────────────────────────────────
-- Migration 14: Add social link columns to projects table
-- ─────────────────────────────────────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS "twitterUrl"  text,
  ADD COLUMN IF NOT EXISTS "linkedinUrl" text;
