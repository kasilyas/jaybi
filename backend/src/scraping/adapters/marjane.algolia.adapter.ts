import { BaseAdapter } from '../baseAdapter.js';
import { ScrapedProduct } from '../types.js';

/**
 * Adaptateur Marjane Mall — index Algolia public du site.
 *
 * Source : index Algolia `magento2_prod_fr_products` utilisé par le frontend
 * de marjanemall.ma (clé search-only publique, restreinte au referer du site).
 * Remplace le dataset Apify (rétention expirée → HTTP 404) et l'API GraphQL
 * (custom_attributesV2 trop coûteux côté serveur : ~0,5 s/produit, 503 Varnish).
 *
 * Données : nom, sku, prix courant/promo, marque (maas_brand), vendeur
 * marketplace, image CDN réelle, stock (is_salable), catégories.
 * Limite connue : l'index n'expose pas le GTIN/EAN — le rapprochement
 * inter-enseignes se fait par nom+marque+format (file de revue admin).
 *
 * Pagination : Algolia limite à 1000 hits par requête (paginationLimitedTo).
 * Les catégories dépassant ce seuil sont découpées récursivement par
 * tranches de prix (`numericFilters` sur price.MAD.default).
 *
 * Périmètre par défaut : catégories alimentation / hygiène / entretien
 *   4256 Epicerie fine, 2044 Hygiène, 1999 Entretien de la maison,
 *   2002 Beauté - Hygiène - Santé, 2086 Hygiène bébé, 2092 Maternité.
 */
const ALGOLIA_DSN = 'https://31pooc8ciq-dsn.algolia.net';
const ALGOLIA_APP_ID = '31POOC8CIQ';
const ALGOLIA_API_KEY = 'f5fd7857c52dd214c18f5eefc3eaf407'; // clé search-only publique (embarquée dans le frontend du site)
const INDEX = 'magento2_prod_fr_products';
const REFERER = 'https://www.marjanemall.ma/';
const GROCERY_CATEGORY_IDS = ['4256', '2044', '1999', '2002', '2086', '2092'];
const HITS_PER_PAGE = 250;
const MAX_WINDOW = 950; // marge sous la limite Algolia de 1000 hits/requête
const PRICE_CAP = 200000; // borne haute de découpage (MAD)

type AlgoliaHit = {
  objectID: string;
  name?: string;
  sku?: string;
  url?: string;
  image_url?: string;
  main_image?: string;
  maas_brand?: string;
  mm_seller?: string;
  maas_offer_seller_name?: string;
  is_salable?: number;
  discount_percent?: number;
  categories?: { level0?: string[]; level1?: string[]; level2?: string[] };
  price?: { MAD?: { default?: number; default_original_formated?: string } };
};

export class MarjaneAlgoliaAdapter extends BaseAdapter {
  readonly name = 'marjane';
  readonly sourceType = 'api' as const;
  protected baseUrl = `${ALGOLIA_DSN}/1/indexes/${INDEX}/query`;
  protected userAgent = 'JaybiBot/1.0 (+contact@jaybi.ma)';
  protected maxPages = 1000;
  protected rateLimitMs = 250;

  private categoryIds = GROCERY_CATEGORY_IDS;

  private async query(params: Record<string, unknown>): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Algolia-Application-Id': ALGOLIA_APP_ID,
        'X-Algolia-API-Key': ALGOLIA_API_KEY,
        'User-Agent': this.userAgent,
        Referer: REFERER,
      },
      body: JSON.stringify(params),
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Algolia HTTP ${res.status}`);
    const json = (await res.json()) as any;
    if (json.message) throw new Error(`Algolia: ${json.message}`);
    return json;
  }

  private async count(filters: string, numericFilters: string[] = [], facetFilters: string[] = []): Promise<number> {
    const res = await this.query({ query: '', filters, numericFilters, facetFilters, hitsPerPage: 0 });
    return res.nbHits ?? 0;
  }

  /** Échappe une valeur de facette Algolia. */
  private ff(name: string, value: string): string {
    return `${name}:"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }

  /** Algolia renvoie parfois des tableaux pour les attributs multi-valués. */
  private str(v: unknown): string | undefined {
    if (typeof v === 'string' && v.trim()) return v;
    if (Array.isArray(v)) return this.str(v[0]);
    return undefined;
  }

  /** Parse un hit Algolia vers ScrapedProduct. Public pour les tests. */
  parseAlgoliaHit(hit: AlgoliaHit, city = 'Casablanca'): ScrapedProduct | null {
    try {
      const name = this.str(hit.name);
      if (!name) return null;

      const mad = hit.price?.MAD;
      const price = Number(mad?.default ?? 0);
      if (!(price > 0)) return null;

      // Prix avant promo : champ formaté "275,00 Dh" (parfois numérique)
      let originalPrice: number | undefined;
      const rawOriginal = mad?.default_original_formated;
      if (rawOriginal !== undefined && rawOriginal !== null && rawOriginal !== '') {
        const parsed = parseFloat(String(rawOriginal).replace(/[^\d.,]/g, '').replace(/\s/g, '').replace(',', '.'));
        if (parsed > price) originalPrice = parsed;
      }
      const pct = Number(hit.discount_percent ?? 0);
      const promotionLabel = originalPrice ? `Promo -${Math.round(pct || (1 - price / originalPrice) * 100)}%` : undefined;

      // Catégorie la plus profonde (segment final du niveau le plus précis)
      const levels = this.str(hit.categories?.level2?.[0]) ?? this.str(hit.categories?.level1?.[0]) ?? this.str(hit.categories?.level0?.[0]);
      const category = levels?.split('|').pop()?.trim() || undefined;

      return {
        source: this.name,
        sourceUrl: this.str(hit.url) || 'https://www.marjanemall.ma',
        scrapedAt: new Date(),
        name,
        brand: this.str(hit.maas_brand),
        seller: this.str(hit.maas_offer_seller_name) ?? this.str(hit.mm_seller),
        category,
        image: this.str(hit.main_image) ?? this.str(hit.image_url),
        price,
        originalPrice,
        promotionLabel,
        available: Number(hit.is_salable ?? 1) !== 0,
        city,
        storeName: 'Marjane',
      };
    } catch {
      return null;
    }
  }

  /** Récupère toutes les pages d'un bucket (nbHits ≤ MAX_WINDOW requis). */
  private async fetchBucket(filters: string, numericFilters: string[], out: Map<string, ScrapedProduct>, facetFilters: string[] = []): Promise<void> {
    let page = 0;
    let nbPages = 1;
    while (page < nbPages && page * HITS_PER_PAGE < 1000) {
      const res = await this.query({ query: '', filters, numericFilters, facetFilters, hitsPerPage: HITS_PER_PAGE, page });
      for (const hit of (res.hits ?? []) as AlgoliaHit[]) {
        const p = this.parseAlgoliaHit(hit);
        if (p) out.set(hit.objectID ?? p.name, p);
      }
      nbPages = res.nbPages ?? 1;
      page += 1;
      await this.rateLimit();
    }
  }

  /** Liste les valeurs d'une facette dans un bucket (pour découpage secondaire). */
  private async facetValues(facet: string, filters: string, numericFilters: string[], facetFilters: string[]): Promise<string[]> {
    const res = await this.query({ query: '', filters, numericFilters, facetFilters, hitsPerPage: 0, facets: [facet], maxValuesPerFacet: 1000 });
    return Object.keys(res.facets?.[facet] ?? {});
  }

  /**
   * Bucket saturé (> MAX_WINDOW) : découpe par facettes en cascade
   * (categories.level2 → categories.level3 → maas_brand). Une feuille encore
   * saturée avance à la facette suivante ; en dernier recours, échantillon partiel.
   */
  private async splitByFacet(filters: string, nf: string[], facetFilters: string[], out: Map<string, ScrapedProduct>, facetIdx: number): Promise<void> {
    const FACETS = ['categories.level2', 'categories.level3', 'maas_brand', 'mm_seller'];
    for (let i = facetIdx; i < FACETS.length; i++) {
      const facet = FACETS[i];
      const values = await this.facetValues(facet, filters, nf, facetFilters);
      if (values.length === 0) continue;
      for (const value of values) {
        const ff = [...facetFilters, this.ff(facet, value)];
        const n = await this.count(filters, nf, ff);
        if (n === 0) continue;
        if (n <= MAX_WINDOW) {
          await this.fetchBucket(filters, nf, out, ff);
        } else if (i + 1 < FACETS.length) {
          await this.splitByFacet(filters, nf, ff, out, i + 1);
        } else {
          console.warn(`[scraping:${this.name}] sous-bucket saturé (${n}) dans ${filters} — échantillon partiel`);
          await this.fetchBucket(filters, nf, out, ff);
        }
      }
      return;
    }
    console.warn(`[scraping:${this.name}] aucune facette exploitable dans ${filters} — échantillon partiel`);
    await this.fetchBucket(filters, nf, out, facetFilters);
  }

  /** Découpe récursive par prix, puis par facette quand le prix est insécable. */
  private async scrapeFiltered(filters: string, lo: number, hi: number, out: Map<string, ScrapedProduct>, depth: number): Promise<void> {
    const nf = [`price.MAD.default>=${lo}`, `price.MAD.default<${hi}`];
    const nbHits = await this.count(filters, nf);
    if (nbHits === 0) return;
    if (nbHits <= MAX_WINDOW) {
      await this.fetchBucket(filters, nf, out);
      return;
    }
    if (hi - lo >= 1 && depth < 16) {
      const mid = Math.floor((lo + hi) / 2);
      await this.scrapeFiltered(filters, lo, mid, out, depth + 1);
      await this.scrapeFiltered(filters, mid, hi, out, depth + 1);
      return;
    }
    // Tranche de prix insécable (prix X.99 denses) → découpe par facette.
    try {
      await this.splitByFacet(filters, nf, [], out, 0);
    } catch (err: any) {
      console.warn(`[scraping:${this.name}] découpe par facette impossible (${err.message}) — échantillon partiel`);
      await this.fetchBucket(filters, nf, out);
    }
  }

  async scrape(): Promise<ScrapedProduct[]> {
    const out = new Map<string, ScrapedProduct>();
    const errors: string[] = [];

    for (const categoryId of this.categoryIds) {
      const filters = `categoryIds:${categoryId}`;
      try {
        const before = out.size;
        await this.scrapeFiltered(filters, 0, PRICE_CAP, out, 0);
        console.log(`[scraping:${this.name}] catégorie ${categoryId}: +${out.size - before} produits (cumul ${out.size})`);
      } catch (err: any) {
        errors.push(`cat ${categoryId}: ${err.message}`);
        console.warn(`[scraping:${this.name}] catégorie ${categoryId} en échec: ${err.message}`);
      }
    }

    if (errors.length) console.warn(`[scraping:${this.name}] ${errors.length} catégorie(s) en échec`);
    console.log(`[scraping:${this.name}] ${out.size} produits uniques collectés`);
    return Array.from(out.values());
  }
}
