-- ============================================================
-- Migration 12: Project Screenshots & Ownership Verification
-- ============================================================
-- Features:
--   1. screenshotUrl — auto-captured screenshot of the project website
--   2. screenshots[] — gallery of additional screenshots (user-uploaded)
--   3. Ownership verification columns (isVerified, verificationMethod, etc.)
--   4. Supabase Storage bucket for project assets
-- ============================================================

-- ─── 1. Screenshot columns ────────────────────────────────────────────────────

-- Auto-captured screenshot of the project's main URL
ALTER TABLE public."projects"
  ADD COLUMN IF NOT EXISTS "screenshotUrl" TEXT;

-- User-uploaded gallery screenshots (stored as TEXT[] of public URLs)
ALTER TABLE public."projects"
  ADD COLUMN IF NOT EXISTS "screenshots" TEXT[] DEFAULT '{}';

-- ─── 2. Ownership verification columns ───────────────────────────────────────

-- Whether the project owner has verified they own the project URL
ALTER TABLE public."projects"
  ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN DEFAULT false;

-- The method used to verify ownership: 'dns_txt', 'meta_tag', 'file', 'github_repo'
ALTER TABLE public."projects"
  ADD COLUMN IF NOT EXISTS "verificationMethod" VARCHAR(30);

-- Unique token generated for verification (e.g. "lokal-verify-abc123")
ALTER TABLE public."projects"
  ADD COLUMN IF NOT EXISTS "verificationToken" VARCHAR(100);

-- When the project was verified
ALTER TABLE public."projects"
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMPTZ;

-- ─── 3. Storage bucket for project assets ─────────────────────────────────────
-- NOTE: Run this manually in Supabase Dashboard → Storage → New Bucket:
--   Bucket name: project-assets
--   Public: true
--   File size limit: 10MB
--   Allowed MIME types: image/png, image/jpeg, image/webp, image/gif, image/svg+xml
--
-- Then add this RLS policy for uploads:
--   CREATE POLICY "Authenticated users can upload project assets"
--     ON storage.objects FOR INSERT
--     WITH CHECK (
--       bucket_id = 'project-assets'
--       AND auth.role() = 'authenticated'
--     );
--
--   CREATE POLICY "Public read access for project assets"
--     ON storage.objects FOR SELECT
--     USING (bucket_id = 'project-assets');
--
--   CREATE POLICY "Users can update their own project assets"
--     ON storage.objects FOR UPDATE
--     USING (
--       bucket_id = 'project-assets'
--       AND auth.uid()::text = (storage.foldername(name))[1]
--     );
--
--   CREATE POLICY "Users can delete their own project assets"
--     ON storage.objects FOR DELETE
--     USING (
--       bucket_id = 'project-assets'
--       AND auth.uid()::text = (storage.foldername(name))[1]
--     );

-- ─── 4. Index for verification lookups ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_projects_verification_token
  ON public."projects"("verificationToken")
  WHERE "verificationToken" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projects_verified
  ON public."projects"("isVerified")
  WHERE "isVerified" = true;
