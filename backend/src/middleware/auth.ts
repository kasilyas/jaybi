import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

// Étend Express Request pour exposer l'utilisateur authentifié
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentification JWT + DB lookup.
 * Vérifie le token ET que l'utilisateur existe toujours, n'est pas supprimé,
 * et que son rôle n'a pas changé depuis l'émission du token.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  const token = header.slice('Bearer '.length).trim();
  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
  // DB lookup : vérifie que l'utilisateur est toujours valide
  const dbUser = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, isDeleted: true },
  });
  if (!dbUser || dbUser.isDeleted) {
    return res.status(401).json({ error: 'ACCOUNT_DISABLED' });
  }
  // Utilise le rôle actuel de la DB, pas celui du token (anti-escalade persistante)
  req.user = { ...payload, role: dbUser.role };
  next();
}

/** Garde d'autorisation par rôle. À utiliser après `authenticate`. */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'FORBIDDEN' });
    next();
  };
}
