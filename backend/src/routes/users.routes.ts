import { Response } from 'express';
import { Router } from '../lib/router.js';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { serializeUser } from '../lib/serialize.js';
import { addAuditLog } from '../lib/audit.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';

export const usersRouter = Router();

const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['customer', 'contributor', 'admin']).optional(),
  tier: z.enum(['free', 'pack1', 'pack2', 'unlimited']).optional(),
  isPremium: z.boolean().optional(),
  savingsScore: z.number().optional(),
});

const userCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform(value => value.toLowerCase()),
  role: z.enum(['customer', 'contributor', 'admin']).default('customer'),
  tier: z.enum(['free', 'pack1', 'pack2', 'unlimited']).default('free'),
  isPremium: z.boolean().default(false),
  savingsScore: z.number().int().min(0).default(0),
}).strict();

const ownProfileSchema = z.object({ name: z.string().trim().min(1).max(120) }).strict();
const addressSchema = z.object({
  label: z.string().trim().min(1).max(80),
  details: z.string().trim().min(3).max(300),
  city: z.string().trim().min(1).max(120),
  isDefault: z.boolean().optional(),
}).strict();
usersRouter.patch('/me', authenticate, async (req, res: Response) => {
  const parsed = ownProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT' });
  const user = await prisma.user.update({ where: { id: req.user!.sub }, data: parsed.data, include: { addresses: true } });
  await addAuditLog({ action: 'PROFILE_UPDATE', user: req.user!.sub, userEmail: req.user!.email, details: 'Profil personnel modifié', type: 'info' });
  res.json(serializeUser(user));
});
usersRouter.delete('/me', authenticate, async (req, res: Response) => {
  await prisma.$transaction(async tx => {
    await tx.user.update({ where: { id: req.user!.sub }, data: { isDeleted: true } });
    await tx.auditLog.create({ data: { action: 'ACCOUNT_DISABLED', user: req.user!.sub, userEmail: req.user!.email, details: 'Désactivation demandée par le titulaire', type: 'warning' } });
  });
  res.status(204).end();
});

usersRouter.post('/me/addresses', authenticate, async (req, res: Response) => {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const user = await prisma.$transaction(async tx => {
    const hasAddress = await tx.address.count({ where: { userId: req.user!.sub } });
    const isDefault = parsed.data.isDefault === true || hasAddress === 0;
    if (isDefault) await tx.address.updateMany({ where: { userId: req.user!.sub }, data: { isDefault: false } });
    const address = await tx.address.create({ data: { ...parsed.data, isDefault, userId: req.user!.sub } });
    const updated = await tx.user.findUniqueOrThrow({ where: { id: req.user!.sub }, include: { addresses: true } });
    await tx.auditLog.create({ data: { action: 'ADDRESS_CREATE', user: req.user!.sub, userEmail: req.user!.email, details: `Adresse ajoutée : ${address.label}`, type: 'info' } });
    return updated;
  });
  res.status(201).json(serializeUser(user));
});

usersRouter.put('/me/addresses/:addressId', authenticate, async (req, res: Response) => {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const user = await prisma.$transaction(async tx => {
    const existing = await tx.address.findFirst({ where: { id: req.params.addressId, userId: req.user!.sub } });
    if (!existing) throw new HttpError(404, 'NOT_FOUND');
    if (parsed.data.isDefault) await tx.address.updateMany({ where: { userId: req.user!.sub }, data: { isDefault: false } });
    await tx.address.update({ where: { id: existing.id }, data: parsed.data });
    return tx.user.findUniqueOrThrow({ where: { id: req.user!.sub }, include: { addresses: true } });
  });
  res.json(serializeUser(user));
});

usersRouter.delete('/me/addresses/:addressId', authenticate, async (req, res: Response) => {
  const user = await prisma.$transaction(async tx => {
    const existing = await tx.address.findFirst({ where: { id: req.params.addressId, userId: req.user!.sub } });
    if (!existing) throw new HttpError(404, 'NOT_FOUND');
    await tx.address.delete({ where: { id: existing.id } });
    if (existing.isDefault) {
      const replacement = await tx.address.findFirst({ where: { userId: req.user!.sub }, orderBy: { id: 'asc' } });
      if (replacement) await tx.address.update({ where: { id: replacement.id }, data: { isDefault: true } });
    }
    const updated = await tx.user.findUniqueOrThrow({ where: { id: req.user!.sub }, include: { addresses: true } });
    await tx.auditLog.create({ data: { action: 'ADDRESS_DELETE', user: req.user!.sub, userEmail: req.user!.email, details: `Adresse supprimée : ${existing.label}`, type: 'warning' } });
    return updated;
  });
  res.json(serializeUser(user));
});

// Liste (admin)
usersRouter.get('/', authenticate, requireRole('admin'), async (_req, res: Response) => {
  const users = await prisma.user.findMany({ include: { addresses: true }, orderBy: { createdAt: 'desc' } });
  res.json(users.map(serializeUser));
});

// Création directe par un administrateur. Le compte se connecte ensuite avec
// le même parcours OTP que les comptes inscrits publiquement.
usersRouter.post('/', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = userCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });
  if (existing) return res.status(409).json({ error: 'EMAIL_ALREADY_EXISTS' });

  const user = await prisma.$transaction(async tx => {
    const created = await tx.user.create({ data: parsed.data, include: { addresses: true } });
    await tx.auditLog.create({
      data: {
        action: 'USER_CREATE',
        user: req.user!.email,
        userEmail: req.user!.email,
        details: `Création du membre : ${created.email} (${created.role}/${created.tier})`,
        type: 'success',
      },
    });
    return created;
  });

  res.status(201).json(serializeUser(user));
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
