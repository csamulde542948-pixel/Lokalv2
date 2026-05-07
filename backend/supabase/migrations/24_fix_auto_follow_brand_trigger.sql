-- ============================================================
-- Migration 24: Fix auto_follow_brand_account trigger
-- ============================================================
-- Bug: The trg_profiles_auto_follow_brand trigger fires after every
-- new profile INSERT and attempts to INSERT a row into "follows"
-- referencing the Lokalhost brand account UUID. If that profile
-- does not exist in the "profiles" table, the FK constraint
-- "follows_followingId_fkey" is violated, causing the entire
-- signup transaction to fail with:
--   "Database error saving new user"
--
-- Fix: Make the auto-follow INSERT conditional — only proceed
-- if the brand profile actually exists in the profiles table.
-- This makes the trigger safe regardless of which environment
-- or DB the code runs against.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_follow_brand_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _brand_id UUID := 'b4fd7854-a85b-4011-9c04-ac10cfddc764';
BEGIN
  -- Skip if somehow the new profile IS the brand account
  IF NEW."id" = _brand_id THEN
    RETURN NEW;
  END IF;

  -- Only auto-follow if the brand profile actually exists
  -- (guards against FK violation on fresh/staging DBs)
  INSERT INTO public."follows" ("followerId", "followingId", "createdAt")
  SELECT NEW."id", _brand_id, now()
  WHERE EXISTS (
    SELECT 1 FROM public."profiles" WHERE "id" = _brand_id
  )
  ON CONFLICT ("followerId", "followingId") DO NOTHING;

  RETURN NEW;
END;
$$;
