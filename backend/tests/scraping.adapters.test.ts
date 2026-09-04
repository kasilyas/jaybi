import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MarjaneAdapter } from '../src/scraping/adapters/marjane.adapter.js';
import { CarrefourAdapter } from '../src/scraping/adapters/carrefour.adapter.js';
import { BimAdapter } from '../src/scraping/adapters/bim.adapter.js';
import { AswakAdapter } from '../src/scraping/adapters/aswak.adapter.js';
import { AdapterRegistry } from '../src/scraping/adapterRegistry.js';

const fixturesDir = join(__dirname, 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('Adaptateurs scraping — parsing avec fixtures HTML', () => {

  describe('MarjaneAdapter', () => {
    const adapter = new MarjaneAdapter();

    it('parse une page avec JSON-LD (2 produits)', () => {
      const html = loadFixture('marjane.html');
      const products = adapter.parsePage(html);
      // JSON-LD : Lait Centrale + Huile Lesieur
      // Cartes : Farine Dari + Sucre + Café Atlas
      expect(products.length).toBeGreaterThanOrEqual(2);

      const lait = products.find(p => p.name.includes('Lait Centrale'));
      expect(lait).toBeDefined();
      expect(lait!.price).toBe(7.5);
      expect(lait!.brand).toBe('Centrale');
      expect(lait!.ean).toBe('6111234567890');
      expect(lait!.storeName).toBe('Marjane');
      expect(lait!.available).toBe(true);
    });

    it('parse les cartes produit (Farine Dari avec promo)', () => {
      const html = loadFixture('marjane.html');
      const products = adapter.parsePage(html);
      const farine = products.find(p => p.name.includes('Farine Dari'));
      expect(farine).toBeDefined();
      expect(farine!.price).toBe(8.5);
      expect(farine!.originalPrice).toBe(10.0);
      expect(farine!.brand).toBe('Dari');
    });

    it('détecte rupture de stock (Café Atlas)', () => {
      const html = loadFixture('marjane.html');
      const products = adapter.parsePage(html);
      const cafe = products.find(p => p.name.includes('Café Atlas'));
      expect(cafe).toBeDefined();
      expect(cafe!.available).toBe(false);
    });

    it('retourne [] pour HTML vide', () => {
      expect(adapter.parsePage('')).toHaveLength(0);
      expect(adapter.parsePage('<html><body></body></html>')).toHaveLength(0);
    });

    it('nom de l\'adaptateur est "marjane"', () => {
      expect(adapter.name).toBe('marjane');
      expect(adapter.sourceType).toBe('scraper');
    });
  });

  describe('CarrefourAdapter', () => {
    const adapter = new CarrefourAdapter();

    it('parse JSON-LD (Yaourt Centrale)', () => {
      const html = loadFixture('carrefour.html');
      const products = adapter.parsePage(html);
      expect(products.length).toBeGreaterThanOrEqual(1);

      const yaourt = products.find(p => p.name.includes('Yaourt Centrale'));
      expect(yaourt).toBeDefined();
      expect(yaourt!.price).toBe(12.5);
      expect(yaourt!.ean).toBe('6119876543210');
      expect(yaourt!.storeName).toBe('Carrefour');
    });

    it('parse les cartes produit (Pates Panzani avec promo)', () => {
      const html = loadFixture('carrefour.html');
      const products = adapter.parsePage(html);
      const pates = products.find(p => p.name.includes('Pates Panzani'));
      expect(pates).toBeDefined();
      expect(pates!.price).toBe(5.75);
      expect(pates!.originalPrice).toBe(7.0);
    });

    it('détecte indisponible (Confiture Beller)', () => {
      const html = loadFixture('carrefour.html');
      const products = adapter.parsePage(html);
      const confiture = products.find(p => p.name.includes('Confiture Beller'));
      expect(confiture).toBeDefined();
      expect(confiture!.available).toBe(false);
    });

    it('nom de l\'adaptateur est "carrefour"', () => {
      expect(adapter.name).toBe('carrefour');
    });
  });

  describe('BimAdapter', () => {
    const adapter = new BimAdapter();

    it('parse les cartes produit (Biscuits, Chocolat, Jus)', () => {
      const html = loadFixture('bim.html');
      const products = adapter.parsePage(html);
      expect(products.length).toBeGreaterThanOrEqual(1);

      const biscuits = products.find(p => p.name.includes('Biscuits BIM'));
      expect(biscuits).toBeDefined();
      expect(biscuits!.price).toBe(3.5);
      expect(biscuits!.storeName).toBe('BIM');
    });

    it('détecte rupture (Jus BIM)', () => {
      const html = loadFixture('bim.html');
      const products = adapter.parsePage(html);
      const jus = products.find(p => p.name.includes('Jus BIM'));
      expect(jus).toBeDefined();
      expect(jus!.available).toBe(false);
    });

    it('nom de l\'adaptateur est "bim"', () => {
      expect(adapter.name).toBe('bim');
    });
  });

  describe('AswakAdapter', () => {
    const adapter = new AswakAdapter();

    it('parse JSON-LD (Semoule Dari)', () => {
      const html = loadFixture('aswak.html');
      const products = adapter.parsePage(html);
      expect(products.length).toBeGreaterThanOrEqual(1);

      const semoule = products.find(p => p.name.includes('Semoule Dari'));
      expect(semoule).toBeDefined();
      expect(semoule!.price).toBe(7.0);
      expect(semoule!.brand).toBe('Dari');
      expect(semoule!.storeName).toBe('Aswak Assalam');
    });

    it('parse les cartes produit (Olives avec promo)', () => {
      const html = loadFixture('aswak.html');
      const products = adapter.parsePage(html);
      const olives = products.find(p => p.name.includes('Olives'));
      expect(olives).toBeDefined();
      expect(olives!.price).toBe(12.0);
      expect(olives!.originalPrice).toBe(15.0);
    });

    it('nom de l\'adaptateur est "aswak"', () => {
      expect(adapter.name).toBe('aswak');
    });
  });

  describe('AdapterRegistry', () => {
    const registry = new AdapterRegistry();

    it('liste 4 adaptateurs', () => {
      const list = registry.list();
      expect(list).toHaveLength(4);
      expect(list.map(a => a.name).sort()).toEqual(['aswak', 'bim', 'carrefour', 'marjane']);
    });

    it('get("marjane") retourne MarjaneAdapter', () => {
      const adapter = registry.get('marjane');
      expect(adapter).toBeDefined();
      expect(adapter!.name).toBe('marjane');
    });

    it('get("inexistant") retourne undefined', () => {
      expect(registry.get('inexistant')).toBeUndefined();
    });

    it('register ajoute un nouvel adaptateur', () => {
      const customAdapter = new BimAdapter();
      customAdapter['name'] = 'custom_test';
      registry.register(customAdapter);
      expect(registry.get('custom_test')).toBeDefined();
    });
  });
});
