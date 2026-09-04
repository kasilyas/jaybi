import { BaseAdapter } from '../baseAdapter.js';
import { ScrapedProduct } from '../types.js';

/**
 * Adaptateur Carrefour — carrefour.ma
 * Source : scraping HTML
 * Parsing similaire à Marjane avec sélecteurs spécifiques Carrefour.
 */
export class CarrefourAdapter extends BaseAdapter {
  readonly name = 'carrefour';
  readonly sourceType = 'scraper' as const;
  protected baseUrl = 'https://www.carrefour.ma';

  parsePage(html: string, city = 'Casablanca'): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];

    // Stratégie 1 : JSON-LD
    const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1].trim());
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item['@type'] === 'Product' || (Array.isArray(item['@type']) && item['@type'].includes('Product'))) {
            const p = this.parseJsonLdProduct(item, city);
            if (p) products.push(p);
          }
        }
      } catch { /* ignore */ }
    }

    // Stratégie 2 : cartes produit Carrefour
    const cardRegex = /<div[^>]*class="[^"]*(?:product-item|product-tile|cs-product|product)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const cardMatches = html.matchAll(cardRegex);
    for (const match of cardMatches) {
      const p = this.parseProductCard(match[1], city);
      if (p) products.push(p);
    }

    // Stratégie 3 : parsing générique (fallback)
    if (products.length === 0) {
      const generic = html.matchAll(/<a[^>]*title="([^"]+)"[^>]*>[\s\S]{0,800}?<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s\S]*?(\d+[.,]?\d*)\s*(?:DH|MAD)/gi);
      for (const match of generic) {
        products.push({
          source: this.name, sourceUrl: this.baseUrl, scrapedAt: new Date(),
          name: match[1].trim(), price: parseFloat(match[2].replace(',', '.')) || 0,
          available: true, city, storeName: 'Carrefour',
        });
      }
    }

    return products;
  }

  private parseJsonLdProduct(item: any, city: string): ScrapedProduct | null {
    try {
      const name = item.name;
      const price = item.offers?.price ?? item.offers?.[0]?.price;
      if (!name || !price) return null;
      return {
        source: this.name, sourceUrl: item.url || this.baseUrl, scrapedAt: new Date(),
        name, brand: item.brand?.name || (typeof item.brand === 'string' ? item.brand : undefined),
        category: item.category, image: item.image, ean: item.gtin13 || item.sku,
        price: parseFloat(price), available: !(item.offers?.availability || '').includes('OutOfStock'),
        city, storeName: 'Carrefour',
      };
    } catch { return null; }
  }

  private parseProductCard(card: string, city: string): ScrapedProduct | null {
    const nameMatch = card.match(/(?:title|alt|data-name)="([^"]+)"/i);
    const name = nameMatch?.[1]?.trim();
    if (!name) return null;

    const priceMatch = card.match(/(\d+[.,]?\d*)\s*(?:DH|MAD|درهم)/i);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;
    if (price <= 0) return null;

    const originalMatch = card.match(/<del[^>]*>[\s\S]*?(\d+[.,]?\d*)\s*(?:DH|MAD)/i)
      || card.match(/class="[^"]*(?:old|original|compare)[^"]*"[^>]*>[\s\S]*?(\d+[.,]?\d*)/i);
    const imgMatch = card.match(/<img[^>]*src="([^"]+)"/i);
    const brandMatch = card.match(/(?:data-brand|data-manufacturer)="([^"]+)"/i);
    const unavailable = /(?:rupture|out\s*of\s*stock|indisponible)/i.test(card);

    return {
      source: this.name, sourceUrl: this.baseUrl, scrapedAt: new Date(),
      name, brand: brandMatch?.[1]?.trim(), image: imgMatch?.[1],
      price, originalPrice: originalMatch ? parseFloat(originalMatch[1].replace(',', '.')) : undefined,
      available: !unavailable, city, storeName: 'Carrefour',
    };
  }

  async scrape(): Promise<ScrapedProduct[]> {
    const allProducts: ScrapedProduct[] = [];
    const errors: { message: string; url?: string; timestamp: string }[] = [];

    const allowed = await this.checkRobotsTxt(this.baseUrl);
    if (!allowed) {
      errors.push({ message: 'robots.txt interdit', timestamp: new Date().toISOString() });
      return [];
    }

    const categories = ['/courses-en-ligne/epicerie', '/courses-en-ligne/boissons', '/courses-en-ligne/frais'];
    for (const cat of categories) {
      for (let page = 1; page <= this.maxPages; page++) {
        try {
          const url = `${this.baseUrl}${cat}?p=${page}`;
          const html = await this.fetchWithRetry(url);
          const products = this.parsePage(html);
          if (products.length === 0) break;
          allProducts.push(...products);
          await this.rateLimit();
        } catch (err: any) {
          errors.push({ message: err.message, url: cat, timestamp: new Date().toISOString() });
          break;
        }
      }
    }

    if (errors.length > 0) console.warn(`[scraping:${this.name}] ${errors.length} erreurs`);
    return allProducts;
  }
}
