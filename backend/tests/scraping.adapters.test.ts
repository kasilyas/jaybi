import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MarjaneAlgoliaAdapter } from '../src/scraping/adapters/marjane.algolia.adapter.js';
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
  // Marjane — index Algolia public (marjanemall.ma)
  // ============================================================
  describe('MarjaneAlgoliaAdapter (index Algolia marjanemall.ma)', () => {
    const adapter = new MarjaneAlgoliaAdapter();

    const sampleAlgoliaHit = {
      objectID: '887792',
      name: 'Gum Dentifrice Original White Blancheur 75ml',
      sku: 'AUC0070942303132',
      url: 'https://payment.marjanemall.ma/p/gum-dentifrice-auc0070942303132',
      image_url: 'https://cdnprd.marjanemall.ma/img.webp',
      main_image: 'https://cdnprd.marjanemall.ma/img-main.webp',
      maas_brand: 'GUM',
      mm_seller: 'Marjane',
      maas_offer_seller_name: 'Marjane',
      is_salable: 1,
      discount_percent: 39,
      categories: {
        level0: ['Beauté - Santé'],
        level2: ['Beauté - Santé|Hygiène|Hygiène dentaire'],
      },
      price: {
        MAD: {
          default: 63.48,
          default_formated: '63,48 Dh',
          default_original_formated: '103,50 Dh',
        },
      },
    };

    it('parse un hit Algolia avec promo', () => {
      const product = adapter.parseAlgoliaHit(sampleAlgoliaHit);
      expect(product).toBeDefined();
      expect(product!.name).toBe('Gum Dentifrice Original White Blancheur 75ml');
      expect(product!.price).toBe(63.48);
      expect(product!.originalPrice).toBe(103.5);
      expect(product!.brand).toBe('GUM');
      expect(product!.image).toBe('https://cdnprd.marjanemall.ma/img-main.webp');
      expect(product!.available).toBe(true);
      expect(product!.storeName).toBe('Marjane');
      expect(product!.promotionLabel).toContain('39');
      expect(product!.category).toBe('Hygiène dentaire');
    });

    it('parse un produit sans promo', () => {
      const noPromo = JSON.parse(JSON.stringify(sampleAlgoliaHit));
      delete noPromo.price.MAD.default_original_formated;
      noPromo.discount_percent = 0;
      const product = adapter.parseAlgoliaHit(noPromo);
      expect(product!.price).toBe(63.48);
      expect(product!.originalPrice).toBeUndefined();
      expect(product!.promotionLabel).toBeUndefined();
    });

    it('parse un produit en rupture de stock', () => {
      const oos = JSON.parse(JSON.stringify(sampleAlgoliaHit));
      oos.is_salable = 0;
      const product = adapter.parseAlgoliaHit(oos);
      expect(product!.available).toBe(false);
    });

    it('extrait le vendeur marketplace', () => {
      const product = adapter.parseAlgoliaHit(sampleAlgoliaHit);
      expect(product!.seller).toBe('Marjane');
    });

    it('retourne null pour produit sans nom', () => {
      expect(adapter.parseAlgoliaHit({ objectID: '1', sku: 'X' })).toBeNull();
    });

    it('retourne null pour produit sans prix', () => {
      expect(adapter.parseAlgoliaHit({ objectID: '1', name: 'Test', price: { MAD: {} } })).toBeNull();
    });

    it('nom et sourceType corrects', () => {
      expect(adapter.name).toBe('marjane');
      expect(adapter.sourceType).toBe('api');
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
      expect(adapter.sourceType).toBe('api');
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
