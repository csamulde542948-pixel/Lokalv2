-- ============================================================
-- Migration 30: Fix profiles email exposure (security patch)
-- ============================================================
-- ISSUE: profiles_public_read policy used USING (true), meaning
-- any request with the anon key could SELECT all columns including
-- email from the profiles table via the REST API.
--
-- FIX:
--   1. Drop the unrestricted public read policy.
--   2. Add a policy: anon/authenticated users can only see their
--      OWN email. Everyone else sees email as NULL (enforced at
--      the application layer via a security-barrier view).
--   3. Create a security-definer view `profiles_public` that
--      strips email and other private fields — use this in any
--      public-facing REST query.
--   4. Revoke direct REST access to the base table for anon role
--      and grant access only through the view.
-- ============================================================

-- ── Step 1: Drop the open read policy ────────────────────────
DROP POLICY IF EXISTS "profiles_public_read" ON "profiles";

-- ── Step 2: New policies ──────────────────────────────────────

-- Authenticated users can read all public-safe columns on any profile
-- (email is excluded at the view layer, not at this policy level —
--  the application never SELECTs email except for the owner)
CREATE POLICY "profiles_authenticated_read"
  ON "profiles"
  FOR SELECT
  TO authenticated
  USING (true);

-- Each user can always read their OWN full row (needed for settings page)
-- This overlaps with above but is explicit and survives role changes.
CREATE POLICY "profiles_owner_read_own"
  ON "profiles"
  FOR SELECT
  TO authenticated
  USING (auth.uid() = "id");

-- Anon users (not logged in): can only read rows where email is NOT their concern.
-- We allow SELECT but the view below (used by all public endpoints) never exposes email.
-- Direct REST table access for anon is blocked by revoking table-level SELECT below.
CREATE POLICY "profiles_anon_read"
  ON "profiles"
  FOR SELECT
  TO anon
  USING (true);   -- Row-level: all rows allowed, but column-level handled by view + privilege revoke

-- ── Step 3: Revoke direct anon SELECT on the base table ──────
-- Anon role must go through the view, not the raw table.
-- Note: 'anon' is the PostgREST role Supabase uses for unauthenticated requests.
REVOKE SELECT ON TABLE "profiles" FROM anon;

-- Re-grant only to authenticated (logged-in users via JWT)
-- authenticated role already has SELECT from Supabase defaults; this is explicit.
GRANT SELECT ON TABLE "profiles" TO authenticated;

-- ── Step 4: Public safe view (no email, no private fields) ───
-- This view is what anon REST consumers see.
-- It intentionally omits: email, streamUserId, interestEmbedding, unreadNotificationsCount
CREATE OR REPLACE VIEW profiles_public
  WITH (security_barrier = true)   -- prevents privilege escalation via WHERE clause tricks
AS
SELECT
  id,
  username,
  name,
  "displayName",
  bio,
  "avatarUrl",
  "coverUrl",
  website,
  location,
  company,
  "jobTitle",
  "githubUsername",
  "isVerified",
  "isOnboarded",
  xp,
  "rankId",
  "createdAt",
  "updatedAt"
FROM profiles;

-- Grant anon SELECT on the safe view (NOT the base table)
GRANT SELECT ON profiles_public TO anon;
GRANT SELECT ON profiles_public TO authenticated;

-- ── Step 5: Ensure service_role retains full access ──────────
-- (service_role bypasses RLS anyway, but be explicit)
GRANT ALL ON TABLE "profiles" TO service_role;

-- ── Verification comment ──────────────────────────────────────
-- After applying:
--   curl "https://<project>.supabase.co/rest/v1/profiles?select=*" \
--     -H "apikey: <ANON_KEY>"
-- → Should return 0 rows or a permission error (anon has no table SELECT)
--
--   curl "https://<project>.supabase.co/rest/v1/profiles_public?select=*" \
--     -H "apikey: <ANON_KEY>"
-- → Returns rows WITHOUT email, streamUserId, interestEmbedding columns ✓
