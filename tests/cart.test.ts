import { describe, it, expect } from 'vitest';
import { addToCart, updateCartQuantity, removeFromCart, cartTotalItems, computeSubtotal, snapshotCartPrices } from '../lib/cart';
import { CartItem, Product, StoreName } from '../types';

const product: Product = {
  id: '1',
  name: 'Huile Lesieur 5L',
  brand: 'Lesieur',
  category: 'Epicerie',
  image: '',
  unit: 'L',
  weight: 5,
  prices: [
    { store: StoreName.MARJANE, city: 'Casablanca', price: 98.5, lastUpdated: '2024-05-24', available: true },
    { store: StoreName.BIM, city: 'Fès', price: 97, lastUpdated: '2024-05-24', available: true },
  ],
};

const products = [product];

describe('cart - addToCart', () => {
  it('ajoute un nouvel article avec quantité 1', () => {
    const cart = addToCart([], { productId: '1', store: StoreName.MARJANE, city: 'Casablanca' });
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(1);
    expect(cart[0].isUserPreference).toBe(false);
  });

  it('incrémente la quantité si la même ligne existe (même store/city/pack)', () => {
    let cart: CartItem[] = [{ productId: '1', quantity: 1, store: StoreName.MARJANE, city: 'Casablanca' }];
    cart = addToCart(cart, { productId: '1', store: StoreName.MARJANE, city: 'Casablanca' });
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it('crée une ligne distincte si le store diffère', () => {
    let cart: CartItem[] = [{ productId: '1', quantity: 1, store: StoreName.MARJANE, city: 'Casablanca' }];
    cart = addToCart(cart, { productId: '1', store: StoreName.BIM, city: 'Fès' });
    expect(cart).toHaveLength(2);
  });

  it('distingue les items de pack des items unitaires', () => {
    let cart: CartItem[] = [{ productId: '1', quantity: 1, store: StoreName.MARJANE, city: 'Casablanca' }];
    cart = addToCart(cart, { productId: '1', store: StoreName.MARJANE, city: 'Casablanca', packId: 'PK-1' });
    expect(cart).toHaveLength(2);
  });
});

describe('cart - updateCartQuantity', () => {
  it('incrémente et décrémente la bonne ligne', () => {
    let cart: CartItem[] = [
      { productId: '1', quantity: 2, store: StoreName.MARJANE, city: 'Casablanca' },
      { productId: '1', quantity: 1, store: StoreName.BIM, city: 'Fès' },
    ];
    cart = updateCartQuantity(cart, '1', StoreName.MARJANE, 'Casablanca', 1);
    expect(cart[0].quantity).toBe(3);
    expect(cart[1].quantity).toBe(1);
  });

  it('supprime la ligne quand la quantité atteint 0', () => {
    let cart: CartItem[] = [{ productId: '1', quantity: 1, store: StoreName.MARJANE, city: 'Casablanca' }];
    cart = updateCartQuantity(cart, '1', StoreName.MARJANE, 'Casablanca', -1);
    expect(cart).toHaveLength(0);
  });

  it('ne descend jamais sous 0 (pas de quantité négative)', () => {
    let cart: CartItem[] = [{ productId: '1', quantity: 1, store: StoreName.MARJANE, city: 'Casablanca' }];
    cart = updateCartQuantity(cart, '1', StoreName.MARJANE, 'Casablanca', -5);
    expect(cart).toHaveLength(0);
  });
});

describe('cart - removeFromCart', () => {
  it('supprime une ligne unitaire précise', () => {
    let cart: CartItem[] = [
      { productId: '1', quantity: 1, store: StoreName.MARJANE, city: 'Casablanca' },
      { productId: '2', quantity: 1, store: StoreName.MARJANE, city: 'Casablanca' },
    ];
    cart = removeFromCart(cart, '1', StoreName.MARJANE, 'Casablanca');
    expect(cart).toHaveLength(1);
    expect(cart[0].productId).toBe('2');
  });

  it('supprime tous les items dun pack quand packId est fourni', () => {
    let cart: CartItem[] = [
      { productId: '1', quantity: 1, packId: 'PK-1' },
      { productId: '2', quantity: 1, packId: 'PK-1' },
      { productId: '3', quantity: 1 },
    ];
    cart = removeFromCart(cart, '1', undefined, undefined, 'PK-1');
    expect(cart).toHaveLength(1);
    expect(cart[0].productId).toBe('3');
  });
});

describe('cart - totals & snapshot', () => {
  it('calcule le nombre total darticles', () => {
    const cart: CartItem[] = [
      { productId: '1', quantity: 2 },
      { productId: '2', quantity: 3 },
    ];
    expect(cartTotalItems(cart)).toBe(5);
  });

  it('calcule le sous-total selon le prix par enseigne', () => {
    const cart: CartItem[] = [
      { productId: '1', quantity: 2, store: StoreName.MARJANE, city: 'Casablanca' },
      { productId: '1', quantity: 1, store: StoreName.BIM, city: 'Fès' },
    ];
    // 2*98.5 + 1*97 = 294
    expect(computeSubtotal(cart, products)).toBe(294);
  });

  it('snapshot les prix unitaires pour audit', () => {
    const cart: CartItem[] = [{ productId: '1', quantity: 2, store: StoreName.MARJANE, city: 'Casablanca' }];
    const snap = snapshotCartPrices(cart, products);
    expect(snap[0].unitPrice).toBe(98.5);
  });
});
