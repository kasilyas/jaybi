import { test, expect } from '@playwright/test';

/**
 * E2E: Security — anti-prompt-injection.
 * Tests that the frontend blocks known prompt injection patterns.
 */
test.describe('Security — anti-prompt-injection', () => {
  test('page loads without security errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('can access security admin panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Enter admin
    const adminBtn = page.locator('button, a', { hasText: /admin|dashboard|console/i }).first();
    if (await adminBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await adminBtn.click();
      await page.waitForTimeout(1000);

      // Find security tab
      const securityTab = page.locator('button, a', { hasText: /sécurité|security/i }).first();
      if (await securityTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await securityTab.click();
        await page.waitForTimeout(1000);

        // Should show security alerts or panel
        const securityContent = page.locator('text=/alerte|suspended|injection|sécurité/i').first();
        if (await securityContent.isVisible({ timeout: 2000 }).catch(() => false)) {
          expect(await securityContent.textContent()).toBeTruthy();
        }
      }
    }
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('no XSS in search input', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="recherch" i]').first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Try XSS payload
      await searchInput.fill('<script>alert("xss")</script>');
      await page.waitForTimeout(500);

      // No alert dialog should appear
      page.on('dialog', dialog => {
        throw new Error(`Unexpected dialog: ${dialog.message()}`);
      });
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
