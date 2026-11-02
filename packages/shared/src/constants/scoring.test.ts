import { describe, expect, it } from 'vitest';
import {
  BUNDLE,
  CFS_WEIGHTS,
  COSINE_CALIBRATION,
  RANK_WEIGHTS,
  RELAXATION_LADDER,
  THRESHOLDS,
  resolveScoringConfig,
} from './scoring';
import {
  ALL_REGENCIES,
  DONOR_REGENCIES,
  MSME_CATEGORIES,
  RECIPIENT_REGENCIES,
  WITA_ZONE,
} from './domain';

describe('Scoring & Domain Constants (T-012)', () => {
  it('verifies CFS weight group sums to 1.00', () => {
    const sum = CFS_WEIGHTS.w1 + CFS_WEIGHTS.w2 + CFS_WEIGHTS.w3;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('verifies Rank weight group sums to 1.00', () => {
    const sum = RANK_WEIGHTS.alpha + RANK_WEIGHTS.beta + RANK_WEIGHTS.gamma;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('verifies MSME bundling weights sum to 1.00', () => {
    const sum = BUNDLE.weightSim + BUNDLE.weightDistance;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('verifies relaxation ladder is monotonically non-increasing in similarity requirement', () => {
    expect(RELAXATION_LADDER).toHaveLength(3);
    const step0 = RELAXATION_LADDER[0];
    const step1 = RELAXATION_LADDER[1];
    const step2 = RELAXATION_LADDER[2];
    expect(step0).toBeDefined();
    expect(step1).toBeDefined();
    expect(step2).toBeDefined();
    if (!step0 || !step1 || !step2) return;
    expect(step0.simMin).toBeGreaterThan(step1.simMin);
    expect(step1.simMin).toBeGreaterThan(step2.simMin);
    expect(step0.microRadiusMaxKm).toBeLessThan(step1.microRadiusMaxKm);
    expect(step1.microRadiusMaxKm).toBeLessThan(step2.microRadiusMaxKm);
  });

  it('resolves scoring config with defaults when no overrides provided', () => {
    const config = resolveScoringConfig();
    expect(config.cosineCalibration.floor).toBe(COSINE_CALIBRATION.floor);
    expect(config.cosineCalibration.ceil).toBe(COSINE_CALIBRATION.ceil);
    expect(config.thresholds.surgePct).toBe(THRESHOLDS.surgePct);
    expect(config.thresholds.corridorPenalty).toBe(THRESHOLDS.corridorPenalty);
  });

  it('allows valid environment overrides', () => {
    const config = resolveScoringConfig({
      cosFloor: 0.15,
      cosCeil: 0.88,
      simSurgePercent: 120,
      corridorPenalty: 30,
    });
    expect(config.cosineCalibration.floor).toBe(0.15);
    expect(config.cosineCalibration.ceil).toBe(0.88);
    expect(config.thresholds.surgePct).toBe(120);
    expect(config.thresholds.corridorPenalty).toBe(30);
  });

  it('throws an error if cosFloor >= cosCeil', () => {
    expect(() => resolveScoringConfig({ cosFloor: 0.9, cosCeil: 0.8 })).toThrow(
      /must be strictly less than/i,
    );
    expect(() => resolveScoringConfig({ cosFloor: 0.5, cosCeil: 0.5 })).toThrow(
      /must be strictly less than/i,
    );
  });

  it('throws an error on invalid numeric ranges', () => {
    expect(() => resolveScoringConfig({ cosFloor: -2 })).toThrow(/Invalid cosFloor/);
    expect(() => resolveScoringConfig({ cosCeil: 2 })).toThrow(/Invalid cosCeil/);
    expect(() => resolveScoringConfig({ simSurgePercent: 80 })).toThrow(/simSurgePercent/);
    expect(() => resolveScoringConfig({ corridorPenalty: -5 })).toThrow(/corridorPenalty/);
  });

  it('verifies domain regency partitions and WITA timezone', () => {
    expect(RECIPIENT_REGENCIES).toHaveLength(6);
    expect(DONOR_REGENCIES).toHaveLength(3);
    expect(ALL_REGENCIES).toHaveLength(9);
    expect(WITA_ZONE).toBe('Asia/Makassar');
    expect(MSME_CATEGORIES).toContain('WARUNG');
    expect(MSME_CATEGORIES).toContain('CAFE');
    expect(MSME_CATEGORIES).toContain('CRAFT_WORKSHOP');
  });
});
