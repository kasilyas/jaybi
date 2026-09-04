/**
 * Script de scraping réel — teste les adaptateurs contre les vrais sites.
 * Usage: npx tsx scripts/scrape-real.ts [adapter]
 * Ex: npx tsx scripts/scrape-real.ts mymarket
 *     npx tsx scripts/scrape-real.ts bim
 */
import { MyMarketAdapter } from '../src/scraping/adapters/mymarket.adapter.js';
import { MarjaneAdapter } from '../src/scraping/adapters/marjane.adapter.js';
import { BimAdapter } from '../src/scraping/adapters/bim.adapter.js';
import { CarrefourAdapter } from '../src/scraping/adapters/carrefour.adapter.js';
import { AswakAdapter } from '../src/scraping/adapters/aswak.adapter.js';
import { normalizeAll } from '../src/scraping/normalizer.js';
import { detectChanges } from '../src/scraping/changeDetector.js';
import { prisma } from '../src/lib/prisma.js';
import type { BaseAdapter } from '../src/scraping/baseAdapter.js';

const adapters: Record<string, () => BaseAdapter> = {
  mymarket: () => new MyMarketAdapter(),
  marjane: () => new MarjaneAdapter(),
  bim: () => new BimAdapter(),
  carrefour: () => new CarrefourAdapter(),
  aswak: () => new AswakAdapter(),
};

async function main() {
  const adapterName = process.argv[2] || 'mymarket';
  console.log(`\n=== Scraping réel: ${adapterName} ===\n`);

  const factory = adapters[adapterName];
  if (!factory) {
    console.error(`Adaptateur inconnu: ${adapterName}`);
    console.error(`Disponibles: ${Object.keys(adapters).join(', ')}`);
    process.exit(1);
  }

  // Limite à 2 pages pour le test (ne pas bombarder le site)
  const adapter = factory();
  (adapter as any).maxPages = 2;
  (adapter as any).rateLimitMs = 3000; // 3s entre requêtes

  console.log(`[1/4] Scraping en cours... (max 2 pages, 3s rate limit)`);
  const scrapeStart = Date.now();
  const scraped = await adapter.scrape();
  const scrapeTime = ((Date.now() - scrapeStart) / 1000).toFixed(1);

  console.log(`[1/4] ✅ ${scraped.length} produits scraped en ${scrapeTime}s`);

  if (scraped.length === 0) {
    console.log(`\n⚠️  Aucun produit trouvé. Causes possibles:`);
    console.log(`   - Le site bloque les bots (403/anti-bot)`);
    console.log(`   - Le site est une SPA (rendu JS — utiliser Playwright)`);
    console.log(`   - La structure HTML a changé`);
    console.log(`   - robots.txt interdit le scraping`);
    await prisma.$disconnect();
    return;
  }

  // Affiche les 5 premiers produits scraped
  console.log(`\n--- Échantillon (5 premiers produits bruts) ---`);
  scraped.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} — ${p.price} DH ${p.brand ? `(${p.brand})` : ''} [${p.storeName}]`);
  });

  // Normalise
  console.log(`\n[2/4] Normalisation...`);
  const normalized = normalizeAll(scraped);
  console.log(`[2/4] ✅ ${normalized.length} produits normalisés`);

  // Affiche les 5 premiers normalisés
  console.log(`\n--- Échantillon (5 premiers normalisés) ---`);
  normalized.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} — ${p.price} DH ${p.brand ? `(${p.brand})` : ''} ${p.unit}/${p.weight} [${p.storeName}, ${p.city}]`);
  });

  // Détecte les changements
  console.log(`\n[3/4] Détection des changements vs base...`);
  const changesStart = Date.now();
  const changes = await detectChanges(normalized);
  const changesTime = ((Date.now() - changesStart) / 1000).toFixed(1);

  console.log(`[3/4] ✅ Changements détectés en ${changesTime}s:`);
  console.log(`   - Nouveaux produits: ${changes.newProducts.length}`);
  console.log(`   - Prix modifiés:     ${changes.priceChanges.length}`);
  console.log(`   - Promos:            ${changes.promotions.length}`);
  console.log(`   - Indisponibles:     ${changes.unavailability.length}`);
  console.log(`   - Matched:           ${changes.matchedCount}`);
  console.log(`   - Unmatched:         ${changes.unmatchedCount}`);

  // Affiche quelques nouveaux produits
  if (changes.newProducts.length > 0) {
    console.log(`\n--- Nouveaux produits (5 premiers) ---`);
    changes.newProducts.slice(0, 5).forEach((np, i) => {
      const p = np.normalized;
      console.log(`  ${i + 1}. ${p.name} — ${p.price} DH ${p.brand ? `(${p.brand})` : ''} [${p.storeName}]`);
    });
  }

  // Affiche quelques changements de prix
  if (changes.priceChanges.length > 0) {
    console.log(`\n--- Changements de prix (5 premiers) ---`);
    changes.priceChanges.slice(0, 5).forEach((pc, i) => {
      const delta = ((pc.newPrice - pc.oldPrice) / pc.oldPrice * 100).toFixed(1);
      console.log(`  ${i + 1}. Produit ${pc.productId.slice(0, 8)}... ${pc.oldPrice} → ${pc.newPrice} DH (${delta}%) [${pc.storeName}, ${pc.city}]`);
    });
  }

  // Résumé
  console.log(`\n[4/4] Résumé:`);
  console.log(`  Source:      ${adapterName}`);
  console.log(`  Scraped:     ${scraped.length} produits`);
  console.log(`  Normalisés:  ${normalized.length} produits`);
  console.log(`  Nouveaux:    ${changes.newProducts.length}`);
  console.log(`  Prix MAJ:    ${changes.priceChanges.length}`);
  console.log(`  Promos:      ${changes.promotions.length}`);
  console.log(`  Total temps: ${((Date.now() - scrapeStart) / 1000).toFixed(1)}s`);

  // Option: créer un dry-run en base
  if (process.argv.includes('--save')) {
    console.log(`\n[SAVE] Création d'un SyncRun dry-run en base...`);
    const run = await prisma.syncRun.create({
      data: {
        adapter: adapterName,
        status: 'dry_run',
        mode: 'real_scrape',
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
    console.log(`[SAVE] Pour publier: POST /api/scraping/${run.id}/approve`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('❌ Erreur:', err);
  process.exit(1);
});
