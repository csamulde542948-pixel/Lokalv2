-- Store successful AI roast generations separately from published feed roasts.
-- A generation is created after the AI roast succeeds, even if the user never
-- publishes it to the community feed.

CREATE TABLE IF NOT EXISTS public.roast_generations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId" UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "projectUrl" TEXT NOT NULL,
  "canonicalUrl" TEXT NOT NULL,
  "projectName" VARCHAR(200) NOT NULL,
  title TEXT,
  "quickRoast" TEXT,
  "fullRoast" TEXT,
  "screenshotUrl" TEXT,
  "faviconUrl" TEXT,
  "ogImageUrl" TEXT,
  "publishedRoastId" TEXT,
  "publishedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roast_generations_created
  ON public.roast_generations ("createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_roast_generations_profile_created
  ON public.roast_generations ("profileId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_roast_generations_canonical_url
  ON public.roast_generations ("canonicalUrl");

ALTER TABLE public.roast_generations ENABLE ROW LEVEL SECURITY;
