import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'redesign.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: [['list'], ['html', { outputFolder: 'e2e-report/redesign', open: 'never' }]],
  outputDir: 'test-results/redesign',
  use: {
    baseURL: 'http://127.0.0.1:4317',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4317 --strictPort',
    url: 'http://127.0.0.1:4317',
    reuseExistingServer: false,
    timeout: 180000,
  },
});
