/**
 * Client API pour le backend Jaybi (Express/Prisma/PostgreSQL).
 *
 * Stratégie : si le backend est joignable, toutes les données proviennent de l'API.
 * Si le backend n'est pas joignable (ex: dev sans Docker), on retombe sur mockData.
 * Le JWT est stocké dans localStorage et envoyé en header Authorization.
 */
import { Product, Pack, User, Order, PromoCode, Store, Brand, PriceReport, AuditLog, PlatformConfig, CartItem, ProductSuggestion } from '../types';

const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'jaybi_jwt';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status, body });
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

/** Ping rapide pour savoir si l'API est disponible. */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE.replace('/api', '')}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// --- AUTH ---

export async function requestOtp(email: string, password?: string): Promise<{ sent: boolean; devCode?: string }> {
  return apiFetch('/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function verifyOtp(email: string, code: string, name?: string): Promise<{ token: string; user: User }> {
  const result = await apiFetch<{ token: string; user: User }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, code, name }),
  });
  setToken(result.token);
  return result;
}

export async function devLogin(email: string): Promise<{ token: string; user: User }> {
  const result = await apiFetch<{ token: string; user: User }>('/auth/dev-login', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  setToken(result.token);
  return result;
}

export async function fetchTestAccounts(): Promise<{ email: string; role: string; name: string }[]> {
  const r = await apiFetch<{ accounts: { email: string; role: string; name: string }[] }>('/auth/test-accounts');
  return r.accounts;
}

export async function fetchMe(): Promise<User | null> {
  try {
    return await apiFetch<User>('/auth/me');
  } catch {
    return null;
  }
}

// --- PRODUCTS ---

export async function fetchProducts(): Promise<Product[]> {
  return apiFetch<Product[]>('/products');
}

export async function createProduct(data: Partial<Product> & { prices?: any[] }): Promise<Product> {
  return apiFetch<Product>('/products', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateProduct(id: string, data: Partial<Product> & { prices?: any[] }): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteProduct(id: string): Promise<void> {
  return apiFetch<void>(`/products/${id}`, { method: 'DELETE' });
}

// --- PACKS ---

export async function fetchPacks(): Promise<Pack[]> {
  return apiFetch<Pack[]>('/packs');
}

export async function createPack(data: any): Promise<Pack> {
  return apiFetch<Pack>('/packs', { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePack(id: string, data: any): Promise<Pack> {
  return apiFetch<Pack>(`/packs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deletePack(id: string): Promise<void> {
  return apiFetch<void>(`/packs/${id}`, { method: 'DELETE' });
}

// --- STORES ---

export async function fetchStores(): Promise<Store[]> {
  return apiFetch<Store[]>('/stores');
}

export async function createStore(data: Partial<Store>): Promise<Store> {
  return apiFetch<Store>('/stores', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateStore(id: string, data: Partial<Store>): Promise<Store> {
  return apiFetch<Store>(`/stores/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteStore(id: string): Promise<void> {
  return apiFetch<void>(`/stores/${id}`, { method: 'DELETE' });
}

// --- BRANDS ---

export async function fetchBrands(): Promise<Brand[]> {
  return apiFetch<Brand[]>('/brands');
}

export async function createBrand(data: Partial<Brand>): Promise<Brand> {
  return apiFetch<Brand>('/brands', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateBrand(id: string, data: Partial<Brand>): Promise<Brand> {
  return apiFetch<Brand>(`/brands/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteBrand(id: string): Promise<void> {
  return apiFetch<void>(`/brands/${id}`, { method: 'DELETE' });
}

// --- USERS (admin) ---

export async function fetchUsers(): Promise<User[]> {
  return apiFetch<User[]>('/users');
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  return apiFetch<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteUser(id: string): Promise<void> {
  return apiFetch<void>(`/users/${id}`, { method: 'DELETE' });
}

// --- ORDERS ---

export async function fetchMyOrders(): Promise<Order[]> {
  return apiFetch<Order[]>('/orders/me');
}

export async function fetchAllOrders(): Promise<Order[]> {
  return apiFetch<Order[]>('/orders');
}

export async function createOrder(data: { items: CartItem[]; mode: 'delivery' | 'roadmap'; paymentMethod?: 'cod' | 'cmi'; promoCodeId?: string }): Promise<Order> {
  return apiFetch<Order>('/orders', { method: 'POST', body: JSON.stringify(data) });
}

// --- PROMO ---

export async function fetchPromoCodes(): Promise<PromoCode[]> {
  return apiFetch<PromoCode[]>('/promo');
}

export async function createPromoCode(data: any): Promise<PromoCode> {
  return apiFetch<PromoCode>('/promo', { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePromoCode(id: string, data: any): Promise<PromoCode> {
  return apiFetch<PromoCode>(`/promo/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deletePromoCode(id: string): Promise<void> {
  return apiFetch<void>(`/promo/${id}`, { method: 'DELETE' });
}

// --- REPORTS ---

export async function fetchReports(): Promise<PriceReport[]> {
  return apiFetch<PriceReport[]>('/reports');
}

export async function createReport(data: { productId: string; storeName: string; city: string; reportedPrice: number; comment?: string }): Promise<PriceReport> {
  return apiFetch<PriceReport>('/reports', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateReportStatus(id: string, status: 'pending' | 'verified' | 'rejected'): Promise<PriceReport> {
  return apiFetch<PriceReport>(`/reports/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

// --- AUDIT ---

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  return apiFetch<AuditLog[]>('/audit');
}

// --- CONFIG ---

export async function fetchConfig(): Promise<PlatformConfig> {
  return apiFetch<PlatformConfig>('/config');
}

export async function updateConfig(data: Partial<PlatformConfig>): Promise<PlatformConfig> {
  return apiFetch<PlatformConfig>('/config', { method: 'PUT', body: JSON.stringify(data) });
}

// --- SUGGESTIONS (contributor) ---

export async function fetchSuggestions(): Promise<ProductSuggestion[]> {
  return apiFetch<ProductSuggestion[]>('/suggestions');
}

export async function createSuggestion(data: { productId?: string | null; suggestedData: Record<string, any>; comment?: string }): Promise<ProductSuggestion> {
  return apiFetch<ProductSuggestion>('/suggestions', { method: 'POST', body: JSON.stringify(data) });
}

export async function reviewSuggestion(id: string, status: 'verified' | 'rejected'): Promise<ProductSuggestion> {
  return apiFetch<ProductSuggestion>(`/suggestions/${id}/review`, { method: 'PATCH', body: JSON.stringify({ status }) });
}
