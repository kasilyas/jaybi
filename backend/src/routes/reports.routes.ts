import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { addAuditLog } from '../lib/audit.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const reportsRouter = Router();

const reportSchema = z.object({
  productId: z.string(),
  storeName: z.string(),
  city: z.string(),
  reportedPrice: z.number().positive(),
  comment: z.string().optional(),
});

// Signalement par un utilisateur connecté (crowdsourcing)
reportsRouter.post('/', authenticate, async (req, res: Response) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return res.status(404).json({ error: 'PRODUCT_NOT_FOUND' });

  const r = await prisma.priceReport.create({
    data: {
      productId: parsed.data.productId,
      productName: product.name,
      storeName: parsed.data.storeName,
      city: parsed.data.city,
      reportedPrice: parsed.data.reportedPrice,
      comment: parsed.data.comment ?? null,
      userEmail: req.user!.email,
      status: 'pending',
    },
  });
  await addAuditLog({ action: 'PRICE_REPORT', user: req.user!.email, userEmail: req.user!.email, details: `Signalement prix : ${product.name}`, type: 'info' });
  res.status(201).json(r);
});

// Liste + gestion : admin
reportsRouter.get('/', authenticate, requireRole('admin'), async (_req, res: Response) => {
  const reports = await prisma.priceReport.findMany({ orderBy: { timestamp: 'desc' } });
  res.json(reports);
});

const statusSchema = z.object({ status: z.enum(['pending', 'verified', 'rejected']) });

reportsRouter.patch('/:id/status', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const r = await prisma.priceReport.update({ where: { id: req.params.id }, data: { status: parsed.data.status } });
  await addAuditLog({ action: 'REPORT_UPDATE', user: req.user!.email, userEmail: req.user!.email, details: `Signalement ${r.id} -> ${r.status}`, type: 'info' });
  res.json(r);
});
