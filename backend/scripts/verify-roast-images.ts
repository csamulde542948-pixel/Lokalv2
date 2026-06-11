import { Client } from 'pg';

const client = new Client({
  connectionString: 'postgresql://postgres.cdglgwuquklscfwivfcj:MxWbLOHpPt379ZDK@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

async function main() {
  await client.connect();
  const r = await client.query('SELECT id, "projectName", "faviconUrl", "ogImageUrl" FROM public.roast_generations ORDER BY "createdAt" DESC');
  console.log('Updated roasts:');
  for (const row of r.rows) {
    console.log(row.projectName + ': favicon=' + (row.faviconUrl ? 'YES' : 'NO') + ', og=' + (row.ogImageUrl ? 'YES' : 'NO'));
  }
  await client.end();
}

main();
