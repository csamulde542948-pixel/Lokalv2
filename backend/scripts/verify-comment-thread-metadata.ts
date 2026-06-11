import "dotenv/config";
import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new Client({ connectionString: databaseUrl });

async function main() {
  await client.connect();

  const columns = await client.query(
    `
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'post_comments'
        AND column_name IN ('rootPostId', 'depth', 'feedVisibility')
      ORDER BY column_name
    `
  );

  const stats = await client.query(
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT("rootPostId")::int AS with_root,
        MIN("depth")::int AS min_depth,
        MAX("depth")::int AS max_depth,
        COUNT(*) FILTER (WHERE "feedVisibility" = 'THREAD_ONLY')::int AS thread_only
      FROM public."post_comments"
    `
  );

  console.log(JSON.stringify({ columns: columns.rows, stats: stats.rows[0] }, null, 2));
}

main()
  .catch((error) => {
    console.error("FAIL:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
