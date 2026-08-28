import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

/**
 * Formatage des prix dans la devise du marché (MAD / DH).
 *
 * @note Le MVP est mono-devise (Maroc, MAD). Le champ `currencySuffix` est
 * exposé dans les traductions pour permettre une future multi-devise.
 */
export function formatPrice(amount: number, language: Language = 'fr'): string {
  const suffix = TRANSLATIONS[language]?.currencySuffix ?? 'DH';
  const formatted = Number.isFinite(amount)
    ? amount.toLocaleString(language === 'ar' ? 'ar-MA' : language === 'fr' ? 'fr-MA' : 'en-US', {
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      })
    : '0';
  return `${formatted} ${suffix}`;
}
