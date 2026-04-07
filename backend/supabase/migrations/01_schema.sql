-- ============================================================
-- Lokal v2 — Full Schema Migration
-- Applied via: supabase db query --linked -f this_file.sql
-- ============================================================

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE "ProjectType" AS ENUM ('GITHUB', 'PERSONAL');
CREATE TYPE "ProjectCategory" AS ENUM ('WEB_APP', 'MOBILE_APP', 'LIBRARY', 'CLI_TOOL', 'PORTFOLIO', 'OTHER');
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'IN_PROGRESS', 'ARCHIVED', 'COMPLETED');
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE');
CREATE TYPE "EventType" AS ENUM ('WEBINAR', 'WORKSHOP', 'HACKATHON', 'CONFERENCE', 'MEETUP', 'PANEL', 'OTHER');
CREATE TYPE "LaunchpadEventType" AS ENUM ('BETA_TESTERS', 'FEEDBACK', 'LAUNCH', 'COLLABORATION', 'HIRING');
CREATE TYPE "NotificationType" AS ENUM ('LIKE', 'COMMENT', 'FOLLOW', 'PROJECT_ROAST', 'JOB_APPLICATION', 'EVENT_REMINDER', 'LAUNCHPAD_INTEREST', 'XP_LEVELUP', 'MENTION');
CREATE TYPE "InteractionType" AS ENUM ('POST_LIKE', 'POST_COMMENT', 'POST_SHARE', 'PROJECT_LIKE', 'PROJECT_STAR', 'PROFILE_VIEW', 'DM_SENT', 'PROJECT_SAVE', 'EVENT_REGISTER', 'JOB_SAVE', 'LAUNCHPAD_INTEREST');
CREATE TYPE "Trend" AS ENUM ('UP', 'DOWN', 'SAME');

-- ─── Ranks ───────────────────────────────────────────────────────────────────

CREATE TABLE "ranks" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(50) NOT NULL UNIQUE,
  "description" TEXT,
  "minXp" INTEGER NOT NULL UNIQUE,
  "maxXp" INTEGER,
  "iconName" VARCHAR(50),
  "color" VARCHAR(50),
  "bgColor" VARCHAR(50),
  "borderColor" VARCHAR(50)
);

-- Seed ranks
INSERT INTO "ranks" ("name", "description", "minXp", "maxXp", "iconName", "color", "bgColor", "borderColor") VALUES
  ('Newbie',        'Just getting started',                    0,     499,   'baby',        'text-gray-500',   'bg-gray-100',   'border-gray-300'),
  ('Junior Dev',    'Learning the ropes',                      500,   1499,  'seedling',    'text-green-500',  'bg-green-50',   'border-green-300'),
  ('Developer',     'Building real things',                    1500,  3999,  'code',        'text-blue-500',   'bg-blue-50',    'border-blue-300'),
  ('Senior Dev',    'Shipping consistently',                   4000,  9999,  'laptop',      'text-purple-500', 'bg-purple-50',  'border-purple-300'),
  ('Tech Lead',     'Leading and mentoring',                   10000, 24999, 'users',       'text-orange-500', 'bg-orange-50',  'border-orange-300'),
  ('Architect',     'Designing systems',                       25000, 49999, 'building',    'text-red-500',    'bg-red-50',     'border-red-300'),
  ('Principal',     'Shaping the industry',                    50000, 99999, 'star',        'text-yellow-500', 'bg-yellow-50',  'border-yellow-300'),
  ('Legend',        'Filipino dev royalty',                    100000, NULL, 'crown',       'text-gold-500',   'bg-amber-50',   'border-amber-400');

-- ─── XP Activities ───────────────────────────────────────────────────────────

CREATE TABLE "xp_activities" (
  "id" SERIAL PRIMARY KEY,
  "action" VARCHAR(100) NOT NULL UNIQUE,
  "xpReward" INTEGER NOT NULL,
  "icon" VARCHAR(10)
);

INSERT INTO "xp_activities" ("action", "xpReward", "icon") VALUES
  ('Create a post',          10,  '📝'),
  ('Receive a like',          5,  '❤️'),
  ('Receive a comment',       8,  '💬'),
  ('Launch a project',       50,  '🚀'),
  ('Get a project star',     15,  '⭐'),
  ('Submit a roast',         20,  '🔥'),
  ('Receive a roast',        10,  '🎯'),
  ('Follow someone',          3,  '👥'),
  ('Get a follower',          5,  '🫂'),
  ('Register for event',     15,  '🎟️'),
  ('Create a launchpad',     30,  '🛸'),
  ('Get launchpad interest', 10,  '💡'),
  ('Apply to job',           10,  '💼'),
  ('Post a job',             25,  '📋'),
  ('Daily login',             5,  '📅');

-- ─── Roles ───────────────────────────────────────────────────────────────────

CREATE TABLE "roles" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL UNIQUE,
  "emoji" VARCHAR(10),
  "description" TEXT,
  "requirement" TEXT
);

INSERT INTO "roles" ("name", "emoji", "description", "requirement") VALUES
  ('Open Sourcerer',    '🧙', 'Active open source contributor',         'Have a public project with 10+ stars'),
  ('Launch King',       '👑', 'Launched 5+ projects on Launchpad',      'Launch 5 projects on Launchpad'),
  ('Roast Master',      '🔥', 'Given 10+ quality roasts',               'Submit 10 approved roasts'),
  ('Event Organizer',   '🎟️', 'Organized a community event',            'Create and run 1 event with 20+ attendees'),
  ('Hired!',            '💼', 'Got a job through lokalhost.club',        'Get hired via a job on the platform'),
  ('Top Contributor',   '🏆', 'Consistent top-10 leaderboard presence', 'Appear in top 10 leaderboard for 4 weeks'),
  ('Mentor',            '🎓', 'Helped others grow',                     'Give 20+ upvoted comments/roasts');

-- ─── Tags ────────────────────────────────────────────────────────────────────

CREATE TABLE "tags" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL UNIQUE
);

-- ─── Profiles ────────────────────────────────────────────────────────────────

CREATE TABLE "profiles" (
  "id" UUID PRIMARY KEY,  -- matches auth.users.id
  "username" VARCHAR(50) NOT NULL UNIQUE,
  "name" VARCHAR(100) NOT NULL,
  "displayName" VARCHAR(100),
  "email" VARCHAR(255) UNIQUE,
  "bio" TEXT,
  "avatarUrl" TEXT,
  "coverUrl" TEXT,
  "website" VARCHAR(255),
  "location" VARCHAR(100),
  "company" VARCHAR(100),
  "jobTitle" VARCHAR(100),
  "githubUsername" VARCHAR(100),
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "rankId" INTEGER NOT NULL DEFAULT 1,
  "unreadNotificationsCount" INTEGER NOT NULL DEFAULT 0,
  "streamUserId" VARCHAR(100) UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "interestEmbedding" vector(1536),
  CONSTRAINT "profiles_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES "ranks"("id") ON DELETE RESTRICT
);

CREATE INDEX "profiles_rankId_idx" ON "profiles"("rankId");

-- ─── XP Log ──────────────────────────────────────────────────────────────────

CREATE TABLE "xp_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId" UUID NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "xpEarned" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now()
);

CREATE INDEX "xp_logs_profileId_idx" ON "xp_logs"("profileId");

-- ─── User Roles ───────────────────────────────────────────────────────────────

CREATE TABLE "user_roles" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId" UUID NOT NULL,
  "roleId" INTEGER NOT NULL,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "user_roles_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id"),
  CONSTRAINT "user_roles_profileId_roleId_key" UNIQUE ("profileId", "roleId")
);

-- ─── Follows ─────────────────────────────────────────────────────────────────

CREATE TABLE "follows" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "followerId" UUID NOT NULL,
  "followingId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "follows_followerId_followingId_key" UNIQUE ("followerId", "followingId")
);

CREATE INDEX "follows_followerId_idx" ON "follows"("followerId");
CREATE INDEX "follows_followingId_idx" ON "follows"("followingId");

-- ─── Posts ───────────────────────────────────────────────────────────────────

CREATE TABLE "posts" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "authorId" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "imageUrl" TEXT,
  "projectName" VARCHAR(100),
  "projectId" VARCHAR(100),
  "streamActivityId" VARCHAR(200) UNIQUE,
  "likesCount" INTEGER NOT NULL DEFAULT 0,
  "commentsCount" INTEGER NOT NULL DEFAULT 0,
  "sharesCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "contentEmbedding" vector(1536),
  CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "posts_authorId_idx" ON "posts"("authorId");
CREATE INDEX "posts_createdAt_idx" ON "posts"("createdAt" DESC);

-- ─── Post Likes ──────────────────────────────────────────────────────────────

CREATE TABLE "post_likes" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "postId" TEXT NOT NULL,
  "profileId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE,
  CONSTRAINT "post_likes_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "post_likes_postId_profileId_key" UNIQUE ("postId", "profileId")
);

CREATE INDEX "post_likes_postId_idx" ON "post_likes"("postId");

-- ─── Post Comments ───────────────────────────────────────────────────────────

CREATE TABLE "post_comments" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "postId" TEXT NOT NULL,
  "authorId" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "post_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE,
  CONSTRAINT "post_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "post_comments_postId_idx" ON "post_comments"("postId");

-- ─── Post Tags ────────────────────────────────────────────────────────────────

CREATE TABLE "post_tags" (
  "postId" TEXT NOT NULL,
  "tagId" INTEGER NOT NULL,
  PRIMARY KEY ("postId", "tagId"),
  CONSTRAINT "post_tags_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE,
  CONSTRAINT "post_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE
);

-- ─── Projects ─────────────────────────────────────────────────────────────────

CREATE TABLE "projects" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "authorId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "tagline" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "iconUrl" TEXT,
  "bannerUrl" TEXT,
  "demoUrl" TEXT,
  "githubUrl" TEXT,
  "type" "ProjectType" NOT NULL DEFAULT 'PERSONAL',
  "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
  "category" "ProjectCategory" NOT NULL DEFAULT 'WEB_APP',
  "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isTrending" BOOLEAN NOT NULL DEFAULT false,
  "starsCount" INTEGER NOT NULL DEFAULT 0,
  "forksCount" INTEGER NOT NULL DEFAULT 0,
  "likesCount" INTEGER NOT NULL DEFAULT 0,
  "roastsCount" INTEGER NOT NULL DEFAULT 0,
  "downloadsText" VARCHAR(20),
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "progress" INTEGER,
  "rankTrend" "Trend" NOT NULL DEFAULT 'SAME',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "projects_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "projects_authorId_idx" ON "projects"("authorId");
CREATE INDEX "projects_isFeatured_idx" ON "projects"("isFeatured");
CREATE INDEX "projects_isTrending_idx" ON "projects"("isTrending");

-- ─── Project Tags ─────────────────────────────────────────────────────────────

CREATE TABLE "project_tags" (
  "projectId" TEXT NOT NULL,
  "tagId" INTEGER NOT NULL,
  PRIMARY KEY ("projectId", "tagId"),
  CONSTRAINT "project_tags_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "project_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE
);

-- ─── Project Likes ────────────────────────────────────────────────────────────

CREATE TABLE "project_likes" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId" TEXT NOT NULL,
  "profileId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "project_likes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "project_likes_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "project_likes_projectId_profileId_key" UNIQUE ("projectId", "profileId")
);

-- ─── Project Stars ────────────────────────────────────────────────────────────

CREATE TABLE "project_stars" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId" TEXT NOT NULL,
  "profileId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "project_stars_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "project_stars_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "project_stars_projectId_profileId_key" UNIQUE ("projectId", "profileId")
);

-- ─── Project Members ─────────────────────────────────────────────────────────

CREATE TABLE "project_members" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId" TEXT NOT NULL,
  "profileId" UUID NOT NULL,
  "role" VARCHAR(50) NOT NULL DEFAULT 'member',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "project_members_projectId_profileId_key" UNIQUE ("projectId", "profileId")
);

-- ─── Roasts ───────────────────────────────────────────────────────────────────

CREATE TABLE "roasts" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "projectId" TEXT NOT NULL,
  "reviewerId" UUID NOT NULL,
  "strengths" TEXT[] NOT NULL DEFAULT '{}',
  "improvements" TEXT[] NOT NULL DEFAULT '{}',
  "detailedFeedback" TEXT,
  "designScore" DOUBLE PRECISION,
  "codeScore" DOUBLE PRECISION,
  "innovationScore" DOUBLE PRECISION,
  "usabilityScore" DOUBLE PRECISION,
  "overallScore" DOUBLE PRECISION NOT NULL,
  "likesCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "roasts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
  CONSTRAINT "roasts_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "roasts_projectId_idx" ON "roasts"("projectId");
CREATE INDEX "roasts_reviewerId_idx" ON "roasts"("reviewerId");

-- ─── Jobs ─────────────────────────────────────────────────────────────────────

CREATE TABLE "jobs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "postedById" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "company" VARCHAR(100) NOT NULL,
  "companyLogoUrl" TEXT,
  "location" VARCHAR(100) NOT NULL,
  "type" "JobType" NOT NULL DEFAULT 'FULL_TIME',
  "salary" VARCHAR(100),
  "shortDesc" TEXT NOT NULL,
  "fullDesc" TEXT NOT NULL,
  "applyEmail" VARCHAR(255),
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "applicantsCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "jobs_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "jobs_postedById_idx" ON "jobs"("postedById");
CREATE INDEX "jobs_isFeatured_idx" ON "jobs"("isFeatured");
CREATE INDEX "jobs_isActive_idx" ON "jobs"("isActive");

-- ─── Job Tags ─────────────────────────────────────────────────────────────────

CREATE TABLE "job_tags" (
  "jobId" TEXT NOT NULL,
  "tagId" INTEGER NOT NULL,
  PRIMARY KEY ("jobId", "tagId"),
  CONSTRAINT "job_tags_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE,
  CONSTRAINT "job_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE
);

-- ─── Job Applications ─────────────────────────────────────────────────────────

CREATE TABLE "job_applications" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "jobId" TEXT NOT NULL,
  "applicantId" UUID NOT NULL,
  "firstName" VARCHAR(100) NOT NULL,
  "lastName" VARCHAR(100) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(50),
  "portfolioUrl" TEXT,
  "resumeUrl" TEXT,
  "coverLetter" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "job_applications_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE,
  CONSTRAINT "job_applications_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "job_applications_jobId_applicantId_key" UNIQUE ("jobId", "applicantId")
);

CREATE INDEX "job_applications_jobId_idx" ON "job_applications"("jobId");

-- ─── Saved Jobs ───────────────────────────────────────────────────────────────

CREATE TABLE "saved_jobs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "jobId" TEXT NOT NULL,
  "profileId" UUID NOT NULL,
  "savedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "saved_jobs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE,
  CONSTRAINT "saved_jobs_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "saved_jobs_jobId_profileId_key" UNIQUE ("jobId", "profileId")
);

-- ─── Events ───────────────────────────────────────────────────────────────────

CREATE TABLE "events" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizerId" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "shortDesc" TEXT NOT NULL,
  "fullDesc" TEXT,
  "coverImageUrl" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "location" VARCHAR(200),
  "eventUrl" TEXT,
  "type" "EventType" NOT NULL DEFAULT 'MEETUP',
  "maxAttendees" INTEGER,
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "attendeesCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "events_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "events_organizerId_idx" ON "events"("organizerId");
CREATE INDEX "events_startDate_idx" ON "events"("startDate");
CREATE INDEX "events_isFeatured_idx" ON "events"("isFeatured");

-- ─── Event Tags ───────────────────────────────────────────────────────────────

CREATE TABLE "event_tags" (
  "eventId" TEXT NOT NULL,
  "tagId" INTEGER NOT NULL,
  PRIMARY KEY ("eventId", "tagId"),
  CONSTRAINT "event_tags_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE,
  CONSTRAINT "event_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE
);

-- ─── Event Registrations ──────────────────────────────────────────────────────

CREATE TABLE "event_registrations" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "eventId" TEXT NOT NULL,
  "profileId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "event_registrations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE,
  CONSTRAINT "event_registrations_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "event_registrations_eventId_profileId_key" UNIQUE ("eventId", "profileId")
);

CREATE INDEX "event_registrations_eventId_idx" ON "event_registrations"("eventId");

-- ─── Launchpad Events ─────────────────────────────────────────────────────────

CREATE TABLE "launchpad_events" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "creatorId" UUID NOT NULL,
  "title" VARCHAR(200) NOT NULL,
  "type" "LaunchpadEventType" NOT NULL DEFAULT 'LAUNCH',
  "shortDesc" TEXT NOT NULL,
  "fullDesc" TEXT,
  "coverImageUrl" TEXT,
  "targetUrl" TEXT,
  "launchDate" TIMESTAMP(3),
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "interestedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "launchpad_events_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "launchpad_events_creatorId_idx" ON "launchpad_events"("creatorId");

-- ─── Launchpad Tags ───────────────────────────────────────────────────────────

CREATE TABLE "launchpad_tags" (
  "launchpadEventId" TEXT NOT NULL,
  "tagId" INTEGER NOT NULL,
  PRIMARY KEY ("launchpadEventId", "tagId"),
  CONSTRAINT "launchpad_tags_launchpadEventId_fkey" FOREIGN KEY ("launchpadEventId") REFERENCES "launchpad_events"("id") ON DELETE CASCADE,
  CONSTRAINT "launchpad_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE
);

-- ─── Launchpad Interests ──────────────────────────────────────────────────────

CREATE TABLE "launchpad_interests" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "launchpadEventId" TEXT NOT NULL,
  "profileId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "launchpad_interests_launchpadEventId_fkey" FOREIGN KEY ("launchpadEventId") REFERENCES "launchpad_events"("id") ON DELETE CASCADE,
  CONSTRAINT "launchpad_interests_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "launchpad_interests_launchpadEventId_profileId_key" UNIQUE ("launchpadEventId", "profileId")
);

-- ─── Notifications ────────────────────────────────────────────────────────────

CREATE TABLE "notifications" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "recipientId" UUID NOT NULL,
  "actorId" UUID,
  "type" "NotificationType" NOT NULL,
  "postId" TEXT,
  "projectId" TEXT,
  "entityId" VARCHAR(200),
  "message" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "profiles"("id") ON DELETE SET NULL,
  CONSTRAINT "notifications_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE,
  CONSTRAINT "notifications_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE
);

CREATE INDEX "notifications_recipientId_isRead_idx" ON "notifications"("recipientId", "isRead");
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt" DESC);

-- ─── User Interactions ────────────────────────────────────────────────────────

CREATE TABLE "user_interactions" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "fromId" UUID NOT NULL,
  "toId" UUID,
  "entityId" VARCHAR(200),
  "type" "InteractionType" NOT NULL,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "user_interactions_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "user_interactions_toId_fkey" FOREIGN KEY ("toId") REFERENCES "profiles"("id") ON DELETE SET NULL
);

CREATE INDEX "user_interactions_fromId_idx" ON "user_interactions"("fromId");
CREATE INDEX "user_interactions_createdAt_idx" ON "user_interactions"("createdAt" DESC);

-- ─── User Tag Affinities ──────────────────────────────────────────────────────

CREATE TABLE "user_tag_affinities" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId" UUID NOT NULL,
  "tagName" VARCHAR(100) NOT NULL,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "user_tag_affinities_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE,
  CONSTRAINT "user_tag_affinities_profileId_tagName_key" UNIQUE ("profileId", "tagName")
);

CREATE INDEX "user_tag_affinities_profileId_idx" ON "user_tag_affinities"("profileId");

-- ─── Profile Photos ───────────────────────────────────────────────────────────

CREATE TABLE "profile_photos" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "profileId" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  CONSTRAINT "profile_photos_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE
);

CREATE INDEX "profile_photos_profileId_idx" ON "profile_photos"("profileId");

-- ─── Prisma migration tracking table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) NOT NULL PRIMARY KEY,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMP WITH TIME ZONE,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMP WITH TIME ZONE,
  "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);
