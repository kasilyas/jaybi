// Types partagés du pipeline de scraping
// Règle d'or : Adapter → Normalize → Match → Diff → Stage → Approve → Publish

export interface ScrapedProduct {
  source: string;
  sourceUrl: string;
  scrapedAt: Date;
  name: string;
  brand?: string;
  seller?: string;
  category?: string;
  image?: string;
  unit?: string;
  weight?: number;
  ean?: string;
  price: number;
  originalPrice?: number;
  promotionLabel?: string;
  promotionExpiresAt?: Date;
  available: boolean;
  city: string;
  storeName: string;
}

export interface NormalizedProduct {
  name: string;
  brand?: string;
  seller?: string;
  category?: string;
  image?: string;
  unit: 'kg' | 'L' | 'unit' | 'g' | 'ml';
  weight: number;
  ean?: string;
  price: number;
  originalPrice?: number;
  promotionLabel?: string;
  promotionExpiresAt?: Date;
  available: boolean;
  city: string;
  storeName: string;
  source: string;
  sourceUrl: string;
  scrapedAt: Date;
}

export interface MatchResult {
  productId: string | null;
  confidence: number;
  method: 'ean' | 'exact' | 'fuzzy' | 'none';
  reviewCandidate?: { id: string; name: string; reason: string };
}

export interface PriceChange {
  productId: string;
  priceEntryId: string;
  storeName: string;
  city: string;
  oldPrice: number;
  newPrice: number;
  oldAvailable: boolean;
  newAvailable: boolean;
  originalPrice?: number;
  promotionLabel?: string;
  promotionExpiresAt?: Date;
  source?: string;
  sourceUrl?: string;
  seller?: string;
  scrapedAt?: Date;
}

export interface NewProductChange {
  normalized: NormalizedProduct;
}

export interface SyncChanges {
  reviewRequired?: { normalized: NormalizedProduct; candidate: { id: string; name: string; reason: string }; confidence: number }[];
  newProducts: NewProductChange[];
  priceChanges: PriceChange[];
  promotions: PriceChange[];
  unavailability: PriceChange[];
  matchedCount: number;
  unmatchedCount: number;
}

export interface SyncRunResult {
  adapter: string;
  productsFound: number;
  changes: SyncChanges;
  errors: { message: string; url?: string; timestamp: string }[];
}

export type AdapterStatus = 'pending' | 'running' | 'dry_run' | 'approved' | 'rejected' | 'completed' | 'failed';
export type SourceType = 'scraper' | 'api' | 'csv';
