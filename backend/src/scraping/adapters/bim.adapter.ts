import { BaseAdapter } from '../baseAdapter.js';
import { ScrapedProduct } from '../types.js';

/**
 * Adaptateur BIM — bim.ma
 * Source : scraping HTML (site limité, peu de prix en ligne)
 * Fallback : import CSV si scraping bloqué.
 */
export class BimAdapter extends BaseAdapter {
  readonly name = 'bim';
  readonly sourceType = 'scraper' as const;
  protected baseUrl = 'https://www.bim.ma';

  parsePage(html: string, city = 'Casablanca'): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];

    // BIM a un site plus simple — parsing générique
    const cardRegex = /<div[^>]*class="[^"]*(?:product|item|card)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const cardMatches = html.matchAll(cardRegex);
    for (const match of cardMatches) {
      const card = match[1];
      const nameMatch = card.match(/(?:title|alt|data-name)="([^"]+)"/i)
        || card.match(/<h[2-4][^>]*>([^<]+)</i);
      const name = nameMatch?.[1]?.trim();
      if (!name) continue;

      const priceMatch = card.match(/(\d+[.,]?\d*)\s*(?:DH|MAD|درهم)/i);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;
      if (price <= 0) continue;

      const imgMatch = card.match(/<img[^>]*src="([^"]+)"/i);
      const unavailable = /(?:rupture|indisponible|épuisé)/i.test(card);

      products.push({
        source: this.name, sourceUrl: this.baseUrl, scrapedAt: new Date(),
        name, image: imgMatch?.[1], price, available: !unavailable,
        city, storeName: 'BIM',
      });
    }

    // Fallback : parsing générique par patterns
    if (products.length === 0) {
      const generic = html.matchAll(/<[^>]*(?:title|alt)="([^"]+)"[^>]*>[\s\S]{0,500}?(\d+[.,]?\d*)\s*(?:DH|MAD)/gi);
      for (const match of generic) {
        products.push({
          source: this.name, sourceUrl: this.baseUrl, scrapedAt: new Date(),
          name: match[1].trim(), price: parseFloat(match[2].replace(',', '.')) || 0,
          available: true, city, storeName: 'BIM',
        });
      }
    }

    return products;
  }

  async scrape(): Promise<ScrapedProduct[]> {
    const errors: { message: string; url?: string; timestamp: string }[] = [];

    const allowed = await this.checkRobotsTxt(this.baseUrl);
    if (!allowed) {
      errors.push({ message: 'robots.txt interdit', timestamp: new Date().toISOString() });
      return [];
    }

    const allProducts: ScrapedProduct[] = [];
    try {
      const html = await this.fetchWithRetry(`${this.baseUrl}/nos-produits`);
      const products = this.parsePage(html);
      allProducts.push(...products);
    } catch (err: any) {
      errors.push({ message: err.message, url: this.baseUrl, timestamp: new Date().toISOString() });
      // BIM bloque souvent → on log et retourne vide (fallback CSV)
      console.warn(`[scraping:bim] Scraping échoué (anti-bot probable). Utiliser import CSV.`);
    }

    return allProducts;
  }
}
