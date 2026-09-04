import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MarjaneAdapter } from '../src/scraping/adapters/marjane.adapter.js';
import { MyMarketAdapter } from '../src/scraping/adapters/mymarket.adapter.js';
import { CarrefourAdapter } from '../src/scraping/adapters/carrefour.adapter.js';
import { BimAdapter } from '../src/scraping/adapters/bim.adapter.js';
import { AswakAdapter } from '../src/scraping/adapters/aswak.adapter.js';
import { AdapterRegistry } from '../src/scraping/adapterRegistry.js';

const fixturesDir = join(__dirname, 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), 'utf-8');
}

describe('Adaptateurs scraping — parsing avec fixtures HTML (sources vérifiées)', () => {

  // ============================================================
  // Marjane — marjane.ma/courses-en-ligne (e-commerce direct)
  // ============================================================
  describe('MarjaneAdapter (marjane.ma)', () => {
    const adapter = new MarjaneAdapter();

    it('parse une page avec JSON-LD (2 produits)', () => {
      const html = loadFixture('marjane.html');
      const products = adapter.parsePage(html);
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
    });

    it('nom et sourceType corrects', () => {
      expect(adapter.name).toBe('marjane');
      expect(adapter.sourceType).toBe('scraper');
    });
  });

  // ============================================================
  // MyMarket — mymarket.ma (hypermarché en ligne)
  // ============================================================
  describe('MyMarketAdapter (mymarket.ma)', () => {
    const adapter = new MyMarketAdapter();

    it('parse JSON-LD (Yaourt Centrale)', () => {
      const html = loadFixture('mymarket.html');
      const products = adapter.parsePage(html);
      expect(products.length).toBeGreaterThanOrEqual(1);

      const yaourt = products.find(p => p.name.includes('Yaourt Centrale'));
      expect(yaourt).toBeDefined();
      expect(yaourt!.price).toBe(12.5);
      expect(yaourt!.ean).toBe('6119876543210');
      expect(yaourt!.storeName).toBe('MyMarket');
    });

    it('parse les cartes produit (Pates Panzani avec promo)', () => {
      const html = loadFixture('mymarket.html');
      const products = adapter.parsePage(html);
      const pates = products.find(p => p.name.includes('Pates Panzani'));
      expect(pates).toBeDefined();
      expect(pates!.price).toBe(5.75);
      expect(pates!.originalPrice).toBe(7.0);
    });

    it('détecte indisponible (Confiture Beller)', () => {
      const html = loadFixture('mymarket.html');
      const products = adapter.parsePage(html);
      const confiture = products.find(p => p.name.includes('Confiture Beller'));
      expect(confiture).toBeDefined();
      expect(confiture!.available).toBe(false);
    });

    it('nom et sourceType corrects', () => {
      expect(adapter.name).toBe('mymarket');
      expect(adapter.sourceType).toBe('scraper');
    });
  });

  // ============================================================
  // Aswak — aswakdelivery.com (SPA, 6000 articles)
  // ============================================================
  describe('AswakAdapter (aswakdelivery.com)', () => {
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

    it('nom et sourceType corrects', () => {
      expect(adapter.name).toBe('aswak');
      expect(adapter.sourceType).toBe('scraper');
    });
  });

  // ============================================================
  // BIM — cataloguebim.com (agrégateur, parsing textuel)
  // ============================================================
  describe('BimAdapter (cataloguebim.com — agrégateur)', () => {
    const adapter = new BimAdapter();

    it('extrait les produits depuis le texte des articles', () => {
      const html = loadFixture('bim.html');
      const products = adapter.parsePage(html);
      expect(products.length).toBeGreaterThan(0);

      // Vérifie que les prix sont extraits correctement
      const miel = products.find(p => p.name.includes('miel') || p.name.includes('Miel'));
      expect(miel).toBeDefined();
      expect(miel!.price).toBe(29.9);
      expect(miel!.storeName).toBe('BIM');
    });

    it('extrait le thon Marisol à 24,90 DH', () => {
      const html = loadFixture('bim.html');
      const products = adapter.parsePage(html);
      const thon = products.find(p => p.name.includes('thon') || p.name.includes('Thon'));
      expect(thon).toBeDefined();
      expect(thon!.price).toBe(24.9);
    });

    it('extrait le lot Ariel à 105,90 DH', () => {
      const html = loadFixture('bim.html');
      const products = adapter.parsePage(html);
      const ariel = products.find(p => p.name.includes('Ariel'));
      expect(ariel).toBeDefined();
      expect(ariel!.price).toBe(105.9);
    });

    it('extrait le rouge à lèvres Maybelline à 75,90 DH', () => {
      const html = loadFixture('bim.html');
      const products = adapter.parsePage(html);
      const maybelline = products.find(p => p.name.includes('Maybelline'));
      expect(maybelline).toBeDefined();
      expect(maybelline!.price).toBe(75.9);
    });

    it('nom et sourceType corrects', () => {
      expect(adapter.name).toBe('bim');
      expect(adapter.sourceType).toBe('scraper');
    });
  });

  // ============================================================
  // Carrefour — promomaroc.com (agrégateur, parsing textuel)
  // ============================================================
  describe('CarrefourAdapter (promomaroc.com — agrégateur)', () => {
    const adapter = new CarrefourAdapter();

    it('extrait les produits depuis le texte des catalogues', () => {
      const html = loadFixture('carrefour.html');
      const products = adapter.parsePage(html);
      expect(products.length).toBeGreaterThan(0);
    });

    it('extrait Smart TV skyworth à 1790 DH', () => {
      const html = loadFixture('carrefour.html');
      const products = adapter.parsePage(html);
      const tv = products.find(p => p.name.includes('skyworth') || p.name.includes('Skyworth'));
      expect(tv).toBeDefined();
      expect(tv!.price).toBe(1790);
      expect(tv!.storeName).toBe('Carrefour');
    });

    it('détecte les promos (au lieu de)', () => {
      const html = loadFixture('carrefour.html');
      const products = adapter.parsePage(html);
      const promo = products.find(p => p.originalPrice && p.originalPrice > p.price);
      expect(promo).toBeDefined();
      expect(promo!.originalPrice).toBeGreaterThan(promo!.price);
    });

    it('nom et sourceType corrects', () => {
      expect(adapter.name).toBe('carrefour');
      expect(adapter.sourceType).toBe('scraper');
    });
  });

  // ============================================================
  // Registry
  // ============================================================
  describe('AdapterRegistry', () => {
    const registry = new AdapterRegistry();

    it('liste 5 adaptateurs', () => {
      const list = registry.list();
      expect(list).toHaveLength(5);
      const names = list.map(a => a.name).sort();
      expect(names).toEqual(['aswak', 'bim', 'carrefour', 'marjane', 'mymarket']);
    });

    it('get("marjane") retourne MarjaneAdapter', () => {
      const adapter = registry.get('marjane');
      expect(adapter).toBeDefined();
      expect(adapter!.name).toBe('marjane');
    });

    it('get("mymarket") retourne MyMarketAdapter', () => {
      const adapter = registry.get('mymarket');
      expect(adapter).toBeDefined();
      expect(adapter!.name).toBe('mymarket');
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
