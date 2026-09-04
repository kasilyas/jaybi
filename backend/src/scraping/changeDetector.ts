import { prisma } from '../lib/prisma.js';
import { NormalizedProduct, SyncChanges, MatchResult } from './types.js';
import { matchProduct } from './matcher.js';

/**
 * Détecte les changements entre les produits scraped et l'état actuel en base.
 */
export async function detectChanges(normalizedProducts: NormalizedProduct[]): Promise<SyncChanges> {
  const newProducts: { normalized: NormalizedProduct }[] = [];
  const priceChanges: any[] = [];
  const promotions: any[] = [];
  const unavailability: any[] = [];
  let matchedCount = 0;

  for (const np of normalizedProducts) {
    const match: MatchResult = await matchProduct(np);

    if (!match.productId) {
      newProducts.push({ normalized: np });
      continue;
    }

    matchedCount++;

    const store = await prisma.store.findFirst({
      where: { name: { equals: np.storeName, mode: 'insensitive' } },
      select: { id: true },
    });

    if (!store) continue;

    const existingEntry = await prisma.priceEntry.findFirst({
      where: { productId: match.productId, storeId: store.id, city: np.city },
    });

    if (!existingEntry) {
      priceChanges.push({
        productId: match.productId,
        priceEntryId: '',
        storeName: np.storeName,
        city: np.city,
        oldPrice: 0,
        newPrice: np.price,
        oldAvailable: false,
        newAvailable: np.available,
        originalPrice: np.originalPrice,
        promotionLabel: np.promotionLabel,
        promotionExpiresAt: np.promotionExpiresAt,
      });
      continue;
    }

    const priceChanged = Math.abs(existingEntry.price - np.price) > 0.01;
    const availChanged = existingEntry.available !== np.available;
    const hasPromo = np.originalPrice && np.originalPrice > np.price;

    if (priceChanged || availChanged || hasPromo) {
      const change = {
        productId: match.productId,
        priceEntryId: existingEntry.id,
        storeName: np.storeName,
        city: np.city,
        oldPrice: existingEntry.price,
        newPrice: np.price,
        oldAvailable: existingEntry.available,
        newAvailable: np.available,
        originalPrice: np.originalPrice,
        promotionLabel: np.promotionLabel,
        promotionExpiresAt: np.promotionExpiresAt,
      };
      priceChanges.push(change);
      if (hasPromo) promotions.push(change);
      if (availChanged && !np.available) unavailability.push(change);
    }
  }

  return {
    newProducts,
    priceChanges,
    promotions,
    unavailability,
    matchedCount,
    unmatchedCount: newProducts.length,
  };
}
