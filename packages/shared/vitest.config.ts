import { mergeConfig, defineConfig } from 'vitest/config';
import { baseVitestConfig } from '../../vitest.base.mts';

export default mergeConfig(
  baseVitestConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts'],
    },
  }),
);
