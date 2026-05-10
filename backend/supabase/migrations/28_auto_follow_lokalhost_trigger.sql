-- ============================================================
-- Migration 28: Auto-follow Lokalhost account on signup
-- ============================================================
-- Every new profile row automatically follows the Lokalhost brand
-- account (hello@lokalhost.club) so new users see the official
-- feed from day one.
--
-- The brand account's UUID is resolved at runtime from the profiles
-- table via email, not hardcoded, so this works across all envs
-- (production, staging, local) as long as the brand profile exists.
--
-- Safe behaviour when brand profile doesn't exist (fresh DB, CI):
--   The INSERT ... WHERE EXISTS silently no-ops — signup proceeds.
-- ============================================================

-- ── Step 1: Replace the function (safe lookup by email) ──────────────────────

CREATE OR REPLACE FUNCTION public.auto_follow_brand_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _brand_id UUID;
BEGIN
  -- Resolve brand account UUID dynamically (handles any env)
  SELECT id INTO _brand_id
  FROM public."profiles"
  WHERE "email" = 'hello@lokalhost.club'
  LIMIT 1;

  -- Brand profile doesn't exist on this DB — skip silently
  IF _brand_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- New profile IS the brand account — don't self-follow
  IF NEW."id" = _brand_id THEN
    RETURN NEW;
  END IF;

  -- Auto-follow the brand account, ignore if already follows
  INSERT INTO public."follows" ("followerId", "followingId", "createdAt")
  VALUES (NEW."id", _brand_id, now())
  ON CONFLICT ("followerId", "followingId") DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── Step 2: Drop any stale version of the trigger and recreate ────────────────

DROP TRIGGER IF EXISTS trg_profiles_auto_follow_brand ON public."profiles";

CREATE TRIGGER trg_profiles_auto_follow_brand
  AFTER INSERT ON public."profiles"
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_follow_brand_account();
