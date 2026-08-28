import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { serializeProduct } from '../lib/serialize.js';
import { addAuditLog } from '../lib/audit.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const productsRouter = Router();

const priceEntrySchema = z.object({
  storeId: z.string(),
  city: z.string(),
  price: z.number().nonnegative(),
  originalPrice: z.number().optional().nullable(),
  promotionExpiresAt: z.string().datetime().optional().nullable(),
  available: z.boolean().default(true),
});

const productSchema = z.object({
  name: z.string().min(1),
  brandId: z.string().optional().nullable(),
  category: z.string().min(1),
  image: z.string().default(''),
  unit: z.enum(['kg', 'L', 'unit', 'g', 'ml']).default('unit'),
  weight: z.number().default(0),
  isNational: z.boolean().default(false),
  prices: z.array(priceEntrySchema).default([]),
});

// Lecture publique (exclut les soft-deleted)
productsRouter.get('/', async (_req, res: Response) => {
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    include: { brand: true, prices: { include: { store: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(products.map(serializeProduct));
});

productsRouter.get('/:id', async (req, res: Response) => {
  const p = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { brand: true, prices: { include: { store: true } } },
  });
  if (!p || p.isDeleted) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(serializeProduct(p));
});

// Écriture : admin uniquement
productsRouter.post('/', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const { prices, ...data } = parsed.data;
  const p = await prisma.product.create({
    data: { ...data, brandId: data.brandId ?? null, prices: { create: prices } },
    include: { brand: true, prices: { include: { store: true } } },
  });
  await addAuditLog({ action: 'PRODUCT_CREATE', user: req.user!.email, userEmail: req.user!.email, details: `Produit : ${p.name}`, type: 'success' });
  res.status(201).json(serializeProduct(p));
});

productsRouter.put('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const { prices, ...data } = parsed.data;
  const id = req.params.id;
  // Remplacement simple des prix : on supprime puis recrée
  if (prices) {
    await prisma.priceEntry.deleteMany({ where: { productId: id } });
  }
  const p = await prisma.product.update({
    where: { id },
    data: { ...data, ...(prices ? { prices: { create: prices } } : {}) },
    include: { brand: true, prices: { include: { store: true } } },
  });
  await addAuditLog({ action: 'PRODUCT_UPDATE', user: req.user!.email, userEmail: req.user!.email, details: `Produit : ${p.name}`, type: 'info' });
  res.json(serializeProduct(p));
});

// Soft-delete
productsRouter.delete('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  await prisma.product.update({ where: { id: req.params.id }, data: { isDeleted: true } });
  await addAuditLog({ action: 'PRODUCT_DELETE', user: req.user!.email, userEmail: req.user!.email, details: `Archivage produit ID: ${req.params.id}`, type: 'danger' });
  res.status(204).end();
});
