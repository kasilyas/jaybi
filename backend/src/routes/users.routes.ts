import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { serializeUser } from '../lib/serialize.js';
import { addAuditLog } from '../lib/audit.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const usersRouter = Router();

const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['customer', 'contributor', 'admin']).optional(),
  tier: z.enum(['free', 'pack1', 'pack2', 'unlimited']).optional(),
  isPremium: z.boolean().optional(),
  savingsScore: z.number().optional(),
});

// Liste (admin)
usersRouter.get('/', authenticate, requireRole('admin'), async (_req, res: Response) => {
  const users = await prisma.user.findMany({ include: { addresses: true }, orderBy: { createdAt: 'desc' } });
  res.json(users.map(serializeUser));
});

usersRouter.get('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  const u = await prisma.user.findUnique({ where: { id: req.params.id }, include: { addresses: true } });
  if (!u) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(serializeUser(u));
});

// Mise à jour (admin) — permet l'attribution des rôles/tiers (S6 corrigé côté serveur)
usersRouter.put('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = userUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const u = await prisma.user.update({ where: { id: req.params.id }, data: parsed.data, include: { addresses: true } });
  await addAuditLog({ action: 'USER_UPDATE', user: req.user!.email, userEmail: req.user!.email, details: `Action sur : ${u.email}`, type: 'info' });
  res.json(serializeUser(u));
});

// Soft-delete (admin)
usersRouter.delete('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  await prisma.user.update({ where: { id: req.params.id }, data: { isDeleted: true } });
  await addAuditLog({ action: 'USER_DELETE', user: req.user!.email, userEmail: req.user!.email, details: `Archivage membre ID: ${req.params.id}`, type: 'danger' });
  res.status(204).end();
});
