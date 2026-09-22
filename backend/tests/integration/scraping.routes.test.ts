import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

const dbAvailable = await prisma.$connect().then(() => prisma.$queryRaw`SELECT 1`.then(() => true)).catch(() => false);
await prisma.$disconnect();

const app = createApp();

async function login(email: string) {
  const r = await request(app).post('/api/auth/dev-login').send({ email });
  expect(r.status).toBe(200);
  return r.body.token as string;
}

const SAMPLE_CSV = `name,brand,category,unit,weight,ean,price,originalPrice,promotionLabel,available,city,storeName
Lait Centrale 1L,Centrale,Lait,L,1,,7.5,8.5,Promo -10%,true,Casablanca,Marjane
Huile Lesieur 2L,Lesieur,Huile,L,2,,45,,,true,Rabat,Carrefour`;

describe.runIf(dbAvailable)('Scraping routes — intégration (dry-run, approve, reject, import, config)', () => {
  let adminToken: string;
  let customerToken: string;

  beforeAll(async () => {
    adminToken = await login('admin@qayess.io');
    const custEmail = `scraping-cust-${Date.now()}@test.com`;
    await request(app).post('/api/auth/request-otp').send({ email: custEmail });
    const cLogin = await request(app).post('/api/auth/verify-otp').send({ email: custEmail, code: '123456' });
    customerToken = cLogin.body.token;
  });

  afterAll(async () => {
    // Nettoyage des sync runs de test (les match_reviews suivent en cascade)
    await prisma.syncRun.deleteMany({ where: { triggeredBy: 'admin@qayess.io' } }).catch(() => null);
    // Nettoyage des produits/marques de test de la revue
    await prisma.priceEntry.deleteMany({ where: { product: { name: { contains: 'Testrevue' } } } }).catch(() => null);
    await prisma.product.deleteMany({ where: { name: { contains: 'Testrevue' } } }).catch(() => null);
    await prisma.brand.deleteMany({ where: { name: 'Testrevue' } }).catch(() => null);
    await prisma.$disconnect();
  });

  // --- Permissions ---

  it('GET /api/scraping/runs as customer → 403', async () => {
    const r = await request(app).get('/api/scraping/runs').set('Authorization', `Bearer ${customerToken}`);
    expect(r.status).toBe(403);
  });

  it('GET /api/scraping/runs as admin → 200', async () => {
    const r = await request(app).get('/api/scraping/runs').set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('GET /api/scraping/status as admin → 200', async () => {
    const r = await request(app).get('/api/scraping/status').set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('GET /api/scraping/config as admin → 200', async () => {
    const r = await request(app).get('/api/scraping/config').set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  // --- Dry-run ---

  it('POST /api/scraping/dry-run avec CSV → 200 + changes', async () => {
    const r = await request(app)
      .post('/api/scraping/dry-run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adapter: 'csv_import', csv: SAMPLE_CSV });
    expect(r.status).toBe(200);
    expect(r.body.runId).toBeDefined();
    expect(r.body.changes).toBeDefined();
    // Les produits peuvent être nouveaux OU déjà existants (matched)
    const total = r.body.changes.newProducts.length + r.body.changes.matchedCount;
    expect(total).toBeGreaterThan(0);
  });

  it('POST /api/scraping/dry-run sans adapter → 400', async () => {
    const r = await request(app)
      .post('/api/scraping/dry-run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ csv: SAMPLE_CSV });
    expect(r.status).toBe(400);
  });

  it('POST /api/scraping/dry-run sans csv ni products → 400', async () => {
    const r = await request(app)
      .post('/api/scraping/dry-run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adapter: 'csv_import' });
    expect(r.status).toBe(400);
  });

  it('POST /api/scraping/run refuse un adaptateur inconnu', async () => {
    const r = await request(app)
      .post('/api/scraping/run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adapter: 'unknown_source' });
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('INVALID_ADAPTER');
  });

  // --- Import CSV ---

  it('POST /api/scraping/import avec CSV → 200 + runId', async () => {
    const r = await request(app)
      .post('/api/scraping/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adapter: 'csv_import', csv: SAMPLE_CSV });
    expect(r.status).toBe(200);
    expect(r.body.runId).toBeDefined();
    expect(r.body.changes).toBeDefined();
  });

  it('POST /api/scraping/import sans csv → 400', async () => {
    const r = await request(app)
      .post('/api/scraping/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adapter: 'csv_import' });
    expect(r.status).toBe(400);
  });

  it('POST /api/scraping/import avec CSV vide → 400', async () => {
    const r = await request(app)
      .post('/api/scraping/import')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adapter: 'csv_import', csv: 'name,price\n,0' });
    expect(r.status).toBe(400);
  });

  // --- Approve / Reject ---

  it('POST /api/scraping/:runId/approve sur dry-run → 200 + publish', async () => {
    // Crée un dry-run d'abord
    const dry = await request(app)
      .post('/api/scraping/dry-run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adapter: 'csv_import', csv: SAMPLE_CSV });
    const runId = dry.body.runId;

    const r = await request(app)
      .post(`/api/scraping/${runId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.productsNew).toBeGreaterThanOrEqual(0);
  });

  it('POST /api/scraping/:runId/approve sur run non dry_run → 400', async () => {
    // Le run qu'on vient d'approuver est maintenant 'completed'
    const dry = await request(app)
      .post('/api/scraping/dry-run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adapter: 'csv_import', csv: SAMPLE_CSV });
    const runId = dry.body.runId;

    // Approuve une première fois
    await request(app).post(`/api/scraping/${runId}/approve`).set('Authorization', `Bearer ${adminToken}`);

    // Tente d'approuver à nouveau
    const r = await request(app)
      .post(`/api/scraping/${runId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('NOT_DRY_RUN');
  });

  it('POST /api/scraping/:runId/reject sur dry-run → 200', async () => {
    const dry = await request(app)
      .post('/api/scraping/dry-run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adapter: 'csv_import', csv: SAMPLE_CSV });
    const runId = dry.body.runId;

    const r = await request(app)
      .post(`/api/scraping/${runId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });

  it('POST /api/scraping/:runId/reject sur run déjà rejeté → 400', async () => {
    // Utilise le run rejeté précédent — on doit en créer un nouveau
    const dry = await request(app)
      .post('/api/scraping/dry-run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adapter: 'csv_import', csv: SAMPLE_CSV });
    const runId = dry.body.runId;

    await request(app).post(`/api/scraping/${runId}/reject`).set('Authorization', `Bearer ${adminToken}`);

    const r = await request(app)
      .post(`/api/scraping/${runId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(400);
  });

  // --- Config ---

  it('PUT /api/scraping/config/:adapter → 200', async () => {
    const r = await request(app)
      .put('/api/scraping/config/marjane')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: false, notes: 'Désactivé temporairement' });
    expect(r.status).toBe(200);
    expect(r.body.enabled).toBe(false);
    expect(r.body.notes).toBe('Désactivé temporairement');
  });

  it('PUT /api/scraping/config/:adapter réactive → 200', async () => {
    const r = await request(app)
      .put('/api/scraping/config/marjane')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: true });
    expect(r.status).toBe(200);
    expect(r.body.enabled).toBe(true);
  });

  it('POST /api/scraping/run met une collecte Marjane en file sans l’exécuter en HTTP', async () => {
    const r = await request(app)
      .post('/api/scraping/run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adapter: 'marjane' });
    expect(r.status).toBe(202);
    expect(r.body.run.status).toBe('pending');
    expect(r.body.run.mode).toBe('full_scrape');
  });

  it('refuse une URL de source non autorisée ou non HTTPS', async () => {
    const insecure = await request(app)
      .put('/api/scraping/config/marjane')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceUrl: 'http://api.apify.com/v2/datasets/example/items' });
    expect(insecure.status).toBe(400);

    const untrusted = await request(app)
      .put('/api/scraping/config/marjane')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sourceUrl: 'https://example.test/products' });
    expect(untrusted.status).toBe(400);
    expect(untrusted.body.error).toBe('SOURCE_NOT_ALLOWED');
  });

  // --- Run detail ---

  it('GET /api/scraping/runs/:id → 200', async () => {
    const runs = await request(app).get('/api/scraping/runs').set('Authorization', `Bearer ${adminToken}`);
    if (runs.body.length > 0) {
      const r = await request(app)
        .get(`/api/scraping/runs/${runs.body[0].id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(r.status).toBe(200);
      expect(r.body.id).toBe(runs.body[0].id);
    }
  });

  it('GET /api/scraping/runs/:id inexistant → 404', async () => {
    const r = await request(app)
      .get('/api/scraping/runs/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(404);
  });

  // --- Revue persistée des rapprochements ---

  const REVIEW_CSV = `name,brand,category,unit,weight,ean,price,originalPrice,promotionLabel,available,city,storeName
Thon Testrevue 800 g,Testrevue,Conserve,g,800,,12.9,,,true,Casablanca,Marjane`;

  const seedReviewTarget = async () => {
    const brand = await prisma.brand.upsert({ where: { name: 'Testrevue' }, update: {}, create: { name: 'Testrevue' } });
    await prisma.store.upsert({ where: { name: 'Marjane' }, update: {}, create: { name: 'Marjane' } });
    return prisma.product.create({
      data: { name: 'Thon Testrevue 800g', brandId: brand.id, category: 'Conserve', unit: 'g', weight: 800, isActive: true },
    });
  };

  it('un rapprochement incertain bloque l’approbation, puis accepté publie le prix sur le produit existant', async () => {
    const target = await seedReviewTarget();
    const before = await prisma.product.count({ where: { name: { contains: 'Testrevue' } } });

    const dry = await request(app)
      .post('/api/scraping/dry-run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adapter: 'csv_import', csv: REVIEW_CSV });
    expect(dry.status).toBe(200);
    expect(dry.body.changes.reviewRequired?.length).toBe(1);
    expect(dry.body.reviews).toHaveLength(1);
    expect(dry.body.reviews[0].status).toBe('pending');
    const runId = dry.body.runId;
    const reviewId = dry.body.reviews[0].id;

    // Bloqué tant que la revue est pending
    const blocked = await request(app).post(`/api/scraping/${runId}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error).toBe('MATCH_REVIEW_REQUIRED');
    expect(blocked.body.pendingReviews).toBe(1);

    // La file de revue est lisible
    const list = await request(app).get(`/api/scraping/runs/${runId}/reviews`).set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body[0].candidateId).toBe(target.id);

    // Décision : même produit
    const decide = await request(app).post(`/api/scraping/reviews/${reviewId}`).set('Authorization', `Bearer ${adminToken}`).send({ decision: 'accept' });
    expect(decide.status).toBe(200);
    expect(decide.body.status).toBe('accepted');
    expect(decide.body.reviewedBy).toBe('admin@qayess.io');

    // Double décision refusée
    const again = await request(app).post(`/api/scraping/reviews/${reviewId}`).set('Authorization', `Bearer ${adminToken}`).send({ decision: 'reject' });
    expect(again.status).toBe(409);

    // Approbation : le prix est appliqué au produit existant, aucun doublon créé
    const approve = await request(app).post(`/api/scraping/${runId}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(approve.status).toBe(200);
    expect(approve.body.pricesUpdated).toBe(1);

    const store = await prisma.store.findFirst({ where: { name: 'Marjane' } });
    const entry = await prisma.priceEntry.findFirst({ where: { productId: target.id, storeId: store!.id, city: 'Casablanca' } });
    expect(entry?.price).toBe(12.9);
    expect(await prisma.product.count({ where: { name: { contains: 'Testrevue' } } })).toBe(before);
  });

  it('un rapprochement rejeté publie un nouveau produit distinct', async () => {
    await seedReviewTarget();
    const before = await prisma.product.count({ where: { name: { contains: 'Testrevue' } } });

    const dry = await request(app)
      .post('/api/scraping/dry-run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adapter: 'csv_import', csv: REVIEW_CSV });
    expect(dry.body.reviews).toHaveLength(1);
    const runId = dry.body.runId;

    const decide = await request(app)
      .post(`/api/scraping/reviews/${dry.body.reviews[0].id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'reject' });
    expect(decide.status).toBe(200);
    expect(decide.body.status).toBe('rejected');

    const approve = await request(app).post(`/api/scraping/${runId}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(approve.status).toBe(200);
    expect(approve.body.productsNew).toBe(1);
    // Un produit supplémentaire existe désormais sous le nom normalisé du CSV
    expect(await prisma.product.count({ where: { name: { contains: 'Testrevue' } } })).toBe(before + 1);
  });

  it('la revue en masse tranche tous les candidats d’un run', async () => {
    const brand = await prisma.brand.findFirst({ where: { name: 'Testrevue' } });
    await prisma.product.create({ data: { name: 'Fromage Testrevue 200g', brandId: brand!.id, category: 'Frais', unit: 'g', weight: 200, isActive: true } });
    await prisma.product.create({ data: { name: 'Beurre Testrevue 250g', brandId: brand!.id, category: 'Frais', unit: 'g', weight: 250, isActive: true } });

    const csv = `name,brand,category,unit,weight,ean,price,originalPrice,promotionLabel,available,city,storeName
Fromage Testrevue 200 g,Testrevue,Frais,g,200,,24.5,,,true,Casablanca,Marjane
Beurre Testrevue 250 g,Testrevue,Frais,g,250,,31,,,true,Casablanca,Marjane`;

    const dry = await request(app)
      .post('/api/scraping/dry-run')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adapter: 'csv_import', csv });
    expect(dry.body.reviews).toHaveLength(2);
    const runId = dry.body.runId;

    const bulk = await request(app)
      .post(`/api/scraping/runs/${runId}/reviews`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ resolutions: dry.body.reviews.map((r: any) => ({ reviewId: r.id, decision: 'accept' })) });
    expect(bulk.status).toBe(200);
    expect(bulk.body).toMatchObject({ decided: 2, pendingReviews: 0 });

    const approve = await request(app).post(`/api/scraping/${runId}/approve`).set('Authorization', `Bearer ${adminToken}`);
    expect(approve.status).toBe(200);
    expect(approve.body.pricesUpdated).toBe(2);
  });

  it('les décisions de revue exigent un rôle admin', async () => {
    const r = await request(app)
      .post('/api/scraping/reviews/whatever')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ decision: 'accept' });
    expect(r.status).toBe(403);
  });
});
