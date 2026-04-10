-- ============================================================
-- Migration 15: Storage Buckets — avatars, covers, post-images
-- ============================================================
-- Creates the three public storage buckets needed for user
-- profile photos, cover photos, and post media uploads.
-- ============================================================

-- ─── 1. Create buckets ────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'avatars',
    'avatars',
    true,
    2097152,  -- 2 MB
    ARRAY['image/png','image/jpeg','image/gif','image/webp']
  ),
  (
    'covers',
    'covers',
    true,
    5242880,  -- 5 MB
    ARRAY['image/png','image/jpeg','image/gif','image/webp']
  ),
  (
    'post-images',
    'post-images',
    true,
    10485760,  -- 10 MB
    ARRAY['image/png','image/jpeg','image/gif','image/webp','video/mp4','video/webm']
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 2. RLS Policies — avatars ────────────────────────────────────────────────

-- Public read
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated upload (path must start with their own user ID)
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.filename(name) LIKE auth.uid()::text || '.%')
  );

-- Update own avatar
CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.filename(name) LIKE auth.uid()::text || '.%')
  );

-- Delete own avatar
CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.filename(name) LIKE auth.uid()::text || '.%')
  );

-- ─── 3. RLS Policies — covers ─────────────────────────────────────────────────

CREATE POLICY "Public read covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

CREATE POLICY "Users upload own cover"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'covers'
    AND auth.role() = 'authenticated'
    AND (storage.filename(name) LIKE auth.uid()::text || '.%')
  );

CREATE POLICY "Users update own cover"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'covers'
    AND auth.role() = 'authenticated'
    AND (storage.filename(name) LIKE auth.uid()::text || '.%')
  );

CREATE POLICY "Users delete own cover"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'covers'
    AND auth.role() = 'authenticated'
    AND (storage.filename(name) LIKE auth.uid()::text || '.%')
  );

-- ─── 4. RLS Policies — post-images ────────────────────────────────────────────

CREATE POLICY "Public read post-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Authenticated users upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users delete own post images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'posts'
  );
