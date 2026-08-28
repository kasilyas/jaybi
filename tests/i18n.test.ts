import { describe, it, expect } from 'vitest';
import { TRANSLATIONS } from '../constants';
import { Language } from '../types';

const LANGS: Language[] = ['fr', 'en', 'es', 'zh', 'ar'];

const flatKeys = (obj: any, prefix = ''): string[] => {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => flatKeys(v as any, prefix ? `${prefix}.${k}` : k));
};

describe('i18n - complétude des traductions', () => {
  const frKeys = new Set(flatKeys(TRANSLATIONS.fr));

  it('le français sert de référence et expose des clés', () => {
    expect(frKeys.size).toBeGreaterThan(0);
  });

  LANGS.forEach(lang => {
    it(`${lang} possède les mêmes clés que fr`, () => {
      const keys = new Set(flatKeys(TRANSLATIONS[lang]));
      const missing = [...frKeys].filter(k => !keys.has(k));
      const extra = [...keys].filter(k => !frKeys.has(k));
      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    });
  });
});
