/**
 * Script de scraping réel Marjane via Apify.
 * Usage: npx tsx scripts/scrape-marjane-apify.ts [--save] [--pages=N]
 */
import { MarjaneApifyAdapter } from '../src/scraping/adapters/marjane.apify.adapter.js';
import { normalizeAll } from '../src/scraping/normalizer.js';
import { detectChanges } from '../src/scraping/changeDetector.js';
import { prisma } from '../src/lib/prisma.js';

async function main() {
  const adapter = new MarjaneApifyAdapter();

  // Limite de pages (default 5 = 5000 produits)
  const pagesArg = process.argv.find(a => a.startsWith('--pages='));
  const maxPages = pagesArg ? parseInt(pagesArg.split('=')[1]) : 5;
  (adapter as any).maxPages = maxPages;

  console.log(`\n=== Scraping réel Marjane via Apify (max ${maxPages} pages, ${maxPages * 1000} produits) ===\n`);

  console.log(`[1/4] Récupération via Apify dataset...`);
  const start = Date.now();
  const scraped = await adapter.scrape();
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`[1/4] ✅ ${scraped.length} produits scraped en ${elapsed}s`);

  if (scraped.length === 0) {
    console.log('Aucun produit. Vérifie l\'URL du dataset Apify.');
    await prisma.$disconnect();
    return;
  }

  // Échantillon
  console.log(`\n--- Échantillon (5 premiers) ---`);
  scraped.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} — ${p.price} DH ${p.originalPrice ? `(was ${p.originalPrice})` : ''} ${p.brand ? `[${p.brand}]` : ''} ${p.promotionLabel || ''}`);
  });

  // Promos
  const promos = scraped.filter(p => p.originalPrice && p.originalPrice > p.price);
  console.log(`\n--- Promos détectées: ${promos.length} ---`);
  promos.slice(0, 5).forEach((p, i) => {
    const discount = ((p.originalPrice! - p.price) / p.originalPrice! * 100).toFixed(0);
    console.log(`  ${i + 1}. ${p.name} — ${p.price} DH (was ${p.originalPrice} DH, -${discount}%) ${p.promotionLabel || ''}`);
  });

  // Normalisation
  console.log(`\n[2/4] Normalisation...`);
  const normalized = normalizeAll(scraped);
  console.log(`[2/4] ✅ ${normalized.length} produits normalisés`);

  // Détection changements
  console.log(`\n[3/4] Détection des changements vs base...`);
  const changes = await detectChanges(normalized);
  console.log(`[3/4] ✅ Changements:`);
  console.log(`   - Nouveaux produits: ${changes.newProducts.length}`);
  console.log(`   - Prix modifiés:     ${changes.priceChanges.length}`);
  console.log(`   - Promos:            ${changes.promotions.length}`);
  console.log(`   - Matched:           ${changes.matchedCount}`);
  console.log(`   - Unmatched:         ${changes.unmatchedCount}`);

  // Résumé
  console.log(`\n[4/4] Résumé:`);
  console.log(`  Source:      Marjane Mall (Apify)`);
  console.log(`  Scraped:     ${scraped.length} produits`);
  console.log(`  Normalisés:  ${normalized.length} produits`);
  console.log(`  Promos:      ${promos.length} produits en promo`);
  console.log(`  Nouveaux:    ${changes.newProducts.length}`);
  console.log(`  Total temps: ${((Date.now() - start) / 1000).toFixed(1)}s`);

  // Save
  if (process.argv.includes('--save')) {
    console.log(`\n[SAVE] Création d'un SyncRun dry-run en base...`);
    const run = await prisma.syncRun.create({
      data: {
        adapter: 'marjane',
        status: 'dry_run',
        mode: 'apify_scrape',
        triggeredBy: 'script@jaybi',
        endedAt: new Date(),
        productsFound: scraped.length,
        productsNew: changes.newProducts.length,
        pricesUpdated: changes.priceChanges.length,
        promotionsFound: changes.promotions.length,
        errors: [],
        changes: changes as any,
      },
    });
    console.log(`[SAVE] ✅ SyncRun créé: ${run.id}`);
    console.log(`[SAVE] Pour publier: node scripts/approve-run.mjs ${run.id}`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
