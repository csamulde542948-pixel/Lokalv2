import { Client } from 'pg';

const client = new Client({ 
  connectionString: 'postgresql://postgres.cdglgwuquklscfwivfcj:MxWbLOHpPt379ZDK@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true' 
});

async function main() {
  await client.connect();
  const r = await client.query('SELECT COUNT(*) as count FROM public.roast_generations');
  const b = await client.query('SELECT COUNT(*) as count FROM public.brand_analyses');
  console.log('totalRoasts:', r.rows[0].count);
  console.log('totalBrandAnalyses:', b.rows[0].count);
  console.log('Total roasted & analyzed:', parseInt(r.rows[0].count) + parseInt(b.rows[0].count));
  await client.end();
}

main();
