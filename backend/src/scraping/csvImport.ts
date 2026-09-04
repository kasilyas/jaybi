import { ScrapedProduct } from './types.js';

/**
 * Parse un CSV importé manuellement (fallback quand scraping bloqué).
 * Format: name,brand,category,unit,weight,ean,price,originalPrice,promotionLabel,available,city,storeName
 */
export function parseCsv(csvContent: string, sourceName = 'csv_import'): ScrapedProduct[] {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const products: ScrapedProduct[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx]; });

    const priceStr = row['price'] || '';
    const price = parseFloat(priceStr) || 0;
    if (priceStr.trim() === '' || price <= 0) continue;

    products.push({
      source: sourceName,
      sourceUrl: `csv://import/${sourceName}`,
      scrapedAt: new Date(),
      name: row['name'] || '',
      brand: row['brand'] || undefined,
      category: row['category'] || undefined,
      unit: row['unit'] || undefined,
      weight: parseFloat(row['weight'] || '0') || undefined,
      ean: row['ean'] || undefined,
      price,
      originalPrice: parseFloat(row['originalprice'] || '0') || undefined,
      promotionLabel: row['promotionlabel'] || undefined,
      available: row['available']?.toLowerCase() !== 'false',
      city: row['city'] || 'Casablanca',
      storeName: row['storename'] || 'Import',
    });
  }

  return products;
}
