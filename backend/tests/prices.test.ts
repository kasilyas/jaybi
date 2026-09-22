import { describe, it, expect, vi } from 'vitest';
import { replacePrices } from '../src/lib/prices.js';
describe('price history preservation', () => {
  it('updates stable IDs, archives prior values and marks removed offers unavailable', async () => {
    const tx: any = { priceEntry: { findMany: vi.fn(async () => [
      { id: 'old1', storeId: 's', city: 'Rabat', price: 100, available: true },
      { id: 'old2', storeId: 's', city: 'Casa', price: 120, available: true },
    ]), update: vi.fn(), create: vi.fn(), deleteMany: vi.fn() }, priceHistory: { create: vi.fn() } };
    await replacePrices(tx, 'product', [{ storeId: 's', city: 'Rabat', price: 90, available: true }]);
    expect(tx.priceEntry.deleteMany).not.toHaveBeenCalled();
    expect(tx.priceHistory.create).toHaveBeenCalledTimes(2);
    expect(tx.priceEntry.update.mock.calls[0][0]).toMatchObject({ where: { id: 'old1' }, data: { price: 90 } });
    expect(tx.priceEntry.update.mock.calls[1][0]).toMatchObject({ where: { id: 'old2' }, data: { available: false } });
  });
  it('rejects duplicate offers before writing', async () => {
    const price = { storeId: 's', city: 'Rabat', price: 50, available: true };
    await expect(replacePrices({} as any, 'p', [price, price])).rejects.toMatchObject({ code: 'DUPLICATE_PRICE' });
  });
});
