-- Persist one optional video per feed post.
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

-- Keep storage limits aligned with the composer:
-- images: 4 per post, 5MB each in post-images
-- video: 1 per post, 25MB in post-videos
UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png','image/jpeg','image/gif','image/webp']
WHERE id = 'post-images';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-videos',
  'post-videos',
  true,
  26214400,
  ARRAY['video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read post-videos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload post videos" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own post videos" ON storage.objects;

CREATE POLICY "Public read post-videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-videos');

CREATE POLICY "Authenticated users upload post videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-videos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'posts'
  );

CREATE POLICY "Users delete own post videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-videos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'posts'
  );
