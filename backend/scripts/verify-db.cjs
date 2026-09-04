// Verify products in DB after publish
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const totalProducts = await p.product.count();
  const totalPriceEntries = await p.priceEntry.count();
  const totalStores = await p.store.count();
  const totalBrands = await p.brand.count();
  const totalSyncRuns = await p.syncRun.count();

  console.log('=== Base de données Jaybi après scraping réel ===');
  console.log(`Produits:      ${totalProducts}`);
  console.log(`Prix (entries): ${totalPriceEntries}`);
  console.log(`Stores:        ${totalStores}`);
  console.log(`Marques:       ${totalBrands}`);
  console.log(`Sync runs:     ${totalSyncRuns}`);

  // Échantillon de produits MyMarket
  const myMarketPrices = await p.priceEntry.findMany({
    where: { store: { name: 'MyMarket' } },
    include: { product: true, store: true },
    take: 10,
    orderBy: { price: 'asc' },
  });

  console.log('\n=== Échantillon produits MyMarket (10 moins chers) ===');
  myMarketPrices.forEach((pe, i) => {
    console.log(`  ${i + 1}. ${pe.product.name} — ${pe.price} DH [${pe.store.name}, ${pe.city}] ${pe.available ? '✅' : '❌'}`);
  });

  // Top marques
  const brands = await p.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { products: { _count: 'desc' } },
    take: 10,
  });

  console.log('\n=== Top 10 marques ===');
  brands.forEach((b, i) => {
    console.log(`  ${i + 1}. ${b.name} — ${b._count.products} produits`);
  });

  await p.$disconnect();
})();
