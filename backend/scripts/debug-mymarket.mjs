// Debug: fetch MyMarket to find correct URL structure
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function tryUrl(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const html = await res.text();
    const products = html.match(/href="\/products\/[^"]+"/g);
    const collections = html.match(/href="\/collections\/[^"]+"/g);
    const hasPrice = /\d+[.,]?\d*\s*(?:DH|MAD)/i.test(html);
    console.log(`[${res.status}] ${url}`);
    console.log(`  HTML: ${html.length} chars, prices: ${hasPrice}`);
    if (collections) {
      const unique = [...new Set(collections)].slice(0, 15);
      console.log(`  Collections (${unique.length}):`, unique.map(c => c.replace('href="', '').replace('"', '')).join(', '));
    }
    if (products) {
      console.log(`  Products: ${products.length} found`);
      products.slice(0, 5).forEach(p => console.log(`    ${p}`));
    }
    return html;
  } catch (e) {
    console.log(`[ERR] ${url}: ${e.message}`);
    return null;
  }
}

(async () => {
  // Try different URL patterns (Shopify structure)
  await tryUrl('https://www.mymarket.ma/collections/all');
  console.log('---');
  await tryUrl('https://www.mymarket.ma/collections/epicerie');
  console.log('---');
  await tryUrl('https://www.mymarket.ma/collections/epicerie-salee');
  console.log('---');
  // Try the sitemap
  await tryUrl('https://www.mymarket.ma/sitemap.xml');
  console.log('---');
  // Try products.json (Shopify endpoint)
  await tryUrl('https://www.mymarket.ma/products.json?limit=5');
})();
