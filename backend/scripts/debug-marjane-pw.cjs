// Debug: try Marjane with Playwright (real browser bypasses Cloudflare)
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
    locale: 'fr-FR',
  });
  const page = await context.newPage();

  console.log('Trying Marjane with Playwright...');
  await page.goto('https://www.marjane.ma/courses-en-ligne', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const title = await page.title();
  console.log('Title:', title);
  console.log('URL:', page.url());

  // Check if we bypassed Cloudflare
  const isCloudflare = /cloudflare|attention required/i.test(title);
  console.log('Cloudflare blocked:', isCloudflare);

  if (!isCloudflare) {
    // Extract products
    const products = await page.evaluate(() => {
      const items = [];
      // JSON-LD
      document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
        try {
          const d = JSON.parse(s.textContent);
          const arr = Array.isArray(d) ? d : [d];
          arr.forEach(i => {
            if (i['@type'] === 'Product') items.push({ name: i.name, price: i.offers?.price });
          });
        } catch (e) {}
      });
      // Product cards
      document.querySelectorAll('[class*="product"], [class*="card"], [class*="item"]').forEach(c => {
        const name = c.querySelector('h2, h3, h4, img[alt]')?.textContent?.trim() || c.querySelector('img[alt]')?.getAttribute('alt');
        const priceText = c.querySelector('[class*="price"]')?.textContent;
        if (name && priceText) {
          const pm = priceText.match(/(\d+[.,]?\d*)\s*(?:DH|MAD)/i);
          if (pm) items.push({ name: name.substring(0, 80), price: parseFloat(pm[1].replace(',', '.')) });
        }
      });
      return items;
    });

    console.log('Products found:', products.length);
    products.slice(0, 10).forEach((p, i) => console.log(`  ${i+1}. ${p.name} — ${p.price} DH`));
  }

  await browser.close();
})();
