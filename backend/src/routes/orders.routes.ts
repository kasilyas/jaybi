import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { serializeOrder } from '../lib/serialize.js';
import { addAuditLog } from '../lib/audit.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const ordersRouter = Router();

const orderItemSchema = z.object({
  productId: z.string(),
  storeId: z.string().optional(),
  city: z.string().optional(),
  quantity: z.number().int().positive(),
  packId: z.string().optional(),
});

const createOrderSchema = z.object({
  mode: z.enum(['delivery', 'roadmap']).default('roadmap'),
  paymentMethod: z.enum(['cod', 'cmi']).default('cod'),
  promoCodeId: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
});

/**
 * POST /orders — crée une commande (réservation COD, hybride).
 * Snapshot des prix unitaires et du nom produit/store pour l'audit.
 */
ordersRouter.post('/', authenticate, async (req, res: Response) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

  const { items, mode, paymentMethod, promoCodeId } = parsed.data;
  const productIds = [...new Set(items.map(i => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isDeleted: false },
    include: { prices: { include: { store: true } } },
  });

  let total = 0;
  const orderItemsData = items.map(it => {
    const p = products.find(pp => pp.id === it.productId);
    if (!p) throw Object.assign(new Error('PRODUCT_NOT_FOUND'), { productId: it.productId });
    const entry = it.storeId
      ? p.prices.find(pr => pr.storeId === it.storeId && pr.city === it.city)
      : [...p.prices].sort((a, b) => a.price - b.price)[0];
    if (!entry) throw Object.assign(new Error('PRICE_NOT_FOUND'), { productId: it.productId });
    total += entry.price * it.quantity;
    return {
      productId: p.id,
      productName: p.name,
      storeName: entry.store.name,
      city: entry.city,
      quantity: it.quantity,
      unitPrice: entry.price,
      packId: it.packId ?? null,
    };
  });

  const deliveryFee = mode === 'delivery' ? 20 : 0;
  let discountAmount: number | undefined;
  let promoCodeUsed: string | undefined;

  if (promoCodeId) {
    const promo = await prisma.promoCode.findUnique({ where: { id: promoCodeId } });
    const now = new Date();
    // Validation complète : actif, non supprimé, dates, montant min, uses
    if (promo && promo.isActive && !promo.isDeleted
        && promo.currentUses < promo.maxUses
        && promo.startsAt && promo.startsAt <= now
        && promo.expiresAt && promo.expiresAt >= now
        && (!promo.minOrderAmount || total >= promo.minOrderAmount)) {
      // Cap percent à 100%
      const pct = promo.discountType === 'percent' ? Math.min(promo.discountValue, 100) : 0;
      discountAmount = promo.discountType === 'percent'
        ? Math.round(total * pct) / 100
        : Math.min(promo.discountValue, total);
      promoCodeUsed = promo.code;
      total = Math.max(0, total - (discountAmount ?? 0));
    }
  }

  // Transaction : création commande + incrément promo en atomique (anti race)
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId: req.user!.sub,
        total: total + deliveryFee,
        discountAmount,
        promoCodeId: promoCodeId ?? null,
        promoCodeUsed: promoCodeUsed ?? null,
        deliveryFee,
        mode,
        paymentMethod,
        status: 'pending',
        items: { create: orderItemsData },
      },
      include: { items: true },
    });
    if (promoCodeId && promoCodeUsed) {
      await tx.promoCode.update({ where: { id: promoCodeId }, data: { currentUses: { increment: 1 } } });
    }
    return created;
  });

  await addAuditLog({ action: 'ORDER_CREATED', user: req.user!.email, userEmail: req.user!.email, details: `Commande ${order.id} créée (${mode})`, type: 'success' });
  res.status(201).json(serializeOrder(order));
});

// Mes commandes (utilisateur)
ordersRouter.get('/me', authenticate, async (req, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.sub },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(orders.map(serializeOrder));
});

// Toutes les commandes (admin)
ordersRouter.get('/', authenticate, requireRole('admin'), async (_req, res: Response) => {
  const orders = await prisma.order.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' } });
  res.json(orders.map(serializeOrder));
});

ordersRouter.get('/:id', authenticate, async (req, res: Response) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!order) return res.status(404).json({ error: 'NOT_FOUND' });
  if (order.userId !== req.user!.sub && req.user!.role !== 'admin') return res.status(403).json({ error: 'FORBIDDEN' });
  res.json(serializeOrder(order));
});
