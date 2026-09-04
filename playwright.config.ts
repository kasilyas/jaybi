import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for Jaybi.
 *
 * Prerequisites:
 * - Backend running on http://localhost:4000 (npm run dev in backend/)
 * - Frontend running on http://localhost:3000 (npm run dev)
 * - PostgreSQL running (docker compose up -d db)
 * - DEV_BYPASS=true in .env.local (for test auto-login)
 *
 * Run: npx playwright test
 * UI:  npx playwright test --ui
 * Debug: npx playwright test --debug
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Sequential — shared DB state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker — E2E tests share DB
  reporter: [
    ['html', { outputFolder: 'e2e-report' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
