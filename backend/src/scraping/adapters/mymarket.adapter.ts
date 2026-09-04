import { BaseAdapter } from '../baseAdapter.js';
import { ScrapedProduct } from '../types.js';

/**
 * Adaptateur MyMarket — https://mymarket.ma
 *
 * Source vérifiée : hypermarché en ligne, 10000 produits, livraison Casa + tout Maroc.
 * Site accessible (pas de 403), structure type WooCommerce/Shopify.
 *
 * Parsing : JSON-LD + cartes produit + fallback générique.
 */
export class MyMarketAdapter extends BaseAdapter {
  readonly name = 'mymarket';
  readonly sourceType = 'scraper' as const;
  protected baseUrl = 'https://mymarket.ma';
  protected userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

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

    // Stratégie 2 : cartes produit (WooCommerce type)
    const cardRegex = /<div[^>]*class="[^"]*(?:product|product-item|wc-block|item)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const cardMatches = html.matchAll(cardRegex);
    for (const match of cardMatches) {
      const p = this.parseProductCard(match[1], city);
      if (p) products.push(p);
    }

    // Stratégie 3 : générique
    if (products.length === 0) {
      const generic = html.matchAll(/<a[^>]*href="([^"]*produit[^"]*)"[^>]*>[\s\S]{0,300}?<[^>]*>([^<]{3,80})<[\s\S]{0,300}?<span[^>]*class="[^"]*price[^"]*"[^>]*>[\s\S]*?(\d+[.,]?\d*)\s*(?:DH|MAD|درهم)/gi);
      for (const match of generic) {
        products.push({
          source: this.name, sourceUrl: match[1] || this.baseUrl, scrapedAt: new Date(),
          name: match[2].trim(), price: parseFloat(match[3].replace(',', '.')) || 0,
          available: true, city, storeName: 'MyMarket',
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
        city, storeName: 'MyMarket',
      };
    } catch { return null; }
  }

  private parseProductCard(card: string, city: string): ScrapedProduct | null {
    const nameMatch = card.match(/(?:title|alt|data-name)="([^"]+)"/i)
      || card.match(/<h[2-4][^>]*>([^<]+)</i);
    const name = nameMatch?.[1]?.trim();
    if (!name) return null;

    const priceMatch = card.match(/(\d+[.,]?\d*)\s*(?:DH|MAD|درهم)/i);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 0;
    if (price <= 0) return null;

    const originalMatch = card.match(/<del[^>]*>[\s\S]*?(\d+[.,]?\d*)\s*(?:DH|MAD)/i)
      || card.match(/class="[^"]*(?:old|original|compare|regular)[^"]*"[^>]*>[\s\S]*?(\d+[.,]?\d*)/i);
    const imgMatch = card.match(/<img[^>]*src="([^"]+)"/i);
    const brandMatch = card.match(/(?:data-brand|data-manufacturer)="([^"]+)"/i);
    const unavailable = /(?:rupture|out\s*of\s*stock|indisponible|épuisé)/i.test(card);

    return {
      source: this.name, sourceUrl: this.baseUrl, scrapedAt: new Date(),
      name, brand: brandMatch?.[1]?.trim(), image: imgMatch?.[1],
      price, originalPrice: originalMatch ? parseFloat(originalMatch[1].replace(',', '.')) : undefined,
      available: !unavailable, city, storeName: 'MyMarket',
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

    // Catégories MyMarket (vérifiées sur le site)
    const categories = [
      '/categorie-produit/epicerie-sucree/',
      '/categorie-produit/epicerie-salee/',
      '/categorie-produit/boissons/',
      '/categorie-produit/cremerie/',
      '/categorie-produit/hygiene-et-beaute/',
      '/categorie-produit/entretien-et-maison/',
    ];

    for (const cat of categories) {
      for (let page = 1; page <= this.maxPages; page++) {
        try {
          const url = page === 1 ? `${this.baseUrl}${cat}` : `${this.baseUrl}${cat}page/${page}/`;
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
