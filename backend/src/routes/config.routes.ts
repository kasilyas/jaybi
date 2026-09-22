import { Response } from 'express';
import { Router } from '../lib/router.js';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { configJson, isComparisonEnabled, serializeConfig } from '../lib/platformConfig.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const configRouter = Router();

configRouter.get('/', async (_req, res: Response, next) => {
  res.set('Cache-Control', 'no-store');
  try {
    const cfg = await prisma.appConfig.findUnique({ where: { id: 'singleton' } });
    res.json(serializeConfig(cfg));
  } catch (error) {
    next(error);
  }
});

const tierSchema = z.object({
  label: z.string().min(1).max(200),
  price: z.number().nonnegative(),
  limit: z.number().int().nonnegative(),
  features: z.array(z.string().max(500)).max(100),
  isRecommended: z.boolean().optional(),
}).strict();

const updateSchema = z.object({
  tiers: z.object({
    free: tierSchema.optional(),
    pack1: tierSchema.optional(),
    pack2: tierSchema.optional(),
    unlimited: tierSchema.optional(),
  }).strict().optional(),
  activeMaintenance: z.boolean().optional(),
  comparisonEnabled: z.boolean().optional(),
}).strict();

configRouter.put('/', authenticate, requireRole('admin'), async (req, res: Response, next) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const cfg = await tx.appConfig.findUnique({ where: { id: 'singleton' } });
      const current = serializeConfig(cfg);
      const comparisonEnabled = parsed.data.comparisonEnabled ?? current.comparisonEnabled;
      const data = {
        tiers: {
          ...configJson(cfg?.tiers),
          ...current.tiers,
          ...parsed.data.tiers,
          __features: { ...configJson(configJson(cfg?.tiers).__features), comparisonEnabled },
        },
        activeMaintenance: parsed.data.activeMaintenance ?? current.activeMaintenance,
      };
      const saved = await tx.appConfig.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', ...data },
        update: data,
      });
      await tx.auditLog.create({ data: {
        action: 'CONFIG_UPDATE',
        user: req.user!.email,
        userEmail: req.user!.email,
        details: `Mise à jour configuration plateforme; comparisonEnabled: ${isComparisonEnabled(cfg)} -> ${comparisonEnabled}`,
        type: 'info',
      } });
      return saved;
    }, { isolationLevel: 'Serializable' });
    res.set('Cache-Control', 'no-store').json(serializeConfig(updated));
  } catch (error) {
    next(error);
  }
});
