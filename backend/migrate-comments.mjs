// @ts-check
import pg from "pg";

const { Client } = pg;

const client = new Client({
  connectionString:
    "postgresql://postgres.nxbiivvsgeglcntwgjal:Samulde0987@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  console.log("Connected ✓");

  // 1. Add reaction column to comment_likes
  try {
    await client.query(`
      ALTER TABLE comment_likes
      ADD COLUMN IF NOT EXISTS reaction VARCHAR(20) NOT NULL DEFAULT 'Like';
    `);
    console.log("1. Added reaction column to comment_likes ✓");
  } catch (e) {
    console.error("1. Failed:", e.message);
  }

  // 2. Create post_comment_edits table for edit history
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS post_comment_edits (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        comment_id TEXT NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
        previous_content TEXT NOT NULL,
        edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS post_comment_edits_comment_id_idx
        ON post_comment_edits(comment_id);
    `);
    console.log("2. Created post_comment_edits table ✓");
  } catch (e) {
    console.error("2. Failed:", e.message);
  }

  // 3. Add mentions array to post_comments (array of profile IDs)
  try {
    await client.query(`
      ALTER TABLE post_comments
      ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}';
    `);
    console.log("3. Added mentions column to post_comments ✓");
  } catch (e) {
    console.error("3. Failed:", e.message);
  }

  // Verify
  const res = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name IN ('comment_likes','post_comments','post_comment_edits')
      AND column_name IN ('reaction','mentions','comment_id','previous_content')
    ORDER BY table_name, column_name;
  `);
  console.log("\nVerification:", res.rows);

  await client.end();
  console.log("\nDone ✓");
}

main().catch((e) => { console.error(e); process.exit(1); });
