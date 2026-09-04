/**
 * Scraping Marjane uniquement — publie directement.
 */
import { MarjaneApifyAdapter } from '../src/scraping/adapters/marjane.apify.adapter.js';
import { normalizeAll } from '../src/scraping/normalizer.js';
import { publishChangesDirect, createSyncRun } from '../src/scraping/publisher.js';
import { prisma } from '../src/lib/prisma.js';

async function main() {
  console.log('\n=== SCRAPING MARJANE (Apify — 19000+ produits) ===\n');

  const adapter = new MarjaneApifyAdapter();
  (adapter as any).maxPages = 20;

  const start = Date.now();
  console.log('[1/4] Récupération via Apify...');
  const scraped = await adapter.scrape();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[1/4] ✅ ${scraped.length} produits en ${elapsed}s`);

  if (scraped.length === 0) {
    console.log('Aucun produit.');
    await prisma.$disconnect();
    return;
  }

  // Promos
  const promos = scraped.filter(p => p.originalPrice && p.originalPrice > p.price);
  console.log(`   Promos: ${promos.length} (${((promos.length / scraped.length) * 100).toFixed(1)}%)`);

  // Normalisation
  console.log('\n[2/4] Normalisation...');
  const normalized = normalizeAll(scraped);
  console.log(`[2/4] ✅ ${normalized.length} normalisés`);

  // Changements
  const changes = {
    newProducts: normalized.map(n => ({ normalized: n })),
    priceChanges: [],
    promotions: [],
    matchedCount: 0,
    unmatchedCount: normalized.length,
  };

  console.log(`\n[3/4] ${changes.newProducts.length} nouveaux produits`);
  const runId = await createSyncRun('marjane', scraped.length, changes as any);
  console.log(`[3/4] SyncRun: ${runId}`);

  // Publication
  console.log(`\n[4/4] Publication en base (peut prendre plusieurs minutes)...`);
  const pubStart = Date.now();
  const result = await publishChangesDirect(changes as any, 'admin@qayess.io', 'marjane');
  const pubElapsed = ((Date.now() - pubStart) / 1000).toFixed(1);
  console.log(`[4/4] ✅ Publié en ${pubElapsed}s — ${result.productsNew} nouveaux, ${result.pricesUpdated} prix MAJ`);

  await prisma.syncRun.update({ where: { id: runId }, data: { status: 'published' } });

  // Vérification
  const dbProducts = await prisma.product.count();
  const dbPrices = await prisma.priceEntry.count();
  const dbBrands = await prisma.brand.count();
  console.log(`\n--- Base après Marjane ---`);
  console.log(`  Produits: ${dbProducts}`);
  console.log(`  Prix:     ${dbPrices}`);
  console.log(`  Marques:  ${dbBrands}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
