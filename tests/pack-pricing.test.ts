import { describe, it, expect } from 'vitest';
import { packQuote } from '../lib/pricing';
import { computeSubtotal } from '../lib/cart';
import type { Pack, Product } from '../types';
const products = [
  { id: 'a', prices: [{ store: 'Market', city: 'Rabat', price: 100, available: true }], discountPercent: 10 },
  { id: 'b', prices: [{ store: 'Market', city: 'Rabat', price: 20, available: true }] },
] as Product[];
const pack: Pack = { id: 'pack', name: 'Pack test', description: '', image: '', theme: 'standard', type: 'bundle', productIds: ['a', 'b'], productDiscounts: { a: 20, b: 50 } };
describe('per-product pack pricing', () => {
  it('shows weighted savings, maximum reduction and actual total', () => {
    const quote = packQuote(pack, products);
    expect(quote.total).toBe(90); expect(quote.savings).toBe(30);
    expect(quote.discount).toBe(25); expect(quote.maxDiscount).toBe(50);
  });
  it('uses identical per-line prices in the cart', () => {
    expect(computeSubtotal(products.map(p => ({ productId: p.id, quantity: 1, packId: pack.id, store: 'Market', city: 'Rabat' })), products, [pack])).toBe(90);
  });
  it('marks incomplete catalogue packs unavailable', () => { expect(packQuote(pack, products.slice(0,1)).available).toBe(false); });
});
