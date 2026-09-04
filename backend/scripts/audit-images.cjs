// Audit images en base
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const total = await prisma.product.count();
  const withImage = await prisma.product.count({ where: { image: { not: '' } } });
  const withoutImage = await prisma.product.count({ where: { image: '' } });

  console.log('=== Audit Images ===');
  console.log(`Total produits:    ${total}`);
  console.log(`Avec image:        ${withImage}`);
  console.log(`Sans image (vide): ${withoutImage}`);
  console.log(`Taux couverture:   ${((withImage / total) * 100).toFixed(1)}%`);

  // Échantillon produits sans image
  const noImg = await prisma.product.findMany({
    where: { image: '' },
    take: 15,
    select: { id: true, name: true, ean: true, brand: { select: { name: true } } },
  });
  console.log('\n--- Échantillon sans image ---');
  noImg.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} [${p.brand?.name || '?'}] EAN: ${p.ean || 'N/A'}`);
  });

  // Couverture par store
  console.log('\n--- Couverture par store ---');
  const stores = await prisma.store.findMany({ select: { id: true, name: true } });
  for (const s of stores) {
    const storePrices = await prisma.priceEntry.findMany({
      where: { storeId: s.id },
      select: { productId: true },
    });
    const productIds = storePrices.map(p => p.productId);
    if (productIds.length === 0) continue;
    const withImgCount = await prisma.product.count({
      where: { id: { in: productIds }, image: { not: '' } },
    });
    const noImgCount = productIds.length - withImgCount;
    const pct = ((withImgCount / productIds.length) * 100).toFixed(0);
    console.log(`  ${s.name}: ${withImgCount}/${productIds.length} (${pct}%) — ${noImgCount} sans image`);
  }

  await prisma.$disconnect();
})();
