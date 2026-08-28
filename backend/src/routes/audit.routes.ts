import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const auditRouter = Router();

auditRouter.get('/', authenticate, requireRole('admin'), async (_req, res: Response) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { timestamp: 'desc' }, take: 500 });
  res.json(logs);
});
