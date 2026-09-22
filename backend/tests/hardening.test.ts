import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { Router } from '../src/lib/router.js';
import { errorHandler } from '../src/middleware/errors.js';
import { validateJwtSecret } from '../src/config/security.js';
import { OtpChallenges } from '../src/lib/otpChallenges.js';
import { effectivePrice } from '../src/lib/pricing.js';

describe('hardening regressions', () => {
  it('forwards rejected promises and keeps HTTP server alive', async () => {
    const app = express(); const router = Router();
    router.get('/failure', async () => { throw Object.assign(new Error('private SQL detail'), { code: 'P2025' }); });
    router.get('/ok', async (_req, res) => { res.json({ ok: true }); });
    app.use(router); app.use(errorHandler);
    const result = await request(app).get('/failure');
    expect(result.status).toBe(404);
    expect(result.body.error.code).toBe('NOT_FOUND');
    expect(JSON.stringify(result.body)).not.toContain('private SQL');
    expect((await request(app).get('/ok')).status).toBe(200);
  });
  it.each(['', 'short', 'change-me-in-production-use-a-long-random-string', 'dev-secret-change-me'])('rejects unsafe deployment secret %s', secret => {
    expect(() => validateJwtSecret(secret, 'production')).toThrow();
  });
  it('accepts a strong provided secret', () => {
    expect(validateJwtSecret('1ba3dc4422f90a182d37b1d277776de125d44e3e953034390129', 'production')).toBeTruthy();
  });
  it('expires OTPs, consumes once and locks after failed attempts', () => {
    let now = 0; const challenges = new OtpChallenges(() => now);
    challenges.issue('a@example.test', '654321');
    expect(challenges.verify('a@example.test', '654321')).toBe('OK');
    expect(challenges.verify('a@example.test', '654321')).toBe('OTP_EXPIRED');
    challenges.issue('b@example.test', '654321');
    for (let i = 0; i < 4; i++) expect(challenges.verify('b@example.test', '111111')).toBe('WRONG_CODE');
    expect(challenges.verify('b@example.test', '111111')).toBe('OTP_LOCKED');
    expect(challenges.verify('b@example.test', '654321')).toBe('OTP_LOCKED');
    expect(() => challenges.issue('b@example.test', '222222')).toThrow('OTP_RATE_LIMITED');
    challenges.issue('c@example.test', '654321'); now += 600001;
    expect(challenges.verify('c@example.test', '654321')).toBe('OTP_EXPIRED');
  });
  it('does not invalidate a newer challenge when an earlier send fails', () => {
    let now = 0; const challenges = new OtpChallenges(() => now);
    const first = challenges.issue('a@example.test', '111111');
    now = 61000;
    challenges.issue('a@example.test', '222222');
    challenges.discard('a@example.test', first);
    expect(challenges.verify('a@example.test', '222222')).toBe('OK');
  });
  it('applies product discount and active flash priority in cents', () => {
    expect(effectivePrice(100, { discountPercent: 25 })).toBe(75);
    expect(effectivePrice(100, { discountPercent: 25, flashSalePercent: 40, flashSaleStartsAt: '2020-01-01', flashSaleEndsAt: '2099-01-01' }, 10)).toBe(60);
    expect(effectivePrice(100, { discountPercent: 25 }, 30)).toBe(70);
    expect(effectivePrice(100, { discountPercent: 25, flashSalePercent: 40, flashSaleStartsAt: '2020-01-01', flashSaleEndsAt: '2021-01-01' })).toBe(75);
  });
});
