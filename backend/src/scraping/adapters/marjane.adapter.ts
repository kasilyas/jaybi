import { BaseAdapter } from '../baseAdapter.js';
import { ScrapedProduct } from '../types.js';

/**
 * Adaptateur Marjane — marjane.ma
 * Source : scraping HTML (site e-commerce)
 * Parsing basé sur la structure produit courante des sites e-commerce marocains.
 *
 * Séparation parsing/fetching : parsePage() est testable avec fixtures HTML.
 */
export class MarjaneAdapter extends BaseAdapter {
  readonly name = 'marjane';
  readonly sourceType = 'scraper' as const;
  protected baseUrl = 'https://www.marjane.ma';

  /**
   * Parse une page HTML et extrait les produits.
   * Public pour les tests avec fixtures.
   */
  parsePage(html: string, city = 'Casablanca'): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];

    // Stratégie 1 : JSON-LD structured data (Schema.org Product)
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
      } catch { /* ignore invalid JSON */ }
    }

    // Stratégie 2 : data attributes (data-product-name, data-product-price)
    const productRegex = /<div[^>]*class="[^"]*(?:product-card|product|item-card)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const cardMatches = html.matchAll(productRegex);
    for (const match of cardMatches) {
      const p = this.parseProductCard(match[1], city);
      if (p) products.push(p);
    }

    // Stratégie 3 : parsing générique par patterns prix (fallback)
    if (products.length === 0) {
      const genericMatches = html.matchAll(/<[^>]*(?:data-name|title|alt)="([^"]+)"[^>]*>[\s\S]{0,500}?<[^>]*class="[^"]*price[^"]*"[^>]*>[\s\S]*?(\d+[.,]?\d*)\s*(?:DH|MAD|درهم)/gi);
      for (const match of genericMatches) {
        products.push({
          source: this.name,
          sourceUrl: this.baseUrl,
          scrapedAt: new Date(),
          name: match[1].trim(),
          price: parseFloat(match[2].replace(',', '.')) || 0,
          available: true,
          city,
          storeName: 'Marjane',
        });
      }
    }

    return products;
  }

  private parseJsonLdProduct(item: any, city: string): ScrapedProduct | null {
    try {
      const name = item.name || item['name'];
      const price = item.offers?.price ?? item.offers?.[0]?.price;
      if (!name || !price) return null;

      const availability = item.offers?.availability ?? item.offers?.[0]?.availability ?? '';
      const available = !availability.includes('OutOfStock');

      return {
        source: this.name,
        sourceUrl: item.url || this.baseUrl,
        scrapedAt: new Date(),
        name,
        brand: item.brand?.name || (typeof item.brand === 'string' ? item.brand : undefined),
        category: item.category || undefined,
        image: item.image || undefined,
        ean: item.gtin13 || item.sku || undefined,
        price: parseFloat(price),
        originalPrice: item.offers?.priceSpecification?.[0]?.price ?? undefined,
        available,
        city,
        storeName: 'Marjane',
      };
    } catch {
      return null;
    }
  }

  private parseProductCard(card: string, city: string): ScrapedProduct | null {
    // Extrait nom
    const nameMatch = card.match(/(?:data-product-name|title|alt)="([^"]+)"/i);
    const name = nameMatch?.[1]?.trim();
    if (!name) return null;

    // Extrait prix
    const priceMatch = card.match(/(\d+[.,]?\d*)\s*(?:DH|MAD|درهم)/i);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;
    if (price <= 0) return null;

    // Extrait prix barré (promo)
    const originalMatch = card.match(/<del[^>]*>[\s\S]*?(\d+[.,]?\d*)\s*(?:DH|MAD)/i)
      || card.match(/<span[^>]*class="[^"]*(?:old-price|original-price|compare-price)[^"]*"[^>]*>[\s\S]*?(\d+[.,]?\d*)/i);
    const originalPrice = originalMatch ? parseFloat(originalMatch[1].replace(',', '.')) : undefined;

    // Extrait image
    const imgMatch = card.match(/<img[^>]*src="([^"]+)"/i);
    const image = imgMatch?.[1];

    // Extrait marque
    const brandMatch = card.match(/(?:data-brand|data-manufacturer)="([^"]+)"/i)
      || card.match(/<span[^>]*class="[^"]*brand[^"]*"[^>]*>([^<]+)</i);
    const brand = brandMatch?.[1]?.trim();

    // Disponibilité
    const unavailable = /(?:rupture|out\s*of\s*stock|indisponible|épuisé)/i.test(card);

    return {
      source: this.name,
      sourceUrl: this.baseUrl,
      scrapedAt: new Date(),
      name,
      brand,
      image,
      price,
      originalPrice,
      available: !unavailable,
      city,
      storeName: 'Marjane',
    };
  }

  async scrape(): Promise<ScrapedProduct[]> {
    const config = { maxPages: this.maxPages };
    const allProducts: ScrapedProduct[] = [];
    const errors: { message: string; url?: string; timestamp: string }[] = [];

    // Vérifie robots.txt
    const allowed = await this.checkRobotsTxt(this.baseUrl);
    if (!allowed) {
      errors.push({ message: 'robots.txt interdit le scraping', timestamp: new Date().toISOString() });
      return [];
    }

    // Scrape les pages catégorie
    const categories = ['/courses-en-ligne', '/courses-en-ligne/epicerie', '/courses-en-ligne/boissons'];
    for (const cat of categories) {
      for (let page = 1; page <= config.maxPages; page++) {
        try {
          const url = page === 1 ? `${this.baseUrl}${cat}` : `${this.baseUrl}${cat}?page=${page}`;
          const html = await this.fetchWithRetry(url);
          const products = this.parsePage(html);
          if (products.length === 0) break; // plus de produits → fin pagination
          allProducts.push(...products);
          await this.rateLimit();
        } catch (err: any) {
          errors.push({ message: err.message, url: cat, timestamp: new Date().toISOString() });
          break; // passe à la catégorie suivante
        }
      }
    }

    if (errors.length > 0) {
      console.warn(`[scraping:${this.name}] ${errors.length} erreurs:`, errors);
    }

    return allProducts;
  }
}
