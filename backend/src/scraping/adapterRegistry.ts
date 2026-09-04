import { BaseAdapter } from './baseAdapter.js';
import { MarjaneAdapter } from './adapters/marjane.adapter.js';
import { CarrefourAdapter } from './adapters/carrefour.adapter.js';
import { BimAdapter } from './adapters/bim.adapter.js';
import { AswakAdapter } from './adapters/aswak.adapter.js';
import { ScrapedProduct } from './types.js';
import { prisma } from '../lib/prisma.js';

/**
 * Registry des adaptateurs — orchestre le scraping.
 * Permet d'activer/désactiver des sources depuis la config en base.
 */
export class AdapterRegistry {
  private adapters = new Map<string, BaseAdapter>();

  constructor() {
    this.register(new MarjaneAdapter());
    this.register(new CarrefourAdapter());
    this.register(new BimAdapter());
    this.register(new AswakAdapter());
  }

  register(adapter: BaseAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  get(name: string): BaseAdapter | undefined {
    return this.adapters.get(name);
  }

  list(): BaseAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Scrape avec un adaptateur spécifique, en respectant la config en base.
   * Si l'adaptateur est désactivé ou inexistant, retourne [].
   */
  async scrapeWith(name: string): Promise<ScrapedProduct[]> {
    const adapter = this.adapters.get(name);
    if (!adapter) return [];

    // Vérifie la config en base
    const config = await prisma.syncConfig.findUnique({ where: { adapter: name } });
    if (config && !config.enabled) return [];

    // Applique la config
    if (config) {
      adapter['maxPages'] = config.maxPages;
      adapter['rateLimitMs'] = config.rateLimitMs;
    }

    return adapter.scrape();
  }

  /**
   * Scrape tous les adaptateurs actifs en parallèle.
   * Un échec d'un adaptateur n'arrête pas les autres.
   */
  async scrapeAll(): Promise<{ adapter: string; products: ScrapedProduct[]; error?: string }[]> {
    const configs = await prisma.syncConfig.findMany();
    const enabledAdapters = configs.filter(c => c.enabled).map(c => c.adapter);

    const results = await Promise.allSettled(
      enabledAdapters.map(async (name) => {
        const products = await this.scrapeWith(name);
        return { adapter: name, products };
      })
    );

    return results.map((r, i) => {
      const name = enabledAdapters[i];
      if (r.status === 'fulfilled') return r.value;
      return { adapter: name, products: [], error: (r.reason as Error)?.message ?? 'Unknown error' };
    });
  }
}

// Singleton
export const adapterRegistry = new AdapterRegistry();
