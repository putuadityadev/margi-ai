import { http, HttpResponse, type HttpHandler } from 'msw';
import {
  CreateTripInputSchema,
  UpdateTripInputSchema,
  ClaimAnalysisInputSchema,
  UpdateProfileInputSchema,
} from '@margi-ai/shared';
import { mockDb } from '../db';

export const meHandlers: HttpHandler[] = [
  // GET /api/v1/me/analyses
  http.get('*/api/v1/me/analyses', () => {
    const user = mockDb.getCurrentUser();
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    const items = mockDb.getUserAnalyses(user.id);
    return HttpResponse.json({ items, nextCursor: null }, { status: 200 });
  }),

  // GET /api/v1/me/analyses/:id
  http.get('*/api/v1/me/analyses/:id', ({ params }) => {
    const user = mockDb.getCurrentUser();
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    const analysis = mockDb.getAnalysis(params.id as string);
    if (!analysis) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Analysis not found' } },
        { status: 404 },
      );
    }

    return HttpResponse.json(analysis, { status: 200 });
  }),

  // DELETE /api/v1/me/analyses/:id
  http.delete('*/api/v1/me/analyses/:id', ({ params }) => {
    const user = mockDb.getCurrentUser();
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    const success = mockDb.deleteAnalysis(params.id as string);
    if (!success) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Analysis not found' } },
        { status: 404 },
      );
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // DELETE /api/v1/me/analyses (delete all)
  http.delete('*/api/v1/me/analyses', () => {
    const user = mockDb.getCurrentUser();
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    mockDb.deleteAllAnalyses();
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /api/v1/me/analyses/:id/image
  http.get('*/api/v1/me/analyses/:id/image', ({ params }) => {
    const analysis = mockDb.getAnalysis(params.id as string);
    const presetId = analysis?.input.presetId;
    const preset = presetId ? mockDb.getPresetById(presetId) : undefined;
    const redirectUrl = preset?.imageUrl ?? 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=600&q=80';

    return new HttpResponse(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
      },
    });
  }),

  // POST /api/v1/me/analyses/:id/claim
  http.post('*/api/v1/me/analyses/:id/claim', async ({ params, request }) => {
    const user = mockDb.getCurrentUser();
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required to claim analysis' } },
        { status: 401 },
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parse = ClaimAnalysisInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_FAILED', message: 'Invalid claim payload' } },
        { status: 400 },
      );
    }

    // Match guest session ID if provided
    if (parse.data.guestSessionId && parse.data.guestSessionId !== mockDb.guestSessionId) {
      return HttpResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Guest session mismatch' } },
        { status: 403 },
      );
    }

    const analysis = mockDb.getAnalysis(params.id as string);
    if (!analysis) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Analysis not found' } },
        { status: 404 },
      );
    }

    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // GET /api/v1/me/trips
  http.get('*/api/v1/me/trips', () => {
    const user = mockDb.getCurrentUser();
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    const items = mockDb.getTripsForUser(user.id);
    return HttpResponse.json({ items }, { status: 200 });
  }),

  // POST /api/v1/me/trips
  http.post('*/api/v1/me/trips', async ({ request }) => {
    const user = mockDb.getCurrentUser();
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    // Require verified email per TDD §10.4 & T-084
    if (!user.emailVerified) {
      return HttpResponse.json(
        {
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Email address must be verified to save trips',
          },
        },
        { status: 403 },
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parse = CreateTripInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: parse.error.issues[0]?.message ?? 'Invalid trip payload',
          },
        },
        { status: 400 },
      );
    }

    const trip = mockDb.saveTrip({
      ...parse.data,
      userId: user.id,
    });

    return HttpResponse.json({ trip }, { status: 201 });
  }),

  // GET /api/v1/me/trips/:id
  http.get('*/api/v1/me/trips/:id', ({ params }) => {
    const user = mockDb.getCurrentUser();
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    const trip = mockDb.getTripById(params.id as string);
    if (!trip || (trip.userId && trip.userId !== user.id)) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Trip not found' } },
        { status: 404 },
      );
    }

    return HttpResponse.json({ trip }, { status: 200 });
  }),

  // PATCH /api/v1/me/trips/:id
  http.patch('*/api/v1/me/trips/:id', async ({ params, request }) => {
    const user = mockDb.getCurrentUser();
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parse = UpdateTripInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: parse.error.issues[0]?.message ?? 'Invalid update payload',
          },
        },
        { status: 400 },
      );
    }

    const existing = mockDb.getTripById(params.id as string);
    if (!existing || (existing.userId && existing.userId !== user.id)) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Trip not found' } },
        { status: 404 },
      );
    }

    const updated = mockDb.updateTrip(params.id as string, parse.data as Record<string, unknown>);
    return HttpResponse.json({ trip: updated }, { status: 200 });
  }),

  // DELETE /api/v1/me/trips/:id
  http.delete('*/api/v1/me/trips/:id', ({ params }) => {
    const user = mockDb.getCurrentUser();
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    const existing = mockDb.getTripById(params.id as string);
    if (!existing || (existing.userId && existing.userId !== user.id)) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Trip not found' } },
        { status: 404 },
      );
    }

    mockDb.deleteTrip(params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),

  // PATCH /api/v1/me/profile
  http.patch('*/api/v1/me/profile', async ({ request }) => {
    const user = mockDb.getCurrentUser();
    if (!user) {
      return HttpResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 },
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parse = UpdateProfileInputSchema.safeParse(raw);
    if (!parse.success) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: parse.error.issues[0]?.message ?? 'Invalid profile update',
          },
        },
        { status: 400 },
      );
    }

    const updated = mockDb.updateUser(user.id, parse.data as Record<string, unknown>);
    if (!updated) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 },
      );
    }

    const { password: _, ...safeUser } = updated;
    return HttpResponse.json({ user: safeUser }, { status: 200 });
  }),
];
