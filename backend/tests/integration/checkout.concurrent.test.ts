import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';

const app = createApp();
const createdPromoIds: string[] = [];

afterAll(async () => {
  await prisma.order.deleteMany({ where: { promoCodeId: { in: createdPromoIds } } });
  await prisma.promoCode.deleteMany({ where: { id: { in: createdPromoIds } } });
  await prisma.$disconnect();
});

async function customerToken() {
  const response = await request(app).post('/api/auth/dev-login').send({ email: 'user@qayess.ma' });
  expect(response.status).toBe(200);
  return response.body.token as string;
}

async function orderFixture() {
  const product = await prisma.product.findFirstOrThrow({
    where: { isActive: true, isDeleted: false, prices: { some: { available: true } } },
    include: { prices: { where: { available: true }, take: 1 } },
  });
  const price = product.prices[0];
  return { mode: 'roadmap', paymentMethod: 'cod', items: [{ productId: product.id, storeId: price.storeId, city: price.city, quantity: 1 }] };
}

describe('checkout concurrency on PostgreSQL', () => {
  it('never consumes a one-use promo more than once under concurrent requests', async () => {
    const token = await customerToken();
    const promo = await prisma.promoCode.create({ data: {
      code: `RACE-${Date.now()}`, discountType: 'percent', discountValue: 10,
      maxUses: 1, currentUses: 0, expiresAt: new Date(Date.now() + 60_000),
    } });
    createdPromoIds.push(promo.id);
    const body = { ...(await orderFixture()), promoCodeId: promo.id };
    const responses = await Promise.all(Array.from({ length: 4 }, (_, index) => request(app)
      .post('/api/orders').set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `promo-race-${Date.now()}-${index}`).send(body)));
    expect(responses.filter(r => r.status === 201)).toHaveLength(1);
    expect(responses.every(r => [201, 409].includes(r.status))).toBe(true);
    expect((await prisma.promoCode.findUniqueOrThrow({ where: { id: promo.id } })).currentUses).toBe(1);
  });

  it('replays the same idempotent request and rejects a changed payload', async () => {
    const token = await customerToken();
    const body = await orderFixture();
    const key = `idempotency-${Date.now()}`;
    const first = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key).send(body);
    const replay = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key).send(body);
    const conflict = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key)
      .send({ ...body, mode: 'delivery' });
    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(replay.body.id).toBe(first.body.id);
    expect(conflict.status).toBe(409);
  });
});
