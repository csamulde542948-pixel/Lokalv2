-- 38_roast_generation_language.sql
-- Adds a `language` column to roast_generations so we can persist which
-- language the AI roast was generated in ("taglish" default, "english"
-- for non-PH users). Existing rows get the default "taglish" so the
-- historic Taglish feed is preserved.

ALTER TABLE public.roast_generations
  ADD COLUMN IF NOT EXISTS language VARCHAR(16) NOT NULL DEFAULT 'taglish';

CREATE INDEX IF NOT EXISTS roast_generations_language_idx
  ON public.roast_generations (language);
