import { describe, it, expect } from 'vitest';
import { validatePromo, computeDiscount } from '../lib/promo';
import { PromoCode } from '../types';

const basePromo = (over: Partial<PromoCode> = {}): PromoCode => ({
  id: 'PRM-1',
  code: 'WELCOME10',
  discountType: 'percent',
  discountValue: 10,
  maxUses: 100,
  currentUses: 0,
  expiresAt: '2099-12-31T23:59:59.000Z',
  isActive: true,
  ...over,
});

const NOW = new Date('2024-06-15T12:00:00.000Z');

describe('promo - validatePromo', () => {
  it('accepte un code valide', () => {
    const r = validatePromo('WELCOME10', [basePromo()], 200, NOW);
    expect(r.ok).toBe(true);
  });

  it('rejette un code inexistant', () => {
    expect(validatePromo('NOPE', [basePromo()], 200, NOW)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });

  it('rejette un code inactif', () => {
    expect(validatePromo('WELCOME10', [basePromo({ isActive: false })], 200, NOW)).toEqual({ ok: false, error: 'INACTIVE' });
  });

  it('rejette un code non encore valide (startsAt futur)', () => {
    expect(validatePromo('WELCOME10', [basePromo({ startsAt: '2024-07-01T00:00:00.000Z' })], 200, NOW)).toEqual({ ok: false, error: 'NOT_YET_VALID' });
  });

  it('rejette un code expiré', () => {
    expect(validatePromo('WELCOME10', [basePromo({ expiresAt: '2024-01-01T00:00:00.000Z' })], 200, NOW)).toEqual({ ok: false, error: 'EXPIRED' });
  });

  it('rejette si max uses atteint', () => {
    expect(validatePromo('WELCOME10', [basePromo({ maxUses: 10, currentUses: 10 })], 200, NOW)).toEqual({ ok: false, error: 'MAX_USES_REACHED' });
  });

  it('rejette si montant minimum non atteint', () => {
    expect(validatePromo('WELCOME10', [basePromo({ minOrderAmount: 300 })], 200, NOW)).toEqual({ ok: false, error: 'MIN_AMOUNT_NOT_MET' });
  });

  it('ignore les codes soft-deleted', () => {
    expect(validatePromo('WELCOME10', [basePromo({ isDeleted: true })], 200, NOW)).toEqual({ ok: false, error: 'NOT_FOUND' });
  });
});

describe('promo - computeDiscount', () => {
  it('calcule une remise en pourcentage', () => {
    expect(computeDiscount(basePromo({ discountType: 'percent', discountValue: 10 }), 200)).toBe(20);
  });

  it('calcule une remise fixe', () => {
    expect(computeDiscount(basePromo({ discountType: 'fixed', discountValue: 50 }), 200)).toBe(50);
  });

  it('plafonne la remise fixe au sous-total (pas de remboursement)', () => {
    expect(computeDiscount(basePromo({ discountType: 'fixed', discountValue: 50 }), 30)).toBe(30);
  });
});
