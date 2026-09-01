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

// Helper pour créer un produit temporaire via API
async function createTempProduct(adminToken: string, suffix = '') {
  const r = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Test Product ${Date.now()}${suffix}`,
      category: 'Test',
      unit: 'unit',
      prices: [],
    });
  return r.body;
}

describe.runIf(dbAvailable)('Product management (CRUD + soft delete + flash sale + activation)', () => {
  let adminToken: string;
  let customerToken: string;

  beforeAll(async () => {
    adminToken = await login('admin@qayess.io');
    customerToken = await login('user@qayess.ma');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // --- CRUD de base ---

  it('GET /api/products (public) exclut les supprimés et inactifs', async () => {
    const r = await request(app).get('/api/products');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    // Aucun produit supprimé ou inactif ne doit apparaître
    r.body.forEach((p: any) => {
      expect(p.isDeleted).toBe(false);
      expect(p.isActive).toBe(true);
    });
  });

  it('POST /api/products as admin crée un produit avec flash sale', async () => {
    const start = new Date(Date.now() - 60_000).toISOString();
    const end = new Date(Date.now() + 3600_000).toISOString();
    const r = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Flash Test Product',
        category: 'Promo',
        unit: 'kg',
        weight: 1,
        discountPercent: 10,
        flashSalePercent: 25,
        flashSaleStartsAt: start,
        flashSaleEndsAt: end,
        flashSaleLabel: 'Flash Weekend',
        prices: [],
      });
    expect(r.status).toBe(201);
    expect(r.body.discountPercent).toBe(10);
    expect(r.body.flashSalePercent).toBe(25);
    expect(r.body.flashSaleActive).toBe(true);
    expect(r.body.effectiveDiscountPercent).toBe(25); // flash prioritaire
    // Cleanup
    await request(app).delete(`/api/products/${r.body.id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  it('POST /api/products as customer => 403', async () => {
    const r = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'X', category: 'C' });
    expect(r.status).toBe(403);
  });

  it('PUT /api/products/:id met à jour la remise', async () => {
    const prod = await createTempProduct(adminToken);
    const r = await request(app)
      .put(`/api/products/${prod.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ discountPercent: 15 });
    expect(r.status).toBe(200);
    expect(r.body.discountPercent).toBe(15);
    await request(app).delete(`/api/products/${prod.id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  it('PUT /api/products/:id programme un flash sale futur', async () => {
    const prod = await createTempProduct(adminToken);
    const start = new Date(Date.now() + 86400_000).toISOString(); // dans 24h
    const end = new Date(Date.now() + 172800_000).toISOString();  // dans 48h
    const r = await request(app)
      .put(`/api/products/${prod.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ flashSalePercent: 30, flashSaleStartsAt: start, flashSaleEndsAt: end, flashSaleLabel: 'Black Friday' });
    expect(r.status).toBe(200);
    expect(r.body.flashSalePercent).toBe(30);
    expect(r.body.flashSaleActive).toBe(false); // pas encore actif
    expect(r.body.effectiveDiscountPercent).toBe(0); // pas de remise active
    await request(app).delete(`/api/products/${prod.id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  // --- Soft delete + restore ---

  it('DELETE /api/products/:id soft-delete (isDeleted=true, isActive=false)', async () => {
    const prod = await createTempProduct(adminToken);
    const r = await request(app)
      .delete(`/api/products/${prod.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(204);
    // Vérifie qu'il n'apparaît plus dans la liste publique
    const list = await request(app).get('/api/products');
    expect(list.body.find((p: any) => p.id === prod.id)).toBeUndefined();
    // Vérifie qu'il apparaît dans la liste admin des supprimés
    const deleted = await request(app)
      .get('/api/products/admin/deleted')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleted.body.find((p: any) => p.id === prod.id)).toBeDefined();
  });

  it('DELETE sur un produit déjà supprimé => 400 ALREADY_DELETED', async () => {
    const prod = await createTempProduct(adminToken);
    await request(app).delete(`/api/products/${prod.id}`).set('Authorization', `Bearer ${adminToken}`);
    const r = await request(app).delete(`/api/products/${prod.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('ALREADY_DELETED');
  });

  it('POST /api/products/:id/restore restaure un produit supprimé', async () => {
    const prod = await createTempProduct(adminToken);
    await request(app).delete(`/api/products/${prod.id}`).set('Authorization', `Bearer ${adminToken}`);
    const r = await request(app)
      .post(`/api/products/${prod.id}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(r.body.isDeleted).toBe(false);
    // Cleanup
    await request(app).delete(`/api/products/${prod.id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  it('POST /api/products/:id/restore sur un produit non supprimé => 400', async () => {
    const prod = await createTempProduct(adminToken);
    const r = await request(app)
      .post(`/api/products/${prod.id}/restore`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('NOT_DELETED');
    await request(app).delete(`/api/products/${prod.id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  // --- Activation / désactivation ---

  it('PATCH /api/products/:id/deactivate désactive sans supprimer', async () => {
    const prod = await createTempProduct(adminToken);
    const r = await request(app)
      .patch(`/api/products/${prod.id}/deactivate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(r.body.isActive).toBe(false);
    expect(r.body.isDeleted).toBe(false);
    // N'apparaît plus dans la liste publique
    const list = await request(app).get('/api/products');
    expect(list.body.find((p: any) => p.id === prod.id)).toBeUndefined();
    // Cleanup
    await request(app).delete(`/api/products/${prod.id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  it('PATCH /api/products/:id/activate réactive un produit', async () => {
    const prod = await createTempProduct(adminToken);
    await request(app).patch(`/api/products/${prod.id}/deactivate`).set('Authorization', `Bearer ${adminToken}`);
    const r = await request(app)
      .patch(`/api/products/${prod.id}/activate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(r.body.isActive).toBe(true);
    // Réapparaît dans la liste publique
    const list = await request(app).get('/api/products');
    expect(list.body.find((p: any) => p.id === prod.id)).toBeDefined();
    await request(app).delete(`/api/products/${prod.id}`).set('Authorization', `Bearer ${adminToken}`);
  });

  // --- Endpoints admin ---

  it('GET /api/products/admin/all liste tous les produits (admin)', async () => {
    const r = await request(app)
      .get('/api/products/admin/all')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    // Inclut des produits supprimés
    expect(r.body.some((p: any) => p.isDeleted === true)).toBe(true);
  });

  it('GET /api/products/admin/all as customer => 403', async () => {
    const r = await request(app)
      .get('/api/products/admin/all')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(r.status).toBe(403);
  });

  it('GET /api/products/admin/deleted liste uniquement les supprimés (admin)', async () => {
    const r = await request(app)
      .get('/api/products/admin/deleted')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    r.body.forEach((p: any) => expect(p.isDeleted).toBe(true));
  });

  it('GET /api/products/admin/deleted as customer => 403', async () => {
    const r = await request(app)
      .get('/api/products/admin/deleted')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(r.status).toBe(403);
  });

  // --- Validation ---

  it('POST /api/products avec discountPercent > 100 => 400', async () => {
    const r = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X', category: 'C', discountPercent: 150 });
    expect(r.status).toBe(400);
  });

  it('POST /api/products avec flashSalePercent négatif => 400', async () => {
    const r = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'X', category: 'C', flashSalePercent: -10 });
    expect(r.status).toBe(400);
  });

  // --- Pas de suppression physique ---

  it('Le soft-delete ne supprime pas physiquement le produit de la DB', async () => {
    const prod = await createTempProduct(adminToken);
    await request(app).delete(`/api/products/${prod.id}`).set('Authorization', `Bearer ${adminToken}`);
    // Le produit existe toujours en base
    const dbProd = await prisma.product.findUnique({ where: { id: prod.id } });
    expect(dbProd).not.toBeNull();
    expect(dbProd!.isDeleted).toBe(true);
  });
});
