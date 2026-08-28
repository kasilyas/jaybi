import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { addAuditLog } from '../lib/audit.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const brandsRouter = Router();

const brandSchema = z.object({
  name: z.string().min(1),
  logo: z.string().optional().nullable(),
});

brandsRouter.get('/', async (_req, res: Response) => {
  const brands = await prisma.brand.findMany({ where: { isDeleted: false }, orderBy: { name: 'asc' } });
  res.json(brands);
});

brandsRouter.post('/', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = brandSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const b = await prisma.brand.create({ data: { name: parsed.data.name, logo: parsed.data.logo ?? null } });
  await addAuditLog({ action: 'BRAND_CREATE', user: req.user!.email, userEmail: req.user!.email, details: `Marque : ${b.name}`, type: 'success' });
  res.status(201).json(b);
});

brandsRouter.put('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = brandSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const b = await prisma.brand.update({ where: { id: req.params.id }, data: { ...parsed.data, logo: parsed.data.logo ?? undefined } });
  await addAuditLog({ action: 'BRAND_UPDATE', user: req.user!.email, userEmail: req.user!.email, details: `Marque : ${b.name}`, type: 'info' });
  res.json(b);
});

brandsRouter.delete('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  await prisma.brand.update({ where: { id: req.params.id }, data: { isDeleted: true } });
  await addAuditLog({ action: 'BRAND_DELETE', user: req.user!.email, userEmail: req.user!.email, details: `Archivage marque ID: ${req.params.id}`, type: 'danger' });
  res.status(204).end();
});
