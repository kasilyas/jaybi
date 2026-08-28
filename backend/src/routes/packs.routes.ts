import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { serializePack } from '../lib/serialize.js';
import { addAuditLog } from '../lib/audit.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const packsRouter = Router();

const packSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(''),
  productIds: z.array(z.string()).default([]),
  price: z.number().optional().nullable(),
  originalPrice: z.number().optional().nullable(),
  discountPercent: z.number().optional().nullable(),
  image: z.string().default(''),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  theme: z.enum(['standard', 'black_friday', 'white_friday', 'halloween', 'ramadan', 'new_year', 'flash']).default('standard'),
  type: z.enum(['bundle', 'group_buy', 'sponsored']).default('bundle'),
  isSponsored: z.boolean().default(false),
  supplierName: z.string().optional().nullable(),
  groupBuyMinParticipants: z.number().optional().nullable(),
  currentParticipants: z.number().optional().nullable(),
});

packsRouter.get('/', async (_req, res: Response) => {
  const packs = await prisma.pack.findMany({
    where: { isDeleted: false },
    include: { products: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(packs.map(serializePack));
});

packsRouter.post('/', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = packSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const { productIds, startsAt, expiresAt, ...data } = parsed.data;
  const p = await prisma.pack.create({
    data: {
      ...data,
      startsAt: startsAt ? new Date(startsAt) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      products: { create: productIds.map(pid => ({ productId: pid })) },
    },
    include: { products: { include: { product: true } } },
  });
  await addAuditLog({ action: 'PACK_CREATE', user: req.user!.email, userEmail: req.user!.email, details: `Campagne : ${p.name}`, type: 'success' });
  res.status(201).json(serializePack(p));
});

packsRouter.put('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = packSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const { productIds, startsAt, expiresAt, ...data } = parsed.data;
  const id = req.params.id;
  if (productIds) {
    await prisma.packProduct.deleteMany({ where: { packId: id } });
  }
  const p = await prisma.pack.update({
    where: { id },
    data: {
      ...data,
      startsAt: startsAt === undefined ? undefined : startsAt ? new Date(startsAt) : null,
      expiresAt: expiresAt === undefined ? undefined : expiresAt ? new Date(expiresAt) : null,
      ...(productIds ? { products: { create: productIds.map(pid => ({ productId: pid })) } } : {}),
    },
    include: { products: { include: { product: true } } },
  });
  await addAuditLog({ action: 'PACK_UPDATE', user: req.user!.email, userEmail: req.user!.email, details: `Campagne : ${p.name}`, type: 'info' });
  res.json(serializePack(p));
});

packsRouter.delete('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  await prisma.pack.update({ where: { id: req.params.id }, data: { isDeleted: true } });
  await addAuditLog({ action: 'PACK_DELETE', user: req.user!.email, userEmail: req.user!.email, details: `Archivage pack ID: ${req.params.id}`, type: 'danger' });
  res.status(204).end();
});
