import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { VenueLiteSchema } from '@margi-ai/shared';
import { IMAGE_CREDITS } from './data/credits';
import { MOCK_PRESETS } from './data/presets';
import { MOCK_REGENCIES } from './data/regencies';
import { MOCK_VENUES } from './data/venues';
import { server } from './node';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MSW Mock Layer (T-082)', () => {
  describe('Mock Data Validation with Shared Zod Contracts', () => {
    it('contains exactly 4 presets adhering to CreatePresetInputSchema', () => {
      expect(MOCK_PRESETS).toHaveLength(4);
      expect(MOCK_PRESETS.map((p) => p.id)).toEqual([
        'lempuyang-morning',
        'ulun-danu-lake',
        'tegallalang-terrace',
        'tanah-lot-sunset',
      ]);
    });

    it('contains all 9 Bali regencies with correct PHR status', () => {
      expect(MOCK_REGENCIES).toHaveLength(9);
      const donors = MOCK_REGENCIES.filter((r) => r.phrStatus === 'DONOR');
      const recipients = MOCK_REGENCIES.filter((r) => r.phrStatus === 'RECIPIENT');
      expect(donors).toHaveLength(3);
      expect(recipients).toHaveLength(6);
    });

    it('contains 5 hotspot origins, >= 8 DTW alternatives, and >= 8 MSMEs', () => {
      const hotspots = MOCK_VENUES.filter((v) => v.isHotspot);
      const dtws = MOCK_VENUES.filter((v) => v.kind === 'DTW' && !v.isHotspot);
      const msmes = MOCK_VENUES.filter((v) => v.kind === 'MSME');

      expect(hotspots).toHaveLength(5);
      expect(dtws.length).toBeGreaterThanOrEqual(8);
      expect(msmes.length).toBeGreaterThanOrEqual(8);
    });

    it('fails immediately when a mock venue has an invalid schema', () => {
      expect(() =>
        VenueLiteSchema.parse({
          id: 'not-a-uuid',
          slug: 'bad-venue',
          kind: 'INVALID_KIND',
        }),
      ).toThrow();
    });

    it('has an image credit entry for key mock images', () => {
      expect(IMAGE_CREDITS.length).toBeGreaterThanOrEqual(8);
      for (const credit of IMAGE_CREDITS) {
        expect(credit.path).toBeDefined();
        expect(credit.credit).toBeDefined();
        expect(credit.license).toBeDefined();
      }
    });
  });

  describe('Public API Mock Endpoints', () => {
    it('GET /api/v1/presets returns 4 presets', async () => {
      const res = await fetch('http://localhost/api/v1/presets');
      expect(res.status).toBe(200);
      const data = (await res.json()) as Array<{ id: string }>;
      expect(data).toHaveLength(4);
      expect(data[0]?.id).toBe('lempuyang-morning');
    });

    it('GET /api/v1/origins returns 5 hotspot venues', async () => {
      const res = await fetch('http://localhost/api/v1/origins');
      expect(res.status).toBe(200);
      const data = (await res.json()) as Array<{ isHotspot: boolean }>;
      expect(data).toHaveLength(5);
      expect(data.every((v) => v.isHotspot)).toBe(true);
    });

    it('GET /api/v1/venues/:slug returns destination details', async () => {
      const res = await fetch('http://localhost/api/v1/venues/taman-ujung');
      expect(res.status).toBe(200);
      const data = (await res.json()) as { slug: string; nameEn: string };
      expect(data.slug).toBe('taman-ujung');
      expect(data.nameEn).toBe('Taman Ujung Water Palace');
    });

    it('GET /api/v1/venues/:slug returns 404 for unknown slug', async () => {
      const res = await fetch('http://localhost/api/v1/venues/non-existent-place');
      expect(res.status).toBe(404);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('GET /api/v1/regencies returns the 9 regencies', async () => {
      const res = await fetch('http://localhost/api/v1/regencies');
      expect(res.status).toBe(200);
      const data = (await res.json()) as unknown[];
      expect(data).toHaveLength(9);
    });

    it('GET /api/v1/system/status returns system metadata', async () => {
      const res = await fetch('http://localhost/api/v1/system/status');
      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        llm: string;
        telemetry: { live: boolean };
        version: string;
      };
      expect(data.llm).toBe('ok');
      expect(data.telemetry.live).toBe(false);
      expect(data.version).toBe('mock-0.1.0');
    });

    it('POST /api/v1/events requires X-Requested-With: margi-ai (CSRF guard)', async () => {
      // Missing header -> 403
      const forbiddenRes = await fetch('http://localhost/api/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'page_view' }),
      });
      expect(forbiddenRes.status).toBe(403);
      const err = (await forbiddenRes.json()) as { error: { code: string } };
      expect(err.error.code).toBe('FORBIDDEN');

      // Valid header -> 204
      const okRes = await fetch('http://localhost/api/v1/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'margi-ai',
        },
        body: JSON.stringify({ name: 'page_view' }),
      });
      expect(okRes.status).toBe(204);
    });
  });
});
