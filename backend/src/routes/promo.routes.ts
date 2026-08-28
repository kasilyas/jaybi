import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { addAuditLog } from '../lib/audit.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const promoRouter = Router();

const promoSchema = z.object({
  code: z.string().min(1),
  discountType: z.enum(['percent', 'fixed']).default('percent'),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().optional().nullable(),
  maxUses: z.number().int().positive().default(1),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime(),
  isActive: z.boolean().default(true),
});

promoRouter.get('/', authenticate, requireRole('admin'), async (_req, res: Response) => {
  const codes = await prisma.promoCode.findMany({ where: { isDeleted: false }, orderBy: { createdAt: 'desc' } });
  res.json(codes);
});

promoRouter.post('/', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = promoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const { startsAt, expiresAt, ...data } = parsed.data;
  const p = await prisma.promoCode.create({
    data: { ...data, startsAt: startsAt ? new Date(startsAt) : null, expiresAt: new Date(expiresAt) },
  });
  await addAuditLog({ action: 'PROMO_CREATE', user: req.user!.email, userEmail: req.user!.email, details: `Code Promo : ${p.code}`, type: 'success' });
  res.status(201).json(p);
});

promoRouter.put('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = promoSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const { startsAt, expiresAt, ...data } = parsed.data;
  const p = await prisma.promoCode.update({
    where: { id: req.params.id },
    data: {
      ...data,
      startsAt: startsAt === undefined ? undefined : startsAt ? new Date(startsAt) : null,
      expiresAt: expiresAt === undefined ? undefined : new Date(expiresAt),
    },
  });
  await addAuditLog({ action: 'PROMO_UPDATE', user: req.user!.email, userEmail: req.user!.email, details: `Code Promo : ${p.code}`, type: 'info' });
  res.json(p);
});

// Soft-delete
promoRouter.delete('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  await prisma.promoCode.update({ where: { id: req.params.id }, data: { isDeleted: true } });
  await addAuditLog({ action: 'PROMO_DELETE', user: req.user!.email, userEmail: req.user!.email, details: `Archivage code ID: ${req.params.id}`, type: 'danger' });
  res.status(204).end();
});
