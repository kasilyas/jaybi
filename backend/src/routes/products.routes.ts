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
  name: z.string().min(1).max(200),
  brandId: z.string().optional().nullable(),
  category: z.string().min(1).max(100),
  image: z.string().max(500).default(''),
  unit: z.enum(['kg', 'L', 'unit', 'g', 'ml']).default('unit'),
  weight: z.number().nonnegative().max(10000).default(0),
  isNational: z.boolean().default(false),
  isActive: z.boolean().default(true),
  // Remise générale
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  // Flash vente
  flashSalePercent: z.number().min(0).max(100).optional().nullable(),
  flashSaleStartsAt: z.string().datetime().optional().nullable(),
  flashSaleEndsAt: z.string().datetime().optional().nullable(),
  flashSaleLabel: z.string().max(200).optional().nullable(),
  prices: z.array(priceEntrySchema).default([]),
});

// Lecture publique (exclut les soft-deleted ET les inactifs)
productsRouter.get('/', async (_req, res: Response) => {
  const products = await prisma.product.findMany({
    where: { isDeleted: false, isActive: true },
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

// --- Endpoints admin ---

// Liste tous les produits (inclut supprimés et inactifs) — admin uniquement
productsRouter.get('/admin/all', authenticate, requireRole('admin'), async (_req, res: Response) => {
  const products = await prisma.product.findMany({
    include: { brand: true, prices: { include: { store: true } } },
    orderBy: [{ isDeleted: 'asc' }, { name: 'asc' }],
  });
  res.json(products.map(serializeProduct));
});

// Liste uniquement les produits supprimés (soft-deleted) — admin uniquement
productsRouter.get('/admin/deleted', authenticate, requireRole('admin'), async (_req, res: Response) => {
  const products = await prisma.product.findMany({
    where: { isDeleted: true },
    include: { brand: true, prices: { include: { store: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(products.map(serializeProduct));
});

// Restaure un produit soft-deleted — admin uniquement
productsRouter.post('/:id/restore', authenticate, requireRole('admin'), async (req, res: Response) => {
  const p = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: 'NOT_FOUND' });
  if (!p.isDeleted) return res.status(400).json({ error: 'NOT_DELETED' });
  const restored = await prisma.product.update({
    where: { id: req.params.id },
    data: { isDeleted: false },
    include: { brand: true, prices: { include: { store: true } } },
  });
  await addAuditLog({ action: 'PRODUCT_RESTORE', user: req.user!.email, userEmail: req.user!.email, details: `Restauration produit : ${restored.name}`, type: 'success' });
  res.json(serializeProduct(restored));
});

// Active/désactive un produit (sans le supprimer) — admin uniquement
productsRouter.patch('/:id/activate', authenticate, requireRole('admin'), async (req, res: Response) => {
  const p = await prisma.product.update({
    where: { id: req.params.id },
    data: { isActive: true },
    include: { brand: true, prices: { include: { store: true } } },
  });
  await addAuditLog({ action: 'PRODUCT_ACTIVATE', user: req.user!.email, userEmail: req.user!.email, details: `Activation produit : ${p.name}`, type: 'info' });
  res.json(serializeProduct(p));
});

productsRouter.patch('/:id/deactivate', authenticate, requireRole('admin'), async (req, res: Response) => {
  const p = await prisma.product.update({
    where: { id: req.params.id },
    data: { isActive: false },
    include: { brand: true, prices: { include: { store: true } } },
  });
  await addAuditLog({ action: 'PRODUCT_DEACTIVATE', user: req.user!.email, userEmail: req.user!.email, details: `Désactivation produit : ${p.name}`, type: 'warning' });
  res.json(serializeProduct(p));
});

// Création — admin uniquement
productsRouter.post('/', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const { prices, flashSaleStartsAt, flashSaleEndsAt, ...data } = parsed.data;
  const p = await prisma.product.create({
    data: {
      ...data,
      flashSaleStartsAt: flashSaleStartsAt ? new Date(flashSaleStartsAt) : null,
      flashSaleEndsAt: flashSaleEndsAt ? new Date(flashSaleEndsAt) : null,
      brandId: data.brandId ?? null,
      prices: { create: prices },
    },
    include: { brand: true, prices: { include: { store: true } } },
  });
  await addAuditLog({ action: 'PRODUCT_CREATE', user: req.user!.email, userEmail: req.user!.email, details: `Produit : ${p.name}`, type: 'success' });
  res.status(201).json(serializeProduct(p));
});

// Mise à jour — admin uniquement
productsRouter.put('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const { prices, flashSaleStartsAt, flashSaleEndsAt, ...data } = parsed.data;
  const id = req.params.id;
  // Remplacement simple des prix : on supprime puis recrée
  if (prices) {
    await prisma.priceEntry.deleteMany({ where: { productId: id } });
  }
  const p = await prisma.product.update({
    where: { id },
    data: {
      ...data,
      ...(flashSaleStartsAt !== undefined ? { flashSaleStartsAt: flashSaleStartsAt ? new Date(flashSaleStartsAt) : null } : {}),
      ...(flashSaleEndsAt !== undefined ? { flashSaleEndsAt: flashSaleEndsAt ? new Date(flashSaleEndsAt) : null } : {}),
      ...(prices ? { prices: { create: prices } } : {}),
    },
    include: { brand: true, prices: { include: { store: true } } },
  });
  await addAuditLog({ action: 'PRODUCT_UPDATE', user: req.user!.email, userEmail: req.user!.email, details: `Produit : ${p.name}`, type: 'info' });
  res.json(serializeProduct(p));
});

// Soft-delete (suppression logique uniquement, jamais de suppression physique)
productsRouter.delete('/:id', authenticate, requireRole('admin'), async (req, res: Response) => {
  const p = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!p) return res.status(404).json({ error: 'NOT_FOUND' });
  if (p.isDeleted) return res.status(400).json({ error: 'ALREADY_DELETED' });
  await prisma.product.update({ where: { id: req.params.id }, data: { isDeleted: true, isActive: false } });
  await addAuditLog({ action: 'PRODUCT_DELETE', user: req.user!.email, userEmail: req.user!.email, details: `Archivage produit : ${p.name}`, type: 'danger' });
  res.status(204).end();
});
