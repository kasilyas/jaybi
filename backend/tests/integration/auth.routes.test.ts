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

describe.runIf(dbAvailable)('auth routes (intégration DB)', () => {
  it('GET /health renvoie ok', async () => {
    const r = await request(app).get('/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
  });

  it('GET /api/auth/test-accounts renvoie les comptes de test (dev)', async () => {
    const r = await request(app).get('/api/auth/test-accounts');
    expect(r.status).toBe(200);
    expect(r.body.accounts).toBeDefined();
    expect(r.body.accounts.length).toBeGreaterThan(0);
  });

  it('POST /api/auth/request-otp renvoie devCode en mode dev', async () => {
    const r = await request(app).post('/api/auth/request-otp').send({ email: 'admin@qayess.io' });
    expect(r.status).toBe(200);
    expect(r.body.devCode).toBe('123456');
  });

  it('POST /api/auth/verify-otp connecte un compte seedé (admin)', async () => {
    await request(app).post('/api/auth/request-otp').send({ email: 'admin@qayess.io' });
    const r = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'admin@qayess.io', code: '123456' });
    expect(r.status).toBe(200);
    expect(r.body.token).toBeDefined();
    expect(r.body.user.role).toBe('admin');
  });

  it('POST /api/auth/verify-otp crée un compte customer pour un nouvel email (anti-escalade)', async () => {
    const email = `newuser-${Date.now()}@test.com`;
    await request(app).post('/api/auth/request-otp').send({ email });
    const r = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email, code: '123456' });
    expect(r.status).toBe(200);
    expect(r.body.user.role).toBe('customer');
    expect(r.body.user.tier).toBe('free');
  });

  it('GET /api/auth/me avec token renvoie le profil', async () => {
    await request(app).post('/api/auth/request-otp').send({ email: 'user@qayess.ma' });
    const login = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'user@qayess.ma', code: '123456' });
    const token = login.body.token;
    const r = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(r.body.email).toBe('user@qayess.ma');
  });

  it('GET /api/products renvoie la liste (lecture publique)', async () => {
    const r = await request(app).get('/api/products');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('POST /api/products sans token => 401', async () => {
    const r = await request(app).post('/api/products').send({ name: 'X', category: 'C' });
    expect(r.status).toBe(401);
  });

  it('POST /api/products avec token customer => 403 (anti-escalade)', async () => {
    await request(app).post('/api/auth/request-otp').send({ email: 'user@qayess.ma' });
    const login = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'user@qayess.ma', code: '123456' });
    const r = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ name: 'X', category: 'C' });
    expect(r.status).toBe(403);
  });
});
