import { prisma } from '../lib/prisma.js';
import { NormalizedProduct, SyncChanges } from './types.js';
import { priceChangeForMatch } from './changeDetector.js';

type ReviewItem = NonNullable<SyncChanges['reviewRequired']>[number];

/**
 * Persiste chaque candidat de revue d'un run dry_run. L'ordre de création
 * correspond à reviewRequired : l'UI peut associer review[i] à l'item i.
 */
export async function stageMatchReviews(runId: string, reviewRequired: ReviewItem[]) {
  const created = [];
  for (const item of reviewRequired) {
    const row = await prisma.matchReview.create({
      data: {
        syncRunId: runId,
        candidateId: item.candidate.id,
        candidateName: item.candidate.name,
        reason: item.candidate.reason,
        confidence: item.confidence,
        normalized: item.normalized as object,
      },
    });
    created.push(row);
  }
  return created;
}

/**
 * Fusionne les décisions persistées dans les changes du run.
 * Les items reviewRequired couverts par une décision sont retirés ;
 * un reliquat non décidé (run historique sans lignes MatchReview) reste bloquant.
 */
export async function resolveReviewedChanges(runId: string, changes: SyncChanges): Promise<SyncChanges> {
  const decided = await prisma.matchReview.findMany({
    where: { syncRunId: runId, status: { in: ['accepted', 'rejected'] } },
    orderBy: { createdAt: 'asc' },
  });
  if (!decided.length) return changes;

  const resolved: SyncChanges = { ...changes, reviewRequired: [], newProducts: [...changes.newProducts], priceChanges: [...changes.priceChanges], promotions: [...changes.promotions], unavailability: [...changes.unavailability] };
  for (const review of decided) {
    const np = review.normalized as unknown as NormalizedProduct;
    if (review.status === 'accepted') {
      const result = await priceChangeForMatch(review.candidateId, np);
      if (result?.change) {
        resolved.priceChanges.push(result.change);
        if (result.hasPromo) resolved.promotions.push(result.change);
        if (result.becomesUnavailable) resolved.unavailability.push(result.change);
      } else {
        resolved.matchedCount++;
      }
    } else {
      resolved.newProducts.push({ normalized: np });
      resolved.unmatchedCount++;
    }
  }
  return resolved;
}
