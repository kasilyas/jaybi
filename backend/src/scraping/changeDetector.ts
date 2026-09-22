import { prisma } from '../lib/prisma.js';
import { NormalizedProduct, SyncChanges, MatchResult, PriceChange } from './types.js';
import { matchProduct } from './matcher.js';

/**
 * Construit le PriceChange d'un produit matché, ou null si rien n'a changé.
 * Réutilisé lors de la résolution des revues de rapprochement acceptées.
 */
export async function priceChangeForMatch(productId: string, np: NormalizedProduct): Promise<{
  change: PriceChange | null;
  hasPromo: boolean;
  becomesUnavailable: boolean;
} | null> {
  const store = await prisma.store.findFirst({
    where: { name: { equals: np.storeName, mode: 'insensitive' } },
    select: { id: true },
  });
  if (!store) return null;

  const existingEntry = await prisma.priceEntry.findFirst({
    where: { productId, storeId: store.id, city: np.city },
  });

  if (!existingEntry) {
    return {
      change: {
        productId,
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
        source: np.source,
        sourceUrl: np.sourceUrl,
        seller: np.seller,
        scrapedAt: np.scrapedAt,
      },
      hasPromo: !!(np.originalPrice && np.originalPrice > np.price),
      becomesUnavailable: !np.available,
    };
  }

  const priceChanged = Math.abs(existingEntry.price - np.price) > 0.01;
  const availChanged = existingEntry.available !== np.available;
  const hasPromo = !!(np.originalPrice && np.originalPrice > np.price);

  if (!priceChanged && !availChanged && !hasPromo) return { change: null, hasPromo: false, becomesUnavailable: false };

  return {
    change: {
      productId,
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
      source: np.source,
      sourceUrl: np.sourceUrl,
      seller: np.seller,
      scrapedAt: np.scrapedAt,
    },
    hasPromo,
    becomesUnavailable: availChanged && !np.available,
  };
}

/**
 * Détecte les changements entre les produits scraped et l'état actuel en base.
 */
export async function detectChanges(normalizedProducts: NormalizedProduct[]): Promise<SyncChanges> {
  const newProducts: { normalized: NormalizedProduct }[] = [];
  const priceChanges: any[] = [];
  const promotions: any[] = [];
  const unavailability: any[] = [];
  let matchedCount = 0;
  const reviewRequired: NonNullable<SyncChanges['reviewRequired']> = [];

  for (const np of normalizedProducts) {
    const match: MatchResult = await matchProduct(np);

    if (match.reviewCandidate) {
      reviewRequired.push({ normalized: np, candidate: match.reviewCandidate, confidence: match.confidence });
      continue;
    }
    if (!match.productId) {
      newProducts.push({ normalized: np });
      continue;
    }

    matchedCount++;

    const result = await priceChangeForMatch(match.productId, np);
    if (result?.change) {
      priceChanges.push(result.change);
      if (result.hasPromo) promotions.push(result.change);
      if (result.becomesUnavailable) unavailability.push(result.change);
    }
  }

  return {
    reviewRequired,
    newProducts,
    priceChanges,
    promotions,
    unavailability,
    matchedCount,
    unmatchedCount: newProducts.length,
  };
}
