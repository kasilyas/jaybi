// Debug Marjane — check for API endpoints and anti-bot
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function tryUrl(url, label) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/json,*/*',
        'Accept-Language': 'fr-FR,fr;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
    });
    const text = await res.text();
    console.log(`[${res.status}] ${label}: ${url}`);
    console.log(`  Length: ${text.length}, Content-Type: ${res.headers.get('content-type')}`);

    // Check for Cloudflare
    if (/cloudflare|cf-ray|__cf_bm/i.test(text) || res.headers.get('server')?.includes('cloudflare')) {
      console.log(`  ⚠️ Cloudflare detected`);
    }
    if (res.headers.get('server')) console.log(`  Server: ${res.headers.get('server')}`);

    // Check for JSON
    if (res.headers.get('content-type')?.includes('json')) {
      const data = JSON.parse(text);
      console.log(`  JSON keys: ${Object.keys(data).slice(0, 10).join(', ')}`);
      if (data.products) console.log(`  Products: ${data.products.length}`);
    }

    // Check for product patterns
    const hasProducts = /product|produit|price|prix/i.test(text);
    const hasJsonLd = /application\/ld\+json/.test(text);
    console.log(`  Has products: ${hasProducts}, JSON-LD: ${hasJsonLd}`);

    // Show first 500 chars if 403
    if (res.status === 403) {
      console.log(`  First 500 chars: ${text.substring(0, 500)}`);
    }
    console.log('');
  } catch (e) {
    console.log(`[ERR] ${label}: ${e.message}\n`);
  }
}

(async () => {
  await tryUrl('https://www.marjane.ma/robots.txt', 'robots.txt');
  await tryUrl('https://www.marjane.ma/courses-en-ligne', 'courses-en-ligne');
  await tryUrl('https://www.marjane.ma/api/products', 'api/products');
  await tryUrl('https://www.marjane.ma/products.json?limit=5', 'products.json');
  // Try the mobile API
  await tryUrl('https://api.marjane.ma/api/v1/products', 'api.marjane.ma');
  // Try with different path
  await tryUrl('https://www.marjane.ma/courses-en-ligne/epicerie-sucree', 'epicerie-sucree');
})();
