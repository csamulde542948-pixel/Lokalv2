import { Client } from 'pg';
import 'dotenv/config';

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  
  const roasts = await client.query('SELECT id, "projectName", "createdAt" FROM public.roasts ORDER BY "createdAt" DESC');
  console.log('Roasts table rows:', roasts.rows.length);
  console.log(roasts.rows);
  
  const generations = await client.query('SELECT id, "projectName", "createdAt" FROM public.roast_generations ORDER BY "createdAt" DESC');
  console.log('Roast generations rows:', generations.rows.length);
  console.log(generations.rows.slice(0, 5));
  
  await client.end();
}

main();
