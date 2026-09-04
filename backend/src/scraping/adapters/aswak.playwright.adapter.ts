import { ScrapedProduct } from '../types.js';

/**
 * Adaptateur Aswak utilisant Playwright pour le rendu JS (SPA).
 *
 * aswakdelivery.com est une SPA (React/Vue) — le HTML statique ne contient
 * pas les produits. Playwright rend le JS et extrait les produits du DOM
 * rendu.
 *
 * Usage :
 *   const adapter = new AswakPlaywrightAdapter();
 *   const products = await adapter.scrape();
 *
 * Note : nécessite Playwright installé (npx playwright install chromium).
 * Plus lent qu'un fetch HTTP mais nécessaire pour les SPA.
 */
export class AswakPlaywrightAdapter {
  readonly name = 'aswak';
  readonly sourceType = 'scraper' as const;
  private baseUrl = 'https://www.aswakdelivery.com';
  private maxPages = 10;
  private timeoutMs = 30000;

  /**
   * Scrape les produits en rendant la SPA avec Playwright.
   */
  async scrape(): Promise<ScrapedProduct[]> {
    // Import dynamique — Playwright n'est pas toujours disponible (tests unitaires)
    const { chromium } = await import('playwright');

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();
    const products: ScrapedProduct[] = [];
    const errors: { message: string; url?: string; timestamp: string }[] = [];

    try {
      // 1. Page d'accueil — sélectionner la ville (Casablanca)
      await page.goto(this.baseUrl, { waitUntil: 'networkidle', timeout: this.timeoutMs });
      await page.waitForTimeout(2000);

      // Cliquer sur le sélecteur de ville et choisir Casablanca
      const citySelector = page.locator('text=/casablanca/i').first();
      if (await citySelector.isVisible({ timeout: 5000 }).catch(() => false)) {
        await citySelector.click();
        await page.waitForTimeout(2000);
      }

      // 2. Naviguer vers les catégories produit
      const categories = ['/boutique/', '/categorie/epicerie/', '/categorie/boissons/', '/categorie/frais/'];

      for (const cat of categories) {
        try {
          const url = `${this.baseUrl}${cat}`;
          await page.goto(url, { waitUntil: 'networkidle', timeout: this.timeoutMs });
          await page.waitForTimeout(3000); // Attendre le rendu SPA

          // Extraire les produits du DOM rendu
          const pageProducts = await this.extractProductsFromPage(page);
          products.push(...pageProducts);

          // Pagination — chercher le bouton "suivant"
          for (let p = 2; p <= this.maxPages; p++) {
            const nextBtn = page.locator('button, a', { hasText: /suivant|next|>/i }).first();
            if (!(await nextBtn.isVisible({ timeout: 2000 }).catch(() => false))) break;
            await nextBtn.click();
            await page.waitForTimeout(2000);
            const moreProducts = await this.extractProductsFromPage(page);
            if (moreProducts.length === 0) break;
            products.push(...moreProducts);
          }
        } catch (err: any) {
          errors.push({ message: err.message, url: cat, timestamp: new Date().toISOString() });
        }
      }
    } catch (err: any) {
      errors.push({ message: err.message, url: this.baseUrl, timestamp: new Date().toISOString() });
    } finally {
      await browser.close();
    }

    if (errors.length > 0) {
      console.warn(`[scraping:aswak-playwright] ${errors.length} erreurs:`, errors);
    }

    return products;
  }

  /**
   * Extrait les produits du DOM rendu par Playwright.
   * Le code dans page.evaluate() s'exécute dans le navigateur (pas Node).
   */
  private async extractProductsFromPage(page: import('playwright').Page): Promise<ScrapedProduct[]> {
    // Le code evaluate s'exécute côté navigateur — on utilise une fonction stringifiée
    // pour éviter les erreurs de type TypeScript (document/window non disponibles en Node)
    const extractFn = `
      () => {
        const products = [];

        // Stratégie 1 : JSON-LD dans le DOM rendu
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        scripts.forEach(script => {
          try {
            const data = JSON.parse(script.textContent || '');
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
              if (item['@type'] === 'Product' || (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
                const name = item.name;
                const price = item.offers?.price ?? item.offers?.[0]?.price;
                if (name && price) {
                  products.push({
                    source: 'aswak',
                    sourceUrl: item.url || window.location.href,
                    scrapedAt: new Date().toISOString(),
                    name,
                    brand: item.brand?.name || (typeof item.brand === 'string' ? item.brand : undefined),
                    category: item.category || undefined,
                    image: item.image || undefined,
                    ean: item.gtin13 || item.sku || undefined,
                    price: parseFloat(price),
                    available: !(item.offers?.availability || '').includes('OutOfStock'),
                    city: 'Casablanca',
                    storeName: 'Aswak Assalam',
                  });
                }
              }
            }
          } catch (e) { /* ignore */ }
        });

        // Stratégie 2 : cartes produit dans le DOM rendu
        if (products.length === 0) {
          const cards = document.querySelectorAll('[class*="product"], [class*="item"], [class*="card"], [data-product]');
          cards.forEach(card => {
            const nameEl = card.querySelector('h2, h3, h4, [class*="name"], [class*="title"], img[alt]');
            const name = nameEl?.textContent?.trim() || nameEl?.getAttribute('alt')?.trim();
            if (!name || name.length < 3) return;

            const priceEl = card.querySelector('[class*="price"], .price');
            const priceText = priceEl?.textContent || '';
            const priceMatch = priceText.match(/(\\d+[.,]?\\d*)\\s*(?:DH|MAD|درهم)/i);
            const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;
            if (price <= 0) return;

            const imgEl = card.querySelector('img');
            const originalEl = card.querySelector('del, [class*="old"], [class*="original"]');
            const originalMatch = originalEl?.textContent?.match(/(\\d+[.,]?\\d*)/);
            const unavailable = /rupture|indisponible|épuisé/i.test(card.textContent || '');

            products.push({
              source: 'aswak',
              sourceUrl: window.location.href,
              scrapedAt: new Date().toISOString(),
              name,
              image: imgEl?.getAttribute('src') || undefined,
              price,
              originalPrice: originalMatch ? parseFloat(originalMatch[1].replace(',', '.')) : undefined,
              available: !unavailable,
              city: 'Casablanca',
              storeName: 'Aswak Assalam',
            });
          });
        }

        return products;
      }
    `;

    const result = await page.evaluate(extractFn);
    return result as ScrapedProduct[];
  }
}
