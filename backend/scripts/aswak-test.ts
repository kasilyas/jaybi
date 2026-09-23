import { AswakPlaywrightAdapter } from '../src/scraping/adapters/aswak.playwright.adapter.js';
const a = new AswakPlaywrightAdapter();
const products = await a.scrape();
console.log(`ASWAK: ${products.length} produits`);
products.slice(0,3).forEach(p => console.log(' -', p.name, p.price, 'DH'));
