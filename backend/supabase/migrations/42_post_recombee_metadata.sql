-- Post intelligence metadata for Recombee item sync.
-- Defaults keep existing posts immediately eligible for recommendation.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS "bookmarksCount" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "viewsCount" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "postType" varchar(40) NOT NULL DEFAULT 'post',
  ADD COLUMN IF NOT EXISTS "topicTags" text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "intentTags" text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "language" varchar(16) NOT NULL DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS "lastActivityAt" timestamp without time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "hasLink" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "linkDomain" varchar(120),
  ADD COLUMN IF NOT EXISTS "engagementScore" double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "qualityScore" double precision NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "visibility" varchar(20) NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS "isDeleted" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moderationStatus" varchar(20) NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS "isSensitive" boolean NOT NULL DEFAULT false;

UPDATE public.posts
SET
  "lastActivityAt" = GREATEST(
    COALESCE("updatedAt", "createdAt"),
    "createdAt"
  ),
  "hasLink" = content ~* 'https?://',
  "linkDomain" = lower(substring(content from 'https?://(?:www\.)?([^/\s\)\]]+)')),
  "engagementScore" =
    ("likesCount"::double precision * 1.0)
    + ("roastReactionCount"::double precision * 1.5)
    + ("commentsCount"::double precision * 2.0)
    + ("sharesCount"::double precision * 3.0)
WHERE "lastActivityAt" IS NULL
   OR "engagementScore" = 0
   OR "hasLink" = false;

UPDATE public.posts p
SET
  "topicTags" = COALESCE(tags.names, '{}'),
  "postType" = CASE
    WHEN COALESCE(tags.names, '{}') && ARRAY['roast']::text[] THEN 'roast'
    WHEN p."projectId" IS NOT NULL OR p."projectName" IS NOT NULL THEN 'launch'
    WHEN p.content LIKE '%?%' THEN 'question'
    WHEN p.content ~* 'https?://' THEN 'resource'
    ELSE 'post'
  END
FROM (
  SELECT pt."postId", array_agg(lower(t.name)) AS names
  FROM public.post_tags pt
  JOIN public.tags t ON t.id = pt."tagId"
  GROUP BY pt."postId"
) tags
WHERE tags."postId" = p.id;

CREATE INDEX IF NOT EXISTS posts_recombee_feed_idx
  ON public.posts ("visibility", "moderationStatus", "isDeleted", "lastActivityAt" DESC);

CREATE INDEX IF NOT EXISTS posts_post_type_idx
  ON public.posts ("postType");
