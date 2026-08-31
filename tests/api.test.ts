import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock fetch globalement
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock import.meta.env
vi.stubEnv('VITE_API_URL', 'http://localhost:4000/api');

// Import après les mocks
const api = await import('../lib/api');

describe('API client — token management', () => {
  beforeEach(() => {
    localStorageMock.clear();
    fetchMock.mockClear();
  });

  it('getToken retourne null si pas de token', () => {
    expect(api.getToken()).toBeNull();
  });

  it('setToken / getToken / clearToken', () => {
    api.setToken('my-jwt-token');
    expect(api.getToken()).toBe('my-jwt-token');
    api.clearToken();
    expect(api.getToken()).toBeNull();
  });
});

describe('API client — fetch wrapper', () => {
  beforeEach(() => {
    localStorageMock.clear();
    fetchMock.mockClear();
  });

  it('fetchProducts appelle GET /products avec headers corrects', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [{ id: '1', name: 'Test' }],
    });
    const products = await api.fetchProducts();
    expect(products).toEqual([{ id: '1', name: 'Test' }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/products',
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) })
    );
  });

  it('envoie le token JWT dans Authorization header', async () => {
    api.setToken('jwt-123');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [],
    });
    await api.fetchPacks();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/packs',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer jwt-123' }),
      })
    );
    api.clearToken();
  });

  it('lance une erreur sur réponse non-ok', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'NOT_FOUND' }),
    });
    await expect(api.fetchProducts()).rejects.toThrow();
  });

  it('createOrder envoie POST /orders avec le body correct', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: 'ORD-1', status: 'pending' }),
    });
    const order = await api.createOrder({
      items: [{ productId: 'p1', quantity: 2, store: 'Marjane' } as any],
      mode: 'delivery',
      paymentMethod: 'cod',
    });
    expect(order.id).toBe('ORD-1');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/orders');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body).mode).toBe('delivery');
  });

  it('verifyOtp stocke le token dans localStorage', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: 'jwt-from-verify', user: { id: 'u1', email: 'test@test.com' } }),
    });
    const result = await api.verifyOtp('test@test.com', '123456');
    expect(result.token).toBe('jwt-from-verify');
    expect(api.getToken()).toBe('jwt-from-verify');
    api.clearToken();
  });

  it('checkApiHealth retourne false si fetch échoue', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    const healthy = await api.checkApiHealth();
    expect(healthy).toBe(false);
  });

  it('checkApiHealth retourne true si health répond ok', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    const healthy = await api.checkApiHealth();
    expect(healthy).toBe(true);
  });

  it('fetchMe retourne null sur erreur', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'UNAUTHORIZED' }),
    });
    const me = await api.fetchMe();
    expect(me).toBeNull();
  });
});

describe('API client — DELETE endpoints', () => {
  beforeEach(() => {
    localStorageMock.clear();
    fetchMock.mockClear();
  });

  it('deleteProduct envoie DELETE', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204, json: async () => undefined });
    await api.deleteProduct('p1');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/products/p1');
    expect(opts.method).toBe('DELETE');
  });
});
