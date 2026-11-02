import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';
import baseVitestConfig from '../../vitest.base.mts';

export default mergeConfig(
  baseVitestConfig,
  defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(import.meta.dirname, 'src'),
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
  }),
);
