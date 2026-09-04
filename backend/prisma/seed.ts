import { PrismaClient, Role, Tier, Unit, CampaignTheme, PackType, DiscountType, OrderMode, PaymentMethod } from '@prisma/client';
import { MOCK_PRODUCTS, MOCK_PACKS, MOCK_USERS, MOCK_ORDERS, MOCK_PROMO_CODES, MOCK_PRICE_REPORTS, MOCK_AUDIT_LOGS } from '../../data/mockData.js';
import { StoreName } from '../../types.js';

const prisma = new PrismaClient();

// Mappe les noms d'enseigne du frontend vers les IDs créés en base.
const storeNameMap: Record<string, string> = {};

async function main() {
  console.log('🌱 Seeding Jaybi database...');

  // 1. Stores
  const storeDefs = Object.values(StoreName);
  for (const name of storeDefs) {
    const s = await prisma.store.upsert({
      where: { name },
      update: {},
      create: { name, logo: '', color: 'bg-slate-500', isActive: true },
    });
    storeNameMap[name] = s.id;
  }

  // 2. Brands (issues des produits)
  const brandNames = [...new Set(MOCK_PRODUCTS.map(p => p.brand))];
  const brandMap: Record<string, string> = {};
  for (const name of brandNames) {
    const b = await prisma.brand.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    brandMap[name] = b.id;
  }

  // 3. Products + price entries
  const productMap: Record<string, string> = {};
  for (const p of MOCK_PRODUCTS) {
    const created = await prisma.product.create({
      data: {
        name: p.name,
        brandId: brandMap[p.brand] ?? null,
        category: p.category,
        image: p.image,
        unit: (p.unit as Unit) ?? 'unit',
        weight: p.weight,
        isNational: !!p.isNational,
        prices: {
          create: p.prices.map(pr => ({
            storeId: storeNameMap[pr.store] ?? storeNameMap[StoreName.MARJANE],
            city: pr.city,
            price: pr.price,
            originalPrice: pr.originalPrice ?? null,
            promotionExpiresAt: pr.promotionExpiresAt ? new Date(pr.promotionExpiresAt) : null,
            available: pr.available,
          })),
        },
      },
    });
    productMap[p.id] = created.id;
  }

  // 4. Packs
  for (const pk of MOCK_PACKS) {
    await prisma.pack.create({
      data: {
        name: pk.name,
        description: pk.description,
        price: pk.price ?? null,
        originalPrice: pk.originalPrice ?? null,
        discountPercent: pk.discountPercent ?? null,
        image: pk.image,
        theme: (pk.theme as CampaignTheme) ?? 'standard',
        type: (pk.type as PackType) ?? 'bundle',
        isSponsored: !!pk.isSponsored,
        supplierName: pk.supplierName ?? null,
        groupBuyMinParticipants: pk.groupBuyMinParticipants ?? null,
        currentParticipants: pk.currentParticipants ?? null,
        products: {
          create: pk.productIds.map(pid => ({ productId: productMap[pid] })),
        },
      },
    });
  }

  // 5. Users (comptes de test). L'admin reçoit le rôle admin (seed autorisé).
  const userMap: Record<string, string> = {};
  for (const u of MOCK_USERS) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        role: u.role as Role,
        tier: u.tier as Tier,
        isPremium: u.isPremium,
        savingsScore: u.savingsScore,
        addresses: {
          create: (u.addresses ?? []).map(a => ({
            label: a.label,
            details: a.details,
            city: a.city,
            isDefault: a.isDefault,
          })),
        },
      },
    });
    userMap[u.id] = created.id;
  }

  // 6. Promo codes
  for (const pc of MOCK_PROMO_CODES) {
    await prisma.promoCode.upsert({
      where: { code: pc.code },
      update: {},
      create: {
        code: pc.code,
        discountType: pc.discountType as DiscountType,
        discountValue: pc.discountValue,
        minOrderAmount: pc.minOrderAmount ?? null,
        maxUses: pc.maxUses,
        currentUses: pc.currentUses,
        startsAt: pc.startsAt ? new Date(pc.startsAt) : null,
        expiresAt: new Date(pc.expiresAt),
        isActive: pc.isActive,
      },
    });
  }

  // 7. Orders (avec snapshot items)
  for (const o of MOCK_ORDERS) {
    await prisma.order.create({
      data: {
        userId: userMap[o.userId] ?? userMap['USR-001'],
        total: o.total,
        deliveryFee: o.deliveryFee,
        status: 'completed',
        mode: o.mode as OrderMode,
        paymentMethod: (o.paymentMethod as PaymentMethod) ?? 'cod',
        createdAt: new Date(o.createdAt),
        items: {
          create: o.items.map(it => ({
            productId: productMap[it.productId] ?? productMap['1'],
            productName: MOCK_PRODUCTS.find(p => p.id === it.productId)?.name ?? 'Produit',
            storeName: it.store ?? null,
            city: it.city ?? null,
            quantity: it.quantity,
            unitPrice: it.unitPrice ?? null,
          })),
        },
      },
    });
  }

  // 8. Price reports
  for (const r of MOCK_PRICE_REPORTS) {
    await prisma.priceReport.create({
      data: {
        productId: productMap[r.productId] ?? productMap['1'],
        productName: r.productName,
        storeName: r.store,
        city: r.city,
        reportedPrice: r.reportedPrice,
        comment: r.comment ?? null,
        userEmail: r.userEmail,
        status: r.status as any,
        timestamp: new Date(r.timestamp),
      },
    });
  }

  // 9. Audit logs
  for (const l of MOCK_AUDIT_LOGS) {
    await prisma.auditLog.create({
      data: {
        action: l.action,
        user: l.user,
        userEmail: l.userEmail,
        details: l.details,
        type: l.type as any,
        timestamp: new Date(l.timestamp),
      },
    });
  }

  // 10. App config
  await prisma.appConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      activeMaintenance: false,
      tiers: {
        free: { label: 'Gratuit', price: 0, limit: 5, features: ['Comparaison simple'] },
        pack1: { label: 'Essentiel', price: 29, limit: 20, features: ['Roadmap GPS', 'Sans pub'] },
        pack2: { label: 'Premium', price: 49, limit: 100, features: ['IA illimitée', 'Support prioritaire'] },
        unlimited: { label: 'Business', price: 199, limit: 1000, features: ['API Access', 'Multi-comptes'] },
      },
    },
  });

  // Sync configs par défaut
  const adapters = ['marjane', 'carrefour', 'bim', 'aswak', 'csv_import'];
  for (const adapter of adapters) {
    await prisma.syncConfig.upsert({
      where: { adapter },
      update: {},
      create: { adapter, enabled: true, sourceType: adapter === 'csv_import' ? 'csv' : 'scraper' },
    });
  }
  console.log('✅ Sync configs seeded.');

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
