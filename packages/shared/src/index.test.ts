import { describe, expect, it } from 'vitest';
import {
  AnalysisResultSchema,
  CFS_WEIGHTS,
  RANK_WEIGHTS,
  SHARED_PACKAGE_NAME,
  StreamEventSchema,
  VibeProfileSchema,
  WITA_ZONE,
  cfs,
  classifyBusyness,
  haversineKm,
  rankScore,
  simVibeFromCosine,
  toWita,
  witaDayOfWeek,
} from './index';

describe('@margi-ai/shared exports', () => {
  it('exposes the package identifier and subpath barrels', () => {
    expect(SHARED_PACKAGE_NAME).toBe('@margi-ai/shared');
    expect(CFS_WEIGHTS).toBeDefined();
    expect(RANK_WEIGHTS).toBeDefined();
    expect(WITA_ZONE).toBe('Asia/Makassar');
    expect(toWita).toBeTypeOf('function');
    expect(witaDayOfWeek).toBeTypeOf('function');
    expect(classifyBusyness).toBeTypeOf('function');
    expect(cfs).toBeTypeOf('function');
    expect(simVibeFromCosine).toBeTypeOf('function');
    expect(rankScore).toBeTypeOf('function');
    expect(haversineKm).toBeTypeOf('function');
    expect(AnalysisResultSchema).toBeDefined();
    expect(VibeProfileSchema).toBeDefined();
    expect(StreamEventSchema).toBeDefined();
  });
});
