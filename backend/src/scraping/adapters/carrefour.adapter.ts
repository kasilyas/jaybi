import { BaseAdapter } from '../baseAdapter.js';
import { ScrapedProduct } from '../types.js';

/**
 * Adaptateur Carrefour — via https://promomaroc.com (agrégateur)
 *
 * Source vérifiée : carrefour.ma est un site corporate (catalogues PDF, magasins).
 * L'e-commerce Carrefour Maroc se fait via l'app mobile, pas via un site web scrapable.
 *
 * promomaroc.com publie les catalogues promos de toutes les enseignes marocaines
 * (Carrefour, Marjane, BIM, Kazyon, Aswak...) avec les prix en texte.
 *
 * Parsing : extraction de produits depuis les articles catalogue (similaire à BIM).
 */
export class CarrefourAdapter extends BaseAdapter {
  readonly name = 'carrefour';
  readonly sourceType = 'scraper' as const;
  protected baseUrl = 'https://promomaroc.com';
  protected userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

  parsePage(html: string, city = 'Casablanca'): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];

    // Extrait le texte des paragraphes
    const textBlocks: string[] = [];
    const pMatches = html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    for (const m of pMatches) textBlocks.push(m[1]);
    const hMatches = html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi);
    for (const m of hMatches) textBlocks.push(m[1]);

    // Patterns pour promomaroc.com :
    // "Smart TV skyworth 32p prix aswakasalam 1790 dh"
    // "Smart TV samsung 43p prix carrefour 3990dh"
    // "Refrigerateur combine whirlpool 343 litres prix carrefour 4999dh"
    // "Machine a laver candy 9kg prix carrefour 2999 dh"
    const pricePatterns = [
      // "Nom produit prix [mot] NNN dh"
      /([A-ZÀ-Ÿ][^.<]{5,80}?)\s+prix\s+\w+\s+(\d+[.,]?\d*)\s*(?:dh|dhs|DH|MAD|درهم)/gi,
      // "Nom produit à NNN dh"
      /([A-ZÀ-Ÿ][^.<]{5,80}?)\s+à\s+(\d+[.,]?\d*)\s*(?:dh|dhs|DH|MAD|درهم)/gi,
      // "Nom produit revient à NNN dh"
      /([A-ZÀ-Ÿ][^.<]{5,80}?)\s+revient\s+à\s+(\d+[.,]?\d*)\s*(?:dh|dhs|DH|MAD|درهم)/gi,
    ];

    for (const block of textBlocks) {
      const text = block.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '');

      for (const pattern of pricePatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          const name = match[1].trim().replace(/\s+/g, ' ');
          const price = parseFloat(match[2].replace(',', '.'));

          if (name.length < 5 || price <= 0) continue;

          // Promo : "au lieu de XX DH"
          const oldPriceMatch = text.match(/au\s+lieu\s+de\s+(\d+[.,]?\d*)/i);
          const originalPrice = oldPriceMatch ? parseFloat(oldPriceMatch[1].replace(',', '.')) : undefined;

          // Quantité
          const qtyMatch = text.match(/(\d+[.,]?\d*)\s*(kg|g|L|ml|cl)/i);
          const weight = qtyMatch ? parseFloat(qtyMatch[1].replace(',', '.')) : undefined;
          const unit = qtyMatch?.[2] as any;

          // Évite les doublons
          if (products.some(p => p.name === name && p.price === price)) continue;

          products.push({
            source: this.name,
            sourceUrl: this.baseUrl,
            scrapedAt: new Date(),
            name,
            price,
            originalPrice,
            weight,
            unit,
            available: true,
            city,
            storeName: 'Carrefour',
            promotionLabel: originalPrice ? 'Promo catalogue' : undefined,
          });
        }
      }
    }

    return products;
  }

  async scrape(): Promise<ScrapedProduct[]> {
    const allProducts: ScrapedProduct[] = [];
    const errors: { message: string; url?: string; timestamp: string }[] = [];

    const allowed = await this.checkRobotsTxt(this.baseUrl);
    if (!allowed) {
      errors.push({ message: 'robots.txt interdit', timestamp: new Date().toISOString() });
      return [];
    }

    // Récupère la page des catalogues Carrefour
    try {
      const html = await this.fetchWithRetry(`${this.baseUrl}/tag/carrefour/`);
      // Extrait les liens vers les catalogues Carrefour récents
      const catalogueLinks = html.matchAll(/href="(https:\/\/promomaroc\.com\/catalogue-carrefour[^"]+)"/gi);
      const urls = new Set<string>();
      for (const m of catalogueLinks) urls.add(m[1]);

      const cataloguesToScrape = Array.from(urls).slice(0, 3);

      for (const url of cataloguesToScrape) {
        try {
          const catHtml = await this.fetchWithRetry(url);
          const products = this.parsePage(catHtml);
          allProducts.push(...products);
          await this.rateLimit();
        } catch (err: any) {
          errors.push({ message: err.message, url, timestamp: new Date().toISOString() });
        }
      }
    } catch (err: any) {
      errors.push({ message: err.message, url: this.baseUrl, timestamp: new Date().toISOString() });
    }

    if (errors.length > 0) console.warn(`[scraping:${this.name}] ${errors.length} erreurs`);
    return allProducts;
  }
}
