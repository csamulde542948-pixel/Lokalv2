-- ============================================================
-- Migration 11: Rename demoUrl → projectUrl on projects table
-- ============================================================

ALTER TABLE public."projects"
  RENAME COLUMN "demoUrl" TO "projectUrl";
