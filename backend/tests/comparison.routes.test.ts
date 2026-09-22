import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../src/config/env.js', () => {
  throw new Error('Environment loading is forbidden in mocked comparison tests');
});
vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    appConfig: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    product: { findMany: vi.fn(), findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('../src/lib/jwt.js', () => ({
  verifyToken: (token: string) => {
    if (!['admin', 'customer', 'contributor', 'demoted', 'deleted', 'suspended'].includes(token)) throw new Error('Invalid token');
    return { sub: token, role: 'admin', email: `${token}@example.test` };
  },
}));

import { prisma } from '../src/lib/prisma.js';
import { configRouter } from '../src/routes/config.routes.js';
import { productsRouter } from '../src/routes/products.routes.js';

const db = vi.mocked(prisma, true);
const tiers = {
  free: { label: 'Gratuit', price: 0, limit: 5, features: ['Catalogue'] },
  pack1: { label: 'Essentiel', price: 29, limit: 20, features: [] },
  pack2: { label: 'Premium', price: 49, limit: 100, features: [] },
  unlimited: { label: 'Business', price: 199, limit: 1000, features: [] },
};
let stored: any;
const product = (id: string) => ({
  id, name: `Produit ${id}`, category: 'Food', unit: 'kg', weight: 1, image: '', brand: null,
  isActive: true, isDeleted: false,
  prices: [{ store: { name: 'Market' }, storeId: 's1', city: 'Rabat', price: 12, available: true, lastUpdated: new Date('2026-01-01') }],
});
const app = express();
app.use(express.json());
app.use('/api/config', configRouter);
app.use('/api/products', productsRouter);
app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(500).json({ error: 'INTERNAL_ERROR' });
});
const save = (body: unknown, token = 'admin') => request(app).put('/api/config').set('Authorization', `Bearer ${token}`).send(body);
const compare = () => request(app).get('/api/products/comparison?ids=p1,p2');
const enable = () => { stored.tiers.__features = { comparisonEnabled: true }; };

beforeEach(() => {
  vi.resetAllMocks();
  stored = { id: 'singleton', tiers: structuredClone(tiers), activeMaintenance: false };
  db.appConfig.findUnique.mockImplementation(async () => stored);
  db.appConfig.create.mockImplementation(async ({ data }: any) => { stored = structuredClone(data); return stored; });
  db.appConfig.update.mockImplementation(async ({ data }: any) => { stored = { ...stored, ...structuredClone(data) }; return stored; });
  db.appConfig.upsert.mockImplementation(async ({ create, update }: any) => {
    stored = stored ? { ...stored, ...structuredClone(update) } : structuredClone(create);
    return stored;
  });
  db.$transaction.mockImplementation(async (callback: any) => {
    const previous = structuredClone(stored);
    try { return await callback(prisma); } catch (error) { stored = previous; throw error; }
  });
  db.user.findUnique.mockImplementation(async ({ where }: any) => ({
    id: where.id, role: ['admin', 'deleted', 'suspended'].includes(where.id) ? 'admin' : where.id === 'contributor' ? 'contributor' : 'customer',
    isDeleted: where.id === 'deleted', isSuspended: where.id === 'suspended',
  }) as any);
  db.product.findMany.mockResolvedValue([product('p2'), product('p1')] as any);
  db.product.findUnique.mockResolvedValue(product('p1') as any);
  db.auditLog.create.mockResolvedValue({} as any);
});

describe('comparison configuration', () => {
  it('defaults missing flags to false without writing on public GET', async () => {
    const result = await request(app).get('/api/config');
    expect(result.status).toBe(200);
    expect(result.body.comparisonEnabled).toBe(false);
    expect(result.body.tiers).toEqual(tiers);
    expect(db.appConfig.create).not.toHaveBeenCalled();
    expect(db.appConfig.upsert).not.toHaveBeenCalled();
  });

  it('returns disabled defaults for a missing singleton without creating it', async () => {
    stored = null;
    const result = await request(app).get('/api/config');
    expect(result.status).toBe(200);
    expect(result.body.comparisonEnabled).toBe(false);
    expect(db.appConfig.create).not.toHaveBeenCalled();
    expect(db.appConfig.upsert).not.toHaveBeenCalled();
  });

  it.each(['true', 'false', 1, 0, null, {}, []])('rejects a nonboolean setting: %j', async (value) => {
    expect((await save({ comparisonEnabled: value })).status).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.appConfig.update).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it.each(['customer', 'contributor', 'demoted'])('rejects a nonadmin using its current role: %s', async (role) => {
    expect((await save({ comparisonEnabled: true }, role)).status).toBe(403);
    expect(db.appConfig.findUnique).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it.each([['deleted', 401], ['suspended', 403], ['invalid', 401]] as const)('rejects an unavailable admin: %s', async (role, status) => {
    expect((await save({ comparisonEnabled: true }, role)).status).toBe(status);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('rejects anonymous writes', async () => {
    expect((await request(app).put('/api/config').send({ comparisonEnabled: true })).status).toBe(401);
  });

  it('rejects attempts to set reserved flags through tiers', async () => {
    expect((await save({ tiers: { ...tiers, __features: { comparisonEnabled: true } } })).status).toBe(400);
  });

  it('persists explicit opt-in and hides the storage namespace from public tiers', async () => {
    expect((await save({ comparisonEnabled: true })).body.comparisonEnabled).toBe(true);
    expect(stored.tiers.__features.comparisonEnabled).toBe(true);
    const result = await request(app).get('/api/config');
    expect(result.body.comparisonEnabled).toBe(true);
    expect(result.body.tiers).toEqual(tiers);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    expect(db.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'CONFIG_UPDATE', userEmail: 'admin@example.test', details: expect.stringContaining('comparisonEnabled: false -> true'),
    }) });
  });

  it('preserves the switch on unrelated config and tier updates', async () => {
    enable();
    const newTiers = { ...tiers, free: { ...tiers.free, label: 'Changed' } };
    expect((await save({ activeMaintenance: true, tiers: newTiers })).body.comparisonEnabled).toBe(true);
    expect(stored.tiers.__features.comparisonEnabled).toBe(true);
    expect((await request(app).get('/api/config')).body.tiers).toEqual(newTiers);
  });

  it('creates configuration only on an authenticated explicit save', async () => {
    stored = null;
    expect((await save({ comparisonEnabled: true })).body.comparisonEnabled).toBe(true);
    expect((await compare()).status).toBe(200);
  });

  it('rolls back the setting if its audit write fails', async () => {
    db.auditLog.create.mockRejectedValueOnce(new Error('Audit unavailable'));
    expect((await save({ comparisonEnabled: true })).status).toBe(500);
    expect((await request(app).get('/api/config')).body.comparisonEnabled).toBe(false);
  });

  it('returns an error when persistence fails', async () => {
    db.appConfig.upsert.mockRejectedValueOnce(new Error('Write unavailable'));
    expect((await save({ comparisonEnabled: true })).status).toBe(500);
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it('forwards authentication lookup failures instead of hanging', async () => {
    db.user.findUnique.mockRejectedValueOnce(new Error('Auth unavailable'));
    expect((await save({ comparisonEnabled: true })).status).toBe(500);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe('read-only comparison API', () => {
  it('blocks a direct request while disabled before loading prices', async () => {
    const result = await compare();
    expect(result.status).toBe(403);
    expect(result.body.error).toBe('FEATURE_DISABLED');
    expect(db.product.findMany).not.toHaveBeenCalled();
    expect(db.product.findUnique).not.toHaveBeenCalled();
    expect(result.headers['cache-control']).toBe('no-store');
  });

  it.each([undefined, null, 'true', 1, false])('fails closed for a missing or malformed flag: %j', async (value) => {
    stored.tiers.__features = { comparisonEnabled: value };
    expect((await compare()).status).toBe(403);
    expect(db.product.findMany).not.toHaveBeenCalled();
  });

  it('fails closed without creating missing configuration', async () => {
    stored = null;
    expect((await compare()).status).toBe(403);
    expect(db.appConfig.create).not.toHaveBeenCalled();
  });

  it('does not accept a client-side bypass flag, including for admins', async () => {
    expect((await request(app).get('/api/products/comparison?ids=p1,p2&comparisonEnabled=true').set('Authorization', 'Bearer admin')).status).toBe(403);
    expect(db.product.findMany).not.toHaveBeenCalled();
  });

  it('returns current products and prices in requested order, with active/nondeleted filters', async () => {
    enable();
    const result = await compare();
    expect(result.status).toBe(200);
    expect(result.body.map((p: any) => p.id)).toEqual(['p1', 'p2']);
    expect(result.body[0].prices[0].price).toBe(12);
    expect(db.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['p1', 'p2'] }, isDeleted: false, isActive: true },
      include: { brand: true, prices: { where: { store: { isActive: true, isDeleted: false } }, include: { store: true } } },
      take: 4,
    }));
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
    expect(db.appConfig.upsert).not.toHaveBeenCalled();
    expect(result.headers['cache-control']).toBe('no-store');
  });

  it.each(['', '?ids=p1', '?ids=p1,p1', '?ids=p1,p2,p3,p4,p5', '?ids=p1,,p2', '?ids=p1,%20p2', '?ids=p1,$bad', '?ids=p1&ids=p2', '?ids[]=p1&ids[]=p2', `?ids=p1,${'x'.repeat(129)}`])('rejects invalid ids or limits: %s', async (query) => {
    enable();
    expect((await request(app).get(`/api/products/comparison${query}`)).status).toBe(400);
    expect(db.product.findMany).not.toHaveBeenCalled();
  });

  it('rejects the whole comparison when a requested product is missing, inactive or deleted', async () => {
    enable();
    db.product.findMany.mockResolvedValueOnce([product('p1')] as any);
    const result = await compare();
    expect(result.status).toBe(404);
    expect(result.body.error).toBe('PRODUCTS_UNAVAILABLE');
    expect(result.body).not.toHaveProperty('prices');
  });

  it('checks persisted state on every request, supporting disable and reactivation', async () => {
    await save({ comparisonEnabled: true });
    expect((await compare()).status).toBe(200);
    await save({ comparisonEnabled: false });
    expect((await compare()).status).toBe(403);
    await save({ comparisonEnabled: true });
    expect((await compare()).status).toBe(200);
    expect(db.auditLog.create).toHaveBeenCalledTimes(3);
  });

  it('keeps normal catalogue prices available when comparison is disabled', async () => {
    const result = await request(app).get('/api/products');
    expect(result.status).toBe(200);
    expect(result.body[0].prices[0].price).toBe(12);
    expect((await request(app).get('/api/products/p1')).body.prices[0].price).toBe(12);
  });

  it('returns an error without loading prices when config lookup fails', async () => {
    db.appConfig.findUnique.mockRejectedValueOnce(new Error('Read unavailable'));
    expect((await compare()).status).toBe(500);
    expect(db.product.findMany).not.toHaveBeenCalled();
  });

  it('returns an error instead of fallback prices when product lookup fails', async () => {
    enable();
    db.product.findMany.mockRejectedValueOnce(new Error('Read unavailable'));
    expect((await compare()).status).toBe(500);
  });
});
