import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    constants: 'src/constants/index.ts',
    time: 'src/time/index.ts',
    scoring: 'src/scoring/index.ts',
    schemas: 'src/schemas/index.ts',
    engine: 'src/engine/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: 'node22',
});
