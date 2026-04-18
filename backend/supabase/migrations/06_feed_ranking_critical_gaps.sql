-- Migration: Feed Ranking Critical Gap Fixes
-- Phase 2.5: Embeddings, dwell signals, A/B testing, helper function
-- =============================================

-- 1. Add feedVariant column to post_views for A/B testing
ALTER TABLE post_views
ADD COLUMN IF NOT EXISTS "feedVariant" VARCHAR(20);

-- 2. Create an index on feedVariant for A/B analysis queries
CREATE INDEX IF NOT EXISTS idx_post_views_feed_variant
ON post_views ("feedVariant")
WHERE "feedVariant" IS NOT NULL;

-- 3. Create helper function for fetching post embeddings (used by Edge Function)
CREATE OR REPLACE FUNCTION get_post_embeddings(post_ids TEXT[])
RETURNS TABLE(id TEXT, embedding extensions.vector(1536))
LANGUAGE sql STABLE
AS $$
  SELECT p.id::TEXT, p."contentEmbedding" AS embedding
  FROM posts p
  WHERE p.id = ANY(post_ids)
    AND p."contentEmbedding" IS NOT NULL;
$$;

-- 4. Create an index for cosine similarity searches (IVFFlat for pgvector)
-- Only create if there are enough rows; otherwise skip
-- This makes embedding-based ranking queries fast
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_posts_content_embedding_cosine'
  ) THEN
    -- IVFFlat index with cosine distance for content embeddings
    -- Lists=100 is good for up to ~100k posts; increase as data grows
    CREATE INDEX idx_posts_content_embedding_cosine
    ON posts USING ivfflat ("contentEmbedding" vector_cosine_ops)
    WITH (lists = 100);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If not enough rows for IVFFlat, create a basic HNSW index instead
  BEGIN
    CREATE INDEX IF NOT EXISTS idx_posts_content_embedding_hnsw
    ON posts USING hnsw ("contentEmbedding" vector_cosine_ops);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create embedding index — will use sequential scan.';
  END;
END
$$;

-- 5. Index for profile interest embeddings (for the cosine similarity join)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_interest_embedding'
  ) THEN
    CREATE INDEX idx_profiles_interest_embedding
    ON profiles USING hnsw ("interestEmbedding" vector_cosine_ops);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not create interest embedding index.';
END
$$;

-- 6. Composite index on post_views for efficient avg dwell aggregation
CREATE INDEX IF NOT EXISTS idx_post_views_postid_dwell
ON post_views (post_id, dwell_ms);

-- 7. Index on user_tag_affinities for recency-aware decay queries
CREATE INDEX IF NOT EXISTS idx_user_tag_affinities_updated
ON user_tag_affinities ("profileId", "updatedAt" DESC);
