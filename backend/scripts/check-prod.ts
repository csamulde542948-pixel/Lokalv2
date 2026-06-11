import { Client } from 'pg';

const client = new Client({ 
  connectionString: 'postgresql://postgres.cdglgwuquklscfwivfcj:MxWbLOHpPt379ZDK@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true' 
});

async function main() {
  await client.connect();
  
  // Check RLS policies
  const policies = await client.query(`
    SELECT tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('roast_generations', 'brand_analyses')
  `);
  console.log('RLS policies:', policies.rows);
  
  // Check recent roasts
  const roasts = await client.query(`
    SELECT id, "projectName", "createdAt" 
    FROM public.roast_generations 
    ORDER BY "createdAt" DESC 
    LIMIT 5
  `);
  console.log('Recent roasts:', roasts.rows);
  
  await client.end();
}

main();
