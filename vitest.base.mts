import { defineConfig } from 'vitest/config';

/**
 * Shared Vitest baseline extended by `packages/shared` and `apps/web`.
 */
export const baseVitestConfig = defineConfig({
  test: {
    passWithNoTests: true,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
    },
  },
});

export default baseVitestConfig;
