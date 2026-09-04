import { prisma } from '../lib/prisma.js';
import { SyncChanges } from './types.js';
import { addAuditLog } from '../lib/audit.js';

/**
 * Publie les changements approuvés en base.
 * RÈGLE D'OR : seul le publisher écrit dans les tables métier.
 *
 * Stratégie : pas de transaction (Prisma bug avec relations dans tx).
 * Batching par 50 produits avec cache stores/brands pour performance.
 */

const BATCH_SIZE = 50;

export async function publishChangesDirect(
  changes: SyncChanges,
  adminEmail: string,
  adapter: string,
): Promise<{ productsNew: number; pricesUpdated: number }> {
  let productsNew = 0;
  let pricesUpdated = 0;

  // Cache stores et brands
  const storeCache = new Map<string, string>();
  const brandCache = new Map<string, string>();

  async function getOrCreateStore(name: string): Promise<string> {
    if (storeCache.has(name)) return storeCache.get(name)!;
    const store = await prisma.store.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    storeCache.set(name, store.id);
    return store.id;
  }

  async function getOrCreateBrand(name: string): Promise<string | null> {
    if (!name) return null;
    if (brandCache.has(name)) return brandCache.get(name)!;
    const brand = await prisma.brand.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    brandCache.set(name, brand.id);
    return brand.id;
  }

  // 1. Nouveaux produits — par batchs sans transaction
  const newProducts = changes.newProducts;
  for (let i = 0; i < newProducts.length; i += BATCH_SIZE) {
    const batch = newProducts.slice(i, i + BATCH_SIZE);
    if (i % 500 === 0) {
      console.log(`[publisher] Progression: ${i}/${newProducts.length} (${Math.round(i / newProducts.length * 100)}%)`);
    }

    for (const np of batch) {
      const n = np.normalized;
      const brandId = await getOrCreateBrand(n.brand || '');
      const storeId = await getOrCreateStore(n.storeName);

      // findFirst pour vérifier si le produit existe déjà (par EAN)
      let product = n.ean
        ? await prisma.product.findFirst({ where: { ean: n.ean } })
        : null;

      if (product) {
        // Update — ProductUpdateInput accepte brandId direct
        await prisma.product.update({
          where: { id: product.id },
          data: {
            name: n.name,
            brandId: brandId || null,
            category: n.category ?? 'Autre',
            image: n.image ?? '',
            unit: n.unit,
            weight: n.weight,
            isActive: true,
          },
        });
      } else {
        // Create — brandId conditionnel pour éviter l'inférence Prisma
        const productData: any = {
          name: n.name,
          category: n.category ?? 'Autre',
          image: n.image ?? '',
          unit: n.unit ?? 'unit',
          weight: (n.weight != null && !isNaN(n.weight)) ? n.weight : 0,
          ean: n.ean || undefined,
          isActive: true,
        };
        if (brandId) productData.brandId = brandId;
        product = await prisma.product.create({ data: productData });
      }

      // Price entry — upsert sur (productId, storeId, city)
      const existingPrice = await prisma.priceEntry.findFirst({
        where: { productId: product.id, storeId, city: n.city },
      });

      if (existingPrice) {
        // Archive old price
        await prisma.priceHistory.create({
          data: {
            priceEntryId: existingPrice.id,
            price: existingPrice.price,
            originalPrice: existingPrice.originalPrice,
            available: existingPrice.available,
          },
        });
        // Update price
        await prisma.priceEntry.update({
          where: { id: existingPrice.id },
          data: {
            price: n.price,
            originalPrice: n.originalPrice,
            promotionExpiresAt: n.promotionExpiresAt,
            available: n.available,
            lastUpdated: new Date(),
          },
        });
        pricesUpdated++;
      } else {
        await prisma.priceEntry.create({
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
    }
  }

  // 2. Prix existants : archive + update
  const priceChanges = changes.priceChanges;
  for (let i = 0; i < priceChanges.length; i += BATCH_SIZE) {
    const batch = priceChanges.slice(i, i + BATCH_SIZE);

    for (const pc of batch) {
      if (!pc.priceEntryId) {
        const storeId = await getOrCreateStore(pc.storeName);
        await prisma.priceEntry.create({
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

      const existing = await prisma.priceEntry.findUnique({ where: { id: pc.priceEntryId } });
      if (existing) {
        await prisma.priceHistory.create({
          data: {
            priceEntryId: existing.id,
            price: existing.price,
            originalPrice: existing.originalPrice,
            available: existing.available,
          },
        });

        await prisma.priceEntry.update({
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
  }

  // 3. Audit log
  await addAuditLog({
    action: 'SYNC_PUBLISHED',
    user: adminEmail,
    userEmail: adminEmail,
    details: `Sync ${adapter}: ${productsNew} nouveaux produits, ${pricesUpdated} prix mis à jour`,
    type: 'success',
  });

  return { productsNew, pricesUpdated };
}

/**
 * Crée un SyncRun en base (status: dry_run).
 */
export async function createSyncRun(
  adapter: string,
  productsFound: number,
  changes: SyncChanges,
): Promise<string> {
  const run = await prisma.syncRun.create({
    data: {
      adapter,
      status: 'dry_run',
      mode: 'full_scrape',
      triggeredBy: 'script@jaybi',
      endedAt: new Date(),
      productsFound,
      productsNew: changes.newProducts.length,
      pricesUpdated: changes.priceChanges.length,
      promotionsFound: changes.promotions.length,
      errors: [],
      changes: changes as any,
    },
  });
  return run.id;
}

// Alias pour compatibilité
export const publishChanges = publishChangesDirect;
