import { describe, it, expect } from 'vitest';
import { formatPrice } from '../lib/format';
import { computeOrderSavings } from '../lib/cart';
import { Product, StoreName, CartItem } from '../types';

describe('format - formatPrice (D8)', () => {
  it('formate un entier avec le suffixe de devise', () => {
    expect(formatPrice(100, 'fr')).toBe('100 DH');
  });
  it('formate un décimal avec 2 chiffres', () => {
    expect(formatPrice(98.5, 'fr')).toBe('98,50 DH');
  });
  it('utilise le suffixe localisé (en -> MAD)', () => {
    expect(formatPrice(100, 'en')).toBe('100 MAD');
  });
  it('utilise le suffixe arabe', () => {
    expect(formatPrice(100, 'ar')).toContain('درهم');
  });
  it('retourne 0 pour une valeur non finie', () => {
    expect(formatPrice(NaN, 'fr')).toBe('0 DH');
  });
});

describe('cart - computeOrderSavings (D7)', () => {
  const product: Product = {
    id: '1',
    name: 'P',
    brand: 'B',
    category: 'C',
    image: '',
    unit: 'L',
    weight: 1,
    prices: [
      { store: StoreName.MARJANE, city: 'Casablanca', price: 80, originalPrice: 100, lastUpdated: '2024-05-24', available: true },
      { store: StoreName.BIM, city: 'Fès', price: 90, lastUpdated: '2024-05-24', available: true },
    ],
  };

  it('calcule les économies sur les prix promotionnels (originalPrice - price) * qty', () => {
    const cart: CartItem[] = [{ productId: '1', quantity: 2, store: StoreName.MARJANE, city: 'Casablanca' }];
    // (100 - 80) * 2 = 40
    expect(computeOrderSavings(cart, [product])).toBe(40);
  });

  it('retourne 0 si aucun originalPrice (pas de promo)', () => {
    const cart: CartItem[] = [{ productId: '1', quantity: 2, store: StoreName.BIM, city: 'Fès' }];
    expect(computeOrderSavings(cart, [product])).toBe(0);
  });

  it('ignore les originalPrice inférieurs au prix (anomalie)', () => {
    const bad: Product = { ...product, prices: [{ store: StoreName.MARJANE, city: 'Casablanca', price: 100, originalPrice: 80, lastUpdated: '', available: true }] };
    const cart: CartItem[] = [{ productId: '1', quantity: 1, store: StoreName.MARJANE, city: 'Casablanca' }];
    expect(computeOrderSavings(cart, [bad])).toBe(0);
  });
});
