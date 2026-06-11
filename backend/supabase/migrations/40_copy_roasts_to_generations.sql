-- 40_copy_roasts_to_generations.sql
-- Copy existing published roasts from the legacy `roasts` table into
-- `roast_generations` so the landing page counter and recent-roasts marquee
-- can see historic data. Skips rows that already exist by id.

INSERT INTO public.roast_generations (
  id,
  "profileId",
  "projectUrl",
  "canonicalUrl",
  "projectName",
  title,
  "quickRoast",
  "fullRoast",
  "screenshotUrl",
  "faviconUrl",
  "ogImageUrl",
  language,
  "publishedRoastId",
  "publishedAt",
  "createdAt"
)
SELECT
  r.id,
  r."reviewerId",
  COALESCE(r."projectUrl", ''),
  COALESCE(r."projectUrl", ''),
  COALESCE(r."projectName", 'Unknown'),
  r."projectName" || ' Got Roasted',
  r."quickRoast",
  r."fullRoast",
  r."screenshotUrl",
  NULL,
  NULL,
  'taglish',
  r.id,
  r."createdAt",
  r."createdAt"
FROM public.roasts r
WHERE NOT EXISTS (
  SELECT 1 FROM public.roast_generations rg WHERE rg.id = r.id
);
