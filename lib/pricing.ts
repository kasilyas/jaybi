export { effectivePrice, effectiveDiscount, money } from '../backend/src/lib/pricing';
import { effectivePrice, effectiveDiscount, money } from '../backend/src/lib/pricing';
import type { Pack, Product } from '../types';
export function packDiscount(pack: Pack | undefined, productId: string): number {
  return pack?.productDiscounts?.[productId] ?? pack?.discountPercent ?? 0;
}
export function packQuote(pack: Pack, products: Product[]) {
  const lines = pack.productIds.map(id => {
    const product = products.find(p => p.id === id && !p.isDeleted && p.isActive !== false);
    const entry = product?.prices.filter(p => p.available && (!p.promotionExpiresAt || Date.parse(p.promotionExpiresAt) >= Date.now())).sort((a,b) => a.price-b.price)[0];
    if (!product || !entry) return null;
    const discount = Math.max(effectiveDiscount(product), packDiscount(pack, id));
    return { product, original: entry.price, price: effectivePrice(entry.price, product, packDiscount(pack, id)), discount };
  });
  const available = lines.length > 0 && lines.every(Boolean);
  const original = money(lines.reduce((s, l) => s + (l?.original ?? 0), 0));
  const total = money(lines.reduce((s, l) => s + (l?.price ?? 0), 0));
  return { available, lines, original, total, savings: money(original - total),
    discount: original ? Math.floor((original-total)/original*100) : 0,
    maxDiscount: Math.max(0, ...lines.map(l => l?.discount ?? 0)) };
}
