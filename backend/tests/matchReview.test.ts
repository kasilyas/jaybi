import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    matchReview: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
    store: { findFirst: vi.fn() },
    priceEntry: { findFirst: vi.fn() },
  },
}));

import { prisma } from '../src/lib/prisma.js';
import { resolveReviewedChanges, stageMatchReviews } from '../src/scraping/matchReview.js';
import type { NormalizedProduct, SyncChanges } from '../src/scraping/types.js';

const db = vi.mocked(prisma, true);

const np = (over: Partial<NormalizedProduct> = {}): NormalizedProduct => ({
  name: 'Lait Testrevue 1 L', brand: 'Testrevue', category: 'Boissons', image: '',
  unit: 'L', weight: 1, price: 9.9, available: true, city: 'Casablanca',
  storeName: 'Marjane', source: 'test', sourceUrl: 'https://example.test/p',
  scrapedAt: new Date('2026-09-22'), ...over,
});

const baseChanges = (items: SyncChanges['reviewRequired']): SyncChanges => ({
  reviewRequired: items,
  newProducts: [],
  priceChanges: [],
  promotions: [],
  unavailability: [],
  matchedCount: 0,
  unmatchedCount: 0,
});

const review = (over: any) => ({
  id: 'rev1', syncRunId: 'run1', candidateId: 'prod1', candidateName: 'Lait Testrevue 1L',
  reason: 'Ressemblance de nom', confidence: 0.9, normalized: np(), status: 'accepted',
  reviewedBy: 'admin@test.io', reviewedAt: new Date(), createdAt: new Date(), ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  db.store.findFirst.mockResolvedValue({ id: 'store1' } as any);
});

describe('stageMatchReviews', () => {
  it('persiste chaque candidat dans l’ordre', async () => {
    db.matchReview.create.mockResolvedValue({ id: 'r1' } as any);
    const items = [
      { normalized: np(), candidate: { id: 'p1', name: 'A', reason: 'r' }, confidence: 0.9 },
      { normalized: np({ name: 'B' }), candidate: { id: 'p2', name: 'B', reason: 'r' }, confidence: 0.86 },
    ];
    await stageMatchReviews('run1', items);
    expect(db.matchReview.create).toHaveBeenCalledTimes(2);
    expect(db.matchReview.create.mock.calls[0][0].data).toMatchObject({ syncRunId: 'run1', candidateId: 'p1', confidence: 0.9 });
  });
});

describe('resolveReviewedChanges', () => {
  it('accepted + prix différent → priceChange avec ancien/nouveau prix', async () => {
    db.matchReview.findMany.mockResolvedValue([review({})] as any);
    db.priceEntry.findFirst.mockResolvedValue({ id: 'pe1', price: 12, available: true, originalPrice: null } as any);

    const resolved = await resolveReviewedChanges('run1', baseChanges([{ normalized: np(), candidate: { id: 'prod1', name: 'x', reason: 'r' }, confidence: 0.9 }]));

    expect(resolved.reviewRequired).toEqual([]);
    expect(resolved.priceChanges).toHaveLength(1);
    expect(resolved.priceChanges[0]).toMatchObject({ productId: 'prod1', priceEntryId: 'pe1', oldPrice: 12, newPrice: 9.9 });
  });

  it('accepted + promo → alimente promotions ; indisponible → unavailability', async () => {
    db.matchReview.findMany.mockResolvedValue([review({ normalized: np({ originalPrice: 15, available: false }) })] as any);
    db.priceEntry.findFirst.mockResolvedValue({ id: 'pe1', price: 9.9, available: true, originalPrice: null } as any);

    const resolved = await resolveReviewedChanges('run1', baseChanges([]));

    expect(resolved.promotions).toHaveLength(1);
    expect(resolved.unavailability).toHaveLength(1);
  });

  it('accepted sans différence → matchedCount++ sans priceChange', async () => {
    db.matchReview.findMany.mockResolvedValue([review({})] as any);
    db.priceEntry.findFirst.mockResolvedValue({ id: 'pe1', price: 9.9, available: true, originalPrice: null } as any);

    const resolved = await resolveReviewedChanges('run1', baseChanges([]));

    expect(resolved.priceChanges).toHaveLength(0);
    expect(resolved.matchedCount).toBe(1);
  });

  it('accepted sans entrée de prix → création (priceEntryId vide)', async () => {
    db.matchReview.findMany.mockResolvedValue([review({})] as any);
    db.priceEntry.findFirst.mockResolvedValue(null);

    const resolved = await resolveReviewedChanges('run1', baseChanges([]));

    expect(resolved.priceChanges).toHaveLength(1);
    expect(resolved.priceChanges[0].priceEntryId).toBe('');
  });

  it('rejected → nouveau produit', async () => {
    db.matchReview.findMany.mockResolvedValue([review({ status: 'rejected' })] as any);

    const resolved = await resolveReviewedChanges('run1', baseChanges([]));

    expect(resolved.newProducts).toHaveLength(1);
    expect(resolved.newProducts[0].normalized.name).toBe('Lait Testrevue 1 L');
    expect(resolved.unmatchedCount).toBe(1);
    expect(resolved.priceChanges).toHaveLength(0);
  });

  it('accepted avec enseigne inconnue → match confirmé, aucun prix créé', async () => {
    db.matchReview.findMany.mockResolvedValue([review({})] as any);
    db.store.findFirst.mockResolvedValue(null);

    const resolved = await resolveReviewedChanges('run1', baseChanges([]));

    expect(resolved.priceChanges).toHaveLength(0);
    expect(resolved.matchedCount).toBe(1);
  });

  it('aucune décision → changes inchangés', async () => {
    db.matchReview.findMany.mockResolvedValue([]);
    const original = baseChanges([{ normalized: np(), candidate: { id: 'p', name: 'x', reason: 'r' }, confidence: 0.9 }]);
    const resolved = await resolveReviewedChanges('run1', original);
    expect(resolved).toBe(original);
  });
});
