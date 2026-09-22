import { createHash } from 'node:crypto';
import { HttpError } from '../middleware/errors.js';
import { priceCheckout, reservePromo } from '../lib/checkout.js';
import { money } from '../lib/pricing.js';
import { Response } from 'express';
import { Router } from '../lib/router.js';
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
  quantity: z.number().int().positive().max(999),
  packId: z.string().optional(),
});

const createOrderSchema = z.object({
  mode: z.enum(['delivery', 'roadmap']).default('roadmap'),
  paymentMethod: z.enum(['cod', 'cmi']).default('cod'),
  promoCodeId: z.string().optional(),
  items: z.array(orderItemSchema).min(1).max(200),
});

/**
 * POST /orders — crée une commande (réservation COD, hybride).
 * Snapshot des prix unitaires et du nom produit/store pour l'audit.
 */
ordersRouter.post('/', authenticate, async (req, res: Response) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

  const { items, mode, paymentMethod, promoCodeId } = parsed.data;
  if (paymentMethod !== 'cod') throw new HttpError(400, 'PAYMENT_METHOD_UNAVAILABLE');
  const key = req.get('Idempotency-Key');
  if (key && !/^[A-Za-z0-9_-]{16,128}$/.test(key)) throw new HttpError(400, 'INVALID_IDEMPOTENCY_KEY');
  const hash = createHash('sha256').update(JSON.stringify(parsed.data)).digest('hex');
  const replay = async () => {
    if (!key) return null;
    const existing = await prisma.order.findUnique({ where: { userId_idempotencyKey: { userId: req.user!.sub, idempotencyKey: key } }, include: { items: true } });
    if (existing && existing.requestHash !== hash) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
    return existing;
  };
  const previous = await replay();
  if (previous) return res.status(200).json(serializeOrder(previous));
  let order;
  try {
    order = await prisma.$transaction(async tx => {
      const { lines, subtotal } = await priceCheckout(tx, items);
      const promo = await reservePromo(tx, promoCodeId, subtotal);
      const deliveryFee = mode === 'delivery' ? 20 : 0;
      const created = await tx.order.create({ data: {
        userId: req.user!.sub, total: money(subtotal - promo.discountAmount + deliveryFee),
        ...promo, promoCodeId: promoCodeId ?? null, deliveryFee, mode, paymentMethod,
        idempotencyKey: key ?? null, requestHash: hash, items: { create: lines },
      }, include: { items: true } });
      await tx.auditLog.create({ data: { action: 'ORDER_CREATED', user: req.user!.email, userEmail: req.user!.email, details: `Commande ${created.id} créée`, type: 'success' } });
      const savings = Math.round(lines.reduce((sum, i) => sum + Math.max(0, i.originalUnitPrice - i.unitPrice) * i.quantity, 0));
      if (savings) await tx.user.update({ where: { id: req.user!.sub }, data: { savingsScore: { increment: savings } } });
      return created;
    }, { isolationLevel: 'Serializable' });
  } catch (error: any) {
    if (key && ['P2002', 'P2034'].includes(error?.code)) {
      const existing = await replay();
      if (existing) return res.status(200).json(serializeOrder(existing));
    }
    throw error;
  }
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
