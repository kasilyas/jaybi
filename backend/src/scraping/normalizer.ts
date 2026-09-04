import { NormalizedProduct, ScrapedProduct } from './types.js';

const UNIT_MAP: Record<string, 'kg' | 'L' | 'unit' | 'g' | 'ml'> = {
  'kg': 'kg', 'kilo': 'kg', 'kilogramme': 'kg', 'kilos': 'kg',
  'l': 'L', 'litre': 'L', 'liter': 'L', 'litres': 'L',
  'unit': 'unit', 'unité': 'unit', 'unite': 'unit', 'piece': 'unit', 'pièce': 'unit', 'pc': 'unit',
  'g': 'g', 'gramme': 'g', 'gram': 'g',
  'ml': 'ml', 'millilitre': 'ml', 'milliliter': 'ml',
};

export function normalizeUnit(raw?: string): 'kg' | 'L' | 'unit' | 'g' | 'ml' {
  if (!raw) return 'unit';
  const key = raw.toLowerCase().trim();
  return UNIT_MAP[key] ?? 'unit';
}

export function extractWeight(raw: string): number {
  const match = raw.match(/([\d.]+)\s*(kg|g|l|ml|litre|gramme)/i);
  if (match) return parseFloat(match[1]);
  const numMatch = raw.match(/^([\d.]+)/);
  if (numMatch) return parseFloat(numMatch[1]);
  return 0;
}

export function cleanName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    // Corrige les unités : "1l" → "1L", "500g" → "500g", "2l" → "2L"
    .replace(/(\d)l\b/gi, '$1L')
    .trim();
}

export function parsePrice(raw: string | number): number {
  if (typeof raw === 'number') return raw;
  const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function normalizeProduct(scraped: ScrapedProduct): NormalizedProduct {
  return {
    name: cleanName(scraped.name),
    brand: scraped.brand ? cleanName(scraped.brand) : undefined,
    category: scraped.category,
    image: scraped.image,
    unit: normalizeUnit(scraped.unit),
    weight: scraped.weight ?? extractWeight(scraped.name),
    ean: scraped.ean?.trim() || undefined,
    price: parsePrice(scraped.price),
    originalPrice: scraped.originalPrice ? parsePrice(scraped.originalPrice) : undefined,
    promotionLabel: scraped.promotionLabel,
    promotionExpiresAt: scraped.promotionExpiresAt,
    available: scraped.available,
    city: scraped.city,
    storeName: scraped.storeName,
    source: scraped.source,
    sourceUrl: scraped.sourceUrl,
    scrapedAt: scraped.scrapedAt,
  };
}

export function normalizeAll(products: ScrapedProduct[]): NormalizedProduct[] {
  return products.map(normalizeProduct);
}
