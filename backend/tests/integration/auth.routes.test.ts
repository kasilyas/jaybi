import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { signToken } from '../../src/lib/jwt.js';

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
  if (process.env.REQUIRE_QA_DB === 'true') throw new Error('Required QA database is unavailable');
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

  it('gère les adresses du titulaire et une seule adresse par défaut', async () => {
    const login = await request(app).post('/api/auth/dev-login').send({ email: 'user@qayess.ma' });
    const token = login.body.token;
    const marker = Date.now();
    const homeLabel = `Test domicile ${marker}`;
    const officeLabel = `Test bureau ${marker}`;
    const first = await request(app).post('/api/users/me/addresses').set('Authorization', `Bearer ${token}`)
      .send({ label: homeLabel, details: '1 rue de test', city: 'Rabat', isDefault: true });
    expect(first.status).toBe(201);
    const firstAddress = first.body.addresses.find((address: any) => address.label === homeLabel);
    expect(firstAddress.isDefault).toBe(true);

    const second = await request(app).post('/api/users/me/addresses').set('Authorization', `Bearer ${token}`)
      .send({ label: officeLabel, details: '2 avenue de test', city: 'Casablanca', isDefault: true });
    expect(second.status).toBe(201);
    expect(second.body.addresses.filter((address: any) => address.isDefault)).toHaveLength(1);

    const deleted = await request(app).delete(`/api/users/me/addresses/${second.body.addresses.find((address: any) => address.label === officeLabel).id}`).set('Authorization', `Bearer ${token}`);
    expect(deleted.status).toBe(200);
    expect(deleted.body.addresses.filter((address: any) => address.isDefault)).toHaveLength(1);
    await prisma.address.delete({ where: { id: firstAddress.id } });
  });

  it('refuse de supprimer l’adresse d’un autre compte', async () => {
    const ownerLogin = await request(app).post('/api/auth/dev-login').send({ email: 'user@qayess.ma' });
    const ownerToken = ownerLogin.body.token;
    const created = await request(app).post('/api/users/me/addresses').set('Authorization', `Bearer ${ownerToken}`)
      .send({ label: 'Adresse privée', details: '3 rue de test', city: 'Fès' });
    const otherLogin = await request(app).post('/api/auth/dev-login').send({ email: 'tech@qayess.ma' });
    const denied = await request(app).delete(`/api/users/me/addresses/${created.body.addresses.find((address: any) => address.label === 'Adresse privée').id}`).set('Authorization', `Bearer ${otherLogin.body.token}`);
    expect(denied.status).toBe(404);
    await prisma.address.deleteMany({ where: { userId: ownerLogin.body.user.id, label: 'Adresse privée' } });
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
    const login = await request(app)
      .post('/api/auth/dev-login')
      .send({ email: 'user@qayess.ma' });
    const r = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ name: 'X', category: 'C' });
    expect(r.status).toBe(403);
  });
});

describe.runIf(dbAvailable)('changement de mot de passe (intégration DB)', () => {
  const email = `pwd-change-${Date.now()}@test.com`;
  let userId = '';

  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => {});
  });

  it('POST /api/auth/password/request-code sans token => 401', async () => {
    const r = await request(app).post('/api/auth/password/request-code');
    expect(r.status).toBe(401);
  });

  it('flux complet : OTP -> hash persisté -> ancien token rejeté -> token frais valide', async () => {
    // Compte créé directement en base pour éviter la limite de 1 OTP / 60 s par email.
    const user = await prisma.user.create({
      data: { name: 'Pwd Test', email, role: 'customer', tier: 'free', isPremium: false, savingsScore: 0 },
    });
    userId = user.id;
    const oldToken = signToken({ sub: user.id, email, role: 'customer' });

    const requestCode = await request(app)
      .post('/api/auth/password/request-code')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(requestCode.status).toBe(200);
    expect(requestCode.body.devCode).toBe('123456');

    const wrongCode = await request(app)
      .post('/api/auth/password/confirm')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ code: '000000', newPassword: 'mot-de-passe-solide' });
    expect(wrongCode.status).toBe(400);
    expect(wrongCode.body.error).toBe('WRONG_CODE');

    const weak = await request(app)
      .post('/api/auth/password/confirm')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ code: '123456', newPassword: 'abc' });
    expect(weak.status).toBe(400);

    // Garantit que l'iat du token précède la seconde de passwordChangedAt.
    await new Promise(resolve => setTimeout(resolve, 1100));

    const confirmed = await request(app)
      .post('/api/auth/password/confirm')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ code: '123456', newPassword: 'mot-de-passe-solide' });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.token).toBeDefined();

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated!.passwordHash).toBeTruthy();
    expect(await bcrypt.compare('mot-de-passe-solide', updated!.passwordHash!)).toBe(true);
    expect(updated!.passwordChangedAt).toBeTruthy();

    const stale = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`);
    expect(stale.status).toBe(401);
    expect(stale.body.error).toBe('TOKEN_STALE');

    const fresh = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${confirmed.body.token}`);
    expect(fresh.status).toBe(200);
    expect(fresh.body.email).toBe(email);
  });

  it('le nouveau mot de passe est exigé à la prochaine demande OTP', async () => {
    const noPassword = await request(app).post('/api/auth/request-otp').send({ email });
    expect(noPassword.status).toBe(401);
    expect(noPassword.body.error).toBe('PASSWORD_REQUIRED');

    const wrongPassword = await request(app).post('/api/auth/request-otp').send({ email, password: 'faux' });
    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.error).toBe('INVALID_CREDENTIALS');
  });
});
