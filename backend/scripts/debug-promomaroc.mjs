// Debug promomaroc.com structure
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function tryUrl(url, label) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const html = await res.text();
    console.log(`[${res.status}] ${label}: ${url} (${html.length} chars)`);

    // Find catalogue links
    const links = html.match(/href="[^"]*catalogue[^"]*"/gi);
    if (links) {
      const unique = [...new Set(links)].slice(0, 15);
      console.log(`  Catalogue links (${unique.length}):`);
      unique.forEach(l => console.log(`    ${l}`));
    }

    // Find carrefour-related links
    const carrefourLinks = html.match(/href="[^"]*carrefour[^"]*"/gi);
    if (carrefourLinks) {
      const unique = [...new Set(carrefourLinks)].slice(0, 10);
      console.log(`  Carrefour links (${unique.length}):`);
      unique.forEach(l => console.log(`    ${l}`));
    }

    // Check for prices in text
    const prices = html.match(/\d+[.,]?\d*\s*(?:DH|dh|MAD)/g);
    if (prices) console.log(`  Prices found: ${prices.length} (first 5: ${prices.slice(0, 5).join(', ')})`);

    // Check for product/article patterns
    const hasArticles = /<article|<h[12][^>]*>.*catalogue/i.test(html);
    console.log(`  Has articles: ${hasArticles}`);
    console.log('');
  } catch (e) {
    console.log(`[ERR] ${label}: ${e.message}\n`);
  }
}

(async () => {
  await tryUrl('https://promomaroc.com', 'homepage');
  await tryUrl('https://promomaroc.com/tag/carrefour/', 'tag/carrefour');
  await tryUrl('https://promomaroc.com/category/carrefour/', 'category/carrefour');
  await tryUrl('https://promomaroc.com/carrefour/', 'carrefour');
})();
