import { BaseAdapter } from '../baseAdapter.js';
import { ScrapedProduct } from '../types.js';

/**
 * Adaptateur Marjane Mall — via dataset Apify
 *
 * Source : https://www.marjanemall.ma (marketplace Marjane)
 * Le site marjane.ma (courses-en-ligne) est bloqué par Cloudflare (403).
 * marjanemall.ma est la marketplace Marjane avec 19000+ produits.
 *
 * Apify contourne Cloudflare et expose les données via un dataset JSON.
 * L'admin configure l'URL du dataset dans la sync config.
 *
 * Données riches :
 * - name, price, regular_price, final_price (promo)
 * - brand_name, sku, gtin (EAN)
 * - stock (is_in_stock, qty)
 * - images, categories
 * - eco_discount, seller_name
 *
 * Configuration :
 *   syncConfig.sourceUrl = https://api.apify.com/v2/datasets/{DATASET_ID}/items
 *   syncConfig.notes = Dataset Apify — Marjane Mall (marjanemall.ma)
 */
export class MarjaneApifyAdapter extends BaseAdapter {
  readonly name = 'marjane';
  readonly sourceType = 'api' as const;
  protected baseUrl = 'https://api.apify.com/v2/datasets/ffurZD3yqDhvhSjXx/items';
  protected userAgent = 'JaybiBot/1.0';
  protected maxPages = 100; // 100 pages × 1000 items = 100000 max

  /**
   * Parse un produit Apify (format Marjane Mall) vers ScrapedProduct.
   * Public pour les tests.
   */
  parseApifyProduct(item: any, city = 'Casablanca'): ScrapedProduct | null {
    try {
      const name = item.name;
      if (!name) return null;

      const ext = item.extension_attributes || {};
      const regularPrice = parseFloat(ext.regular_price || item.price || '0');
      const finalPrice = parseFloat(ext.final_price || item.price || '0');
      const price = finalPrice > 0 ? finalPrice : regularPrice;

      if (price <= 0) return null;

      // Promo : final_price < regular_price
      const hasPromo = finalPrice > 0 && regularPrice > 0 && finalPrice < regularPrice;
      const originalPrice = hasPromo ? regularPrice : undefined;

      // EAN / GTIN
      const gtinAttr = item.custom_attributes?.find(
        (a: any) => a.attribute_code === 'maas_gtin'
      );
      const ean = gtinAttr?.value || item.sku || undefined;

      // Image principale
      const imageAttr = item.custom_attributes?.find(
        (a: any) => a.attribute_code === 'main_image'
      );
      const image = imageAttr?.value || item.media_gallery_entries?.[0]?.file || undefined;

      // Stock
      const stockItem = ext.stock_item;
      const available = stockItem?.is_in_stock !== false;

      // Catégorie (prend la plus spécifique)
      const categories = ext.item_categories;
      let category: string | undefined;
      if (categories && categories.length > 0) {
        const cat = categories[0];
        category = cat.item_category3 || cat.item_category2 || cat.item_category;
      }

      // Label promo
      let promotionLabel: string | undefined;
      if (hasPromo && ext.eco_discount) {
        promotionLabel = ext.eco_discount;
      } else if (hasPromo) {
        const discount = ((regularPrice - finalPrice) / regularPrice * 100).toFixed(0);
        promotionLabel = `Promo -${discount}%`;
      }

      return {
        source: this.name,
        sourceUrl: item.productUrl || `https://www.marjanemall.ma/p/${item.sku}`,
        scrapedAt: new Date(),
        name,
        brand: ext.brand_name || undefined,
        category,
        image,
        ean,
        price,
        originalPrice,
        promotionLabel,
        available,
        city,
        storeName: 'Marjane',
      };
    } catch {
      return null;
    }
  }

  /**
   * Scrape via l'API Apify dataset.
   * Pagination : limit=1000 par page.
   */
  async scrape(): Promise<ScrapedProduct[]> {
    const allProducts: ScrapedProduct[] = [];
    const errors: { message: string; url?: string; timestamp: string }[] = [];

    console.log(`[scraping:${this.name}] Récupération via Apify dataset...`);

    for (let page = 1; page <= this.maxPages; page++) {
      try {
        const url = `${this.baseUrl}?limit=1000&offset=${(page - 1) * 1000}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // 60s pour gros dataset
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': this.userAgent },
        });
        clearTimeout(timeout);

        if (!res.ok) {
          errors.push({
            message: `HTTP ${res.status}`,
            url: `page ${page}`,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        const data = (await res.json()) as any[];
        if (!Array.isArray(data) || data.length === 0) {
          console.log(`[scraping:${this.name}] Page ${page}: 0 items — fin pagination`);
          break;
        }

        for (const item of data) {
          const p = this.parseApifyProduct(item);
          if (p) allProducts.push(p);
        }

        console.log(`[scraping:${this.name}] Page ${page}: ${data.length} items (total: ${allProducts.length})`);

        if (data.length < 1000) break; // dernière page
        // Pas de rate limit pour Apify (API, pas site web)
      } catch (err: any) {
        errors.push({ message: err.message, url: `page ${page}`, timestamp: new Date().toISOString() });
        break;
      }
    }

    if (errors.length > 0) console.warn(`[scraping:${this.name}] ${errors.length} erreurs`);
    return allProducts;
  }

  // Méthodes héritées non utilisées (API, pas HTML)
  parsePage(_html: string, _city?: string): ScrapedProduct[] {
    return [];
  }
}
