import { BaseAdapter } from '../baseAdapter.js';
import { ScrapedProduct } from '../types.js';

/**
 * Adaptateur BIM — via https://www.cataloguebim.com (agrégateur non-officiel)
 *
 * Source vérifiée : BIM (bim.ma) n'a PAS d'e-commerce. Les prix ne sont visibles
 * qu'en magasin ou via des sites agrégateurs comme cataloguebim.com.
 *
 * cataloguebim.com publie les catalogues hebdomadaires BIM avec :
 * - Des articles de blog décrivant les produits en promo
 * - Des prix intégrés dans le texte ("29,90 DH", "105,90 DH")
 * - Des images de catalogue (pages scannées)
 *
 * Parsing : extraction de produits depuis le texte des articles catalogue.
 * Le format est : "Nom du produit à XX,XX DH" ou "Le lot XXX est affiché à XX,90 DH".
 */
export class BimAdapter extends BaseAdapter {
  readonly name = 'bim';
  readonly sourceType = 'scraper' as const;
  protected baseUrl = 'https://www.cataloguebim.com';
  protected userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

  /**
   * Parse une page d'article catalogue et extrait les produits avec prix.
   * Le contenu est textuel (paragraphes décrivant les promos).
   */
  parsePage(html: string, city = 'Casablanca'): ScrapedProduct[] {
    const products: ScrapedProduct[] = [];

    // Extrait le texte des paragraphes <p> et <h2>/<h3>
    const textBlocks: string[] = [];
    const pMatches = html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    for (const m of pMatches) textBlocks.push(m[1]);
    const hMatches = html.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi);
    for (const m of hMatches) textBlocks.push(m[1]);

    // Patterns pour cataloguebim.com :
    // "Le produit revient à 29,90 DH"
    // "Le produit s'affiche à 29,90 DH"
    // "Le produit est affiché à 105,90 DH"
    // "Le produit à 22,90 DH les 6 pièces"
    // On utilise des patterns spécifiques pour éviter les faux positifs ("à l'huile")
    const pricePatterns = [
      /([A-ZÀ-Ÿ][^.<]{5,80}?)\s+revient\s+à\s+(\d+[.,]?\d*)\s*(?:DH|MAD|درهم)/gi,
      /([A-ZÀ-Ÿ][^.<]{5,80}?)\s+s'affiche\s+à\s+(\d+[.,]?\d*)\s*(?:DH|MAD|درهم)/gi,
      /([A-ZÀ-Ÿ][^.<]{5,80}?)\s+est\s+affiché\s+à\s+(\d+[.,]?\d*)\s*(?:DH|MAD|درهم)/gi,
      /([A-ZÀ-Ÿ][^.<]{5,80}?)\s+à\s+(\d+[.,]?\d*)\s*(?:DH|MAD|درهم)\s+les\s/gi,
      /([A-ZÀ-Ÿ][^.<]{5,80}?)\s+à\s+(\d+[.,]?\d*)\s*(?:DH|MAD|درهم)\s+pour/gi,
      // "produit ... pour 24,90 DH les 4×80 g"
      /([A-ZÀ-Ÿ][^.<]{5,80}?)\s+pour\s+(\d+[.,]?\d*)\s*(?:DH|MAD|درهم)/gi,
    ];

    for (const block of textBlocks) {
      // Nettoie les balises HTML du block
      const text = block.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '');

      for (const pattern of pricePatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          const name = match[1].trim().replace(/\s+/g, ' ');
          const price = parseFloat(match[2].replace(',', '.'));

          if (name.length < 5 || price <= 0) continue;

          // Extrait la marque si mentionnée
          const brandMatch = text.match(/(?:marque|de\s+la\s+marque|signée?)\s+([A-Z][a-z]+)/i);
          const brand = brandMatch?.[1];

          // Détecte promo (prix barré mentionné)
          const oldPriceMatch = text.match(/au\s+lieu\s+de\s+(\d+[.,]?\d*)/i);
          const originalPrice = oldPriceMatch ? parseFloat(oldPriceMatch[1].replace(',', '.')) : undefined;

          // Détecte quantité/pack
          const qtyMatch = text.match(/les\s+(\d+)[×x](\d+)\s*(g|kg|ml|L)/i)
            || text.match(/les\s+(\d+)\s*(pièces|pcs|unités)/i)
            || text.match(/lot\s+de\s+(\d+)/i);
          const weight = qtyMatch ? parseFloat(qtyMatch[1]) : undefined;
          const unit = qtyMatch?.[3] as any;

          // Évite les doublons (même nom + même prix)
          if (products.some(p => p.name === name && p.price === price)) continue;

          products.push({
            source: this.name,
            sourceUrl: this.baseUrl,
            scrapedAt: new Date(),
            name,
            brand,
            price,
            originalPrice,
            weight,
            unit,
            available: true,
            city,
            storeName: 'BIM',
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

    // Récupère la page d'accueil pour trouver les liens vers les derniers catalogues
    try {
      const homeHtml = await this.fetchWithRetry(this.baseUrl);
      // Extrait les liens vers les catalogues récents
      const catalogueLinks = homeHtml.matchAll(/href="(https:\/\/www\.cataloguebim\.com\/catalogue-bim-[^"]+)"/gi);
      const urls = new Set<string>();
      for (const m of catalogueLinks) {
        urls.add(m[1]);
      }

      // Scrape les 3 derniers catalogues (limite pour respecter rate limit)
      const cataloguesToScrape = Array.from(urls).slice(0, 3);

      for (const url of cataloguesToScrape) {
        try {
          const html = await this.fetchWithRetry(url);
          const products = this.parsePage(html);
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
