import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/firestore/**/*.test.ts'],
    setupFiles: ['tests/firestore/setup.ts'],
    hookTimeout: 120000,
    testTimeout: 120000,
  },
});
