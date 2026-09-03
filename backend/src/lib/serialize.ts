import { Prisma } from '@prisma/client';

/**
 * Sérialiseurs : convertissent les modèles Prisma vers les formes attendues
 * par le frontend (qui utilise `brand: string`, `store: string`, etc.).
 */

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: { brand: true; prices: { include: { store: true } } };
}>;

export function serializeProduct(p: ProductWithRelations) {
  // Détermine si le flash sale est actif maintenant
  const now = new Date();
  const flashSaleActive = !!(p.flashSalePercent
    && p.flashSaleStartsAt && p.flashSaleStartsAt <= now
    && p.flashSaleEndsAt && p.flashSaleEndsAt >= now);

  return {
    id: p.id,
    name: p.name,
    brand: p.brand?.name ?? '',
    brandId: p.brandId,
    category: p.category,
    image: p.image,
    unit: p.unit,
    weight: p.weight,
    isNational: p.isNational,
    isDeleted: p.isDeleted,
    isActive: p.isActive,
    // Remise générale
    discountPercent: p.discountPercent ?? null,
    // Flash vente
    flashSalePercent: p.flashSalePercent ?? null,
    flashSaleStartsAt: p.flashSaleStartsAt?.toISOString() ?? null,
    flashSaleEndsAt: p.flashSaleEndsAt?.toISOString() ?? null,
    flashSaleLabel: p.flashSaleLabel ?? null,
    flashSaleActive,
    // Remise effective = flash sale prioritaire sur discount général
    effectiveDiscountPercent: flashSaleActive
      ? p.flashSalePercent!
      : (p.discountPercent ?? 0),
    prices: p.prices.map(pr => ({
      id: pr.id,
      store: pr.store.name,
      storeId: pr.storeId,
      city: pr.city,
      price: pr.price,
      originalPrice: pr.originalPrice,
      promotionExpiresAt: pr.promotionExpiresAt?.toISOString() ?? null,
      lastUpdated: pr.lastUpdated.toISOString(),
      available: pr.available,
    })),
  };
}

type PackWithRelations = Prisma.PackGetPayload<{
  include: { products: { include: { product: true } } };
}>;

export function serializePack(p: PackWithRelations) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    productIds: p.products.map(pp => pp.productId),
    price: p.price,
    originalPrice: p.originalPrice,
    discountPercent: p.discountPercent,
    image: p.image,
    startsAt: p.startsAt?.toISOString() ?? null,
    expiresAt: p.expiresAt?.toISOString() ?? null,
    theme: p.theme,
    type: p.type,
    isSponsored: p.isSponsored,
    supplierName: p.supplierName,
    groupBuyMinParticipants: p.groupBuyMinParticipants,
    currentParticipants: p.currentParticipants,
    isDeleted: p.isDeleted,
  };
}

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: { items: true };
}>;

export function serializeOrder(o: OrderWithRelations) {
  return {
    id: o.id,
    userId: o.userId,
    items: o.items.map(it => ({
      productId: it.productId,
      productName: it.productName,
      store: it.storeName,
      city: it.city,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      packId: it.packId,
    })),
    total: o.total,
    discountAmount: o.discountAmount,
    promoCodeUsed: o.promoCodeUsed,
    deliveryFee: o.deliveryFee,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    mode: o.mode,
    paymentMethod: o.paymentMethod,
  };
}

export function serializeUser(u: {
  id: string;
  name: string;
  email: string;
  role: string;
  tier: string;
  isPremium: boolean;
  savingsScore: number;
  avatar: string | null;
  isDeleted: boolean;
  isSuspended: boolean;
  addresses?: any[];
}) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    tier: u.tier,
    isPremium: u.isPremium,
    savingsScore: u.savingsScore,
    avatar: u.avatar,
    isDeleted: u.isDeleted,
    isSuspended: u.isSuspended,
    addresses: u.addresses ?? [],
  };
}
