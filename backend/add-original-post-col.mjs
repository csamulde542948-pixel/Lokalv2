import pg from "pg";
const { Client } = pg;

const client = new Client({
  connectionString:
    "postgresql://postgres.nxbiivvsgeglcntwgjal:Samulde0987@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Connected.");

await client.query(
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS "originalPostId" VARCHAR(200);`
);
console.log('Column "originalPostId" added (or already existed).');

await client.end();
