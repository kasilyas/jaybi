import type { Prisma } from '@prisma/client';
import { HttpError } from '../middleware/errors.js';
import { effectivePrice, effectiveDiscount, money } from './pricing.js';
export type CheckoutItem = { productId: string; storeId?: string; city?: string; quantity: number; packId?: string };
export async function priceCheckout(tx: Prisma.TransactionClient, items: CheckoutItem[], now = new Date()) {
  const ids = [...new Set(items.map(i => i.productId))];
  const packIds = [...new Set(items.flatMap(i => i.packId ? [i.packId] : []))];
  const [products, packs] = await Promise.all([
    tx.product.findMany({ where: { id: { in: ids }, isDeleted: false, isActive: true }, include: { prices: { include: { store: true } } } }),
    tx.pack.findMany({ where: { id: { in: packIds }, isDeleted: false }, include: { products: true } }),
  ]);
  for (const id of packIds) {
    const pack = packs.find(p => p.id === id);
    if (!pack || !pack.products.length || (pack.startsAt && pack.startsAt > now) || (pack.expiresAt && pack.expiresAt < now)) throw new HttpError(409, 'PACK_UNAVAILABLE');
    const selected = items.filter(i => i.packId === id);
    const quantities = new Map<string, number>();
    for (const item of selected) {
      if (!pack.products.some(p => p.productId === item.productId)) throw new HttpError(400, 'PRODUCT_OUTSIDE_PACK');
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    if (quantities.size !== pack.products.length || new Set(quantities.values()).size !== 1) throw new HttpError(400, 'PACK_INCOMPLETE');
  }
  const lines = items.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product || !product.isActive || product.isDeleted) throw new HttpError(409, 'PRODUCT_UNAVAILABLE');
    const valid = product.prices.filter(p => p.available && p.store.isActive && !p.store.isDeleted
      && (!p.promotionExpiresAt || p.promotionExpiresAt >= now)
      && (!item.storeId || p.storeId === item.storeId) && (!item.city || p.city === item.city));
    const price = valid.sort((a, b) => a.price - b.price)[0];
    if (!price) throw new HttpError(409, 'OFFER_UNAVAILABLE');
    const pack = packs.find(p => p.id === item.packId);
    const packDiscount = pack?.products.find(p => p.productId === item.productId)?.discountPercent ?? 0;
    const unitPrice = effectivePrice(price.price, product, packDiscount, now.getTime());
    return { productId: product.id, productName: product.name, storeName: price.store.name, city: price.city,
      quantity: item.quantity, unitPrice, originalUnitPrice: price.price,
      discountPercent: Math.max(effectiveDiscount(product, now.getTime()), packDiscount), packId: item.packId ?? null };
  });
  return { lines, subtotal: money(lines.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)) };
}

export async function reservePromo(tx: Prisma.TransactionClient, id: string | undefined, subtotal: number, now = new Date()) {
  if (!id) return { discountAmount: 0, promoCodeUsed: null };
  const promo = await tx.promoCode.findUnique({ where: { id } });
  if (!promo || !promo.isActive || promo.isDeleted || (promo.startsAt && promo.startsAt > now)
    || promo.expiresAt < now || subtotal < (promo.minOrderAmount ?? 0) || promo.currentUses >= promo.maxUses) throw new HttpError(409, 'PROMO_UNAVAILABLE');
  // Optimistic conditional reservation; a competing transaction must retry or fail.
  const reserved = await tx.promoCode.updateMany({ where: { id, currentUses: promo.currentUses, maxUses: promo.maxUses,
    isActive: true, isDeleted: false }, data: { currentUses: { increment: 1 } } });
  if (reserved.count !== 1) throw new HttpError(409, 'PROMO_UNAVAILABLE');
  return { promoCodeUsed: promo.code, discountAmount: money(Math.min(subtotal, promo.discountType === 'percent'
    ? subtotal * Math.min(100, Math.max(0, promo.discountValue)) / 100 : Math.max(0, promo.discountValue))) };
}
