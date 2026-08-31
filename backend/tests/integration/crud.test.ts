import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

// Test d'intégration : nécessite une base PostgreSQL accessible (DATABASE_URL).
// La disponibilité est vérifiée au chargement du module (top-level await) car
// `describe.runIf` est évalué avant `beforeAll`.
let dbAvailable = false;
try {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  dbAvailable = true;
} catch (e) {
  console.warn('[integration] DB not available, skipping:', (e as Error).message);
  dbAvailable = false;
}

afterAll(async () => {
  await prisma.$disconnect();
});

const app = createApp();

async function login(email: string) {
  await request(app).post('/api/auth/request-otp').send({ email });
  const r = await request(app).post('/api/auth/verify-otp').send({ email, code: '123456' });
  return { token: r.body.token as string, user: r.body.user };
}

const ADMIN = 'admin@qayess.io';
const CUSTOMER = 'user@qayess.ma';

// ─── USERS ──────────────────────────────────────────────────────────────────
describe.runIf(dbAvailable)('USERS (admin only)', () => {
  it('GET /api/users as admin → 200, array', async () => {
    const { token } = await login(ADMIN);
    const r = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('GET /api/users as customer → 403', async () => {
    const { token } = await login(CUSTOMER);
    const r = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });

  it('PUT /api/users/:id as admin → 200 (change tier)', async () => {
    const { token } = await login(ADMIN);
    // Find a customer user to update
    const list = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    const target = list.body.find((u: any) => u.role === 'customer' && !u.isDeleted);
    expect(target).toBeDefined();
    const r = await request(app)
      .put(`/api/users/${target.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tier: 'pack1' });
    expect(r.status).toBe(200);
    expect(r.body.tier).toBe('pack1');
    // Restore
    await request(app)
      .put(`/api/users/${target.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tier: target.tier });
  });

  it('DELETE /api/users/:id as admin → 204', async () => {
    // Create a temp user to delete
    const tempEmail = `temp-delete-${Date.now()}@test.com`;
    await login(tempEmail);
    const { token } = await login(ADMIN);
    const list = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    const target = list.body.find((u: any) => u.email === tempEmail);
    expect(target).toBeDefined();
    const r = await request(app)
      .delete(`/api/users/${target.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 204]).toContain(r.status);
  });
});

// ─── ORDERS ─────────────────────────────────────────────────────────────────
describe.runIf(dbAvailable)('ORDERS', () => {
  it('POST /api/orders as customer → 201', async () => {
    const { token } = await login(CUSTOMER);
    // Find a product with prices
    const products = await request(app).get('/api/products');
    const product = products.body.find((p: any) => p.prices && p.prices.length > 0);
    expect(product).toBeDefined();
    const price = product.prices[0];
    const r = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mode: 'roadmap',
        paymentMethod: 'cod',
        items: [{ productId: product.id, storeId: price.storeId, city: price.city, quantity: 1 }],
      });
    expect(r.status).toBe(201);
    expect(r.body.id).toBeDefined();
    expect(r.body.items.length).toBeGreaterThan(0);
  });

  it('GET /api/orders/me as customer → 200', async () => {
    const { token } = await login(CUSTOMER);
    const r = await request(app).get('/api/orders/me').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('GET /api/orders as admin → 200', async () => {
    const { token } = await login(ADMIN);
    const r = await request(app).get('/api/orders').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('GET /api/orders/:id as owner → 200', async () => {
    const { token } = await login(CUSTOMER);
    const me = await request(app).get('/api/orders/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.length).toBeGreaterThan(0);
    const orderId = me.body[0].id;
    const r = await request(app).get(`/api/orders/${orderId}`).set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.id).toBe(orderId);
  });

  it('GET /api/orders/:id as non-owner customer → 403', async () => {
    // Create order as customer A
    const { token: tokenA } = await login(CUSTOMER);
    const me = await request(app).get('/api/orders/me').set('Authorization', `Bearer ${tokenA}`);
    expect(me.body.length).toBeGreaterThan(0);
    const orderId = me.body[0].id;
    // Try to access as customer B (different user)
    const emailB = `other-${Date.now()}@test.com`;
    const { token: tokenB } = await login(emailB);
    const r = await request(app).get(`/api/orders/${orderId}`).set('Authorization', `Bearer ${tokenB}`);
    expect(r.status).toBe(403);
  });
});

// ─── PACKS ──────────────────────────────────────────────────────────────────
describe.runIf(dbAvailable)('PACKS (admin CRUD)', () => {
  it('GET /api/packs → 200 (public read)', async () => {
    const r = await request(app).get('/api/packs');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('POST /api/packs as admin → 201', async () => {
    const { token } = await login(ADMIN);
    const r = await request(app)
      .post('/api/packs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Pack Test ${Date.now()}`, description: 'Test pack' });
    expect(r.status).toBe(201);
    expect(r.body.id).toBeDefined();
  });

  it('POST /api/packs as customer → 403', async () => {
    const { token } = await login(CUSTOMER);
    const r = await request(app)
      .post('/api/packs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Should Fail' });
    expect(r.status).toBe(403);
  });

  it('PUT /api/packs/:id as admin → 200', async () => {
    const { token } = await login(ADMIN);
    // Create a pack first
    const created = await request(app)
      .post('/api/packs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Pack PUT ${Date.now()}` });
    expect(created.status).toBe(201);
    const r = await request(app)
      .put(`/api/packs/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Pack Updated' });
    expect(r.status).toBe(200);
    expect(r.body.name).toBe('Pack Updated');
  });

  it('DELETE /api/packs/:id as admin → 200 or 204', async () => {
    const { token } = await login(ADMIN);
    const created = await request(app)
      .post('/api/packs')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Pack DELETE ${Date.now()}` });
    expect(created.status).toBe(201);
    const r = await request(app)
      .delete(`/api/packs/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 204]).toContain(r.status);
  });
});

// ─── PROMO ──────────────────────────────────────────────────────────────────
describe.runIf(dbAvailable)('PROMO (admin CRUD)', () => {
  const futureDate = new Date(Date.now() + 86400000).toISOString();

  it('GET /api/promo as admin → 200', async () => {
    const { token } = await login(ADMIN);
    const r = await request(app).get('/api/promo').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('POST /api/promo as admin → 201', async () => {
    const { token } = await login(ADMIN);
    const r = await request(app)
      .post('/api/promo')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: `TESTPROMO${Date.now()}`,
        discountType: 'percent',
        discountValue: 10,
        maxUses: 100,
        expiresAt: futureDate,
      });
    expect(r.status).toBe(201);
    expect(r.body.id).toBeDefined();
  });

  it('POST /api/promo as customer → 403', async () => {
    const { token } = await login(CUSTOMER);
    const r = await request(app)
      .post('/api/promo')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'FAIL', discountValue: 10, expiresAt: futureDate });
    expect(r.status).toBe(403);
  });

  it('DELETE /api/promo/:id as admin → 200 or 204', async () => {
    const { token } = await login(ADMIN);
    const created = await request(app)
      .post('/api/promo')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: `DEL${Date.now()}`,
        discountType: 'fixed',
        discountValue: 5,
        maxUses: 1,
        expiresAt: futureDate,
      });
    expect(created.status).toBe(201);
    const r = await request(app)
      .delete(`/api/promo/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 204]).toContain(r.status);
  });
});

// ─── STORES ─────────────────────────────────────────────────────────────────
describe.runIf(dbAvailable)('STORES (admin CRUD)', () => {
  it('GET /api/stores → 200', async () => {
    const r = await request(app).get('/api/stores');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('POST /api/stores as admin → 201', async () => {
    const { token } = await login(ADMIN);
    const r = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Store Test ${Date.now()}` });
    expect(r.status).toBe(201);
    expect(r.body.id).toBeDefined();
  });

  it('POST /api/stores as customer → 403', async () => {
    const { token } = await login(CUSTOMER);
    const r = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Should Fail' });
    expect(r.status).toBe(403);
  });

  it('DELETE /api/stores/:id as admin → 200 or 204', async () => {
    const { token } = await login(ADMIN);
    const created = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Store DELETE ${Date.now()}` });
    expect(created.status).toBe(201);
    const r = await request(app)
      .delete(`/api/stores/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 204]).toContain(r.status);
  });
});

// ─── BRANDS ─────────────────────────────────────────────────────────────────
describe.runIf(dbAvailable)('BRANDS (admin CRUD)', () => {
  it('GET /api/brands → 200', async () => {
    const r = await request(app).get('/api/brands');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('POST /api/brands as admin → 201', async () => {
    const { token } = await login(ADMIN);
    const r = await request(app)
      .post('/api/brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Brand Test ${Date.now()}` });
    expect(r.status).toBe(201);
    expect(r.body.id).toBeDefined();
  });

  it('POST /api/brands as customer → 403', async () => {
    const { token } = await login(CUSTOMER);
    const r = await request(app)
      .post('/api/brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Should Fail' });
    expect(r.status).toBe(403);
  });

  it('DELETE /api/brands/:id as admin → 200 or 204', async () => {
    const { token } = await login(ADMIN);
    const created = await request(app)
      .post('/api/brands')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Brand DELETE ${Date.now()}` });
    expect(created.status).toBe(201);
    const r = await request(app)
      .delete(`/api/brands/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 204]).toContain(r.status);
  });
});

// ─── AUDIT ──────────────────────────────────────────────────────────────────
describe.runIf(dbAvailable)('AUDIT (admin only)', () => {
  it('GET /api/audit as admin → 200, array', async () => {
    const { token } = await login(ADMIN);
    const r = await request(app).get('/api/audit').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('GET /api/audit as customer → 403', async () => {
    const { token } = await login(CUSTOMER);
    const r = await request(app).get('/api/audit').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });
});

// ─── CONFIG ─────────────────────────────────────────────────────────────────
describe.runIf(dbAvailable)('CONFIG', () => {
  it('GET /api/config → 200', async () => {
    const r = await request(app).get('/api/config');
    expect(r.status).toBe(200);
    expect(r.body.tiers).toBeDefined();
  });

  it('PUT /api/config as admin → 200', async () => {
    const { token } = await login(ADMIN);
    // Read current config first to restore later
    const before = await request(app).get('/api/config');
    const r = await request(app)
      .put('/api/config')
      .set('Authorization', `Bearer ${token}`)
      .send({ activeMaintenance: true });
    expect(r.status).toBe(200);
    expect(r.body.activeMaintenance).toBe(true);
    // Restore
    await request(app)
      .put('/api/config')
      .set('Authorization', `Bearer ${token}`)
      .send({ activeMaintenance: before.body.activeMaintenance });
  });

  it('PUT /api/config as customer → 403', async () => {
    const { token } = await login(CUSTOMER);
    const r = await request(app)
      .put('/api/config')
      .set('Authorization', `Bearer ${token}`)
      .send({ activeMaintenance: true });
    expect(r.status).toBe(403);
  });
});
