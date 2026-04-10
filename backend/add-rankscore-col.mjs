/**
 * One-shot migration: adds `rankScore FLOAT` column to the posts table.
 * Uses the pooled Supabase connection (DATABASE_URL) so no direct port needed.
 *
 * Run once:  node add-rankscore-col.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envPath = resolve(__dirname, ".env");
const envLines = readFileSync(envPath, "utf8").split("\n");
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

const { default: pg } = await import("pg");
const { Client } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL not set in .env");
  process.exit(1);
}

const client = new Client({ connectionString });

try {
  await client.connect();
  console.log("✅ Connected to database");

  // Add rankScore column if it doesn't exist
  await client.query(`
    ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS "rankScore" DOUBLE PRECISION;
  `);
  console.log('✅ Column "rankScore" added to posts table (or already existed)');

  // Add index for faster explore feed sorting
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_posts_rankscore
    ON posts ("rankScore" DESC NULLS LAST, "createdAt" DESC);
  `);
  console.log('✅ Index on rankScore created');

} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
  console.log("Done.");
}
