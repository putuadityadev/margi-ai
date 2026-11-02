import { http, HttpResponse, type HttpHandler } from 'msw';
import {
  CreateVenueInputSchema,
  UpdateVenueInputSchema,
  BulkHourlyForecastInputSchema,
  CreatePresetInputSchema,
  type CreatePresetInput,
  CreateEtiquetteRuleInputSchema,
  CreateCorridorInputSchema,
} from '@margi-ai/shared';
import { mockDb } from '../db';
import { MOCK_ADMIN_STATS } from '../data/admin-stats';

function requireAdmin(): Response | null {
  const user = mockDb.getCurrentUser();
  if (!user) {
    return HttpResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 },
    );
  }
  if (user.role !== 'ADMIN') {
    return HttpResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin role required' } },
      { status: 403 },
    );
  }
  return null;
}

export const adminHandlers: HttpHandler[] = [
  // GET /api/v1/admin/venues
  http.get('*/api/v1/admin/venues', ({ request }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase();
    const kind = url.searchParams.get('kind');
    const regencyId = url.searchParams.get('regencyId');

    let items = [...mockDb.venues];
    if (search) {
      items = items.filter(
        (v) =>
          v.nameEn.toLowerCase().includes(search) ||
          v.nameId.toLowerCase().includes(search) ||
          v.slug.toLowerCase().includes(search),
      );
    }
    if (kind) {
      items = items.filter((v) => v.kind === kind);
    }
    if (regencyId) {
      items = items.filter((v) => v.regencyId === regencyId);
    }

    return HttpResponse.json({ items, total: items.length }, { status: 200 });
  }),

  // POST /api/v1/admin/venues
  http.post('*/api/v1/admin/venues', async ({ request }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const raw = await request.json().catch(() => ({}));
    const parse = CreateVenueInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: parse.error.issues[0]?.message ?? 'Invalid venue payload',
          },
        },
        { status: 400 },
      );
    }

    const venue = mockDb.addVenue(parse.data);
    return HttpResponse.json({ venue }, { status: 201 });
  }),

  // GET /api/v1/admin/venues/:id
  http.get('*/api/v1/admin/venues/:id', ({ params }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const venue = mockDb.getVenueById(params.id as string);
    if (!venue) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Venue not found' } },
        { status: 404 },
      );
    }

    return HttpResponse.json({ venue }, { status: 200 });
  }),

  // PATCH /api/v1/admin/venues/:id
  http.patch('*/api/v1/admin/venues/:id', async ({ params, request }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const raw = await request.json().catch(() => ({}));
    const parse = UpdateVenueInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: parse.error.issues[0]?.message ?? 'Invalid venue update',
          },
        },
        { status: 400 },
      );
    }

    const updated = mockDb.updateVenue(params.id as string, parse.data as Record<string, unknown>);
    if (!updated) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Venue not found' } },
        { status: 404 },
      );
    }

    return HttpResponse.json({ venue: updated }, { status: 200 });
  }),

  // DELETE /api/v1/admin/venues/:id
  http.delete('*/api/v1/admin/venues/:id', ({ params }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const success = mockDb.deleteVenue(params.id as string);
    if (!success) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Venue not found' } },
        { status: 404 },
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/v1/admin/venues/:id/vibe/generate (generates profile without saving per AC-12.3)
  http.post('*/api/v1/admin/venues/:id/vibe/generate', ({ params }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const venue = mockDb.getVenueById(params.id as string);
    if (!venue) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Venue not found' } },
        { status: 404 },
      );
    }

    // Return fixture generated vibe
    return HttpResponse.json(
      {
        vibeProfile: {
          isTravelScene: true,
          sceneSummary: `AI-extracted atmospheric vibe profile for ${venue.nameEn}`,
          topography: { label: 'Terraces', descriptors: ['terraces', 'green'], intensity: 0.75 },
          architecture: { label: 'Candi Bentar', descriptors: ['traditional', 'stone'], intensity: 0.85 },
          lighting: { label: 'Dappled Sunlight', descriptors: ['sunlight', 'golden'], intensity: 0.68 },
          activity: { label: 'Meditation', descriptors: ['peaceful', 'meditation'], intensity: 0.4 },
          visualDensity: { label: 'Serene Sanctuary', descriptors: ['spacious', 'serene'], intensity: 0.35 },
          detectedLandmarkGuess: null,
          confidence: 0.94,
        },
      },
      { status: 200 },
    );
  }),

  // POST /api/v1/admin/venues/:id/embed
  http.post('*/api/v1/admin/venues/:id/embed', async ({ params, request }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const venue = mockDb.getVenueById(params.id as string);
    if (!venue) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Venue not found' } },
        { status: 404 },
      );
    }

    const raw = await request.json().catch(() => ({}));
    if (raw && typeof raw === 'object' && 'vibeProfile' in raw) {
      mockDb.updateVenue(venue.id, { vibeProfile: raw.vibeProfile });
    }

    return HttpResponse.json({ success: true, embeddedAt: new Date().toISOString() }, { status: 200 });
  }),

  // POST /api/v1/admin/venues/re-embed-all
  http.post('*/api/v1/admin/venues/re-embed-all', () => {
    const denied = requireAdmin();
    if (denied) return denied;

    const job = mockDb.createJob(mockDb.venues.length);
    return HttpResponse.json({ jobId: job.id, status: job.status }, { status: 202 });
  }),

  // GET /api/v1/admin/jobs/:id
  http.get('*/api/v1/admin/jobs/:id', ({ params }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const job = mockDb.getJob(params.id as string);
    if (!job) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Job not found' } },
        { status: 404 },
      );
    }

    return HttpResponse.json(job, { status: 200 });
  }),

  // GET /api/v1/admin/venues/:id/forecast
  http.get('*/api/v1/admin/venues/:id/forecast', ({ params }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const venue = mockDb.getVenueById(params.id as string);
    if (!venue) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Venue not found' } },
        { status: 404 },
      );
    }

    const forecasts = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        forecasts.push({
          dayOfWeek: day,
          hour,
          busyness: hour >= 10 && hour <= 16 ? 65 : 20,
        });
      }
    }

    return HttpResponse.json({ forecasts }, { status: 200 });
  }),

  // PUT /api/v1/admin/venues/:id/forecast
  http.put('*/api/v1/admin/venues/:id/forecast', async ({ params, request }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const venue = mockDb.getVenueById(params.id as string);
    if (!venue) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Venue not found' } },
        { status: 404 },
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parse = BulkHourlyForecastInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: parse.error.issues[0]?.message ?? 'Invalid forecast payload',
          },
        },
        { status: 400 },
      );
    }

    return HttpResponse.json({ success: true, count: parse.data.forecasts.length }, { status: 200 });
  }),

  // POST /api/v1/admin/venues/:id/forecast/import-csv
  http.post('*/api/v1/admin/venues/:id/forecast/import-csv', async ({ params, request }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const venue = mockDb.getVenueById(params.id as string);
    if (!venue) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Venue not found' } },
        { status: 404 },
      );
    }

    let text = await request.text().catch(() => '');
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && typeof parsed.csvText === 'string') {
        text = parsed.csvText;
      }
    } catch {
      // It's raw text/csv
    }
    if (!text.includes('day,hour,busyness')) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid CSV header. Expected: day,hour,busyness',
          },
        },
        { status: 400 },
      );
    }

    const lines = text.trim().split('\n').slice(1);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;
      const parts = line.split(',');
      const busyness = Number(parts[2]);
      if (isNaN(busyness) || busyness < 0 || busyness > 100) {
        return HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_FAILED',
              message: `Row ${i + 2}: busyness must be between 0 and 100`,
            },
          },
          { status: 400 },
        );
      }
    }

    return HttpResponse.json({ success: true, imported: lines.length }, { status: 200 });
  }),

  // POST /api/v1/admin/venues/:id/forecast/sync-besttime -> 409 BESTTIME_DISABLED per T-084
  http.post('*/api/v1/admin/venues/:id/forecast/sync-besttime', () => {
    const denied = requireAdmin();
    if (denied) return denied;

    return HttpResponse.json(
      {
        error: {
          code: 'BESTTIME_DISABLED',
          message: 'BestTime telemetry sync is disabled in prototype mode',
        },
      },
      { status: 409 },
    );
  }),

  // Presets CRUD
  http.get('*/api/v1/admin/presets', () => {
    const denied = requireAdmin();
    if (denied) return denied;
    return HttpResponse.json({ items: mockDb.presets }, { status: 200 });
  }),

  http.post('*/api/v1/admin/presets', async ({ request }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const raw = await request.json().catch(() => ({}));
    const parse = CreatePresetInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: parse.error.issues[0]?.message ?? 'Invalid preset' } },
        { status: 400 },
      );
    }
    mockDb.addPreset(parse.data);
    return HttpResponse.json({ preset: parse.data }, { status: 201 });
  }),

  http.patch('*/api/v1/admin/presets/:id', async ({ params, request }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const raw = (await request.json().catch(() => ({}))) as Partial<CreatePresetInput>;
    const updated = mockDb.updatePreset(params.id as string, raw);
    if (!updated) {
      return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Preset not found' } }, { status: 404 });
    }
    return HttpResponse.json({ preset: updated }, { status: 200 });
  }),

  http.delete('*/api/v1/admin/presets/:id', ({ params }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const success = mockDb.deletePreset(params.id as string);
    if (!success) {
      return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Preset not found' } }, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // Etiquette rules CRUD
  http.get('*/api/v1/admin/etiquette-rules', () => {
    const denied = requireAdmin();
    if (denied) return denied;
    return HttpResponse.json(
      {
        items: [
          {
            id: 'temple-sarong',
            tag: 'TEMPLE',
            severity: 3,
            textEn: 'Wear a kamen (sarong) and temple sash before entering sacred inner sanctums.',
            textId: 'Wajib mengenakan kamen dan selendang persembahyangan sebelum memasuki area suci pura.',
          },
          {
            id: 'modest-attire',
            tag: 'CULTURAL',
            severity: 2,
            textEn: 'Dress modestly covering shoulders and knees when visiting cultural sanctuaries.',
            textId: 'Kenakan pakaian sopan yang menutup pundak dan lutut saat berkunjung ke situs budaya.',
          },
        ],
      },
      { status: 200 },
    );
  }),

  http.post('*/api/v1/admin/etiquette-rules', async ({ request }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const raw = await request.json().catch(() => ({}));
    const parse = CreateEtiquetteRuleInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid etiquette rule' } },
        { status: 400 },
      );
    }
    return HttpResponse.json({ rule: parse.data }, { status: 201 });
  }),

  // Corridors CRUD
  http.get('*/api/v1/admin/corridors', () => {
    const denied = requireAdmin();
    if (denied) return denied;
    return HttpResponse.json(
      {
        items: [
          {
            id: 'canggu-shortcut',
            name: 'Canggu Coastal Shortcut',
            centerLat: -8.65,
            centerLng: 115.13,
            radiusMeters: 3000,
            typicalDelayMinutes: 25,
            penaltyWindows: [{ days: [0, 1, 2, 3, 4, 5, 6], start: '16:00', end: '19:00' }],
          },
        ],
      },
      { status: 200 },
    );
  }),

  http.post('*/api/v1/admin/corridors', async ({ request }) => {
    const denied = requireAdmin();
    if (denied) return denied;

    const raw = await request.json().catch(() => ({}));
    const parse = CreateCorridorInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid corridor payload' } },
        { status: 400 },
      );
    }
    return HttpResponse.json({ corridor: parse.data }, { status: 201 });
  }),

  // GET /api/v1/admin/stats
  http.get('*/api/v1/admin/stats', () => {
    const denied = requireAdmin();
    if (denied) return denied;

    return HttpResponse.json(MOCK_ADMIN_STATS, { status: 200 });
  }),
];
