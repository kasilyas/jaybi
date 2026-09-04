// Debug: fetch a Carrefour catalogue page from promomaroc.com
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

(async () => {
  const url = 'https://promomaroc.com/catalogue-carrefour-du-23-juillet-au-12-aout-2026/';
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const html = await res.text();
  console.log(`Status: ${res.status}, Length: ${html.length}`);

  // Extract <p> tags
  const pMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  console.log(`\n<p> tags: ${pMatches?.length || 0}`);
  if (pMatches) {
    pMatches.slice(0, 10).forEach((p, i) => {
      const text = p.replace(/<[^>]+>/g, '').trim();
      if (text.length > 20) console.log(`  ${i+1}. ${text.substring(0, 200)}`);
    });
  }

  // Extract <h2>, <h3> tags
  const hMatches = html.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi);
  console.log(`\n<h2/h3> tags: ${hMatches?.length || 0}`);
  if (hMatches) {
    hMatches.slice(0, 10).forEach((h, i) => {
      const text = h.replace(/<[^>]+>/g, '').trim();
      if (text.length > 5) console.log(`  ${i+1}. ${text.substring(0, 150)}`);
    });
  }

  // Check for prices anywhere
  const prices = html.match(/\d+[.,]?\d*\s*(?:dh|dhs|DH|MAD)/gi);
  console.log(`\nPrices found: ${prices?.length || 0}`);
  if (prices) console.log(`  First 10: ${prices.slice(0, 10).join(', ')}`);

  // Check for <li> tags with prices
  const liMatches = html.match(/<li[^>]*>[\s\S]*?\d+[.,]?\d*\s*(?:dh|DH)[\s\S]*?<\/li>/gi);
  console.log(`\n<li> with prices: ${liMatches?.length || 0}`);

  // Check for <span> or <div> with prices
  const spanPrices = html.match(/<span[^>]*>[\s\S]*?\d+[.,]?\d*\s*(?:dh|DH)[\s\S]*?<\/span>/gi);
  console.log(`<span> with prices: ${spanPrices?.length || 0}`);

  // Check for <strong> or <b> with prices
  const strongPrices = html.match(/<(?:strong|b)[^>]*>[\s\S]*?\d+[.,]?\d*\s*(?:dh|DH)[\s\S]*?<\/(?:strong|b)>/gi);
  console.log(`<strong/b> with prices: ${strongPrices?.length || 0}`);

  // Show a sample of the content around prices
  if (prices && prices.length > 0) {
    const firstPrice = prices[0];
    const idx = html.indexOf(firstPrice);
    if (idx > -1) {
      const context = html.substring(Math.max(0, idx - 200), idx + 100);
      console.log(`\nContext around first price "${firstPrice}":`);
      console.log(context.replace(/<[^>]+>/g, ' ').trim());
    }
  }

  // Check for images with alt text containing prices
  const imgAlts = html.match(/<img[^>]*alt="[^"]*\d+[^"]*"/gi);
  console.log(`\n<img> with numbers in alt: ${imgAlts?.length || 0}`);

  // Check for figure/figcaption
  const figCaptions = html.match(/<figcaption[^>]*>[\s\S]*?<\/figcaption>/gi);
  console.log(`<figcaption>: ${figCaptions?.length || 0}`);
})();
