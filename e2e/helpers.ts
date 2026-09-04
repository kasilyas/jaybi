import { test as base, expect, type Page } from '@playwright/test';

/**
 * Test helpers for Jaybi E2E tests.
 * Uses DEV_BYPASS=true auto-login accounts for authentication.
 */

// Test accounts defined in config.ts (DEV_BYPASS mode)
export const TEST_ACCOUNTS = {
  admin: 'admin@qayess.io',
  customer: 'e2e-customer@test.com',
  contributor: 'e2e-contributor@test.com',
};

/**
 * Login via the AuthModal using DEV_BYPASS auto-login button.
 * Requires VITE_DEV_BYPASS=true in .env.local.
 */
export async function loginAs(page: Page, email: string) {
  // Click the login/auth button in the header
  await page.goto('/');
  // Wait for app to load
  await page.waitForLoadState('networkidle');

  // Look for auth trigger button (varies by UI state)
  const loginBtn = page.locator('button, a', { hasText: /connex|login|se connecter/i }).first();
  if (await loginBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await loginBtn.click();
  }

  // In DEV_BYPASS mode, test accounts appear as quick-login buttons
  // Click the account button matching the email
  const accountBtn = page.locator(`[data-test-account="${email}"], button:has-text("${email}")`).first();
  if (await accountBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await accountBtn.click();
    await page.waitForLoadState('networkidle');
    return;
  }

  // Fallback: manual OTP flow
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill(email);
    const submitBtn = page.locator('button[type="submit"], button:has-text("envoyer|continue|suivant")').first();
    await submitBtn.click();

    // DEV_BYPASS: OTP code is 123456 or shown on screen
    const otpInput = page.locator('input[name="otp"], input[name="code"], input[type="tel"]').first();
    await otpInput.waitFor({ state: 'visible', timeout: 5000 });
    await otpInput.fill('123456');
    const verifyBtn = page.locator('button[type="submit"], button:has-text("vérif|verify|valider")').first();
    await verifyBtn.click();
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Login as admin.
 */
export async function loginAsAdmin(page: Page) {
  await loginAs(page, TEST_ACCOUNTS.admin);
}

/**
 * Login as customer.
 */
export async function loginAsCustomer(page: Page) {
  await loginAs(page, TEST_ACCOUNTS.customer);
}

/**
 * Navigate to admin dashboard.
 * Assumes user is already logged in as admin.
 */
export async function goToAdminDashboard(page: Page) {
  // Click admin link/button in the UI
  const adminLink = page.locator('a, button', { hasText: /admin|dashboard|console/i }).first();
  if (await adminLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await adminLink.click();
    await page.waitForLoadState('networkidle');
  } else {
    // Try direct navigation
    await page.goto('/#admin');
    await page.waitForLoadState('networkidle');
  }
}

// Re-export test and expect with custom fixtures
export const test = base.extend({});
export { expect };
