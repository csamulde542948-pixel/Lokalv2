import { Client } from 'pg';

const client = new Client({ 
  connectionString: 'postgresql://postgres.cdglgwuquklscfwivfcj:MxWbLOHpPt379ZDK@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true' 
});

async function scrapeMetadata(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error('HTTP error for ' + url + ':', response.status);
      return null;
    }
    
    const html = await response.text();
    
    const faviconMatch = html.match(/<link[^>]*rel=["']icon["'][^>]*href=["']([^"']+)["']/i) ||
                         html.match(/<link[^>]*rel=["']shortcut.icon["'][^>]*href=["']([^"']+)["']/i);
    
    let faviconUrl = faviconMatch ? faviconMatch[1] : null;
    
    if (faviconUrl && !faviconUrl.startsWith('http')) {
      const baseUrl = new URL(url);
      if (faviconUrl.startsWith('/')) {
        faviconUrl = baseUrl.protocol + '//' + baseUrl.host + faviconUrl;
      } else {
        faviconUrl = baseUrl.protocol + '//' + baseUrl.host + '/' + faviconUrl;
      }
    }
    
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                     html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    
    const ogImageUrl = ogMatch ? ogMatch[1] : null;
    
    return { faviconUrl, ogImageUrl };
  } catch (error) {
    console.error('Error fetching ' + url + ':', error);
    return null;
  }
}

async function main() {
  await client.connect();
  
  const roasts = await client.query('SELECT id, "projectUrl" FROM public.roast_generations WHERE "faviconUrl" IS NULL OR "ogImageUrl" IS NULL');
  
  console.log('Found ' + roasts.rows.length + ' roasts to update');
  
  for (const row of roasts.rows) {
    const url = row.projectUrl;
    console.log('\nScraping: ' + url);
    
    const data = await scrapeMetadata(url);
    
    if (data) {
      console.log('  Favicon: ' + data.faviconUrl);
      console.log('  OG Image: ' + data.ogImageUrl);
      
      await client.query(
        'UPDATE public.roast_generations SET "faviconUrl" = COALESCE($1, "faviconUrl"), "ogImageUrl" = COALESCE($2, "ogImageUrl") WHERE id = $3',
        [data.faviconUrl, data.ogImageUrl, row.id]
      );
      console.log('  Updated!');
    } else {
      console.log('  Failed to scrape');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  await client.end();
  console.log('\nDone!');
}

main().catch(console.error);
