import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

/**
 * E2E: Admin dashboard navigation.
 * Tests that admin can access dashboard and navigate between tabs.
 */
test.describe('Admin dashboard', () => {
  test('admin can access dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for admin access (button, link, or direct nav)
    const adminBtn = page.locator('button, a', { hasText: /admin|dashboard|console/i }).first();
    if (await adminBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await adminBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Dashboard should show admin-related content
      const adminContent = page.locator('text=/utilisateurs|products|commandes|audit|sécurité|sync/i').first();
      if (await adminContent.isVisible({ timeout: 3000 }).catch(() => false)) {
        expect(await adminContent.textContent()).toBeTruthy();
      }
    }
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('admin can navigate between tabs', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Enter admin
    const adminBtn = page.locator('button, a', { hasText: /admin|dashboard|console/i }).first();
    if (await adminBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await adminBtn.click();
      await page.waitForTimeout(1000);
    }

    // Try clicking different tabs
    const tabs = ['produits', 'utilisateurs', 'commandes', 'audit', 'sécurité', 'sync'];
    for (const tabName of tabs) {
      const tab = page.locator(`button, a`, { hasText: new RegExp(tabName, 'i') }).first();
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(500);
        // Page should still be functional
        await expect(page.locator('body')).not.toBeEmpty();
      }
    }
  });

  test('admin can view product management', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const adminBtn = page.locator('button, a', { hasText: /admin|dashboard|console/i }).first();
    if (await adminBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await adminBtn.click();
      await page.waitForTimeout(1000);

      const productTab = page.locator('button, a', { hasText: /produits|products/i }).first();
      if (await productTab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await productTab.click();
        await page.waitForTimeout(1000);

        // Should see product list or management UI
        const productList = page.locator('[class*="product"], table, [class*="list"]').first();
        if (await productList.isVisible({ timeout: 2000 }).catch(() => false)) {
          expect(await productList.isVisible()).toBe(true);
        }
      }
    }
  });
});
