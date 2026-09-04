import { BaseAdapter } from '../baseAdapter.js';
import { ScrapedProduct } from '../types.js';

/**
 * Adaptateur Carrefour — via https://promomaroc.com (agrégateur)
 *
 * Source vérifiée : carrefour.ma est un site corporate (catalogues PDF, magasins).
 * L'e-commerce Carrefour Maroc se fait via l'app mobile, pas via un site web scrapable.
 *
 * promomaroc.com publie les catalogues promos Carrefour avec les prix dans des <li>.
 * Format observé : "Ps5 slim digitale prix carrefour maroc 7499dh au lieu de 7999dh."
 *
 * Parsing : extraction depuis <li> (principal) + <p> (fallback).
 */
export class CarrefourAdapter extends BaseAdapter {
  readonly name = 'carrefour';
  readonly sourceType = 'scraper' as const;
  protected baseUrl = 'https://promomaroc.com';
  protected userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  protected maxPages = 3;

  parsePage(html: string, city = 'Casablanca'): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];

    // Récupère les blocs de texte : <li> (principal) + <p> et <h2>/<h3> (fallback)
    const textBlocks: string[] = [];

    // <li> — c'est ici que sont les produits sur promomaroc.com
    const liMatches = html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
    for (const m of liMatches) textBlocks.push(m[1]);

    // <p> et <h2>/<h3> — fallback
    const pMatches = html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    for (const m of pMatches) textBlocks.push(m[1]);
    const hMatches = html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi);
    for (const m of hMatches) textBlocks.push(m[1]);

    // Patterns observés sur promomaroc.com :
    // "Ps5 slim digitale prix carrefour maroc 7499dh au lieu de 7999dh."
    // "Smartphone oppo A5 prix carrefour maroc 1999dh."
    // "Lave vaisselle whirlpool prix carrefour 3999dh au lieu de 4399dhs."
    // "Table de cuisine prix carrefour 649dh au lieu de 999dh."
    // "Smart TV skyworth 32p prix aswakasalam 1790 dh"
    const pricePatterns = [
      // "Nom produit prix [mot] NNNdh" — le mot après prix peut être carrefour, maroc, aswakasalam, etc.
      /([A-ZÀ-Ÿ][^.<]{5,100}?)\s+prix\s+\w+\s+(\d+[.,]?\d*)\s*(?:dh|dhs|DH|MAD|درهم)/gi,
      // "Nom produit prix NNNdh" (sans mot entre prix et nombre)
      /([A-ZÀ-Ÿ][^.<]{5,100}?)\s+prix\s+(\d+[.,]?\d*)\s*(?:dh|dhs|DH|MAD|درهم)/gi,
      // "Nom produit à NNN dh"
      /([A-ZÀ-Ÿ][^.<]{5,80}?)\s+à\s+(\d+[.,]?\d*)\s*(?:dh|dhs|DH|MAD|درهم)/gi,
    ];

    for (const block of textBlocks) {
      const text = block.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').trim();
      if (text.length < 10) continue;

      for (const pattern of pricePatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          let name = match[1].trim().replace(/\s+/g, ' ');
          const price = parseFloat(match[2].replace(',', '.'));

          // Nettoie le nom : retire "prix carrefour maroc" etc.
          name = name.replace(/\s+prix\s+carrefour.*$/i, '').replace(/\s+maroc\s*$/i, '').trim();

          if (name.length < 5 || price <= 0) continue;

          // Promo : "au lieu de NNN dh"
          const oldPriceMatch = text.match(/au\s+lieu\s+de\s+(\d+[.,]?\d*)\s*(?:dh|dhs|DH|MAD|درهم)?/i);
          const originalPrice = oldPriceMatch ? parseFloat(oldPriceMatch[1].replace(',', '.')) : undefined;

          // Quantité/poids
          const qtyMatch = text.match(/(\d+[.,]?\d*)\s*(kg|g|L|ml|cl|litres?|pouces?|p)/i);
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

    // Récupère la page tag/carrefour pour trouver les liens catalogues
    try {
      const html = await this.fetchWithRetry(`${this.baseUrl}/tag/carrefour/`);
      // Extrait les liens vers les catalogues Carrefour récents
      const catalogueLinks = html.matchAll(/href="(https:\/\/promomaroc\.com\/catalogue-carrefour[^"]+)"/gi);
      const urls = new Set<string>();
      for (const m of catalogueLinks) urls.add(m[1]);

      const cataloguesToScrape = Array.from(urls).slice(0, this.maxPages);
      console.log(`[scraping:${this.name}] ${cataloguesToScrape.length} catalogues trouvés`);

      for (const url of cataloguesToScrape) {
        try {
          const catHtml = await this.fetchWithRetry(url);
          const products = this.parsePage(catHtml);
          console.log(`[scraping:${this.name}] ${url.split('/').pop()}: ${products.length} produits`);
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
