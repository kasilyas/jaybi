import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { addAuditLog } from '../lib/audit.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const configRouter = Router();

const DEFAULT_TIERS = {
  free: { label: 'Gratuit', price: 0, limit: 5, features: ['Comparaison simple'] },
  pack1: { label: 'Essentiel', price: 29, limit: 20, features: ['Roadmap GPS', 'Sans pub'] },
  pack2: { label: 'Premium', price: 49, limit: 100, features: ['IA illimitée', 'Support prioritaire'] },
  unlimited: { label: 'Business', price: 199, limit: 1000, features: ['API Access', 'Multi-comptes'] },
};

async function getConfig() {
  let cfg = await prisma.appConfig.findUnique({ where: { id: 'singleton' } });
  if (!cfg) {
    cfg = await prisma.appConfig.create({ data: { id: 'singleton', tiers: DEFAULT_TIERS, activeMaintenance: false } });
  }
  return cfg;
}

configRouter.get('/', async (_req, res: Response) => {
  const cfg = await getConfig();
  res.json({ tiers: cfg.tiers, activeMaintenance: cfg.activeMaintenance });
});

const updateSchema = z.object({
  tiers: z.record(z.any()).optional(),
  activeMaintenance: z.boolean().optional(),
});

configRouter.put('/', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
  const cfg = await getConfig();
  const updated = await prisma.appConfig.update({
    where: { id: cfg.id },
    data: {
      ...(parsed.data.tiers ? { tiers: parsed.data.tiers } : {}),
      ...(parsed.data.activeMaintenance !== undefined ? { activeMaintenance: parsed.data.activeMaintenance } : {}),
    },
  });
  await addAuditLog({ action: 'CONFIG_UPDATE', user: req.user!.email, userEmail: req.user!.email, details: 'Mise à jour configuration plateforme', type: 'info' });
  res.json({ tiers: updated.tiers, activeMaintenance: updated.activeMaintenance });
});
