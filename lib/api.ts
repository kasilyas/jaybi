/**
 * Client API pour le backend Jaybi (Express/Prisma/PostgreSQL).
 *
 * Stratégie : si le backend est joignable, toutes les données proviennent de l'API.
 * Si le backend n'est pas joignable (ex: dev sans Docker), on retombe sur mockData.
 * Le JWT est stocké dans localStorage et envoyé en header Authorization.
 */
import { Product, Pack, User, Order, PromoCode, Store, Brand, PriceReport, AuditLog, PlatformConfig, CartItem, ProductSuggestion, SecurityAlert, ScrapingSyncRun, SyncConfig, ScrapingStatus, SyncChanges, MatchReview, Address } from '../types';

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
export async function updateMyProfile(name: string): Promise<User> {
  return apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify({ name }) });
}
export async function disableMyAccount(): Promise<void> {
  return apiFetch('/users/me', { method: 'DELETE' });
}
export async function createMyAddress(data: Omit<Address, 'id'>): Promise<User> {
  return apiFetch('/users/me/addresses', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateMyAddress(id: string, data: Omit<Address, 'id'>): Promise<User> {
  return apiFetch(`/users/me/addresses/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export async function deleteMyAddress(id: string): Promise<User> {
  return apiFetch(`/users/me/addresses/${id}`, { method: 'DELETE' });
}
export async function parseAiGroceryList(text: string): Promise<string[]> {
  const result = await apiFetch<{ items: string[] }>('/ai/parse-list', { method: 'POST', body: JSON.stringify({ text }) });
  return result.items;
}
export async function fetchAiSearchSuggestions(query: string): Promise<string[]> {
  const result = await apiFetch<{ items: string[] }>('/ai/search-suggestions', { method: 'POST', body: JSON.stringify({ query }) });
  return result.items;
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
    const code = typeof body.error === 'string' ? body.error : body.error?.code;
    throw Object.assign(new Error(code || `HTTP ${res.status}`), { status: res.status, body, code });
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

export async function requestOtp(email: string, password?: string): Promise<{ sent: boolean; devCode?: string; mailboxUrl?: string }> {
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

/** Demande un code OTP pour autoriser le changement de mot de passe. */
export async function requestPasswordChangeCode(): Promise<{ sent: boolean; devCode?: string; mailboxUrl?: string }> {
  return apiFetch('/auth/password/request-code', { method: 'POST' });
}

/** Confirme le changement de mot de passe. Remplace le token par celui renvoyé. */
export async function confirmPasswordChange(code: string, newPassword: string): Promise<void> {
  const result = await apiFetch<{ ok: boolean; token: string }>('/auth/password/confirm', {
    method: 'POST',
    body: JSON.stringify({ code, newPassword }),
  });
  if (result.token) setToken(result.token);
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

export async function fetchComparison(ids: string[]): Promise<Product[]> {
  if (ids.length < 2 || ids.length > 4 || new Set(ids).size !== ids.length || ids.some(id => !/^[A-Za-z0-9_-]{1,128}$/.test(id))) {
    throw new Error('INVALID_INPUT');
  }
  const query = new URLSearchParams({ ids: ids.join(',') });
  return apiFetch<Product[]>(`/products/comparison?${query}`, { cache: 'no-store' });
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

// --- PRODUCTS (admin) ---

/** Récupère TOUS les produits (admin uniquement), y compris supprimés/inactifs. */
export async function fetchAdminAllProducts(): Promise<Product[]> {
  return apiFetch<Product[]>('/products/admin/all');
}

/** Récupère uniquement les produits supprimés (soft-delete). */
export async function fetchDeletedProducts(): Promise<Product[]> {
  return apiFetch<Product[]>('/products/admin/deleted');
}

/** Restaure un produit supprimé (soft-delete). */
export async function restoreProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}/restore`, { method: 'POST' });
}

/** Active un produit (le rend visible côté client). */
export async function activateProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}/activate`, { method: 'PATCH' });
}

/** Désactive un produit (le masque côté client sans le supprimer). */
export async function deactivateProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}/deactivate`, { method: 'PATCH' });
}

// --- PACKS ---

export async function fetchPacks(): Promise<Pack[]> {
  return apiFetch<Pack[]>('/packs');
}

function packPayload(data: any) {
  return { ...data, price: null, originalPrice: null, discountPercent: null,
    productDiscounts: Object.fromEntries(data.productIds.map((id: string) => [id, data.productDiscounts?.[id] ?? data.discountPercent ?? 0])),
    theme: data.theme?.replaceAll('-', '_'), type: data.type?.replaceAll('-', '_'),
    startsAt: data.startsAt ? new Date(data.startsAt).toISOString() : null,
    expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null };
}

export async function createPack(data: any): Promise<Pack> {
  return apiFetch<Pack>('/packs', { method: 'POST', body: JSON.stringify(packPayload(data)) });
}

export async function updatePack(id: string, data: any): Promise<Pack> {
  return apiFetch<Pack>(`/packs/${id}`, { method: 'PUT', body: JSON.stringify(packPayload(data)) });
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

export async function createUser(data: Pick<User, 'name' | 'email' | 'role' | 'tier' | 'isPremium' | 'savingsScore'>): Promise<User> {
  return apiFetch<User>('/users', { method: 'POST', body: JSON.stringify(data) });
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

export async function createOrder(data: { items: CartItem[]; mode: 'delivery' | 'roadmap'; paymentMethod?: 'cod' | 'cmi'; promoCodeId?: string }, idempotencyKey?: string): Promise<Order> {
  return apiFetch<Order>('/orders', { method: 'POST', headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined, body: JSON.stringify(data) });
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
  const config = await apiFetch<PlatformConfig>('/config', { cache: 'no-store' });
  return { ...config, comparisonEnabled: config.comparisonEnabled === true };
}

export async function updateConfig(data: Partial<PlatformConfig>): Promise<PlatformConfig> {
  const config = await apiFetch<PlatformConfig>('/config', { method: 'PUT', body: JSON.stringify(data) });
  return { ...config, comparisonEnabled: config.comparisonEnabled === true };
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

// --- SECURITY ---

export async function fetchSecurityAlerts(): Promise<SecurityAlert[]> {
  return apiFetch<SecurityAlert[]>('/security/alerts');
}

export async function fetchUnresolvedAlertsCount(): Promise<number> {
  const r = await apiFetch<{ count: number }>('/security/alerts/unresolved');
  return r.count;
}

export async function resolveAlert(id: string): Promise<SecurityAlert> {
  return apiFetch<SecurityAlert>(`/security/alerts/${id}/resolve`, { method: 'PATCH' });
}

export async function fetchSuspendedUsers(): Promise<any[]> {
  return apiFetch<any[]>('/security/suspended');
}

export async function unsuspendUser(id: string): Promise<any> {
  return apiFetch<any>(`/security/users/${id}/unsuspend`, { method: 'POST' });
}

// --- SCRAPING / SYNC CENTER ---

/** Historique des syncs (SyncRun[]). */
export async function fetchSyncRuns(): Promise<ScrapingSyncRun[]> {
  return apiFetch<ScrapingSyncRun[]>('/scraping/runs');
}

/** Détail d'un run. */
export async function fetchSyncRun(id: string): Promise<ScrapingSyncRun> {
  return apiFetch<ScrapingSyncRun>(`/scraping/runs/${id}`);
}

/** Statut live par adaptateur. */
export async function fetchScrapingStatus(): Promise<ScrapingStatus[]> {
  return apiFetch<ScrapingStatus[]>('/scraping/status');
}

/** Toutes les configs d'adaptateurs. */
export async function fetchSyncConfigs(): Promise<SyncConfig[]> {
  return apiFetch<SyncConfig[]>('/scraping/config');
}

/** Modifie la config d'un adaptateur. */
export async function updateSyncConfig(adapter: string, data: Partial<SyncConfig>): Promise<SyncConfig> {
  return apiFetch<SyncConfig>(`/scraping/config/${adapter}`, { method: 'PUT', body: JSON.stringify(data) });
}

/** Dry-run : simulation d'import sans publier. Retourne aussi les revues de rapprochement à trancher. */
export async function scrapingDryRun(adapter: string, csv?: string, products?: any[]): Promise<{ runId: string; changes: SyncChanges; reviews: MatchReview[] }> {
  return apiFetch<{ runId: string; changes: SyncChanges; reviews: MatchReview[] }>('/scraping/dry-run', {
    method: 'POST',
    body: JSON.stringify({ adapter, csv, products }),
  });
}

/** Met une collecte d'adaptateur en file ; le worker prépare ensuite un aperçu à valider. */
export async function queueScrapingRun(adapter: string): Promise<{ run: ScrapingSyncRun }> {
  return apiFetch<{ run: ScrapingSyncRun }>('/scraping/run', {
    method: 'POST',
    body: JSON.stringify({ adapter }),
  });
}

/** Publie (approuve) un run dry-run. */
export async function approveSyncRun(runId: string): Promise<void> {
  return apiFetch<void>(`/scraping/${runId}/approve`, { method: 'POST' });
}

/** Rejette un run dry-run. */
export async function rejectSyncRun(runId: string): Promise<void> {
  return apiFetch<void>(`/scraping/${runId}/reject`, { method: 'POST' });
}

/** Import CSV direct (crée un run + changes). Retourne aussi les revues à trancher. */
export async function importCsv(adapter: string, csv: string): Promise<{ runId: string; changes: SyncChanges; reviews: MatchReview[] }> {
  return apiFetch<{ runId: string; changes: SyncChanges; reviews: MatchReview[] }>('/scraping/import', {
    method: 'POST',
    body: JSON.stringify({ adapter, csv }),
  });
}

/** File de revue des rapprochements d'un run. */
export async function fetchRunReviews(runId: string): Promise<MatchReview[]> {
  return apiFetch<MatchReview[]>(`/scraping/runs/${runId}/reviews`);
}

/** Décision humaine sur un rapprochement incertain. */
export async function resolveMatchReview(reviewId: string, decision: 'accept' | 'reject'): Promise<MatchReview> {
  return apiFetch<MatchReview>(`/scraping/reviews/${reviewId}`, { method: 'POST', body: JSON.stringify({ decision }) });
}

/** Décisions en masse sur les rapprochements d'un run. */
export async function resolveRunReviews(runId: string, resolutions: { reviewId: string; decision: 'accept' | 'reject' }[]): Promise<{ decided: number; skipped: number; pendingReviews: number }> {
  return apiFetch<{ decided: number; skipped: number; pendingReviews: number }>(`/scraping/runs/${runId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ resolutions }),
  });
}
