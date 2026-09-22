import { describe, it, expect, vi, beforeEach } from 'vitest';
import { priceCheckout, reservePromo } from '../src/lib/checkout.js';
let tx: any; let product: any; let pack: any;
beforeEach(() => {
  product = { id: 'p', name: 'Article', isActive: true, isDeleted: false, discountPercent: 25,
    prices: [{ storeId: 's', city: 'Rabat', price: 100, available: true, store: { name: 'Store', isActive: true, isDeleted: false } }] };
  pack = { id: 'pack', products: [{ productId: 'p', discountPercent: 30 }] };
  tx = { product: { findMany: vi.fn(async () => [product]) }, pack: { findMany: vi.fn(async () => [pack]) },
    promoCode: { findUnique: vi.fn(), updateMany: vi.fn() } };
});
describe('server checkout invariants', () => {
  it('snapshots 100 DH at 75 DH with product discount', async () => {
    const result = await priceCheckout(tx, [{ productId: 'p', quantity: 1 }]);
    expect(result.subtotal).toBe(75); expect(result.lines[0].originalUnitPrice).toBe(100);
  });
  it('uses the best per-product pack price, never stacking reductions', async () => {
    expect((await priceCheckout(tx, [{ productId: 'p', quantity: 1, packId: 'pack' }])).subtotal).toBe(70);
  });
  it('rejects missing/expired packs and products outside packs', async () => {
    const items = [{ productId: 'p', quantity: 1, packId: 'pack' }];
    pack.products = [{ productId: 'other', discountPercent: 90 }];
    await expect(priceCheckout(tx, items)).rejects.toMatchObject({ code: 'PRODUCT_OUTSIDE_PACK' });
    pack.products = []; await expect(priceCheckout(tx, items)).rejects.toMatchObject({ code: 'PACK_UNAVAILABLE' });
    pack.products = [{ productId: 'p' }]; pack.expiresAt = new Date('2000-01-01');
    await expect(priceCheckout(tx, items)).rejects.toMatchObject({ code: 'PACK_UNAVAILABLE' });
  });
  it('requires a complete bundle including quantities', async () => {
    pack.products.push({ productId: 'other', discountPercent: 5 });
    await expect(priceCheckout(tx, [{ productId: 'p', quantity: 1, packId: 'pack' }])).rejects.toMatchObject({ code: 'PACK_INCOMPLETE' });
  });
  it.each(['product', 'price', 'store', 'deleted-store', 'expired'])('rejects unavailable %s', async kind => {
    if (kind === 'product') product.isActive = false;
    if (kind === 'price') product.prices[0].available = false;
    if (kind === 'store') product.prices[0].store.isActive = false;
    if (kind === 'deleted-store') product.prices[0].store.isDeleted = true;
    if (kind === 'expired') product.prices[0].promotionExpiresAt = new Date('2000-01-01');
    await expect(priceCheckout(tx, [{ productId: 'p', quantity: 1 }])).rejects.toThrow();
  });
  it('does not silently select a different city', async () => {
    await expect(priceCheckout(tx, [{ productId: 'p', quantity: 1, city: 'Agadir' }])).rejects.toMatchObject({ code: 'OFFER_UNAVAILABLE' });
  });
  it('rejects a promo when another request reserved the final use', async () => {
    tx.promoCode.findUnique.mockResolvedValue({ id: 'promo', code: 'X', isActive: true, isDeleted: false, maxUses: 1, currentUses: 0, expiresAt: new Date('2099-01-01'), discountType: 'percent', discountValue: 10 });
    tx.promoCode.updateMany.mockResolvedValue({ count: 0 });
    await expect(reservePromo(tx, 'promo', 100)).rejects.toMatchObject({ code: 'PROMO_UNAVAILABLE' });
    expect(tx.promoCode.updateMany.mock.calls[0][0].where.currentUses).toBe(0);
  });
});
