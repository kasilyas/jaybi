import { compatible } from './compatibility.js';
import { prisma } from '../lib/prisma.js';
import { NormalizedProduct, MatchResult } from './types.js';

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a: string, b: string): number {
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - dist / maxLen;
}

/**
 * Matching strategy: EAN → exact (brand+name) → fuzzy (name similarity)
 */
export async function matchProduct(normalized: NormalizedProduct): Promise<MatchResult> {
  // 1. EAN exact match
  if (normalized.ean) {
    const byEan = await prisma.product.findFirst({
      where: { ean: normalized.ean, isDeleted: false },
      include: { brand: true },
    });
    if (byEan) return compatible(normalized, byEan) ? { productId: byEan.id, confidence: 1.0, method: 'ean' } : { productId: null, confidence: 1, method: 'none', reviewCandidate: { id: byEan.id, name: byEan.name, reason: 'Identifiant identique mais format ou marque à vérifier' } };
  }

  // 2. Exact match on brand + name
  if (normalized.brand) {
    const brand = await prisma.brand.findFirst({
      where: { name: { equals: normalized.brand, mode: 'insensitive' } },
      select: { id: true },
    });
    if (brand) {
      const exact = await prisma.product.findFirst({
        where: {
          brandId: brand.id,
          name: { equals: normalized.name, mode: 'insensitive' },
          isDeleted: false,
        },
        include: { brand: true },
      });
      if (exact && compatible(normalized, exact)) return { productId: exact.id, confidence: 0.95, method: 'exact' };
    }
  }

  // Paginated stable traversal: no silent truncation at 500 products.
  let cursor: string | undefined;
  let best: { id: string; name: string; score: number } | undefined;
  while (true) {
    const candidates = await prisma.product.findMany({
      where: { isDeleted: false }, include: { brand: true }, orderBy: { id: 'asc' },
      take: 500, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    for (const candidate of candidates) {
      if (!compatible(normalized, candidate)) continue;
      const score = similarity(normalized.name, candidate.name);
      if (score >= 0.85 && (!best || score > best.score)) best = { id: candidate.id, name: candidate.name, score };
    }
    if (candidates.length < 500) break;
    cursor = candidates[candidates.length - 1].id;
  }
  if (best) return { productId: null, confidence: best.score, method: 'fuzzy', reviewCandidate: { id: best.id, name: best.name, reason: 'Ressemblance de nom : validation humaine nécessaire' } };
  return { productId: null, confidence: 0, method: 'none' };
}
