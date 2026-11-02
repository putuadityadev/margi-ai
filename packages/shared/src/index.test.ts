import { describe, expect, it } from 'vitest';
import {
  CFS_WEIGHTS,
  RANK_WEIGHTS,
  SHARED_PACKAGE_NAME,
  SHARED_SCHEMAS_READY,
  SHARED_SCORING_READY,
  SHARED_TIME_READY,
  WITA_ZONE,
} from './index';

describe('@margi-ai/shared exports', () => {
  it('exposes the package identifier and subpath barrels', () => {
    expect(SHARED_PACKAGE_NAME).toBe('@margi-ai/shared');
    expect(CFS_WEIGHTS).toBeDefined();
    expect(RANK_WEIGHTS).toBeDefined();
    expect(WITA_ZONE).toBe('Asia/Makassar');
    expect(SHARED_TIME_READY).toBe(true);
    expect(SHARED_SCORING_READY).toBe(true);
    expect(SHARED_SCHEMAS_READY).toBe(true);
  });
});
