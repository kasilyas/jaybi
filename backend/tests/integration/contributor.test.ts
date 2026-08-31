import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

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
  return r.body.token as string;
}

describe.runIf(dbAvailable)('contributor role (intégration DB)', () => {
  it('un contributor peut créer une suggestion de produit', async () => {
    const token = await login('tech@qayess.ma'); // contributor
    const r = await request(app)
      .post('/api/suggestions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        productId: null,
        suggestedData: { name: 'Nouveau Produit Test', category: 'Epicerie', unit: 'kg', weight: 1 },
        comment: 'Suggestion de test',
      });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('pending');
    expect(r.body.userEmail).toBe('tech@qayess.ma');
  });

  it('un contributor voit uniquement ses propres suggestions', async () => {
    const token = await login('tech@qayess.ma');
    const r = await request(app).get('/api/suggestions').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    r.body.forEach((s: any) => expect(s.userEmail).toBe('tech@qayess.ma'));
  });

  it('un customer ne peut pas lister les suggestions (403)', async () => {
    const token = await login('user@qayess.ma'); // customer
    const r = await request(app).get('/api/suggestions').set('Authorization', `Bearer ${token}`);
    expect(r.status).toBe(403);
  });

  it('un admin peut valider une suggestion (verified)', async () => {
    // Crée une suggestion en tant que contributor
    const contributorToken = await login('tech@qayess.ma');
    const created = await request(app)
      .post('/api/suggestions')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({
        productId: null,
        suggestedData: { name: `Produit Validé ${Date.now()}`, category: 'Epicerie', unit: 'unit', weight: 0 },
      });
    expect(created.status).toBe(201);

    // Valide en tant qu'admin
    const adminToken = await login('admin@qayess.io');
    const r = await request(app)
      .patch(`/api/suggestions/${created.body.id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'verified' });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('verified');
    expect(r.body.reviewedBy).toBe('admin@qayess.io');
  });

  it('un contributor ne peut pas valider une suggestion (403)', async () => {
    const contributorToken = await login('tech@qayess.ma');
    const created = await request(app)
      .post('/api/suggestions')
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({ productId: null, suggestedData: { name: 'Test Rejet', category: 'C' } });

    const r = await request(app)
      .patch(`/api/suggestions/${created.body.id}/review`)
      .set('Authorization', `Bearer ${contributorToken}`)
      .send({ status: 'verified' });
    expect(r.status).toBe(403);
  });

  it('un contributor peut signaler un prix (PriceReport)', async () => {
    const token = await login('tech@qayess.ma');
    const products = await request(app).get('/api/products');
    const productId = products.body[0].id;
    const r = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId, storeName: 'Marjane', city: 'Casablanca', reportedPrice: 99.9 });
    expect(r.status).toBe(201);
    expect(r.body.userEmail).toBe('tech@qayess.ma');
  });
});
