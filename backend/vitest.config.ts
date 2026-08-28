import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    // Les tests d'intégration (supertest + DB) sont dans tests/integration
    // et nécessitent une base PostgreSQL accessible (DATABASE_URL).
  },
});
