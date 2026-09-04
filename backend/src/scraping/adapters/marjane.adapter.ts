import { BaseAdapter } from '../baseAdapter.js';
import { ScrapedProduct } from '../types.js';

/**
 * Adaptateur Marjane — https://www.marjane.ma/courses-en-ligne
 *
 * Source vérifiée : e-commerce direct avec 7000+ produits, prix et promos visibles.
 * Le site bloque les User-Agents de bots (403) — on utilise un UA navigateur réaliste.
 *
 * Parsing : JSON-LD (Schema.org Product) + cartes produit + fallback générique.
 * Séparation parsePage(html) / scrape() pour tests avec fixtures.
 */
export class MarjaneAdapter extends BaseAdapter {
  readonly name = 'marjane';
  readonly sourceType = 'scraper' as const;
  protected baseUrl = 'https://www.marjane.ma/courses-en-ligne';
  // Marjane bloque les bots — UA navigateur réaliste requis
  protected userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

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

    // Stratégie 2 : cartes produit (data-attributes ou classes CSS)
    const cardRegex = /<div[^>]*class="[^"]*(?:product-card|product-item|product-tile|product)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const cardMatches = html.matchAll(cardRegex);
    for (const match of cardMatches) {
      const p = this.parseProductCard(match[1], city);
      if (p) products.push(p);
    }

    // Stratégie 3 : parsing générique (fallback si rien trouvé)
    if (products.length === 0) {
      const genericMatches = html.matchAll(/<[^>]*(?:data-name|title|alt)="([^"]+)"[^>]*>[\s\S]{0,500}?<[^>]*class="[^"]*price[^"]*"[^>]*>[\s\S]*?(\d+[.,]?\d*)\s*(?:DH|MAD|درهم)/gi);
      for (const match of genericMatches) {
        products.push({
          source: this.name, sourceUrl: this.baseUrl, scrapedAt: new Date(),
          name: match[1].trim(), price: parseFloat(match[2].replace(',', '.')) || 0,
          available: true, city, storeName: 'Marjane',
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
    const nameMatch = card.match(/(?:data-product-name|title|alt)="([^"]+)"/i);
    const name = nameMatch?.[1]?.trim();
    if (!name) return null;

    const priceMatch = card.match(/(\d+[.,]?\d*)\s*(?:DH|MAD|درهم)/i);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;
    if (price <= 0) return null;

    const originalMatch = card.match(/<del[^>]*>[\s\S]*?(\d+[.,]?\d*)\s*(?:DH|MAD)/i)
      || card.match(/<span[^>]*class="[^"]*(?:old-price|original-price|compare-price)[^"]*"[^>]*>[\s\S]*?(\d+[.,]?\d*)/i);
    const imgMatch = card.match(/<img[^>]*src="([^"]+)"/i);
    const brandMatch = card.match(/(?:data-brand|data-manufacturer)="([^"]+)"/i)
      || card.match(/<span[^>]*class="[^"]*brand[^"]*"[^>]*>([^<]+)</i);
    const unavailable = /(?:rupture|out\s*of\s*stock|indisponible|épuisé)/i.test(card);

    return {
      source: this.name, sourceUrl: this.baseUrl, scrapedAt: new Date(),
      name, brand: brandMatch?.[1]?.trim(), image: imgMatch?.[1],
      price, originalPrice: originalMatch ? parseFloat(originalMatch[1].replace(',', '.')) : undefined,
      available: !unavailable, city, storeName: 'Marjane',
    };
  }

  async scrape(): Promise<ScrapedProduct[]> {
    const allProducts: ScrapedProduct[] = [];
    const errors: { message: string; url?: string; timestamp: string }[] = [];

    // Vérifie robots.txt
    const allowed = await this.checkRobotsTxt('https://www.marjane.ma');
    if (!allowed) {
      errors.push({ message: 'robots.txt interdit le scraping', timestamp: new Date().toISOString() });
      console.warn(`[scraping:${this.name}] robots.txt interdit`);
      return [];
    }

    // Scrape les pages catégorie
    const categories = ['', '/epicerie', '/boissons', '/frais', '/hygiene'];
    for (const cat of categories) {
      for (let page = 1; page <= this.maxPages; page++) {
        try {
          const url = page === 1
            ? `${this.baseUrl}${cat}`
            : `${this.baseUrl}${cat}?page=${page}`;
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

    if (errors.length > 0) {
      console.warn(`[scraping:${this.name}] ${errors.length} erreurs:`, errors);
    }

    return allProducts;
  }
}
