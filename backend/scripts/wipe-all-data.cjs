// Nettoie TOUTES les données de test : produits seed/mock, prix, sync runs
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('=== Nettoyage complet des données de test ===\n');

  // 1. Compter avant
  const before = {
    products: await prisma.product.count(),
    prices: await prisma.priceEntry.count(),
    priceHistory: await prisma.priceHistory.count(),
    syncRuns: await prisma.syncRun.count(),
    brands: await prisma.brand.count(),
    stores: await prisma.store.count(),
  };
  console.log('Avant nettoyage:', before);

  // 2. Supprimer les sync runs existants
  console.log('\n--- Suppression sync runs ---');
  const deletedRuns = await prisma.syncRun.deleteMany({});
  console.log(`Sync runs supprimés: ${deletedRuns.count}`);

  // 3. Supprimer price history
  console.log('--- Suppression price history ---');
  const deletedHistory = await prisma.priceHistory.deleteMany({});
  console.log(`Price history supprimé: ${deletedHistory.count}`);

  // 4. Supprimer price entries
  console.log('--- Suppression price entries ---');
  const deletedPrices = await prisma.priceEntry.deleteMany({});
  console.log(`Price entries supprimés: ${deletedPrices.count}`);

  // 5. Supprimer les tables dépendantes des produits
  console.log('--- Suppression price reports ---');
  const deletedReports = await prisma.priceReport.deleteMany({});
  console.log(`Price reports supprimés: ${deletedReports.count}`);

  console.log('--- Suppression pack products ---');
  const deletedPackProducts = await prisma.packProduct.deleteMany({});
  console.log(`Pack products supprimés: ${deletedPackProducts.count}`);

  // 6. Supprimer TOUS les produits (seed + scraped, on va tout re-scrapé)
  console.log('--- Suppression tous les produits ---');
  const deletedProducts = await prisma.product.deleteMany({});
  console.log(`Produits supprimés: ${deletedProducts.count}`);

  // 6. Supprimer les marques orphelines
  console.log('--- Suppression marques orphelines ---');
  const deletedBrands = await prisma.brand.deleteMany({});
  console.log(`Marques supprimées: ${deletedBrands.count}`);

  // 7. Garder les stores (seront recréés par le publisher)
  console.log('--- Stores conservés ---');
  const stores = await prisma.store.findMany({ select: { name: true } });
  console.log(`Stores conservés: ${stores.length} (${stores.map(s => s.name).join(', ')})`);

  // 8. Vérifier après
  const after = {
    products: await prisma.product.count(),
    prices: await prisma.priceEntry.count(),
    priceHistory: await prisma.priceHistory.count(),
    syncRuns: await prisma.syncRun.count(),
    brands: await prisma.brand.count(),
    stores: await prisma.store.count(),
  };
  console.log('\nAprès nettoyage:', after);

  await prisma.$disconnect();
})();
