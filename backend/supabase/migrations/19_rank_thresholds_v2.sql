-- ─── Migration 19: Rank XP threshold rebalance + IP fraud column ─────────────
-- Newbie was 0–499; widened to 0–999 so new users have a full "newcomer" phase.
-- All subsequent ranks scaled proportionally to keep progression feel intact.
-- Also adds ipAddress column to xp_logs for cross-account IP fraud detection.
-- Run this against your live DB to apply without a full schema reset.

-- 1. Add ipAddress column to xp_logs (nullable — old rows get NULL, fine)
ALTER TABLE "xp_logs" ADD COLUMN IF NOT EXISTS "ipAddress" INET;

-- Index for fast per-IP daily lookups (used by the IP fraud guard in xp.ts)
CREATE INDEX IF NOT EXISTS "xp_logs_ip_created_idx"
  ON "xp_logs" ("ipAddress", "createdAt")
  WHERE "ipAddress" IS NOT NULL;

-- 2. Rebalance rank thresholds
UPDATE "ranks" SET "maxXp" = 999    WHERE "name" = 'Newbie';
UPDATE "ranks" SET "minXp" = 1000,  "maxXp" = 2499  WHERE "name" = 'Junior Dev';
UPDATE "ranks" SET "minXp" = 2500,  "maxXp" = 5999  WHERE "name" = 'Developer';
UPDATE "ranks" SET "minXp" = 6000,  "maxXp" = 14999 WHERE "name" = 'Senior Dev';
UPDATE "ranks" SET "minXp" = 15000, "maxXp" = 34999 WHERE "name" = 'Tech Lead';
UPDATE "ranks" SET "minXp" = 35000, "maxXp" = 74999 WHERE "name" = 'Architect';
UPDATE "ranks" SET "minXp" = 75000, "maxXp" = 149999 WHERE "name" = 'Principal';
UPDATE "ranks" SET "minXp" = 150000, "maxXp" = NULL  WHERE "name" = 'Legend';

-- 3. Re-assign every profile's rankId to the highest rank they now qualify for.
UPDATE "profiles" p
SET    "rankId" = r.id
FROM (
  SELECT DISTINCT ON (pr.id)
    pr.id AS profile_id,
    rk.id
  FROM   "profiles" pr
  JOIN   "ranks"    rk ON pr.xp >= rk."minXp"
  ORDER  BY pr.id, rk."minXp" DESC
) r
WHERE p.id = r.profile_id;
