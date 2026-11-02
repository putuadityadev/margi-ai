/// <reference types="vite/client" />
import type { AxeMatchers } from 'vitest-axe';

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_MOCKS?: string;
    readonly VITE_API_BASE_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
  interface Assertion<_T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
