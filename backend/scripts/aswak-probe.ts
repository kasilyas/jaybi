import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 720 },
})).newPage();
try {
  const resp = await page.goto('https://www.aswakdelivery.com/boutique/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  console.log('HTTP', resp?.status());
  await page.waitForTimeout(8000);
  console.log('TITLE:', await page.title());
  console.log('URL:', page.url());
  const info = await page.evaluate(() => ({
    bodyLen: document.body?.innerHTML?.length ?? 0,
    text: document.body?.innerText?.slice(0, 800),
    productEls: document.querySelectorAll('[class*="product"], [class*="Product"], [data-product]').length,
    ldJson: document.querySelectorAll('script[type="application/ld+json"]').length,
  }));
  console.log(JSON.stringify(info, null, 1));
} catch (e: any) { console.log('ERR:', e.message); }
await browser.close();
