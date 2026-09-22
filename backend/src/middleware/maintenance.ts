import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { verifyToken } from '../lib/jwt.js';

const allowedPaths = new Set(['/config', '/auth/request-otp', '/auth/verify-otp']);

/** Blocks public business endpoints during maintenance while preserving admin recovery access. */
export async function maintenanceGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (allowedPaths.has(req.path)) return next();
  const config = await prisma.appConfig.findUnique({ where: { id: 'singleton' }, select: { activeMaintenance: true } });
  if (!config?.activeMaintenance) return next();

  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  try {
    if (token && verifyToken(token).role === 'admin') return next();
  } catch { /* invalid tokens remain blocked */ }

  res.set('Retry-After', '300').status(503).json({ error: 'MAINTENANCE', message: 'La plateforme est temporairement en maintenance.' });
}
