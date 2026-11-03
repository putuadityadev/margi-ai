/// <reference types="vite/client" />
import type { AxeMatchers } from 'vitest-axe';

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_MOCKS?: string;
    readonly VITE_API_BASE_URL?: string;
    /** Optional raster tile URL template for the explore map (defaults to OpenStreetMap). */
    readonly VITE_MAP_TILE_URL?: string;
    /** `true` shows the photo-match entry points (needs the vision pipeline API). */
    readonly VITE_ENABLE_PHOTO_MATCH?: string;
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
