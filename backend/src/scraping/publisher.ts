import { prisma } from '../lib/prisma.js';
import { SyncChanges } from './types.js';
import { addAuditLog } from '../lib/audit.js';

/**
 * Publie les changements approuvés en base.
 * RÈGLE D'OR : seul le publisher écrit dans les tables métier.
 *
 * Stratégie : batch par petits groupes (50 produits/transaction) pour éviter
 * les timeouts de transaction Prisma (500+ produits en une transaction = crash).
 */

const BATCH_SIZE = 50;
// Timeout Prisma étendu pour les batchs (défaut 5s trop court)
const TX_TIMEOUT_MS = 30000;

export async function publishChanges(
  changes: SyncChanges,
  adminEmail: string,
  adapter: string,
): Promise<{ productsNew: number; pricesUpdated: number }> {
  let productsNew = 0;
  let pricesUpdated = 0;

  // Cache stores et brands pour éviter les upserts répétitifs
  const storeCache = new Map<string, string>();
  const brandCache = new Map<string, string>();

  async function getOrCreateStore(tx: any, name: string): Promise<string> {
    if (storeCache.has(name)) return storeCache.get(name)!;
    const store = await tx.store.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    storeCache.set(name, store.id);
    return store.id;
  }

  async function getOrCreateBrand(tx: any, name: string): Promise<string | null> {
    if (!name) return null;
    if (brandCache.has(name)) return brandCache.get(name)!;
    const brand = await tx.brand.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    brandCache.set(name, brand.id);
    return brand.id;
  }

  // 1. Nouveaux produits — par batchs
  const newProducts = changes.newProducts;
  for (let i = 0; i < newProducts.length; i += BATCH_SIZE) {
    const batch = newProducts.slice(i, i + BATCH_SIZE);
    console.log(`[publisher] Batch nouveaux produits ${i / BATCH_SIZE + 1}/${Math.ceil(newProducts.length / BATCH_SIZE)} (${batch.length} produits)`);

    await prisma.$transaction(async (tx) => {
      for (const np of batch) {
        const n = np.normalized;
        const brandId = await getOrCreateBrand(tx, n.brand || '');
        const storeId = await getOrCreateStore(tx, n.storeName);

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
            storeId,
            city: n.city,
            price: n.price,
            originalPrice: n.originalPrice,
            promotionExpiresAt: n.promotionExpiresAt,
            available: n.available,
          },
        });

        productsNew++;
      }
    }, { timeout: TX_TIMEOUT_MS });
  }

  // 2. Prix existants : archive + update — par batchs
  const priceChanges = changes.priceChanges;
  for (let i = 0; i < priceChanges.length; i += BATCH_SIZE) {
    const batch = priceChanges.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(async (tx) => {
      for (const pc of batch) {
        if (!pc.priceEntryId) {
          const storeId = await getOrCreateStore(tx, pc.storeName);
          await tx.priceEntry.create({
            data: {
              productId: pc.productId,
              storeId,
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
    }, { timeout: TX_TIMEOUT_MS });
  }

  // 3. Audit log (hors transaction)
  await addAuditLog({
    action: 'SYNC_PUBLISHED',
    user: adminEmail,
    userEmail: adminEmail,
    details: `Sync ${adapter}: ${productsNew} nouveaux produits, ${pricesUpdated} prix mis à jour`,
    type: 'success',
  });

  return { productsNew, pricesUpdated };
}
