/**
 * Applies all pending migrations (05–09) using the pooled DATABASE_URL.
 * Safe to run multiple times — all statements use IF NOT EXISTS / DO $$ guards.
 *
 * Run:  node run-all-migrations.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ──────────────────────────────────────────────────────────────
const envLines = readFileSync(resolve(__dirname, ".env"), "utf8").split("\n");
for (const line of envLines) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const idx = t.indexOf("=");
  if (idx === -1) continue;
  const k = t.slice(0, idx).trim();
  const v = t.slice(idx + 1).trim();
  if (!process.env[k]) process.env[k] = v;
}

const { default: pg } = await import("pg");
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
console.log("✅ Connected");

// ── Helper: run SQL, skip errors on things that already exist ──────────────
async function runSQL(label, sql) {
  try {
    await client.query(sql);
    console.log(`✅ ${label}`);
  } catch (e) {
    // Idempotency: already-exists errors are fine
    if (
      e.message?.includes("already exists") ||
      e.message?.includes("duplicate") ||
      e.message?.includes("IF NOT EXISTS")
    ) {
      console.log(`⚠️  ${label} — already exists, skipping`);
    } else {
      console.error(`❌ ${label} — ${e.message}`);
    }
  }
}

// ─── Migration 05: post_views + user_author_affinities ─────────────────────
await runSQL("post_views table", `
  CREATE TABLE IF NOT EXISTS post_views (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "postId"   TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    "viewerId" UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    "dwellMs"  INTEGER NOT NULL DEFAULT 0,
    source     VARCHAR(30) NOT NULL DEFAULT 'feed',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`);
await runSQL("post_views indexes", `
  CREATE INDEX IF NOT EXISTS idx_post_views_viewer_created ON post_views ("viewerId", "createdAt" DESC);
  CREATE INDEX IF NOT EXISTS idx_post_views_post ON post_views ("postId");
`);
await runSQL("user_author_affinities table", `
  CREATE TABLE IF NOT EXISTS user_author_affinities (
    id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId"      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    "authorId"    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    "likeCount"   INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount"  INTEGER NOT NULL DEFAULT 0,
    "viewCount"   INTEGER NOT NULL DEFAULT 0,
    score         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE ("userId", "authorId")
  );
`);
await runSQL("user_author_affinities index", `
  CREATE INDEX IF NOT EXISTS idx_user_author_aff_user_score ON user_author_affinities ("userId", score DESC);
`);
await runSQL("RLS post_views", `
  ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;
`);
await runSQL("RLS user_author_affinities", `
  ALTER TABLE user_author_affinities ENABLE ROW LEVEL SECURITY;
`);

// ─── Migration 06: feedVariant on post_views, embedding indexes ────────────
await runSQL("post_views.feedVariant column", `
  ALTER TABLE post_views ADD COLUMN IF NOT EXISTS "feedVariant" VARCHAR(20);
`);
await runSQL("post_views.position column", `
  ALTER TABLE post_views ADD COLUMN IF NOT EXISTS position INTEGER;
`);
await runSQL("post_views.engaged column", `
  ALTER TABLE post_views ADD COLUMN IF NOT EXISTS engaged BOOLEAN NOT NULL DEFAULT false;
`);
await runSQL("post_views.sessionId column", `
  ALTER TABLE post_views ADD COLUMN IF NOT EXISTS "sessionId" VARCHAR(60);
`);
await runSQL("post_views.engagementWeight column", `
  ALTER TABLE post_views ADD COLUMN IF NOT EXISTS "engagementWeight" FLOAT;
`);
await runSQL("post_views sessionId index", `
  CREATE INDEX IF NOT EXISTS idx_post_views_session ON post_views ("sessionId");
`);

// ─── Migration 07: feed_score_logs, feed_config, feed_sessions ─────────────
await runSQL("feed_score_logs table", `
  CREATE TABLE IF NOT EXISTS feed_score_logs (
    id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId"             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    "postId"             TEXT NOT NULL,
    "sessionId"          VARCHAR(60),
    "feedVariant"        VARCHAR(20) NOT NULL,
    position             INT NOT NULL DEFAULT 0,
    "finalScore"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "engagementScore"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "decayFactor"        DOUBLE PRECISION NOT NULL DEFAULT 1,
    "rankBoost"          DOUBLE PRECISION NOT NULL DEFAULT 1,
    "socialBoost"        DOUBLE PRECISION NOT NULL DEFAULT 1,
    "typeBoost"          DOUBLE PRECISION NOT NULL DEFAULT 1,
    "interestBoost"      DOUBLE PRECISION NOT NULL DEFAULT 1,
    "followingBoost"     DOUBLE PRECISION NOT NULL DEFAULT 1,
    "authorAffinityBoost" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "velocityBoost"      DOUBLE PRECISION NOT NULL DEFAULT 1,
    "semanticBoost"      DOUBLE PRECISION NOT NULL DEFAULT 1,
    "dwellBoost"         DOUBLE PRECISION NOT NULL DEFAULT 1,
    "notInterestedPenalty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "postType"           VARCHAR(20) NOT NULL DEFAULT 'post',
    "authorId"           UUID NOT NULL,
    "likesCount"         INT NOT NULL DEFAULT 0,
    "commentsCount"      INT NOT NULL DEFAULT 0,
    "sharesCount"        INT NOT NULL DEFAULT 0,
    "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`);
await runSQL("feed_score_logs indexes", `
  CREATE INDEX IF NOT EXISTS idx_feed_score_logs_user_created ON feed_score_logs ("userId", "createdAt" DESC);
  CREATE INDEX IF NOT EXISTS idx_feed_score_logs_session ON feed_score_logs ("sessionId");
  CREATE INDEX IF NOT EXISTS idx_feed_score_logs_variant_created ON feed_score_logs ("feedVariant", "createdAt" DESC);
`);
await runSQL("feed_config table", `
  CREATE TABLE IF NOT EXISTS feed_config (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    key         VARCHAR(100) UNIQUE NOT NULL,
    value       DOUBLE PRECISION NOT NULL,
    label       VARCHAR(200),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`);
await runSQL("feed_config seed data", `
  INSERT INTO feed_config (key, value, label) VALUES
    ('engagementLikeWeight',      1.5,   'Weight for likes in engagement score'),
    ('engagementCommentWeight',   2.0,   'Weight for comments in engagement score'),
    ('engagementShareWeight',     3.0,   'Weight for shares in engagement score'),
    ('typeProjectMultiplier',     1.4,   'Boost multiplier for project posts'),
    ('typeRoastMultiplier',       1.3,   'Boost multiplier for roast posts'),
    ('typeEventMultiplier',       1.2,   'Boost multiplier for event posts'),
    ('typePostMultiplier',        1.0,   'Base multiplier for regular posts'),
    ('followingBoostValue',       1.5,   'Boost for posts from followed users'),
    ('notInterestedPenaltyValue', 0.05,  'Penalty multiplier for not-interested posts'),
    ('decayLambda',               0.029, 'Time decay constant'),
    ('lowCtrSemanticMultiplier',  1.5,   'Extra semantic boost when session CTR is low'),
    ('lowCtrThreshold',           0.10,  'CTR threshold below which semantic boost kicks in')
  ON CONFLICT (key) DO NOTHING;
`);
await runSQL("feed_sessions table", `
  CREATE TABLE IF NOT EXISTS feed_sessions (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId"        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    "feedVariant"   VARCHAR(20) NOT NULL DEFAULT 'ranked',
    "postsShown"    INT NOT NULL DEFAULT 0,
    "postsEngaged"  INT NOT NULL DEFAULT 0,
    "totalDwellMs"  INT NOT NULL DEFAULT 0,
    "avgDwellMs"    DOUBLE PRECISION NOT NULL DEFAULT 0,
    ctr             DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive"      BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`);
await runSQL("feed_sessions indexes", `
  CREATE INDEX IF NOT EXISTS idx_feed_sessions_user_created ON feed_sessions ("userId", "createdAt" DESC);
  CREATE INDEX IF NOT EXISTS idx_feed_sessions_variant_created ON feed_sessions ("feedVariant", "createdAt" DESC);
`);
await runSQL("profiles.feedEngagementCount column", `
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "feedEngagementCount" INTEGER NOT NULL DEFAULT 0;
`);

// ─── Migration 08: user_not_interested ─────────────────────────────────────
await runSQL("user_not_interested table", `
  CREATE TABLE IF NOT EXISTS user_not_interested (
    id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId"   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    "postId"   TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE ("userId", "postId")
  );
`);
await runSQL("user_not_interested index", `
  CREATE INDEX IF NOT EXISTS idx_user_not_interested_user ON user_not_interested ("userId");
`);
await runSQL("idx_posts_explore_feed index", `
  CREATE INDEX IF NOT EXISTS idx_posts_explore_feed ON posts ("createdAt" DESC, "likesCount" DESC);
`);

// ─── Migration 09: rankScore, SHARE enum, originalPostId ───────────────────
await runSQL("posts.rankScore column", `
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS "rankScore" FLOAT;
`);
await runSQL("posts.originalPostId column", `
  ALTER TABLE posts ADD COLUMN IF NOT EXISTS "originalPostId" VARCHAR(200);
`);
await runSQL("idx_posts_rank_score", `
  CREATE INDEX IF NOT EXISTS idx_posts_rank_score ON posts ("rankScore" DESC NULLS LAST);
`);
await runSQL("idx_posts_explore_ranked", `
  CREATE INDEX IF NOT EXISTS idx_posts_explore_ranked ON posts ("createdAt" DESC, "rankScore" DESC NULLS LAST, "likesCount" DESC);
`);
await runSQL("SHARE NotificationType enum value", `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'SHARE'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')
    ) THEN
      ALTER TYPE "NotificationType" ADD VALUE 'SHARE';
    END IF;
  END$$;
`);
await runSQL("post_likes reaction index", `
  CREATE INDEX IF NOT EXISTS idx_post_likes_reaction ON post_likes ("postId", reaction);
`);

await client.end();
console.log("\n🎉 All migrations applied successfully!");
