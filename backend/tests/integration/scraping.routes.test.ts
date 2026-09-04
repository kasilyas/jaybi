import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

const dbAvailable = await prisma.$connect().then(() => prisma.$queryRaw`SELECT 1`.then(() => true)).catch(() => false);
await prisma.$disconnect();

const app = createApp();

async function login(email: string) {
  await request(app).post('/api/auth/request-otp').send({ email });
  const r = await request(app).post('/api/auth/verify-otp').send({ email, code: '123456' });
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
    // Nettoyage des sync runs de test
    await prisma.syncRun.deleteMany({ where: { triggeredBy: 'admin@qayess.io' } }).catch(() => null);
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
});
