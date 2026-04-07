// One-shot script: adds reaction column to post_likes via pooler (port 6543)
// Run: node add-reaction-col.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

// Parse .env manually
const envText = readFileSync(join(__dir, '.env'), 'utf-8');
const env = Object.fromEntries(
  envText.split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => { const [k, ...rest] = l.split('='); return [k.trim(), rest.join('=').trim()]; })
);

const supabaseUrl = env['SUPABASE_URL'];
const serviceKey  = env['SUPABASE_SERVICE_ROLE_KEY'];

console.log('Connecting to', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// Use rpc to run raw SQL
const { data, error } = await supabase.rpc('exec_migration', {
  sql: "ALTER TABLE post_likes ADD COLUMN IF NOT EXISTS reaction VARCHAR(20) NOT NULL DEFAULT 'Like';"
});

if (error) {
  // rpc might not exist — try a different approach: insert via special function
  console.log('rpc failed:', error.message);
  console.log('\nTrying direct query via supabase-js...');

  // supabase-js doesn't support raw SQL — we need pg directly
  // Fall back to pg with the pooler URL
  const { default: pg } = await import('pg');
  const { Client } = pg;

  const poolerUrl = env['DATABASE_URL']; // uses port 6543 pooler
  console.log('Using pooler URL (port 6543)...');

  const client = new Client({ connectionString: poolerUrl, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('Connected!');
    
    const res = await client.query(
      "ALTER TABLE post_likes ADD COLUMN IF NOT EXISTS reaction VARCHAR(20) NOT NULL DEFAULT 'Like';"
    );
    console.log('✅ Migration done:', res.command);
    
    // Verify
    const check = await client.query(
      "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='post_likes' AND column_name='reaction';"
    );
    console.log('Column state:', check.rows);
    
    await client.end();
  } catch (pgErr) {
    console.error('pg error:', pgErr.message);
    await client.end();
    process.exit(1);
  }
} else {
  console.log('✅ Migration done via rpc:', data);
}
