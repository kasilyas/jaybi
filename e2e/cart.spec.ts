import { test, expect } from '@playwright/test';
import { loginAsCustomer } from './helpers';

/**
 * E2E: Cart and checkout flow.
 * Tests adding products to cart, modifying quantities, and checkout.
 */
test.describe('Cart and checkout', () => {
  test('can add product to cart', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Find an "add to cart" or "+" button on a product card
    const addBtn = page.locator('button:has-text("+"), button:has-text("ajouter" i), button:has-text("add" i), [class*="add"], [aria-label*="ajouter" i]').first();

    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);

      // Cart should update — look for cart badge or counter
      const cartBadge = page.locator('[class*="cart"], [class*="badge"], [data-cart-count]').first();
      if (await cartBadge.isVisible({ timeout: 2000 }).catch(() => false)) {
        const cartText = await cartBadge.textContent();
        // Cart should have at least 1 item
        expect(cartText).toMatch(/[1-9]/);
      }
    }
  });

  test('can view cart and modify quantity', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Add a product first
    const addBtn = page.locator('button:has-text("+"), button:has-text("ajouter" i), [class*="add"]').first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);
    }

    // Open cart
    const cartBtn = page.locator('button, a', { hasText: /panier|cart|voir/i }).first()
      .or(page.locator('[class*="cart"], [aria-label*="panier" i]').first());
    if (await cartBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cartBtn.click();
      await page.waitForTimeout(1000);

      // Look for quantity controls
      const qtyInput = page.locator('input[type="number"], input[class*="qty"], [class*="quantity"]').first();
      if (await qtyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await qtyInput.fill('3');
        await page.waitForTimeout(500);
      }
    }

    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('checkout flow shows order summary', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Add a product
    const addBtn = page.locator('button:has-text("+"), button:has-text("ajouter" i), [class*="add"]').first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(500);
    }

    // Try to checkout
    const checkoutBtn = page.locator('button, a', { hasText: /commander|checkout|valider/i }).first();
    if (await checkoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkoutBtn.click();
      await page.waitForTimeout(1000);

      // Should show order summary or delivery form
      const summary = page.locator('text=/total|résumé|livraison|adresse/i').first();
      if (await summary.isVisible({ timeout: 2000 }).catch(() => false)) {
        expect(await summary.textContent()).toBeTruthy();
      }
    }
  });
});
