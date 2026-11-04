import { describe, expect, it } from 'vitest';
import {
  bundleScore,
  cfs,
  classifyBusyness,
  fiscalBoost,
  googleMapsDirUrl,
  haversineKm,
  isRedZone,
  queueEstimateMin,
  rankScore,
  simVibeFromCosine,
  timeSavedRange,
  travelMinutesEstimate,
} from './index';

describe('Scoring Pure Functions (T-014)', () => {
  describe('Worked Example from TDD §7.6', () => {
    it('verifies Lempuyang simulation is Red Zone with CFS = 86', () => {
      // Origin: Pura Lempuyang, simulation Saturday 09:00: bEff=115, F(t+2)=95, corridorPenalty=0
      const originCfs = cfs({ bEff: 115, fPlus2: 95, corridorPenalty: 0 });
      expect(originCfs.raw).toBe(86);
      expect(originCfs.display).toBe(86);
      expect(isRedZone({ cfsRaw: originCfs.raw, bEff: 115 })).toBe(true);
    });

    it('verifies Taman Ujung alternative scores Sim = 78.5, CFS = 20, R = 82.3 (±0.1)', () => {
      // Alternative: Taman Ujung (Karangasem, RECIPIENT):
      // cos=0.71 -> Sim = (0.71 - 0.20) / 0.65 * 100 = 78.4615... -> ~78.5
      // The BRD worked example predates the measured calibration, so it pins its own bounds.
      const simVibe = simVibeFromCosine(0.71, { floor: 0.2, ceil: 0.85 });
      expect(simVibe).toBeCloseTo(78.5, 1);

      // B_eff = 22, F(t+2) = 30, corridorPenalty = 0 -> CFS = 20
      const altCfs = cfs({ bEff: 22, fPlus2: 30, corridorPenalty: 0 });
      expect(altCfs.raw).toBe(20);
      expect(altCfs.display).toBe(20);

      // Karangasem is a RECIPIENT regency
      const eFiscal = fiscalBoost({ phrStatus: 'RECIPIENT', isHotspot: false });
      expect(eFiscal).toBe(100);

      // R = 0.50 * 78.4615 + 0.35 * (100 - 20) + 0.15 * 100 = 39.2307 + 28 + 15 = 82.23... (82.3 ±0.1)
      const r = rankScore(simVibe, altCfs.display, eFiscal);
      expect(Math.abs(r - 82.3)).toBeLessThan(0.1);
    });
  });

  describe('Busyness classification boundaries', () => {
    it('classifies 5 levels accurately at all threshold boundaries', () => {
      expect(classifyBusyness(0)).toBe('low');
      expect(classifyBusyness(20)).toBe('low');
      expect(classifyBusyness(21)).toBe('below_average');
      expect(classifyBusyness(35)).toBe('below_average');
      expect(classifyBusyness(36)).toBe('average');
      expect(classifyBusyness(60)).toBe('average');
      expect(classifyBusyness(61)).toBe('above_average');
      expect(classifyBusyness(74)).toBe('above_average');
      expect(classifyBusyness(75)).toBe('high');
      expect(classifyBusyness(100)).toBe('high');
      expect(classifyBusyness(115)).toBe('high'); // surge beyond 100
    });
  });

  describe('CFS & Red Zone checks', () => {
    it('computes CFS with default corridorPenalty=0 when omitted', () => {
      const res = cfs({ bEff: 50, fPlus2: 50 });
      // 0.5 * 50 + 0.3 * 50 + 0.2 * 0 = 25 + 15 = 40
      expect(res.raw).toBe(40);
      expect(res.display).toBe(40);
    });

    it('adds corridor penalty when specified', () => {
      const res = cfs({ bEff: 50, fPlus2: 50, corridorPenalty: 25 });
      // 40 + 0.2 * 25 = 45
      expect(res.raw).toBe(45);
      expect(res.display).toBe(45);
    });

    it('evaluates Red Zone at exactly 75 boundary', () => {
      expect(isRedZone({ cfsRaw: 75, bEff: 30 })).toBe(true);
      expect(isRedZone({ cfsRaw: 40, bEff: 75 })).toBe(true);
      expect(isRedZone({ cfsRaw: 74.9, bEff: 74.9 })).toBe(false);
    });
  });

  describe('Cosine calibration & SimVibe', () => {
    it('clamps cos below floor to 0 and above ceil to 100', () => {
      expect(simVibeFromCosine(0.1)).toBe(0);
      expect(simVibeFromCosine(0.6)).toBe(0);
      expect(simVibeFromCosine(0.9)).toBe(100);
      expect(simVibeFromCosine(0.99)).toBe(100);
      expect(simVibeFromCosine(0.75)).toBeCloseTo(50, 5);
    });

    it('throws when floor >= ceil', () => {
      expect(() => simVibeFromCosine(0.5, { floor: 0.8, ceil: 0.5 })).toThrow(/strictly less than/);
    });
  });

  describe('Rank score and Fiscal Boost', () => {
    it('clamps negative or exceeding inputs to [0, 100]', () => {
      const score = rankScore(120, -10, 150);
      // sim clamped 100, cfs clamped 0 -> (100 - 0) = 100, fiscal clamped 100
      // 0.5 * 100 + 0.35 * 100 + 0.15 * 100 = 100
      expect(score).toBe(100);
    });

    it('computes fiscal boost for donor, recipient, buffer zone, and hotspot', () => {
      expect(fiscalBoost({ phrStatus: 'DONOR', isHotspot: false })).toBe(0);
      expect(fiscalBoost({ phrStatus: 'RECIPIENT', isHotspot: false })).toBe(100);
      expect(fiscalBoost({ phrStatus: 'DONOR', isBufferZone: true, isHotspot: false })).toBe(100);
      expect(fiscalBoost({ phrStatus: 'RECIPIENT', isHotspot: true })).toBe(0); // hotspot excluded
    });
  });

  describe('Geo calculations', () => {
    it('computes haversine distance between two coordinates', () => {
      // Same point = 0 km
      expect(haversineKm({ lat: -8.5, lng: 115.2 }, { lat: -8.5, lng: 115.2 })).toBe(0);

      // Denpasar (-8.6705, 115.2126) to Ubud (-8.5069, 115.2625) ~19 km
      const d = haversineKm({ lat: -8.6705, lng: 115.2126 }, { lat: -8.5069, lng: 115.2625 });
      expect(d).toBeGreaterThan(17);
      expect(d).toBeLessThan(22);
    });

    it('generates official Google Maps direction URL', () => {
      const url = googleMapsDirUrl({ lat: -8.5069, lng: 115.2625 });
      expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=-8.5069,115.2625');
    });
  });

  describe('Impact and bundling metrics', () => {
    it('computes queueEstimateMin with peak and ratio clamping', () => {
      expect(queueEstimateMin(210, 100)).toBe(210);
      expect(queueEstimateMin(210, 120)).toBe(252); // capped at 1.2
      expect(queueEstimateMin(210, 150)).toBe(252); // capped at 1.2
      expect(queueEstimateMin(210, 0)).toBe(0);
    });

    it('computes travelMinutesEstimate for corridor peak and normal speeds', () => {
      expect(travelMinutesEstimate(0, false)).toBe(0);
      expect(travelMinutesEstimate(15, false)).toBe(30); // 15 km at 30 km/h = 30 min
      expect(travelMinutesEstimate(9, true)).toBe(30); // 9 km at 18 km/h = 30 min
    });

    it('computes timeSavedRange with +-20% bounds, floored at 0', () => {
      // Origin: queue 180 + corridor 30 = 210
      // Alt: queue 30 + travel 30 = 60
      // Net: 210 - 60 = 150 -> range [120, 180]
      const range = timeSavedRange({
        originQueue: 180,
        originCorridorDelay: 30,
        altQueue: 30,
        altTravel: 30,
      });
      expect(range[0]).toBe(120);
      expect(range[1]).toBe(180);

      // Slower alternative -> net negative -> [0, 0]
      const negativeRange = timeSavedRange({
        originQueue: 20,
        originCorridorDelay: 0,
        altQueue: 50,
        altTravel: 40,
      });
      expect(negativeRange).toEqual([0, 0]);
    });

    it('computes MSME bundleScore according to vibe similarity and distance ratio', () => {
      // Perfect match at distance 0
      expect(bundleScore(100, 0, 3)).toBe(100);

      // Distance at radius edge (3 km out of 3 km) -> distance score = 0, sim = 80 -> 0.6 * 80 = 48
      expect(bundleScore(80, 3, 3)).toBe(48);

      // Distance beyond radius -> clamped distance score = 0
      expect(bundleScore(80, 5, 3)).toBe(48);

      // Zero radius boundary handling
      expect(bundleScore(80, 2, 0)).toBe(48);
    });
  });
});
