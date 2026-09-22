import type { Prisma } from '@prisma/client';
import { HttpError } from '../middleware/errors.js';
type InputPrice = { storeId: string; city: string; price: number; originalPrice?: number | null; promotionExpiresAt?: string | Date | null; available: boolean };
/** Caller owns the transaction. Removed offers become unavailable; history survives. */
export async function replacePrices(tx: Prisma.TransactionClient, productId: string, inputs: InputPrice[]) {
  const keys = inputs.map(p => `${p.storeId}\u0000${p.city}`);
  if (new Set(keys).size !== keys.length) throw new HttpError(400, 'DUPLICATE_PRICE');
  const existing = await tx.priceEntry.findMany({ where: { productId } });
  for (const old of existing) {
    const input = inputs.find(p => p.storeId === old.storeId && p.city === old.city);
    if (!input && !old.available) continue;
    await tx.priceHistory.create({ data: { priceEntryId: old.id, price: old.price, originalPrice: old.originalPrice, available: old.available } });
    await tx.priceEntry.update({ where: { id: old.id }, data: input
      ? { ...input, promotionExpiresAt: input.promotionExpiresAt ? new Date(input.promotionExpiresAt) : null, lastUpdated: new Date() }
      : { available: false, lastUpdated: new Date() } });
  }
  for (const input of inputs) {
    if (!existing.some(p => p.storeId === input.storeId && p.city === input.city)) {
      await tx.priceEntry.create({ data: { ...input, productId, promotionExpiresAt: input.promotionExpiresAt ? new Date(input.promotionExpiresAt) : null } });
    }
  }
}
