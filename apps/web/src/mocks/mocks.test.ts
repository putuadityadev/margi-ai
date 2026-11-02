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

  describe('T-084 · Auth Mock Handlers', () => {
    it('authenticates demo user with valid credentials', async () => {
      const res = await fetch('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@margi.test', password: 'Password123' }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { user: { email: string; role: string; emailVerified: boolean } };
      expect(data.user.email).toBe('demo@margi.test');
      expect(data.user.role).toBe('USER');
      expect(data.user.emailVerified).toBe(true);
    });

    it('rejects invalid password with 401 AUTH_INVALID_CREDENTIALS', async () => {
      const res = await fetch('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@margi.test', password: 'WrongPassword' }),
      });

      expect(res.status).toBe(401);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('rejects registration with existing email with 409 AUTH_EMAIL_EXISTS', async () => {
      const res = await fetch('http://localhost/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@margi.test', password: 'Password123', name: 'Duplicate' }),
      });

      expect(res.status).toBe(409);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('AUTH_EMAIL_EXISTS');
    });

    it('returns 204 for forgot password regardless of email existence', async () => {
      const res = await fetch('http://localhost/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@example.com' }),
      });

      expect(res.status).toBe(204);
    });

    it('rejects invalid or reused email verification token', async () => {
      const res = await fetch('http://localhost/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'fake-token-123' }),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('AUTH_TOKEN_INVALID');
    });
  });

  describe('T-084 · Me & Trips Mock Handlers', () => {
    it('prevents unverified users from saving a trip (EMAIL_NOT_VERIFIED)', async () => {
      // Log in as unverified user
      await fetch('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'unverified@margi.test', password: 'Password123' }),
      });

      const res = await fetch('http://localhost/api/v1/me/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f001',
          venueId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f002',
          title: 'My Dream Bali Trip',
        }),
      });

      expect(res.status).toBe(403);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('allows verified user to save, fetch, and delete trips', async () => {
      // Log in as verified user
      await fetch('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@margi.test', password: 'Password123' }),
      });

      // Create trip
      const createRes = await fetch('http://localhost/api/v1/me/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f001',
          venueId: '0192e2b0-8c20-7193-8db6-8d5ec4f0f002',
          title: 'Verified Traveler Trip',
          msmeVenueIds: ['0192e2b0-8c20-7193-8db6-8d5ec4f0f004'],
        }),
      });

      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as { trip: { id: string; title: string } };
      expect(created.trip.title).toBe('Verified Traveler Trip');

      // Fetch trips
      const listRes = await fetch('http://localhost/api/v1/me/trips');
      expect(listRes.status).toBe(200);
      const list = (await listRes.json()) as { items: Array<{ id: string }> };
      expect(list.items.some((t) => t.id === created.trip.id)).toBe(true);

      // Delete trip
      const delRes = await fetch(`http://localhost/api/v1/me/trips/${created.trip.id}`, {
        method: 'DELETE',
      });
      expect(delRes.status).toBe(204);
    });
  });

  describe('T-084 · Admin Mock Handlers', () => {
    it('returns 403 FORBIDDEN for regular non-admin user on admin endpoints', async () => {
      // Log in as regular user
      await fetch('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@margi.test', password: 'Password123' }),
      });

      const res = await fetch('http://localhost/api/v1/admin/venues');
      expect(res.status).toBe(403);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('allows admin user to manage venues and view stats', async () => {
      // Log in as admin
      await fetch('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@margi.test', password: 'Password123' }),
      });

      // View venues
      const venuesRes = await fetch('http://localhost/api/v1/admin/venues');
      expect(venuesRes.status).toBe(200);
      const venuesData = (await venuesRes.json()) as { items: unknown[]; total: number };
      expect(venuesData.total).toBeGreaterThan(0);

      // View stats
      const statsRes = await fetch('http://localhost/api/v1/admin/stats');
      expect(statsRes.status).toBe(200);
      const stats = (await statsRes.json()) as { tierDistribution: { LIVE: number } };
      expect(stats.tierDistribution.LIVE).toBe(48);

      // Test besttime sync endpoint returning 409 BESTTIME_DISABLED
      const syncRes = await fetch(
        'http://localhost/api/v1/admin/venues/0192e2b0-8c20-7193-8db6-8d5ec4f0f002/forecast/sync-besttime',
        { method: 'POST' },
      );
      expect(syncRes.status).toBe(409);
      const syncErr = (await syncRes.json()) as { error: { code: string } };
      expect(syncErr.error.code).toBe('BESTTIME_DISABLED');
    });
  });
});
