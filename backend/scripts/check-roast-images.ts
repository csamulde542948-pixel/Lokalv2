import { Client } from 'pg';

const client = new Client({ 
  connectionString: 'postgresql://postgres.cdglgwuquklscfwivfcj:MxWbLOHpPt379ZDK@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true' 
});

async function main() {
  await client.connect();
  const roasts = await client.query('SELECT id, "projectUrl", "projectName", "faviconUrl", "ogImageUrl" FROM public.roast_generations');
  console.log('Total roasts:', roasts.rows.length);
  for (const row of roasts.rows) {
    console.log('ID:', row.id);
    console.log('  URL:', row.projectUrl);
    console.log('  Name:', row.projectName);
    console.log('  Favicon:', row.faviconUrl);
    console.log('  OG Image:', row.ogImageUrl);
    console.log('---');
  }
  await client.end();
}

main();
