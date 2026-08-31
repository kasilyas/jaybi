import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    testTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      DEV_BYPASS: 'true',
    },
  },
});
