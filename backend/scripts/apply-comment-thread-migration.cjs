const fs = require("node:fs");
const path = require("node:path");
const pg = require("pg");

const migrationFile = process.argv[2] ?? "41_post_comment_thread_metadata.sql";
if (migrationFile.includes("..") || path.isAbsolute(migrationFile)) {
  throw new Error("Migration filename must be a file inside backend/supabase/migrations");
}

const sqlPath = path.join(__dirname, "..", "supabase", "migrations", migrationFile);
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
  const before = await client.query(`
    SELECT COUNT(*)::int AS nested_count
    FROM public."post_comments" child
    JOIN public."post_comments" parent
      ON parent."id" = child."parentId"
    WHERE parent."parentId" IS NOT NULL;
  `);

  await client.query(sql);

  const after = await client.query(`
    SELECT COUNT(*)::int AS nested_count
    FROM public."post_comments" child
    JOIN public."post_comments" parent
      ON parent."id" = child."parentId"
    WHERE parent."parentId" IS NOT NULL;
  `);

  const { rows } = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'post_comments'
      AND column_name IN ('rootPostId', 'depth', 'feedVisibility')
    ORDER BY column_name;
  `);

  console.log("applied migration:", migrationFile);
  console.log("nested replies before:", before.rows[0]?.nested_count ?? 0);
  console.log("nested replies after:", after.rows[0]?.nested_count ?? 0);
  console.log("post_comments thread columns:", rows.map((row) => row.column_name).join(", "));
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
