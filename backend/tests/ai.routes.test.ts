import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/auth.js', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { sub: 'ai-test-user', email: 'ai@test.local', role: 'customer' };
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

const { aiRouter } = await import('../src/routes/ai.routes.js');
const { errorHandler } = await import('../src/middleware/errors.js');
const { env } = await import('../src/config/env.js');

const app = express();
app.use(express.json());
app.use('/api/ai', aiRouter);
app.use(errorHandler);

afterEach(() => {
  env.geminiApiKey = undefined;
  vi.unstubAllGlobals();
});

describe('AI proxy routes', () => {
  it('rejects invalid input before calling the provider', async () => {
    const response = await request(app).post('/api/ai/parse-list').send({ text: '' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_INPUT');
  });

  it('fails closed when the server key is absent', async () => {
    const response = await request(app).post('/api/ai/search-suggestions').send({ query: 'lait' });
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('AI_UNAVAILABLE');
  });

  it('returns a bounded, deduplicated provider response', async () => {
    env.geminiApiKey = 'server-only-test-key';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: '["Lait","Lait","Café"]' }] } }] }),
    }));
    const response = await request(app).post('/api/ai/search-suggestions').send({ query: 'boissons' });
    expect(response.status).toBe(200);
    expect(response.body.items).toEqual(['Lait', 'Café']);
    expect(String((fetch as any).mock.calls[0][0])).toContain('server-only-test-key');
  });
});
