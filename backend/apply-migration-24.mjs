import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new pg.Client({
  host: 'aws-1-ap-southeast-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.cdglgwuquklscfwivfcj',
  password: 'MxWbLOHpPt379ZDK',
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log('Connected to production DB');

const sql = readFileSync(
  join(__dirname, 'supabase/migrations/24_fix_auto_follow_brand_trigger.sql'),
  'utf8'
);

await client.query(sql);
console.log('✅ Migration 24 applied');

const { rows } = await client.query(
  `SELECT prosrc FROM pg_proc WHERE proname = 'auto_follow_brand_account' LIMIT 1;`
);
const src = rows[0]?.prosrc ?? '';
if (src.includes('WHERE EXISTS')) {
  console.log('✅ WHERE EXISTS guard confirmed in trigger function');
} else {
  console.log('⚠️  WHERE EXISTS not found — check the function body:');
  console.log(src);
}

await client.end();
