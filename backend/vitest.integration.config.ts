import { defineConfig } from 'vitest/config';
if (!process.env.QA_DATABASE_URL) throw new Error('QA_DATABASE_URL required for integration tests');
export default defineConfig({
  envDir: false,
  test: {
    globals: true, environment: 'node', include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false, maxWorkers: 1, testTimeout: 30000,
    globalSetup: ['./tests/qaGuard.ts'],
    env: { NODE_ENV: 'test', DEV_BYPASS: 'true', DATABASE_URL: process.env.QA_DATABASE_URL,
      JWT_SECRET: 'qa-tests-only-secret-minimum-32-characters', REQUIRE_QA_DB: 'true' },
  },
});
