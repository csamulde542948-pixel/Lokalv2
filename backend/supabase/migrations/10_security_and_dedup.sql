-- ============================================================
-- Migration 10: Account Deduplication, Login Guardrails & Security
-- ============================================================
-- Features:
--   1. Account linking / deduplication (same email, multiple providers)
--   2. Login attempt tracking & brute-force lockout
--   3. Security audit log
--   4. Tightened RLS policies
--   5. Updated handle_new_user trigger with account-link detection
-- ============================================================

-- ─── 1. Account Links (deduplication) ─────────────────────────────────────────
-- Tracks which auth providers are linked to each profile (by email).
-- Used to detect "You signed up with Google, try logging in with Google" scenarios.

CREATE TABLE IF NOT EXISTS public."account_links" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId"   UUID NOT NULL REFERENCES public."profiles"("id") ON DELETE CASCADE,
  "provider"    VARCHAR(50) NOT NULL,      -- 'email', 'google', 'github', 'web3'
  "providerAccountId" TEXT NOT NULL,       -- Supabase auth.users.id for this provider identity
  "email"       VARCHAR(255),              -- email associated with this provider
  "createdAt"   TIMESTAMPTZ DEFAULT now(),
  UNIQUE("profileId", "provider")
);

CREATE INDEX IF NOT EXISTS idx_account_links_email ON public."account_links"("email");
CREATE INDEX IF NOT EXISTS idx_account_links_profile ON public."account_links"("profileId");

-- RLS: Users can only read their own account links
ALTER TABLE public."account_links" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "account_links_own_read"
  ON public."account_links" FOR SELECT
  USING (auth.uid() = "profileId");

-- Only the trigger/service role can insert (SECURITY DEFINER functions bypass RLS)
CREATE POLICY "account_links_service_insert"
  ON public."account_links" FOR INSERT
  WITH CHECK (false); -- blocked for regular users; trigger uses SECURITY DEFINER

-- ─── 2. Login Attempts (brute-force protection) ──────────────────────────────

CREATE TABLE IF NOT EXISTS public."login_attempts" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email"       VARCHAR(255),
  "ipAddress"   INET,
  "userAgent"   TEXT,
  "success"     BOOLEAN NOT NULL DEFAULT false,
  "failReason"  VARCHAR(100),              -- 'invalid_password', 'account_not_found', 'account_locked', 'rate_limited'
  "provider"    VARCHAR(50) DEFAULT 'email', -- 'email', 'google', 'github'
  "createdAt"   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public."login_attempts"("email", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON public."login_attempts"("ipAddress", "createdAt" DESC);

-- RLS: No direct access from client — only server-side
ALTER TABLE public."login_attempts" ENABLE ROW LEVEL SECURITY;

-- ─── 3. Security Audit Log ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public."security_events" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId"   UUID REFERENCES public."profiles"("id") ON DELETE SET NULL,
  "eventType"   VARCHAR(100) NOT NULL,     -- 'login', 'logout', 'signup', 'password_change', 'password_reset', 'account_link', 'suspicious_activity', 'account_locked', 'profile_update'
  "provider"    VARCHAR(50),               -- which auth provider was used
  "ipAddress"   INET,
  "userAgent"   TEXT,
  "metadata"    JSONB DEFAULT '{}',        -- extra data (e.g. { "reason": "too_many_attempts" })
  "createdAt"   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_events_profile ON public."security_events"("profileId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public."security_events"("eventType", "createdAt" DESC);

-- RLS: Users can read their own security events
ALTER TABLE public."security_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_events_own_read"
  ON public."security_events" FOR SELECT
  USING (auth.uid() = "profileId");

-- ─── 4. Account lockout support on profiles ──────────────────────────────────

ALTER TABLE public."profiles" ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN DEFAULT false;
ALTER TABLE public."profiles" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMPTZ;
ALTER TABLE public."profiles" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INT DEFAULT 0;
ALTER TABLE public."profiles" ADD COLUMN IF NOT EXISTS "lastFailedLoginAt" TIMESTAMPTZ;

-- ─── 5. Helper: Check if account is locked ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_account_locked(_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _locked BOOLEAN;
  _locked_until TIMESTAMPTZ;
BEGIN
  SELECT "isLocked", "lockedUntil"
  INTO _locked, _locked_until
  FROM public."profiles"
  WHERE "email" = _email
  LIMIT 1;

  IF _locked IS NULL THEN
    RETURN false; -- account not found = not locked
  END IF;

  -- Auto-unlock if lockout period has passed (30 min)
  IF _locked AND _locked_until IS NOT NULL AND _locked_until < now() THEN
    UPDATE public."profiles"
    SET "isLocked" = false,
        "lockedUntil" = NULL,
        "failedLoginAttempts" = 0,
        "updatedAt" = now()
    WHERE "email" = _email;
    RETURN false;
  END IF;

  RETURN COALESCE(_locked, false);
END;
$$;

-- ─── 6. Helper: Record failed login & maybe lock account ─────────────────────

CREATE OR REPLACE FUNCTION public.record_failed_login(_email TEXT, _ip INET DEFAULT NULL, _reason TEXT DEFAULT 'invalid_password')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _attempts INT;
  _is_locked BOOLEAN := false;
  _profile_id UUID;
  MAX_ATTEMPTS CONSTANT INT := 5;
  LOCKOUT_MINUTES CONSTANT INT := 30;
BEGIN
  -- Record the attempt
  INSERT INTO public."login_attempts" ("email", "ipAddress", "success", "failReason")
  VALUES (_email, _ip, false, _reason);

  -- Increment failed attempts on profile
  UPDATE public."profiles"
  SET "failedLoginAttempts" = "failedLoginAttempts" + 1,
      "lastFailedLoginAt" = now(),
      "updatedAt" = now()
  WHERE "email" = _email
  RETURNING "id", "failedLoginAttempts" INTO _profile_id, _attempts;

  -- Lock account if too many attempts
  IF _attempts >= MAX_ATTEMPTS THEN
    UPDATE public."profiles"
    SET "isLocked" = true,
        "lockedUntil" = now() + (LOCKOUT_MINUTES || ' minutes')::INTERVAL,
        "updatedAt" = now()
    WHERE "id" = _profile_id;
    _is_locked := true;

    -- Log security event
    INSERT INTO public."security_events" ("profileId", "eventType", "ipAddress", "metadata")
    VALUES (_profile_id, 'account_locked', _ip, jsonb_build_object(
      'reason', 'too_many_failed_attempts',
      'attempts', _attempts,
      'lockout_minutes', LOCKOUT_MINUTES
    ));
  END IF;

  RETURN jsonb_build_object(
    'attempts', COALESCE(_attempts, 0),
    'maxAttempts', MAX_ATTEMPTS,
    'isLocked', _is_locked,
    'lockoutMinutes', LOCKOUT_MINUTES
  );
END;
$$;

-- ─── 7. Helper: Record successful login (resets counters) ────────────────────

CREATE OR REPLACE FUNCTION public.record_successful_login(_email TEXT, _ip INET DEFAULT NULL, _provider TEXT DEFAULT 'email')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile_id UUID;
BEGIN
  -- Reset failed attempts
  UPDATE public."profiles"
  SET "failedLoginAttempts" = 0,
      "isLocked" = false,
      "lockedUntil" = NULL,
      "updatedAt" = now()
  WHERE "email" = _email
  RETURNING "id" INTO _profile_id;

  -- Record successful attempt
  INSERT INTO public."login_attempts" ("email", "ipAddress", "success", "provider")
  VALUES (_email, _ip, true, _provider);

  -- Log security event
  IF _profile_id IS NOT NULL THEN
    INSERT INTO public."security_events" ("profileId", "eventType", "provider", "ipAddress")
    VALUES (_profile_id, 'login', _provider, _ip);
  END IF;
END;
$$;

-- ─── 8. Helper: Get linked providers for an email ────────────────────────────

CREATE OR REPLACE FUNCTION public.get_linked_providers(_email TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _providers TEXT[];
BEGIN
  SELECT array_agg(DISTINCT "provider")
  INTO _providers
  FROM public."account_links"
  WHERE "email" = _email;

  RETURN COALESCE(_providers, ARRAY[]::TEXT[]);
END;
$$;

-- ─── 9. Updated handle_new_user trigger ──────────────────────────────────────
-- Now also:
--   a) Creates an account_link row for the provider used
--   b) Auto-links to existing profile if same email exists (deduplication)
--   c) Logs a security event for signup

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
  SELECT "id" INTO _existing_id
  FROM public."profiles"
  WHERE "email" = _email AND "id" != NEW.id
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    -- Same email already exists under a different auth user.
    -- Link this new auth identity to the EXISTING profile.
    -- We'll still create the account_link entry below.
    -- Note: Supabase handles the auth.users merge via "automatic linking"
    -- if configured, but we track it on our side too.

    INSERT INTO public."account_links" ("profileId", "provider", "providerAccountId", "email")
    VALUES (_existing_id, _provider, NEW.id::text, _email)
    ON CONFLICT ("profileId", "provider") DO UPDATE SET
      "providerAccountId" = EXCLUDED."providerAccountId",
      "email" = EXCLUDED."email";

    -- Update the existing profile with any new data from this provider
    UPDATE public."profiles"
    SET "avatarUrl"       = COALESCE("avatarUrl", _avatar_url),
        "githubUsername"  = COALESCE("githubUsername", _github_username),
        "updatedAt"       = now()
    WHERE "id" = _existing_id;

    -- Log the linking event
    INSERT INTO public."security_events" ("profileId", "eventType", "provider", "metadata")
    VALUES (_existing_id, 'account_link', _provider, jsonb_build_object(
      'linked_auth_id', NEW.id::text,
      'method', 'auto_email_match'
    ));

    RETURN NEW;
  END IF;

  -- ── No existing profile — create new one ───────────────────────────────────

  -- ── Derive username ────────────────────────────────────────────────────────
  _username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    _github_username,
    split_part(NEW.email, '@', 1)
  );
  _username := lower(regexp_replace(_username, '[^a-zA-Z0-9_]', '_', 'g'));

  IF EXISTS (SELECT 1 FROM public."profiles" WHERE "username" = _username) THEN
    _username := _username || '_' || substr(NEW.id::text, 1, 6);
  END IF;

  -- ── Derive display name ───────────────────────────────────────────────────
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
    "avatarUrl"       = COALESCE(EXCLUDED."avatarUrl", profiles."avatarUrl"),
    "githubUsername"   = COALESCE(EXCLUDED."githubUsername", profiles."githubUsername"),
    "updatedAt"       = now();

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

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 10. Auto-cleanup old login attempts (> 90 days) ─────────────────────────

CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts(days_to_keep INT DEFAULT 90)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM public."login_attempts"
  WHERE "createdAt" < NOW() - (days_to_keep || ' days')::INTERVAL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ─── 11. RLS hardening: Ensure profiles can only be updated by owner ─────────

-- Drop any overly-permissive update policy first
DO $$
BEGIN
  DROP POLICY IF EXISTS "profiles_update_own" ON public."profiles";
EXCEPTION WHEN undefined_object THEN NULL;
END$$;

CREATE POLICY "profiles_update_own"
  ON public."profiles" FOR UPDATE
  USING (auth.uid() = "id")
  WITH CHECK (auth.uid() = "id");

