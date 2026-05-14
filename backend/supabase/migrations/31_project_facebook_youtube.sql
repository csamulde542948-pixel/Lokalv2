-- Add Facebook and YouTube social link columns to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS "facebookUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "youtubeUrl"  TEXT;
