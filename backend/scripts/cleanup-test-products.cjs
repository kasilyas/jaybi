// Nettoie les produits de test et seed sans image
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  // Compte les produits de test
  const testProducts = await prisma.product.findMany({
    where: {
      OR: [
        { name: { startsWith: 'Produit Validé' } },
        { name: { startsWith: 'Test Product' } },
        { name: 'Flash Test Product' },
        { name: { startsWith: 'Produit Test' } },
        { name: { startsWith: 'Mock' } },
      ],
    },
    select: { id: true, name: true, image: true },
  });

  console.log(`Produits de test trouvés: ${testProducts.length}`);
  testProducts.slice(0, 10).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (image: "${p.image?.substring(0, 30) || ''}")`);
  });

  if (testProducts.length === 0) {
    console.log('Aucun produit de test à supprimer.');
    await prisma.$disconnect();
    return;
  }

  // Supprime d'abord les price entries, price history, puis les produits
  const testIds = testProducts.map(p => p.id);

  const deletedPrices = await prisma.priceEntry.deleteMany({
    where: { productId: { in: testIds } },
  });
  console.log(`\nPrice entries supprimés: ${deletedPrices.count}`);

  const deletedProducts = await prisma.product.deleteMany({
    where: { id: { in: testIds } },
  });
  console.log(`Produits de test supprimés: ${deletedProducts.count}`);

  // Vérifie après
  const total = await prisma.product.count();
  const withImage = await prisma.product.count({ where: { image: { not: '' } } });
  const withoutImage = await prisma.product.count({ where: { image: '' } });
  console.log(`\n=== Après nettoyage ===`);
  console.log(`Total produits:    ${total}`);
  console.log(`Avec image:        ${withImage}`);
  console.log(`Sans image:        ${withoutImage}`);
  console.log(`Taux couverture:   ${((withImage / total) * 100).toFixed(1)}%`);

  // Liste les produits restants sans image
  const remaining = await prisma.product.findMany({
    where: { image: '' },
    take: 20,
    select: { name: true, brand: { select: { name: true } } },
  });
  if (remaining.length > 0) {
    console.log(`\n--- Produits restants sans image ---`);
    remaining.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} [${p.brand?.name || '?'}]`);
    });
  }

  await prisma.$disconnect();
})();
