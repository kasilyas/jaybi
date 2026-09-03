import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { unsuspendUser } from '../lib/securityAlert.js';
import { addAuditLog } from '../lib/audit.js';

export const securityRouter = Router();

// GET /security/alerts — liste toutes les alertes (admin only)
securityRouter.get('/alerts', authenticate, requireRole('admin'), async (_req, res: Response) => {
  const alerts = await prisma.securityAlert.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });
  res.json(alerts);
});

// GET /security/alerts/unresolved — alertes non résolues (admin only)
securityRouter.get('/alerts/unresolved', authenticate, requireRole('admin'), async (_req, res: Response) => {
  const count = await prisma.securityAlert.count({ where: { resolved: false } });
  res.json({ count });
});

// PATCH /security/alerts/:id/resolve — résoudre une alerte (admin only)
securityRouter.patch('/alerts/:id/resolve', authenticate, requireRole('admin'), async (req, res: Response) => {
  const alert = await prisma.securityAlert.findUnique({ where: { id: req.params.id } });
  if (!alert) return res.status(404).json({ error: 'NOT_FOUND' });
  if (alert.resolved) return res.status(400).json({ error: 'ALREADY_RESOLVED' });
  const updated = await prisma.securityAlert.update({
    where: { id: req.params.id },
    data: { resolved: true, resolvedBy: req.user!.email, resolvedAt: new Date() },
  });
  await addAuditLog({ action: 'SECURITY_ALERT_RESOLVED', user: req.user!.email, userEmail: req.user!.email, details: `Alerte ${req.params.id} résolue`, type: 'info' });
  res.json(updated);
});

// GET /security/suspended — liste des utilisateurs suspendus (admin only)
securityRouter.get('/suspended', authenticate, requireRole('admin'), async (_req, res: Response) => {
  const users = await prisma.user.findMany({
    where: { isSuspended: true },
    select: { id: true, name: true, email: true, isSuspended: true, suspendedReason: true, suspendedAt: true },
    orderBy: { suspendedAt: 'desc' },
  });
  res.json(users);
});

// POST /security/users/:id/unsuspend — réactiver un compte (admin only)
securityRouter.post('/users/:id/unsuspend', authenticate, requireRole('admin'), async (req, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'NOT_FOUND' });
  if (!user.isSuspended) return res.status(400).json({ error: 'NOT_SUSPENDED' });
  await unsuspendUser(req.params.id, req.user!.email);
  res.json({ ok: true });
});
