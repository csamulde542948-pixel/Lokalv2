-- ============================================================
-- Migration 23: Fix handle_new_user trigger — NULL username/name crash
-- ============================================================
-- Bug: When a user signs up via an OAuth provider that doesn't share
-- their email (Apple, Twitter/X, etc.), NEW.email is NULL.
-- The trigger derived _username from split_part(NULL, '@', 1) which
-- returns NULL in PostgreSQL, then tried to INSERT NULL into
-- profiles.username which is NOT NULL — crashing the trigger and
-- producing "Database error saving new user" for those users.
--
-- Fix:
--   1. UUID-based fallback username when all sources are NULL
--   2. Guard the email deduplication check with IS NOT NULL
--   3. Ensure _name also falls back correctly
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _username        TEXT;
  _name            TEXT;
  _email           TEXT;
  _avatar_url      TEXT;
  _github_username TEXT;
  _provider        TEXT;
  _existing_id     UUID;
BEGIN
  _email    := NEW.email;
  _provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  -- ── Derive avatar URL ──────────────────────────────────────────────────────
  _avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  -- ── Derive GitHub username ─────────────────────────────────────────────────
  IF _provider = 'github' THEN
    _github_username := COALESCE(
      NEW.raw_user_meta_data->>'user_name',
      NEW.raw_user_meta_data->>'preferred_username'
    );
  END IF;

  -- ── Check for existing profile with same email (account deduplication) ─────
  -- Guard: only query by email if email is NOT NULL; equality with NULL is
  -- always false/unknown in SQL and would miss matches.
  IF _email IS NOT NULL THEN
    SELECT "id" INTO _existing_id
    FROM public."profiles"
    WHERE "email" = _email AND "id" != NEW.id
    LIMIT 1;
  END IF;

  IF _existing_id IS NOT NULL THEN
    -- Same email already exists under a different auth user.
    -- Link this new auth identity to the EXISTING profile.
    INSERT INTO public."account_links" ("profileId", "provider", "providerAccountId", "email")
    VALUES (_existing_id, _provider, NEW.id::text, _email)
    ON CONFLICT ("profileId", "provider") DO UPDATE SET
      "providerAccountId" = EXCLUDED."providerAccountId",
      "email" = EXCLUDED."email";

    UPDATE public."profiles"
    SET "avatarUrl"       = COALESCE("avatarUrl", _avatar_url),
        "githubUsername"  = COALESCE("githubUsername", _github_username),
        "updatedAt"       = now()
    WHERE "id" = _existing_id;

    INSERT INTO public."security_events" ("profileId", "eventType", "provider", "metadata")
    VALUES (_existing_id, 'account_link', _provider, jsonb_build_object(
      'linked_auth_id', NEW.id::text,
      'method', 'auto_email_match'
    ));

    RETURN NEW;
  END IF;

  -- ── No existing profile — create new one ──────────────────────────────────

  -- ── Derive username ────────────────────────────────────────────────────────
  -- Priority: explicit username → GitHub → email prefix → UUID fallback
  -- FIX: added UUID fallback so username is NEVER NULL (e.g. Apple Sign In
  -- or any OAuth provider that hides the user's email address).
  _username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    _github_username,
    CASE WHEN _email IS NOT NULL THEN split_part(_email, '@', 1) ELSE NULL END,
    'user_' || substr(replace(NEW.id::text, '-', ''), 1, 10)  -- guaranteed non-NULL
  );
  _username := lower(regexp_replace(_username, '[^a-zA-Z0-9_]', '_', 'g'));

  -- Ensure uniqueness — append UUID segment if already taken
  IF EXISTS (SELECT 1 FROM public."profiles" WHERE "username" = _username) THEN
    _username := _username || '_' || substr(replace(NEW.id::text, '-', ''), 1, 6);
  END IF;

  -- ── Derive display name ───────────────────────────────────────────────────
  -- FIX: fallback chain now always terminates at _username (which is non-NULL)
  _name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    _github_username,
    _username
  );

  INSERT INTO public."profiles" (
    "id", "username", "name", "displayName", "email",
    "avatarUrl", "githubUsername",
    "rankId", "xp", "isOnboarded",
    "failedLoginAttempts", "isLocked",
    "createdAt", "updatedAt"
  ) VALUES (
    NEW.id, _username, _name, _name, _email,
    _avatar_url, _github_username,
    1, 0, false,
    0, false,
    now(), now()
  )
  ON CONFLICT ("id") DO UPDATE SET
    "avatarUrl"     = COALESCE(EXCLUDED."avatarUrl", profiles."avatarUrl"),
    "githubUsername" = COALESCE(EXCLUDED."githubUsername", profiles."githubUsername"),
    "updatedAt"     = now();

  -- ── Create account_link for this provider ─────────────────────────────────
  INSERT INTO public."account_links" ("profileId", "provider", "providerAccountId", "email")
  VALUES (NEW.id, _provider, NEW.id::text, _email)
  ON CONFLICT ("profileId", "provider") DO NOTHING;

  -- ── Log signup security event ─────────────────────────────────────────────
  INSERT INTO public."security_events" ("profileId", "eventType", "provider", "metadata")
  VALUES (NEW.id, 'signup', _provider, jsonb_build_object(
    'email', _email,
    'username', _username
  ));

  RETURN NEW;
END;
$$;
