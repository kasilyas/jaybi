import { PromoCode } from '../types';

/**
 * Logique pure de validation / calcul des codes promo.
 */

export type PromoValidationError =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_YET_VALID'
  | 'EXPIRED'
  | 'MAX_USES_REACHED'
  | 'MIN_AMOUNT_NOT_MET';

export function validatePromo(
  code: string,
  promoCodes: PromoCode[],
  cartSubtotal: number,
  now: Date = new Date(),
): { ok: true; promo: PromoCode } | { ok: false; error: PromoValidationError } {
  const promo = promoCodes.find(p => p.code === code && !p.isDeleted);
  if (!promo) return { ok: false, error: 'NOT_FOUND' };
  if (!promo.isActive) return { ok: false, error: 'INACTIVE' };
  if (promo.startsAt && new Date(promo.startsAt) > now) return { ok: false, error: 'NOT_YET_VALID' };
  if (new Date(promo.expiresAt) < now) return { ok: false, error: 'EXPIRED' };
  if (promo.currentUses >= promo.maxUses) return { ok: false, error: 'MAX_USES_REACHED' };
  if (promo.minOrderAmount != null && cartSubtotal < promo.minOrderAmount)
    return { ok: false, error: 'MIN_AMOUNT_NOT_MET' };
  return { ok: true, promo };
}

/** Montant de la remise à appliquer sur le sous-total. */
export function computeDiscount(promo: PromoCode, subtotal: number): number {
  if (promo.discountType === 'percent') {
    return Math.round(subtotal * promo.discountValue) / 100;
  }
  // fixed : remise plafonnée au sous-total (pas de remboursement)
  return Math.min(promo.discountValue, subtotal);
}
