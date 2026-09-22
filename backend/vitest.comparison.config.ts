import { defineConfig } from 'vitest/config';

export default defineConfig({
  envDir: false,
  test: {
    environment: 'node',
    include: ['tests/comparison.routes.test.ts', 'tests/auth.middleware.test.ts'],
    testTimeout: 5000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://unused:unused@127.0.0.1:1/unused',
      JWT_SECRET: 'comparison-mocked-tests-only',
      DEV_BYPASS: 'false',
    },
  },
});
