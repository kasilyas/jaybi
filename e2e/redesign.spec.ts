import { test, expect, type Page } from '@playwright/test';

const products = Array.from({ length: 12 }, (_, i) => ({
  id: `qa-${i}`, name: `Produit QA ${String(i).padStart(2, '0')}`, brand: 'Marque QA',
  category: i % 2 ? 'Épicerie' : 'Frais', unit: 'unit', weight: 1, image: '', isActive: true, isDeleted: false,
  prices: [{ store: 'Marjane', city: 'Rabat', price: 10 + i, available: true, lastUpdated: '2026-09-14T08:00:00Z' }],
}));
const tier = { label: 'QA', price: 0, limit: 4, features: [] };

async function prepare(page: Page, options: { enabled?: boolean; admin?: boolean; saveFails?: boolean; configFails?: boolean; empty?: boolean } = {}) {
  let config = { comparisonEnabled: options.enabled === true, activeMaintenance: false, tiers: { free: tier, pack1: tier, pack2: tier, unlimited: tier } };
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  if (options.admin) await page.addInitScript(() => localStorage.setItem('jaybi_jwt', 'qa-admin'));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:4317') return route.continue();
    if (url.origin !== 'http://localhost:4000') return route.abort();
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/health') return json({ status: 'ok' });
    if (url.pathname === '/api/config') {
      if (options.configFails) return json({ error: 'UNAVAILABLE' }, 503);
      if (route.request().method() === 'PUT') {
        if (options.saveFails) return json({ error: 'UNAVAILABLE' }, 503);
        config = { ...config, ...route.request().postDataJSON() };
      }
      return json(config);
    }
    if (url.pathname === '/api/products') return json(options.empty ? [] : products);
    if (url.pathname === '/api/products/comparison') {
      if (!config.comparisonEnabled) return json({ error: 'FEATURE_DISABLED' }, 403);
      const ids = url.searchParams.get('ids')!.split(',');
      return json(products.filter(p => ids.includes(p.id)));
    }
    if (url.pathname === '/api/auth/me') return json({ id: 'qa-admin', email: 'qa-admin@example.test', name: 'Admin QA', role: 'admin', tier: 'free', addresses: [], savingsScore: 0 });
    if (url.pathname === '/api/scraping/status') return json({ adapters: [], configs: [], recentRuns: [] });
    return json([]);
  });
  return { errors, disable: () => { config.comparisonEnabled = false; } };
}

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Console Admin', exact: true }).click();
  await page.getByRole('button', { name: 'Configuration', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Activer la comparaison de produits' })).toBeVisible();
}

test('catalogue: pagination, search, empty result, details and cart', async ({ page }) => {
  const { errors } = await prepare(page);
  await page.goto('/');
  await expect(page.locator('.product-card')).toHaveCount(8);
  await expect(page.getByRole('button', { name: /comparer :/i })).toHaveCount(0);
  await page.getByRole('button', { name: 'Page suivante' }).click();
  await expect(page.locator('.product-card')).toHaveCount(4);
  await page.getByRole('searchbox').fill('Produit QA 00');
  await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Voir le produit : Produit QA 00' }).click();
  await expect(page.getByRole('heading', { name: 'Produit QA 00', level: 2, exact: true })).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: /ajouter.*Produit QA 00/i }).click();
  await expect(page.locator('.product-card')).toHaveCount(8);
  await expect(page.getByRole('button', { name: /panier \(1\)/i })).toBeVisible();
  await page.goto('/');
  await page.getByRole('searchbox').fill('aucun-resultat-qa');
  await expect(page.getByText('Aucun produit trouvé', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('comparison closes on remote disable and controls disappear', async ({ page }) => {
  const state = await prepare(page, { enabled: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Comparer : Produit QA 00', exact: true }).click();
  await expect(page.locator('.market-compare-button')).toBeDisabled();
  await page.getByRole('button', { name: 'Comparer : Produit QA 01', exact: true }).click();
  await page.locator('.market-compare-button').click();
  await expect(page.getByRole('heading', { name: 'Analyse Comparative Fine' })).toBeVisible();
  state.disable();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading', { name: 'Analyse Comparative Fine' })).toHaveCount(0);
  await expect(page.locator('.market-compare-button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Comparer :/ })).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test('admin enables comparison explicitly and reload reads saved API state', async ({ page }) => {
  const { errors } = await prepare(page, { admin: true });
  await page.goto('/');
  await openSettings(page);
  await page.getByRole('switch', { name: 'Activer la comparaison de produits' }).click();
  await expect(page.getByText('État enregistré : Désactivée')).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer la configuration' }).click();
  await expect(page.getByText('Configuration enregistrée.')).toBeVisible();
  await expect(page.getByText('État enregistré : Activée')).toBeVisible();
  await page.getByRole('button', { name: 'Fermer l’administration' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Comparer : Produit QA 00', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('admin save failure is visible and does not enable comparison', async ({ page }) => {
  const { errors } = await prepare(page, { admin: true, saveFails: true });
  await page.goto('/');
  await openSettings(page);
  await page.getByRole('switch', { name: 'Activer la comparaison de produits' }).click();
  await page.getByRole('button', { name: 'Enregistrer la configuration' }).click();
  await expect(page.getByRole('alert')).toContainText('Enregistrement impossible');
  await expect(page.getByText('Configuration enregistrée.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Fermer l’administration' }).click();
  await expect(page.getByRole('button', { name: /Comparer :/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('mobile RTL catalogue has no horizontal page overflow', async ({ page }, testInfo) => {
  const { errors } = await prepare(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.product-card')).toHaveCount(8);
  await page.screenshot({ path: testInfo.outputPath('mobile-fr.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Langue' }).selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('mobile-ar.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('configuration outage fails closed without hiding the catalogue', async ({ page }, testInfo) => {
  const { errors } = await prepare(page, { configFails: true });
  await page.goto('/');
  await expect(page.locator('.product-card')).toHaveCount(8);
  await expect(page.getByRole('button', { name: /Comparer :/ })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('an empty API catalogue is not replaced by demonstration products', async ({ page }) => {
  await prepare(page, { empty: true });
  await page.goto('/');
  await expect(page.locator('.product-card')).toHaveCount(0);
  await expect(page.getByText('Aucun produit trouvé', { exact: true })).toBeVisible();
});
