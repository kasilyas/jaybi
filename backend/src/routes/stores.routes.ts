import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { addAuditLog } from '../lib/audit.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const storesRouter = Router();

const storeSchema = z.object({
  name: z.string().min(1),
  logo: z.string().default(''),
  color: z.string().default('bg-slate-500'),
  isActive: z.boolean().default(true),
});

storesRouter.get('/', async (_req, res: Response) => {
  const stores = await prisma.store.findMany({ where: { isDeleted: false }, orderBy: { name: 'asc' } });
  res.json(stores);
});

storesRouter.post('/', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = storeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const s = await prisma.store.create({ data: parsed.data });
  await addAuditLog({ action: 'STORE_CREATE', user: req.user!.email, userEmail: req.user!.email, details: `Enseigne : ${s.name}`, type: 'success' });
  res.status(201).json(s);
});

storesRouter.put('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = storeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const s = await prisma.store.update({ where: { id: req.params.id }, data: parsed.data });
  await addAuditLog({ action: 'STORE_UPDATE', user: req.user!.email, userEmail: req.user!.email, details: `Enseigne : ${s.name}`, type: 'info' });
  res.json(s);
});

// Soft-delete (cohérent avec la règle #1)
storesRouter.delete('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  await prisma.store.update({ where: { id: req.params.id }, data: { isDeleted: true } });
  await addAuditLog({ action: 'STORE_DELETE', user: req.user!.email, userEmail: req.user!.email, details: `Archivage enseigne ID: ${req.params.id}`, type: 'danger' });
  res.status(204).end();
});
