-- ============================================================
-- Migration 16: Create project-assets storage bucket
-- ============================================================
-- The bucket is referenced by screenshot.service.ts and
-- projects.tsx but was never formally created (migration 12
-- left it as a commented-out manual step).
-- ============================================================

-- ─── 1. Create bucket ────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-assets',
  'project-assets',
  true,
  10485760,  -- 10 MB
  ARRAY[
    'image/png', 'image/jpeg', 'image/webp',
    'image/gif', 'image/svg+xml'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. RLS Policies ─────────────────────────────────────────────────────────

-- Drop first so re-running is idempotent
DROP POLICY IF EXISTS "Public read access for project assets"               ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload project assets"       ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own project assets"           ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own project assets"           ON storage.objects;

-- Anyone can view project screenshots / icons
CREATE POLICY "Public read access for project assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-assets');

-- Any authenticated user can upload (path is scoped to their userId by the app)
CREATE POLICY "Authenticated users can upload project assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-assets'
    AND auth.role() = 'authenticated'
  );

-- Users can only update files inside their own userId folder
CREATE POLICY "Users can update their own project assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'project-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can only delete files inside their own userId folder
CREATE POLICY "Users can delete their own project assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-assets'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
