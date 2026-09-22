type Discount = {
  discountPercent?: number | null;
  flashSalePercent?: number | null;
  flashSaleStartsAt?: string | Date | null;
  flashSaleEndsAt?: string | Date | null;
};
const percent = (n?: number | null) => Math.min(100, Math.max(0, n ?? 0));
export const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function effectiveDiscount(product: Discount, now = Date.now()): number {
  const active = product.flashSaleStartsAt && product.flashSaleEndsAt
    && new Date(product.flashSaleStartsAt).getTime() <= now && new Date(product.flashSaleEndsAt).getTime() >= now;
  return percent(active && product.flashSalePercent ? product.flashSalePercent : product.discountPercent);
}
export function effectivePrice(storePrice: number, product: Discount, packDiscount = 0, now = Date.now()): number {
  return money(storePrice * (1 - Math.max(effectiveDiscount(product, now), percent(packDiscount)) / 100));
}
