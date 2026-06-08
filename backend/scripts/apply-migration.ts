// Apply a single Supabase migration file to the dev database.
// Usage: npx tsx scripts/apply-migration.ts supabase/migrations/37_*.sql
import "dotenv/config";
import { readFileSync } from "fs";
import { Client } from "pg";

const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("Usage: npx tsx scripts/apply-migration.ts <path-to-sql>");
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

async function main() {
  await client.connect();
  console.log(`Applying ${sqlPath} to ${new URL(databaseUrl).host}...`);
  try {
    await client.query(sql);
    console.log("OK: migration applied");
  } catch (err: any) {
    // 42710 = duplicate_object, 42P07 = duplicate_table
    // Tolerate idempotent re-runs of CREATE TABLE IF NOT EXISTS / ADD VALUE IF NOT EXISTS.
    if (err?.code === "42710" || err?.code === "42P07") {
      console.warn("WARN: already applied — ignoring duplicate-object error:", err.message);
    } else {
      throw err;
    }
  }
  await client.end();
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
