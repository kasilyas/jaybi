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
      select: { id: true },
    });
    if (byEan) return { productId: byEan.id, confidence: 1.0, method: 'ean' };
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
        select: { id: true },
      });
      if (exact) return { productId: exact.id, confidence: 0.95, method: 'exact' };
    }
  }

  // 3. Fuzzy match on name
  const candidates = await prisma.product.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true },
    take: 500,
  });

  let bestMatch: { id: string; score: number } | null = null;
  for (const c of candidates) {
    const score = similarity(normalized.name, c.name);
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { id: c.id, score };
    }
  }

  if (bestMatch && bestMatch.score >= 0.85) {
    return { productId: bestMatch.id, confidence: bestMatch.score, method: 'fuzzy' };
  }

  return { productId: null, confidence: 0, method: 'none' };
}
