import { CartItem, Product, StoreName } from '../types';

/**
 * Logique pure du panier (extraite d'App.tsx pour la testabilité).
 * Aucun effet de bord : toutes les fonctions retournent un nouveau tableau.
 */

export type AddArgs = {
  productId: string;
  store?: StoreName | string;
  city?: string;
  isPreference?: boolean;
  packId?: string;
};

const sameLine = (a: CartItem, args: AddArgs) =>
  a.productId === args.productId &&
  a.store === args.store &&
  a.city === args.city &&
  a.packId === args.packId;

export function addToCart(cart: CartItem[], args: AddArgs): CartItem[] {
  const existing = cart.find(item => sameLine(item, args));
  if (existing) {
    return cart.map(item => (item === existing ? { ...item, quantity: item.quantity + 1 } : item));
  }
  return [
    ...cart,
    {
      productId: args.productId,
      quantity: 1,
      store: args.store,
      city: args.city,
      isUserPreference: args.isPreference ?? false,
      packId: args.packId,
    },
  ];
}

export function updateCartQuantity(
  cart: CartItem[],
  productId: string,
  store: StoreName | string | undefined,
  city: string | undefined,
  delta: number,
  packId?: string,
): CartItem[] {
  return cart
    .map(item => {
      if (item.productId === productId && item.store === store && item.city === city && item.packId === packId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    })
    .filter(item => item.quantity > 0);
}

export function removeFromCart(
  cart: CartItem[],
  productId: string,
  store: StoreName | string | undefined,
  city: string | undefined,
  packId?: string,
): CartItem[] {
  if (packId) {
    return cart.filter(item => item.packId !== packId);
  }
  return cart.filter(
    item => !(item.productId === productId && item.store === store && item.city === city),
  );
}

export function cartTotalItems(cart: CartItem[]): number {
  return cart.reduce((acc, item) => acc + item.quantity, 0);
}

/** Sous-total à partir du catalogue (prix par enseigne). */
export function computeSubtotal(cart: CartItem[], products: Product[]): number {
  return cart.reduce((sum, item) => {
    const p = products.find(prod => prod.id === item.productId);
    if (!p) return sum;
    const price = p.prices.find(pr => pr.store === item.store)?.price || 0;
    return sum + price * item.quantity;
  }, 0);
}

/** Snapshot du prix unitaire par item (audit / historique). */
export function snapshotCartPrices(cart: CartItem[], products: Product[]): CartItem[] {
  return cart.map(item => {
    const p = products.find(prod => prod.id === item.productId);
    const price = p?.prices.find(pr => pr.store === item.store)?.price || 0;
    return { ...item, unitPrice: price };
  });
}
