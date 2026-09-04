import { describe, it, expect } from 'vitest';
import { normalizeUnit, extractWeight, cleanName, parsePrice, normalizeProduct, normalizeAll } from '../src/scraping/normalizer.js';
import { parseCsv } from '../src/scraping/csvImport.js';

describe('Normalizer — nettoyage et normalisation', () => {
  describe('normalizeUnit', () => {
    it('normalise "kg"', () => expect(normalizeUnit('kg')).toBe('kg'));
    it('normalise "kilo"', () => expect(normalizeUnit('kilo')).toBe('kg'));
    it('normalise "litre"', () => expect(normalizeUnit('litre')).toBe('L'));
    it('normalise "L"', () => expect(normalizeUnit('L')).toBe('L'));
    it('normalise "unité"', () => expect(normalizeUnit('unité')).toBe('unit'));
    it('normalise "pièce"', () => expect(normalizeUnit('pièce')).toBe('unit'));
    it('normalise "g"', () => expect(normalizeUnit('g')).toBe('g'));
    it('normalise "ml"', () => expect(normalizeUnit('ml')).toBe('ml'));
    it('défaut unit pour inconnu', () => expect(normalizeUnit('xyz')).toBe('unit'));
    it('défaut unit pour undefined', () => expect(normalizeUnit(undefined)).toBe('unit'));
  });

  describe('extractWeight', () => {
    it('extrait 1 de "1L"', () => expect(extractWeight('1L')).toBe(1));
    it('extrait 500 de "500g"', () => expect(extractWeight('500g')).toBe(500));
    it('extrait 2.5 de "2.5 kg"', () => expect(extractWeight('2.5 kg')).toBe(2.5));
    it('extrait 1.5 de "1.5L"', () => expect(extractWeight('1.5L')).toBe(1.5));
    it('retourne 0 pour texte sans nombre', () => expect(extractWeight('lait')).toBe(0));
  });

  describe('cleanName', () => {
    it('nettoie les espaces multiples', () => {
      expect(cleanName('LAIT   CENTRALE  1L')).toBe('Lait Centrale 1L');
    });
    it('Title Case', () => {
      expect(cleanName('huile lesieur')).toBe('Huile Lesieur');
    });
  });

  describe('parsePrice', () => {
    it('parse "7,50 DH"', () => expect(parsePrice('7,50 DH')).toBe(7.5));
    it('parse nombre direct', () => expect(parsePrice(45)).toBe(45));
    it('parse "45.00"', () => expect(parsePrice('45.00')).toBe(45));
    it('parse "0" → 0', () => expect(parsePrice('0')).toBe(0));
    it('parse invalide → 0', () => expect(parsePrice('abc')).toBe(0));
  });

  describe('normalizeProduct', () => {
    it('normalise un ScrapedProduct complet', () => {
      const r = normalizeProduct({
        source: 'marjane',
        sourceUrl: 'https://marjane.ma/p/1',
        scrapedAt: new Date(),
        name: 'lait centrale  1l',
        brand: 'centrale',
        unit: 'litre',
        price: '7,50 DH',
        available: true,
        city: 'Casablanca',
        storeName: 'Marjane',
      });
      expect(r.name).toBe('Lait Centrale 1L');
      expect(r.brand).toBe('Centrale');
      expect(r.unit).toBe('L');
      expect(r.price).toBe(7.5);
      expect(r.weight).toBe(1); // extrait de "1L" dans le name
    });

    it('normalise avec EAN', () => {
      const r = normalizeProduct({
        source: 'carrefour',
        sourceUrl: 'https://carrefour.ma/p/2',
        scrapedAt: new Date(),
        name: 'Huile Lesieur 2L',
        ean: '6111234567890',
        price: 45,
        available: true,
        city: 'Rabat',
        storeName: 'Carrefour',
      });
      expect(r.ean).toBe('6111234567890');
      expect(r.weight).toBe(2);
    });
  });

  describe('normalizeAll', () => {
    it('normalise un tableau', () => {
      const r = normalizeAll([
        { source: 'm', sourceUrl: '', scrapedAt: new Date(), name: 'test', price: 5, available: true, city: 'C', storeName: 'S' },
        { source: 'm', sourceUrl: '', scrapedAt: new Date(), name: 'test2', price: 10, available: true, city: 'C', storeName: 'S' },
      ]);
      expect(r).toHaveLength(2);
      expect(r[0].name).toBe('Test');
    });
  });
});

describe('CSV Import — parseCsv', () => {
  it('parse un CSV valide', () => {
    const csv = `name,brand,category,unit,weight,ean,price,originalPrice,promotionLabel,available,city,storeName
Lait Centrale 1L,Centrale,Lait,L,1,,7.5,8.5,Promo -10%,true,Casablanca,Marjane
Huile Lesieur 2L,Lesieur,Huile,L,2,6111234567890,45,,,true,Rabat,Carrefour`;
    const products = parseCsv(csv, 'csv_import');
    expect(products).toHaveLength(2);
    expect(products[0].name).toBe('Lait Centrale 1L');
    expect(products[0].brand).toBe('Centrale');
    expect(products[0].price).toBe(7.5);
    expect(products[0].originalPrice).toBe(8.5);
    expect(products[0].available).toBe(true);
    expect(products[1].ean).toBe('6111234567890');
  });

  it('ignore les lignes sans prix', () => {
    const csv = `name,brand,category,unit,weight,ean,price,originalPrice,promotionLabel,available,city,storeName
Produit sans prix,,,,,,,,
Lait Centrale 1L,Centrale,Lait,L,1,,7.5,,,true,Casablanca,Marjane`;
    const products = parseCsv(csv);
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe('Lait Centrale 1L');
  });

  it('retourne [] pour CSV vide', () => {
    expect(parseCsv('')).toHaveLength(0);
    expect(parseCsv('name,price')).toHaveLength(0);
  });

  it('défaut available=true si colonne vide', () => {
    const csv = `name,brand,category,unit,weight,ean,price,originalPrice,promotionLabel,available,city,storeName
Test,B,C,u,1,,5,,,,,,,,Casablanca,Marjane`;
    const products = parseCsv(csv);
    expect(products[0].available).toBe(true);
  });

  it('available=false explicite', () => {
    const csv = `name,brand,category,unit,weight,ean,price,originalPrice,promotionLabel,available,city,storeName
Test,B,C,u,1,,5,,,false,Casablanca,Marjane`;
    const products = parseCsv(csv);
    expect(products[0].available).toBe(false);
  });
});
