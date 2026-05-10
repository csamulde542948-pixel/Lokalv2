-- Migration 29: Make roasts.projectId optional + add projectUrl/projectName/screenshotUrl
-- This allows roasts for external URLs (not registered projects) to be saved.

ALTER TABLE roasts
  ALTER COLUMN "projectId" DROP NOT NULL;

ALTER TABLE roasts
  ADD COLUMN IF NOT EXISTS "projectUrl"   TEXT,
  ADD COLUMN IF NOT EXISTS "projectName"  VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "screenshotUrl" TEXT;
