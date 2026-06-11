import { Client } from 'pg';

const client = new Client({ 
  connectionString: 'postgresql://postgres.cdglgwuquklscfwivfcj:MxWbLOHpPt379ZDK@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true' 
});

async function scrapeWithFirecrawl(url: string) {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fc-405ace0cac50452b9733f31e0ceb0c0d'
      },
      body: JSON.stringify({
        url: url,
        formats: ['metadata']
      })
    });

    if (!response.ok) {
      console.error(`Firecrawl error for ${url}:`, response.status);
      return null;
    }

    const data = await response.json();
    console.log(`Scraped ${url}:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

async function main() {
  await client.connect();
  
  const roasts = await client.query('SELECT id, "projectUrl" FROM public.roast_generations WHERE "faviconUrl" IS NULL OR "ogImageUrl" IS NULL');
  
  console.log(`Found ${roasts.rows.length} roasts to update`);
  
  for (const row of roasts.rows) {
    const url = row.projectUrl;
    console.log(`\nScraping: ${url}`);
    
    const data = await scrapeWithFirecrawl(url);
    
    if (data && data.success) {
      const metadata = data.data?.metadata || {};
      const faviconUrl = metadata.favicon || null;
      const ogImageUrl = metadata.ogImage || null;
      
      console.log(`  Favicon: ${faviconUrl}`);
      console.log(`  OG Image: ${ogImageUrl}`);
      
      if (faviconUrl || ogImageUrl) {
        await client.query(
          'UPDATE public.roast_generations SET "faviconUrl" = COALESCE($1, "faviconUrl"), "ogImageUrl" = COALESCE($2, "ogImageUrl") WHERE id = $3',
          [faviconUrl, ogImageUrl, row.id]
        );
        console.log(`  Updated!`);
      }
    } else {
      console.log(`  Failed to scrape or no metadata found`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  await client.end();
  console.log('\nDone!');
}

main().catch(console.error);
