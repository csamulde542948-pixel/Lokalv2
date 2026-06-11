const fs = require("node:fs");
const path = require("node:path");
const pg = require("pg");

const sqlPath = path.join(__dirname, "..", "supabase", "migrations", "41_post_comment_thread_metadata.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  await client.query(sql);

  const { rows } = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'post_comments'
      AND column_name IN ('rootPostId', 'depth', 'feedVisibility')
    ORDER BY column_name;
  `);

  console.log("post_comments thread columns:", rows.map((row) => row.column_name).join(", "));
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
