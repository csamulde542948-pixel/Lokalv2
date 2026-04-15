-- Migration 17: Roast system — remove scoring, add quickRoast/fullRoast columns
-- Removes: overallScore, designScore, codeScore, innovationScore, usabilityScore,
--           strengths (array), improvements (array)
-- Adds:    quickRoast (text), fullRoast (text)
-- detailedFeedback column is kept as a legacy alias (was used for fullRoast content)

ALTER TABLE roasts
  ADD COLUMN IF NOT EXISTS "quickRoast"  TEXT,
  ADD COLUMN IF NOT EXISTS "fullRoast"   TEXT;

-- Migrate any existing detailedFeedback → fullRoast
UPDATE roasts
SET "fullRoast" = "detailedFeedback"
WHERE "detailedFeedback" IS NOT NULL AND "fullRoast" IS NULL;

-- Drop the score and structured-list columns
ALTER TABLE roasts
  DROP COLUMN IF EXISTS "overallScore",
  DROP COLUMN IF EXISTS "designScore",
  DROP COLUMN IF EXISTS "codeScore",
  DROP COLUMN IF EXISTS "innovationScore",
  DROP COLUMN IF EXISTS "usabilityScore",
  DROP COLUMN IF EXISTS strengths,
  DROP COLUMN IF EXISTS improvements;
