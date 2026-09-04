// Debug: extract <li> content from Carrefour catalogue page
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

(async () => {
  const url = 'https://promomaroc.com/catalogue-carrefour-du-23-juillet-au-12-aout-2026/';
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const html = await res.text();

  // Extract <li> tags with prices
  const liMatches = html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  let count = 0;
  for (const m of liMatches) {
    const text = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (/\d+[.,]?\d*\s*(?:dh|DH)/i.test(text) && text.length > 10) {
      count++;
      if (count <= 20) console.log(`${count}. ${text.substring(0, 200)}`);
    }
  }
  console.log(`\nTotal <li> with prices: ${count}`);

  // Also check img alt attributes with prices
  const imgMatches = html.matchAll(/<img[^>]*alt="([^"]*\d+[^"]*)"[^>]*>/gi);
  let imgCount = 0;
  for (const m of imgMatches) {
    const alt = m[1].trim();
    if (/\d/.test(alt) && alt.length > 10) {
      imgCount++;
      if (imgCount <= 10) console.log(`\nIMG ${imgCount}. ${alt.substring(0, 200)}`);
    }
  }
  console.log(`\nTotal <img> alt with numbers: ${imgCount}`);
})();
