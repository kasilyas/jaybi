/**
 * Validation live des adaptateurs de scraping — LECTURE SEULE.
 * Scrape chaque source, mesure la couverture, n'écrit rien en base.
 * Usage: npx tsx scripts/validate-sources.ts [adapterName]
 */
import { MarjaneAlgoliaAdapter } from '../src/scraping/adapters/marjane.algolia.adapter.js';
import { MyMarketAdapter } from '../src/scraping/adapters/mymarket.adapter.js';
import { AswakAdapter } from '../src/scraping/adapters/aswak.adapter.js';
import { BimAdapter } from '../src/scraping/adapters/bim.adapter.js';
import { CarrefourAdapter } from '../src/scraping/adapters/carrefour.adapter.js';
import { normalizeAll } from '../src/scraping/normalizer.js';
import { BaseAdapter } from '../src/scraping/baseAdapter.js';

const adapters: BaseAdapter[] = [
  new MarjaneAlgoliaAdapter(),
  new MyMarketAdapter(),
  new AswakAdapter(),
  new BimAdapter(),
  new CarrefourAdapter(),
];

const only = process.argv[2];

interface Result {
  name: string;
  ok: boolean;
  count: number;
  normalized: number;
  withPrice: number;
  withImage: number;
  withEan: number;
  withPromo: number;
  seconds: number;
  error?: string;
}

async function probe(adapter: BaseAdapter): Promise<Result> {
  const start = Date.now();
  try {
    const scraped = await adapter.scrape();
    const seconds = (Date.now() - start) / 1000;
    const normalized = normalizeAll(scraped);
    const stat = (fn: (p: any) => boolean) => scraped.filter(fn).length;
    return {
      name: adapter.name,
      ok: scraped.length > 0,
      count: scraped.length,
      normalized: normalized.length,
      withPrice: stat(p => typeof p.price === 'number' && p.price > 0),
      withImage: stat(p => !!p.image),
      withEan: stat(p => !!p.ean),
      withPromo: stat(p => typeof p.originalPrice === 'number' && p.originalPrice > (p.price ?? 0)),
      seconds,
    };
  } catch (err: any) {
    return {
      name: adapter.name, ok: false, count: 0, normalized: 0,
      withPrice: 0, withImage: 0, withEan: 0, withPromo: 0,
      seconds: (Date.now() - start) / 1000, error: err?.message ?? String(err),
    };
  }
}

async function main() {
  console.log('Validation live des sources de scraping (lecture seule)\n');
  const results: Result[] = [];
  for (const adapter of adapters) {
    if (only && adapter.name !== only) continue;
    process.stdout.write(`→ ${adapter.name}... `);
    const r = await probe(adapter);
    results.push(r);
    console.log(r.error ? `ERREUR: ${r.error}` : `${r.count} produits en ${r.seconds.toFixed(1)}s`);
  }

  console.log('\n' + '='.repeat(96));
  console.log(
    'source'.padEnd(12), 'statut'.padEnd(8), 'produits'.padStart(9), 'normalisés'.padStart(11),
    'prix%'.padStart(7), 'img%'.padStart(7), 'ean%'.padStart(7), 'promo%'.padStart(8), 'durée'.padStart(8),
  );
  for (const r of results) {
    const pct = (n: number) => (r.count ? `${Math.round((n / r.count) * 100)}%` : '—');
    console.log(
      r.name.padEnd(12), (r.error ? 'ERREUR' : r.ok ? 'OK' : 'VIDE').padEnd(8),
      String(r.count).padStart(9), String(r.normalized).padStart(11),
      pct(r.withPrice).padStart(7), pct(r.withImage).padStart(7),
      pct(r.withEan).padStart(7), pct(r.withPromo).padStart(8),
      `${r.seconds.toFixed(1)}s`.padStart(8),
    );
    if (r.error) console.log(`             ↳ ${r.error}`);
  }
  const failed = results.filter(r => !r.ok);
  console.log('='.repeat(96));
  console.log(failed.length ? `${failed.length} source(s) en échec/vide : ${failed.map(f => f.name).join(', ')}` : 'Toutes les sources répondent.');
  process.exitCode = failed.length ? 1 : 0;
}

main();
