import { BaseAdapter } from '../baseAdapter.js';
import { ScrapedProduct } from '../types.js';

/**
 * Adaptateur MyMarket — https://www.mymarket.ma
 *
 * Source vérifiée : hypermarché en ligne, 10000 produits, livraison tout Maroc.
 * Site Shopify — utilise l'endpoint /products.json (API publique Shopify).
 *
 * Avantage : pas de parsing HTML, JSON structuré avec prix, marque (vendor),
 * disponibilité, images, et barcode (EAN).
 *
 * L'endpoint /products.json?limit=250&page=N retourne jusqu'à 250 produits
 * par page. On pagine pour récupérer tous les produits.
 */
export class MyMarketAdapter extends BaseAdapter {
  readonly name = 'mymarket';
  readonly sourceType = 'api' as const; // API Shopify, pas scraping HTML
  protected baseUrl = 'https://www.mymarket.ma';
  protected userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  protected maxPages = 40; // 40 pages × 250 = 10000 produits max

  /**
   * Parse une page HTML (fallback si l'API ne fonctionne pas).
   * Public pour les tests avec fixtures.
   */
  parsePage(html: string, city = 'Casablanca'): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];

    // JSON-LD
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

    // Cartes produit (Shopify)
    const cardRegex = /<div[^>]*class="[^"]*(?:product|product-item|card|grid-item)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const cardMatches = html.matchAll(cardRegex);
    for (const match of cardMatches) {
      const p = this.parseProductCard(match[1], city);
      if (p) products.push(p);
    }

    return products;
  }

  /**
   * Parse un produit Shopify JSON vers ScrapedProduct.
   * Public pour les tests.
   */
  parseShopifyProduct(item: any, city = 'Casablanca'): ScrapedProduct | null {
    try {
      const variant = item.variants?.[0];
      const price = parseFloat(variant?.price || '0');
      if (!item.title || price <= 0) return null;

      const compareAt = parseFloat(variant?.compare_at_price || '0');
      const hasPromo = compareAt > 0 && compareAt > price;

      return {
        source: this.name,
        sourceUrl: `${this.baseUrl}/products/${item.handle}`,
        scrapedAt: new Date(),
        name: item.title,
        brand: item.vendor || undefined,
        category: item.product_type || undefined,
        image: item.images?.[0]?.src || undefined,
        ean: variant?.barcode || undefined,
        price,
        originalPrice: hasPromo ? compareAt : undefined,
        promotionLabel: hasPromo ? 'Promo MyMarket' : undefined,
        available: variant?.available !== false,
        city,
        storeName: 'MyMarket',
      };
    } catch {
      return null;
    }
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
    const unavailable = /(?:rupture|out\s*of\s*stock|indisponible|épuisé)/i.test(card);

    return {
      source: this.name, sourceUrl: this.baseUrl, scrapedAt: new Date(),
      name, image: imgMatch?.[1],
      price, originalPrice: originalMatch ? parseFloat(originalMatch[1].replace(',', '.')) : undefined,
      available: !unavailable, city, storeName: 'MyMarket',
    };
  }

  /**
   * Scrape via l'API Shopify /products.json (méthode principale).
   * Fallback sur scraping HTML si l'API échoue.
   */
  async scrape(): Promise<ScrapedProduct[]> {
    const allProducts: ScrapedProduct[] = [];
    const errors: { message: string; url?: string; timestamp: string }[] = [];

    // Vérifie robots.txt
    const allowed = await this.checkRobotsTxt(this.baseUrl);
    if (!allowed) {
      errors.push({ message: 'robots.txt interdit', timestamp: new Date().toISOString() });
      console.warn(`[scraping:${this.name}] robots.txt interdit`);
      return [];
    }

    // Méthode 1 : API Shopify /products.json (préféré — JSON structuré)
    console.log(`[scraping:${this.name}] Récupération via API Shopify /products.json...`);
    for (let page = 1; page <= this.maxPages; page++) {
      try {
        const url = `${this.baseUrl}/products.json?limit=250&page=${page}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': this.userAgent },
        });
        clearTimeout(timeout);

        if (!res.ok) {
          if (res.status === 403) {
            console.warn(`[scraping:${this.name}] API bloquée (403) page ${page}`);
            break;
          }
          break;
        }

        const data = await res.json() as any;
        const items = data.products || [];
        if (items.length === 0) {
          console.log(`[scraping:${this.name}] Page ${page}: 0 produits — fin pagination`);
          break;
        }

        for (const item of items) {
          const p = this.parseShopifyProduct(item);
          if (p) allProducts.push(p);
        }

        console.log(`[scraping:${this.name}] Page ${page}: ${items.length} produits (total: ${allProducts.length})`);

        if (items.length < 250) break; // dernière page
        await this.rateLimit();
      } catch (err: any) {
        errors.push({ message: err.message, url: `page ${page}`, timestamp: new Date().toISOString() });
        break;
      }
    }

    // Méthode 2 : fallback scraping HTML si l'API retourne 0 produits
    if (allProducts.length === 0) {
      console.log(`[scraping:${this.name}] API vide — fallback scraping HTML...`);
      const collections = ['/collections/all', '/collections/epicerie-salee', '/collections/boissons'];
      for (const col of collections) {
        try {
          const html = await this.fetchWithRetry(`${this.baseUrl}${col}`);
          const products = this.parsePage(html);
          allProducts.push(...products);
          await this.rateLimit();
        } catch (err: any) {
          errors.push({ message: err.message, url: col, timestamp: new Date().toISOString() });
        }
      }
    }

    if (errors.length > 0) console.warn(`[scraping:${this.name}] ${errors.length} erreurs`);
    return allProducts;
  }
}
