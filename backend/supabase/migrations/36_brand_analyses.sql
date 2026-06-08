-- Store successful Brand Analyzer generations separately from roast output.
-- This lets users revisit generated design.md files without regenerating AI work.

CREATE TABLE IF NOT EXISTS public.brand_analyses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId" UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "projectUrl" TEXT NOT NULL,
  "canonicalUrl" TEXT NOT NULL,
  "projectName" VARCHAR(200) NOT NULL,
  title TEXT NOT NULL,
  "designMd" TEXT NOT NULL,
  "screenshotUrl" TEXT,
  "faviconUrl" TEXT,
  "ogImageUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_analyses_created
  ON public.brand_analyses ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_brand_analyses_profile_created
  ON public.brand_analyses ("profileId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_brand_analyses_canonical_url
  ON public.brand_analyses ("canonicalUrl");

ALTER TABLE public.brand_analyses ENABLE ROW LEVEL SECURITY;
