import { prisma } from '../lib/prisma.js';
import { SyncChanges } from './types.js';
import { addAuditLog } from '../lib/audit.js';

/**
 * Publie les changements approuvés en base de manière atomique.
 * RÈGLE D'OR : seul le publisher écrit dans les tables métier.
 */
export async function publishChanges(
  changes: SyncChanges,
  adminEmail: string,
  adapter: string,
): Promise<{ productsNew: number; pricesUpdated: number }> {
  return await prisma.$transaction(async (tx) => {
    let productsNew = 0;
    let pricesUpdated = 0;

    // 1. Nouveaux produits
    for (const np of changes.newProducts) {
      const n = np.normalized;

      let brandId: string | null = null;
      if (n.brand) {
        const brand = await tx.brand.upsert({
          where: { name: n.brand },
          update: {},
          create: { name: n.brand },
        });
        brandId = brand.id;
      }

      const store = await tx.store.upsert({
        where: { name: n.storeName },
        update: {},
        create: { name: n.storeName },
      });

      const product = await tx.product.create({
        data: {
          name: n.name,
          brandId,
          category: n.category ?? 'Autre',
          image: n.image ?? '',
          unit: n.unit,
          weight: n.weight,
          ean: n.ean,
          isActive: true,
        },
      });

      await tx.priceEntry.create({
        data: {
          productId: product.id,
          storeId: store.id,
          city: n.city,
          price: n.price,
          originalPrice: n.originalPrice,
          promotionExpiresAt: n.promotionExpiresAt,
          available: n.available,
        },
      });

      productsNew++;
    }

    // 2. Prix existants : archive + update
    for (const pc of changes.priceChanges) {
      if (!pc.priceEntryId) {
        const store = await tx.store.upsert({
          where: { name: pc.storeName },
          update: {},
          create: { name: pc.storeName },
        });
        await tx.priceEntry.create({
          data: {
            productId: pc.productId,
            storeId: store.id,
            city: pc.city,
            price: pc.newPrice,
            originalPrice: pc.originalPrice,
            promotionExpiresAt: pc.promotionExpiresAt,
            available: pc.newAvailable,
          },
        });
        pricesUpdated++;
        continue;
      }

      const existing = await tx.priceEntry.findUnique({ where: { id: pc.priceEntryId } });
      if (existing) {
        await tx.priceHistory.create({
          data: {
            priceEntryId: existing.id,
            price: existing.price,
            originalPrice: existing.originalPrice,
            available: existing.available,
          },
        });

        await tx.priceEntry.update({
          where: { id: pc.priceEntryId },
          data: {
            price: pc.newPrice,
            originalPrice: pc.originalPrice,
            promotionExpiresAt: pc.promotionExpiresAt,
            available: pc.newAvailable,
            lastUpdated: new Date(),
          },
        });
        pricesUpdated++;
      }
    }

    await addAuditLog({
      action: 'SYNC_PUBLISHED',
      user: adminEmail,
      userEmail: adminEmail,
      details: `Sync ${adapter}: ${productsNew} nouveaux produits, ${pricesUpdated} prix mis à jour`,
      type: 'success',
    });

    return { productsNew, pricesUpdated };
  });
}
