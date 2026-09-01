import { describe, it, expect, vi } from 'vitest';

// Mock de jwt.verify pour contrôler le payload (sans dépendance DB).
vi.mock('../src/lib/jwt.js', () => ({
  verifyToken: (token: string) => {
    if (token === 'admin-token') return { sub: 'u1', email: 'admin@x', role: 'admin' };
    if (token === 'customer-token') return { sub: 'u2', email: 'c@x', role: 'customer' };
    throw new Error('bad token');
  },
  signToken: () => 'signed',
}));

// Mock de prisma pour le DB lookup dans authenticate
vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        if (where.id === 'u1') return { id: 'u1', role: 'admin', isDeleted: false };
        if (where.id === 'u2') return { id: 'u2', role: 'customer', isDeleted: false };
        return null;
      }),
    },
  },
}));

// Helper : construit un mock Response où status() renvoie this pour le chaînage.
function mockRes() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.end = vi.fn(() => res);
  return res;
}

describe('middleware/auth - authenticate + requireRole', () => {
  it('rejette sans header Authorization', async () => {
    const { authenticate } = await import('../src/middleware/auth.js');
    const req: any = { headers: {} };
    const res = mockRes();
    await authenticate(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejette un token invalide', async () => {
    const { authenticate } = await import('../src/middleware/auth.js');
    const req: any = { headers: { authorization: 'Bearer bad' } };
    const res = mockRes();
    await authenticate(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('accepte un token admin valide et peuple req.user', async () => {
    const { authenticate } = await import('../src/middleware/auth.js');
    const req: any = { headers: { authorization: 'Bearer admin-token' } };
    const res = mockRes();
    const next = vi.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user?.role).toBe('admin');
  });

  it('requireRole autorise le bon rôle', async () => {
    const { requireRole } = await import('../src/middleware/auth.js');
    const req: any = { user: { role: 'admin' } };
    const res = mockRes();
    const next = vi.fn();
    requireRole('admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('requireRole refuse un rôle insuffisant (403)', async () => {
    const { requireRole } = await import('../src/middleware/auth.js');
    const req: any = { user: { role: 'customer' } };
    const res = mockRes();
    const next = vi.fn();
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('requireRole refuse sans utilisateur (401)', async () => {
    const { requireRole } = await import('../src/middleware/auth.js');
    const req: any = {};
    const res = mockRes();
    const next = vi.fn();
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
