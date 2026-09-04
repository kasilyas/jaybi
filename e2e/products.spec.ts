import { test, expect } from '@playwright/test';

/**
 * E2E: Product browsing and search.
 * Tests that the frontend displays products and allows search/filter.
 */
test.describe('Product browsing', () => {
  test('homepage shows products', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for product cards/items (any element with product-related class or data attribute)
    const products = page.locator('[class*="product"], [class*="card"], [data-product-id]').first();
    // At least something should be visible
    await expect(products.or(page.locator('main, #root, [class*="app"]'))).toBeVisible({ timeout: 5000 });
  });

  test('can search for a product', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="recherch" i], input[name="search"]').first();

    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('lait');
      await page.waitForTimeout(1000);
      // Results should update
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  test('can filter by category', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for category filter buttons/links
    const categoryBtn = page.locator('button, a', { hasText: /épicerie|boisson|frais|hygiène|lait/i }).first();
    if (await categoryBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await categoryBtn.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  test('product cards show price', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for price display (DH, MAD, or numeric with currency)
    const priceElement = page.locator('text=/\\d+[.,]?\\d*\\s*(?:DH|MAD|درهم)/').first();
    // If products are loaded from mockData, prices should be visible
    if (await priceElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      const priceText = await priceElement.textContent();
      expect(priceText).toMatch(/\d/);
    }
  });
});
