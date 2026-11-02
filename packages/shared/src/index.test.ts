import { describe, expect, it } from 'vitest';
import {
  SHARED_CONSTANTS_READY,
  SHARED_PACKAGE_NAME,
  SHARED_SCHEMAS_READY,
  SHARED_SCORING_READY,
  SHARED_TIME_READY,
} from './index';

describe('@margi-ai/shared skeleton', () => {
  it('exposes the package identifier and subpath barrels', () => {
    expect(SHARED_PACKAGE_NAME).toBe('@margi-ai/shared');
    expect(SHARED_CONSTANTS_READY).toBe(true);
    expect(SHARED_TIME_READY).toBe(true);
    expect(SHARED_SCORING_READY).toBe(true);
    expect(SHARED_SCHEMAS_READY).toBe(true);
  });
});
