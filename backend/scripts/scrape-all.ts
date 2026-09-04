/**
 * Scraping complet de toutes les sources — publie directement en base.
 * Usage: npx tsx scripts/scrape-all.ts
 *
 * Sources :
 * 1. Marjane (Apify dataset — 19000+ produits)
 * 2. MyMarket (API Shopify — 500+ produits)
 * 3. Carrefour (promomaroc.com — 20+ produits)
 * 4. BIM (cataloguebim.com — 20+ produits)
 */
import { MarjaneApifyAdapter } from '../src/scraping/adapters/marjane.apify.adapter.js';
import { MyMarketAdapter } from '../src/scraping/adapters/mymarket.adapter.js';
import { CarrefourAdapter } from '../src/scraping/adapters/carrefour.adapter.js';
import { BimAdapter } from '../src/scraping/adapters/bim.adapter.js';
import { normalizeAll } from '../src/scraping/normalizer.js';
import { publishChangesDirect, createSyncRun } from '../src/scraping/publisher.js';
import { prisma } from '../src/lib/prisma.js';
import { ScrapedProduct, SyncChanges } from '../src/scraping/types.js';

interface SourceResult {
  name: string;
  scraped: ScrapedProduct[];
  normalized: ScrapedProduct[];
  changes: SyncChanges;
  runId?: string;
  published?: { productsNew: number; pricesUpdated: number };
  error?: string;
}

async function scrapeSource(
  name: string,
  adapter: any,
  maxPages?: number,
): Promise<SourceResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  SCRAPING: ${name.toUpperCase()}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    if (maxPages) (adapter as any).maxPages = maxPages;

    const start = Date.now();
    console.log(`[1/4] Récupération...`);
    const scraped = await adapter.scrape();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (scraped.length === 0) {
      console.log(`⚠️  Aucun produit pour ${name}`);
      return { name, scraped: [], normalized: [], changes: { newProducts: [], priceChanges: [], promotions: [], matchedCount: 0, unmatchedCount: 0 } };
    }

    console.log(`[1/4] ✅ ${scraped.length} produits en ${elapsed}s`);

    // Échantillon
    console.log(`\n--- Échantillon (3 premiers) ---`);
    scraped.slice(0, 3).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} — ${p.price} DH ${p.brand ? `[${p.brand}]` : ''} ${p.originalPrice ? `(was ${p.originalPrice})` : ''}`);
    });

    // Normalisation
    console.log(`\n[2/4] Normalisation...`);
    const normalized = normalizeAll(scraped);
    console.log(`[2/4] ✅ ${normalized.length} normalisés`);

    // Changements (tout est nouveau car base vide)
    const changes: SyncChanges = {
      newProducts: normalized.map(n => ({ normalized: n })),
      priceChanges: [],
      promotions: [],
      matchedCount: 0,
      unmatchedCount: normalized.length,
    };

    console.log(`[3/4] ${changes.newProducts.length} nouveaux produits`);

    // Créer sync run
    const runId = await createSyncRun(name, scraped.length, changes);
    console.log(`[3/4] SyncRun créé: ${runId}`);

    // Publier directement
    console.log(`[4/4] Publication en base...`);
    const pubStart = Date.now();
    const published = await publishChangesDirect(changes, 'admin@qayess.io', name);
    const pubElapsed = ((Date.now() - pubStart) / 1000).toFixed(1);
    console.log(`[4/4] ✅ Publié en ${pubElapsed}s — ${published.productsNew} nouveaux, ${published.pricesUpdated} prix MAJ`);

    // Marquer run comme publié
    await prisma.syncRun.update({ where: { id: runId }, data: { status: 'published' } });

    return { name, scraped, normalized, changes, runId, published };
  } catch (err: any) {
    console.error(`❌ Erreur ${name}: ${err.message}`);
    return {
      name,
      scraped: [],
      normalized: [],
      changes: { newProducts: [], priceChanges: [], promotions: [], matchedCount: 0, unmatchedCount: 0 },
      error: err.message,
    };
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('  JAYBI — SCRAPING COMPLET DE TOUTES LES SOURCES');
  console.log('='.repeat(60) + '\n');

  const totalStart = Date.now();

  // 1. Marjane — Apify (TOUS les produits, 20 pages = 20000 max)
  const marjane = await scrapeSource('marjane', new MarjaneApifyAdapter(), 20);

  // 2. MyMarket — API Shopify (10 pages = 2500 produits)
  const mymarket = await scrapeSource('mymarket', new MyMarketAdapter(), 10);

  // 3. Carrefour — promomaroc.com
  const carrefour = await scrapeSource('carrefour', new CarrefourAdapter());

  // 4. BIM — cataloguebim.com
  const bim = await scrapeSource('bim', new BimAdapter());

  // Résumé final
  const totalElapsed = ((Date.now() - totalStart) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log('  RÉSUMÉ FINAL');
  console.log('='.repeat(60));
  console.log(`Temps total: ${totalElapsed}s\n`);

  const results = [marjane, mymarket, carrefour, bim];
  let totalScraped = 0;
  let totalPublished = 0;

  results.forEach(r => {
    const status = r.error ? '❌' : r.scraped.length === 0 ? '⚠️ ' : '✅';
    console.log(`${status} ${r.name.padEnd(12)} — ${r.scraped.length} scraped, ${r.published?.productsNew || 0} publiés${r.error ? ` (${r.error})` : ''}`);
    totalScraped += r.scraped.length;
    totalPublished += r.published?.productsNew || 0;
  });

  console.log(`\n  TOTAL: ${totalScraped} scraped, ${totalPublished} publiés`);

  // Vérification base
  const dbProducts = await prisma.product.count();
  const dbPrices = await prisma.priceEntry.count();
  const dbBrands = await prisma.brand.count();
  const dbStores = await prisma.store.count();
  const dbRuns = await prisma.syncRun.count();

  console.log(`\n--- Base de données ---`);
  console.log(`  Produits:  ${dbProducts}`);
  console.log(`  Prix:      ${dbPrices}`);
  console.log(`  Marques:   ${dbBrands}`);
  console.log(`  Stores:    ${dbStores}`);
  console.log(`  Sync runs: ${dbRuns}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
