import { describe, it, expect } from 'vitest';
import {
  MOCK_PRODUCTS,
  MOCK_PACKS,
  MOCK_USERS,
  MOCK_ORDERS,
  MOCK_PROMO_CODES,
  MOCK_PRICE_REPORTS,
  MOCK_AUDIT_LOGS,
} from '../data/mockData';

const uniq = (arr: string[]) => new Set(arr).size === arr.length;

describe('seeds - unicité des IDs', () => {
  it('produits ont des IDs uniques', () => {
    expect(uniq(MOCK_PRODUCTS.map(p => p.id))).toBe(true);
  });
  it('utilisateurs ont des IDs uniques', () => {
    expect(uniq(MOCK_USERS.map(u => u.id))).toBe(true);
  });
  it('utilisateurs ont des emails uniques', () => {
    expect(uniq(MOCK_USERS.map(u => u.email.toLowerCase()))).toBe(true);
  });
  it('commandes ont des IDs uniques', () => {
    expect(uniq(MOCK_ORDERS.map(o => o.id))).toBe(true);
  });
  it('packs ont des IDs uniques', () => {
    expect(uniq(MOCK_PACKS.map(p => p.id))).toBe(true);
  });
  it('codes promo ont des codes uniques', () => {
    expect(uniq(MOCK_PROMO_CODES.map(p => p.code))).toBe(true);
  });
});

describe('seeds - intégrité référentielle (FK)', () => {
  it('chaque commande référence un utilisateur existant', () => {
    const userIds = new Set(MOCK_USERS.map(u => u.id));
    MOCK_ORDERS.forEach(o => {
      expect(userIds.has(o.userId)).toBe(true);
    });
  });

  it('chaque item de commande référence un produit existant', () => {
    const productIds = new Set(MOCK_PRODUCTS.map(p => p.id));
    MOCK_ORDERS.forEach(o => {
      o.items.forEach(item => {
        expect(productIds.has(item.productId)).toBe(true);
      });
    });
  });

  it('chaque pack référence des produits existants', () => {
    const productIds = new Set(MOCK_PRODUCTS.map(p => p.id));
    MOCK_PACKS.forEach(pack => {
      pack.productIds.forEach(id => {
        expect(productIds.has(id)).toBe(true);
      });
    });
  });

  it('chaque signalement référence un produit existant', () => {
    const productIds = new Set(MOCK_PRODUCTS.map(p => p.id));
    MOCK_PRICE_REPORTS.forEach(r => {
      expect(productIds.has(r.productId)).toBe(true);
    });
  });
});

describe('seeds - cohérence métier', () => {
  it('le compte admin seedé a bien le rôle admin', () => {
    const admin = MOCK_USERS.find(u => u.email === 'admin@qayess.io');
    expect(admin).toBeDefined();
    expect(admin?.role).toBe('admin');
    expect(admin?.tier).toBe('unlimited');
  });

  it('les dates de commandes sont au format ISO 8601', () => {
    MOCK_ORDERS.forEach(o => {
      expect(() => new Date(o.createdAt).toISOString()).not.toThrow();
      expect(o.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  it('au moins un utilisateur possède des adresses seedées', () => {
    const withAddresses = MOCK_USERS.filter(u => u.addresses.length > 0);
    expect(withAddresses.length).toBeGreaterThan(0);
  });

  it('les codes promo ont expiresAt valide et discountValue positif', () => {
    MOCK_PROMO_CODES.forEach(p => {
      expect(() => new Date(p.expiresAt).toISOString()).not.toThrow();
      expect(p.discountValue).toBeGreaterThan(0);
      expect(p.maxUses).toBeGreaterThan(0);
    });
  });

  it('les signalements ont un statut valide', () => {
    const valid = ['pending', 'verified', 'rejected'];
    MOCK_PRICE_REPORTS.forEach(r => {
      expect(valid).toContain(r.status);
    });
  });
});
