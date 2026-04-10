-- Migration 13: Add project branding fields to launchpad_events
-- These store the project's name, icon, screenshot, and spot count
-- so they persist across server restarts (were previously virtual-only).

ALTER TABLE launchpad_events
  ADD COLUMN IF NOT EXISTS project_name   TEXT,
  ADD COLUMN IF NOT EXISTS icon_url       TEXT,
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS spots_total    INTEGER;
