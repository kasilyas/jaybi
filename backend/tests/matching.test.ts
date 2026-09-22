import { describe, it, expect } from 'vitest';
import { compatible } from '../src/scraping/compatibility.js';
describe('matching identity', () => {
  it.each([
    [{ name: 'Farine Fleur 1kg' }, { name: 'Farine Fleur 5kg' }],
    [{ name: 'Lait 1L', ean: '111' }, { name: 'Lait 1L', ean: '222' }],
    [{ name: 'Lait 1L', brand: 'A' }, { name: 'Lait 1L', brand: 'B' }],
    [{ name: 'Lait 6x1L' }, { name: 'Lait 1L' }],
    [{ name: 'Produit' }, { name: 'Produit' }],
  ])('does not merge incompatible identities', (a,b) => { expect(compatible(a,b)).toBe(false); });
  it('recognizes equivalent normalized units', () => { expect(compatible({name:'Farine 1kg'}, {name:'Farine 1000g'})).toBe(true); });
});
