-- ============================================================
-- Lokal v2 — RLS Policies + Auth Trigger
-- ============================================================

-- ─── Enable RLS on all public tables ─────────────────────────────────────────

ALTER TABLE "profiles"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "xp_logs"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "follows"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "posts"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "post_likes"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "post_comments"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "post_tags"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_tags"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_likes"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_stars"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_members"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roasts"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jobs"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_tags"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_applications"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saved_jobs"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_tags"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "event_registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "launchpad_events"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "launchpad_tags"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "launchpad_interests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_interactions"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_tag_affinities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profile_photos"      ENABLE ROW LEVEL SECURITY;

-- Lookup tables are public read — no auth needed
ALTER TABLE "ranks"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "xp_activities"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roles"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tags"                ENABLE ROW LEVEL SECURITY;

-- ─── Lookup table policies (public read) ─────────────────────────────────────

CREATE POLICY "ranks_public_read"        ON "ranks"          FOR SELECT USING (true);
CREATE POLICY "xp_activities_public_read" ON "xp_activities" FOR SELECT USING (true);
CREATE POLICY "roles_public_read"        ON "roles"          FOR SELECT USING (true);
CREATE POLICY "tags_public_read"         ON "tags"           FOR SELECT USING (true);
CREATE POLICY "tags_auth_insert"         ON "tags"           FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ─── Profiles ─────────────────────────────────────────────────────────────────

-- Anyone can read public profiles
CREATE POLICY "profiles_public_read"
  ON "profiles" FOR SELECT USING (true);

-- Only the owner can update their own profile
CREATE POLICY "profiles_owner_update"
  ON "profiles" FOR UPDATE USING (auth.uid() = "id");

-- Service role handles inserts (via trigger)
CREATE POLICY "profiles_service_insert"
  ON "profiles" FOR INSERT WITH CHECK (auth.uid() = "id");

-- ─── Posts ────────────────────────────────────────────────────────────────────

-- All authenticated users can read public posts
CREATE POLICY "posts_public_read"
  ON "posts" FOR SELECT USING (true);

CREATE POLICY "posts_auth_insert"
  ON "posts" FOR INSERT WITH CHECK (auth.uid() = "authorId");

CREATE POLICY "posts_owner_update"
  ON "posts" FOR UPDATE USING (auth.uid() = "authorId");

CREATE POLICY "posts_owner_delete"
  ON "posts" FOR DELETE USING (auth.uid() = "authorId");

-- ─── Post Likes ───────────────────────────────────────────────────────────────

CREATE POLICY "post_likes_public_read"
  ON "post_likes" FOR SELECT USING (true);

CREATE POLICY "post_likes_auth_insert"
  ON "post_likes" FOR INSERT WITH CHECK (auth.uid() = "profileId");

CREATE POLICY "post_likes_owner_delete"
  ON "post_likes" FOR DELETE USING (auth.uid() = "profileId");

-- ─── Post Comments ────────────────────────────────────────────────────────────

CREATE POLICY "post_comments_public_read"
  ON "post_comments" FOR SELECT USING (true);

CREATE POLICY "post_comments_auth_insert"
  ON "post_comments" FOR INSERT WITH CHECK (auth.uid() = "authorId");

CREATE POLICY "post_comments_owner_update"
  ON "post_comments" FOR UPDATE USING (auth.uid() = "authorId");

CREATE POLICY "post_comments_owner_delete"
  ON "post_comments" FOR DELETE USING (auth.uid() = "authorId");

-- ─── Post Tags ────────────────────────────────────────────────────────────────

CREATE POLICY "post_tags_public_read"
  ON "post_tags" FOR SELECT USING (true);

CREATE POLICY "post_tags_auth_manage"
  ON "post_tags" FOR ALL USING (
    EXISTS (SELECT 1 FROM "posts" WHERE "posts"."id" = "postId" AND "posts"."authorId" = auth.uid())
  );

-- ─── Projects ─────────────────────────────────────────────────────────────────

-- Public projects are readable by all; private only by owner
CREATE POLICY "projects_public_read"
  ON "projects" FOR SELECT
  USING ("visibility" = 'PUBLIC' OR auth.uid() = "authorId");

CREATE POLICY "projects_auth_insert"
  ON "projects" FOR INSERT WITH CHECK (auth.uid() = "authorId");

CREATE POLICY "projects_owner_update"
  ON "projects" FOR UPDATE USING (auth.uid() = "authorId");

CREATE POLICY "projects_owner_delete"
  ON "projects" FOR DELETE USING (auth.uid() = "authorId");

-- ─── Project Tags ─────────────────────────────────────────────────────────────

CREATE POLICY "project_tags_public_read"
  ON "project_tags" FOR SELECT USING (true);

CREATE POLICY "project_tags_auth_manage"
  ON "project_tags" FOR ALL USING (
    EXISTS (SELECT 1 FROM "projects" WHERE "projects"."id" = "projectId" AND "projects"."authorId" = auth.uid())
  );

-- ─── Project Likes ────────────────────────────────────────────────────────────

CREATE POLICY "project_likes_public_read"
  ON "project_likes" FOR SELECT USING (true);

CREATE POLICY "project_likes_auth_insert"
  ON "project_likes" FOR INSERT WITH CHECK (auth.uid() = "profileId");

CREATE POLICY "project_likes_owner_delete"
  ON "project_likes" FOR DELETE USING (auth.uid() = "profileId");

-- ─── Project Stars ────────────────────────────────────────────────────────────

CREATE POLICY "project_stars_public_read"
  ON "project_stars" FOR SELECT USING (true);

CREATE POLICY "project_stars_auth_insert"
  ON "project_stars" FOR INSERT WITH CHECK (auth.uid() = "profileId");

CREATE POLICY "project_stars_owner_delete"
  ON "project_stars" FOR DELETE USING (auth.uid() = "profileId");

-- ─── Project Members ─────────────────────────────────────────────────────────

CREATE POLICY "project_members_public_read"
  ON "project_members" FOR SELECT USING (true);

-- ─── Roasts ───────────────────────────────────────────────────────────────────

CREATE POLICY "roasts_public_read"
  ON "roasts" FOR SELECT USING (true);

CREATE POLICY "roasts_auth_insert"
  ON "roasts" FOR INSERT WITH CHECK (auth.uid() = "reviewerId");

CREATE POLICY "roasts_owner_update"
  ON "roasts" FOR UPDATE USING (auth.uid() = "reviewerId");

CREATE POLICY "roasts_owner_delete"
  ON "roasts" FOR DELETE USING (auth.uid() = "reviewerId");

-- ─── Jobs ─────────────────────────────────────────────────────────────────────

CREATE POLICY "jobs_public_read"
  ON "jobs" FOR SELECT USING ("isActive" = true OR auth.uid() = "postedById");

CREATE POLICY "jobs_auth_insert"
  ON "jobs" FOR INSERT WITH CHECK (auth.uid() = "postedById");

CREATE POLICY "jobs_owner_update"
  ON "jobs" FOR UPDATE USING (auth.uid() = "postedById");

CREATE POLICY "jobs_owner_delete"
  ON "jobs" FOR DELETE USING (auth.uid() = "postedById");

-- ─── Job Tags ─────────────────────────────────────────────────────────────────

CREATE POLICY "job_tags_public_read"
  ON "job_tags" FOR SELECT USING (true);

-- ─── Job Applications ─────────────────────────────────────────────────────────

-- Applicants can see their own; job poster can see all
CREATE POLICY "job_applications_self_read"
  ON "job_applications" FOR SELECT USING (
    auth.uid() = "applicantId"
    OR EXISTS (SELECT 1 FROM "jobs" WHERE "jobs"."id" = "jobId" AND "jobs"."postedById" = auth.uid())
  );

CREATE POLICY "job_applications_auth_insert"
  ON "job_applications" FOR INSERT WITH CHECK (auth.uid() = "applicantId");

CREATE POLICY "job_applications_owner_delete"
  ON "job_applications" FOR DELETE USING (auth.uid() = "applicantId");

-- ─── Saved Jobs ───────────────────────────────────────────────────────────────

CREATE POLICY "saved_jobs_self_read"
  ON "saved_jobs" FOR SELECT USING (auth.uid() = "profileId");

CREATE POLICY "saved_jobs_auth_insert"
  ON "saved_jobs" FOR INSERT WITH CHECK (auth.uid() = "profileId");

CREATE POLICY "saved_jobs_owner_delete"
  ON "saved_jobs" FOR DELETE USING (auth.uid() = "profileId");

-- ─── Events ───────────────────────────────────────────────────────────────────

CREATE POLICY "events_public_read"
  ON "events" FOR SELECT USING (true);

CREATE POLICY "events_auth_insert"
  ON "events" FOR INSERT WITH CHECK (auth.uid() = "organizerId");

CREATE POLICY "events_owner_update"
  ON "events" FOR UPDATE USING (auth.uid() = "organizerId");

CREATE POLICY "events_owner_delete"
  ON "events" FOR DELETE USING (auth.uid() = "organizerId");

-- ─── Event Tags ───────────────────────────────────────────────────────────────

CREATE POLICY "event_tags_public_read"
  ON "event_tags" FOR SELECT USING (true);

-- ─── Event Registrations ──────────────────────────────────────────────────────

CREATE POLICY "event_registrations_public_read"
  ON "event_registrations" FOR SELECT USING (true);

CREATE POLICY "event_registrations_auth_insert"
  ON "event_registrations" FOR INSERT WITH CHECK (auth.uid() = "profileId");

CREATE POLICY "event_registrations_owner_delete"
  ON "event_registrations" FOR DELETE USING (auth.uid() = "profileId");

-- ─── Launchpad Events ─────────────────────────────────────────────────────────

CREATE POLICY "launchpad_events_public_read"
  ON "launchpad_events" FOR SELECT USING (true);

CREATE POLICY "launchpad_events_auth_insert"
  ON "launchpad_events" FOR INSERT WITH CHECK (auth.uid() = "creatorId");

CREATE POLICY "launchpad_events_owner_update"
  ON "launchpad_events" FOR UPDATE USING (auth.uid() = "creatorId");

CREATE POLICY "launchpad_events_owner_delete"
  ON "launchpad_events" FOR DELETE USING (auth.uid() = "creatorId");

-- ─── Launchpad Tags ───────────────────────────────────────────────────────────

CREATE POLICY "launchpad_tags_public_read"
  ON "launchpad_tags" FOR SELECT USING (true);

-- ─── Launchpad Interests ──────────────────────────────────────────────────────

CREATE POLICY "launchpad_interests_public_read"
  ON "launchpad_interests" FOR SELECT USING (true);

CREATE POLICY "launchpad_interests_auth_insert"
  ON "launchpad_interests" FOR INSERT WITH CHECK (auth.uid() = "profileId");

CREATE POLICY "launchpad_interests_owner_delete"
  ON "launchpad_interests" FOR DELETE USING (auth.uid() = "profileId");

-- ─── Notifications ────────────────────────────────────────────────────────────

-- Users only see their own notifications
CREATE POLICY "notifications_self_read"
  ON "notifications" FOR SELECT USING (auth.uid() = "recipientId");

CREATE POLICY "notifications_self_update"
  ON "notifications" FOR UPDATE USING (auth.uid() = "recipientId");

-- ─── User Interactions ────────────────────────────────────────────────────────

CREATE POLICY "user_interactions_self_read"
  ON "user_interactions" FOR SELECT USING (auth.uid() = "fromId");

CREATE POLICY "user_interactions_auth_insert"
  ON "user_interactions" FOR INSERT WITH CHECK (auth.uid() = "fromId");

-- ─── User Tag Affinities ──────────────────────────────────────────────────────

CREATE POLICY "user_tag_affinities_self_read"
  ON "user_tag_affinities" FOR SELECT USING (auth.uid() = "profileId");

-- ─── XP Logs ─────────────────────────────────────────────────────────────────

CREATE POLICY "xp_logs_self_read"
  ON "xp_logs" FOR SELECT USING (auth.uid() = "profileId"::uuid);

-- ─── User Roles ───────────────────────────────────────────────────────────────

CREATE POLICY "user_roles_public_read"
  ON "user_roles" FOR SELECT USING (true);

-- ─── Follows ─────────────────────────────────────────────────────────────────

CREATE POLICY "follows_public_read"
  ON "follows" FOR SELECT USING (true);

CREATE POLICY "follows_auth_insert"
  ON "follows" FOR INSERT WITH CHECK (auth.uid() = "followerId");

CREATE POLICY "follows_owner_delete"
  ON "follows" FOR DELETE USING (auth.uid() = "followerId");

-- ─── Profile Photos ───────────────────────────────────────────────────────────

CREATE POLICY "profile_photos_public_read"
  ON "profile_photos" FOR SELECT USING (true);

CREATE POLICY "profile_photos_auth_insert"
  ON "profile_photos" FOR INSERT WITH CHECK (auth.uid() = "profileId");

CREATE POLICY "profile_photos_owner_delete"
  ON "profile_photos" FOR DELETE USING (auth.uid() = "profileId");

-- ─── on_new_user trigger ──────────────────────────────────────────────────────
-- Automatically creates a profile row whenever a new user signs up via Supabase Auth.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _username TEXT;
  _name     TEXT;
  _email    TEXT;
BEGIN
  _email    := NEW.email;
  -- Derive a username: use raw_user_meta_data.username, or fall back to email prefix
  _username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  -- Ensure username is unique by appending part of the UUID if needed
  IF EXISTS (SELECT 1 FROM public."profiles" WHERE "username" = _username) THEN
    _username := _username || '_' || substr(NEW.id::text, 1, 6);
  END IF;

  _name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    _username
  );

  INSERT INTO public."profiles" (
    "id",
    "username",
    "name",
    "displayName",
    "email",
    "rankId",
    "xp",
    "isOnboarded",
    "createdAt",
    "updatedAt"
  ) VALUES (
    NEW.id,
    _username,
    _name,
    _name,
    _email,
    1,
    0,
    false,
    now(),
    now()
  )
  ON CONFLICT ("id") DO NOTHING;

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── updatedAt auto-update triggers ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "profiles"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER "posts_updated_at" BEFORE UPDATE ON "posts"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER "projects_updated_at" BEFORE UPDATE ON "projects"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER "jobs_updated_at" BEFORE UPDATE ON "jobs"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER "events_updated_at" BEFORE UPDATE ON "events"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER "launchpad_events_updated_at" BEFORE UPDATE ON "launchpad_events"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
