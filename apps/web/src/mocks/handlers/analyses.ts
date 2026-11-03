import { http, HttpResponse, delay, type HttpHandler } from 'msw';
import { sse } from 'msw/sse';
import { mockDb } from '../db';
import { apiError, checkCsrf, ok } from '../respond';
import { getScenarioConfig } from '../scenario';
import { buildAnalysisResult } from '../pipeline/buildResult';
import { buildTranscript, type TranscriptItem } from '../pipeline/buildTranscript';

async function handleCreateAnalysis(request: Request): Promise<Response> {
  const csrf = checkCsrf(request);
  if (csrf) return csrf;

  const { scenario, latencyMultiplier } = getScenarioConfig();
  if (scenario === 'rate-limited') {
    return apiError(
      'RATE_LIMITED',
      429,
      'Rate limit exceeded (guest: 6/min). Please try again shortly.',
    );
  }

  const contentType = request.headers.get('content-type') ?? '';
  let presetId: string | undefined;
  let originVenueId: string | undefined;
  let arrivalAt: string | undefined;
  let simulate: boolean;
  let locale: 'en' | 'id' = 'en';
  let hasImage: boolean;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const p = formData.get('presetId');
    if (typeof p === 'string' && p.trim()) presetId = p.trim();
    const o = formData.get('originVenueId');
    if (typeof o === 'string' && o.trim()) originVenueId = o.trim();
    const a = formData.get('arrivalAt');
    if (typeof a === 'string' && a.trim()) arrivalAt = a.trim();
    const s = formData.get('simulate');
    simulate = s === 'true' || s === '1';
    const l = formData.get('locale');
    if (l === 'id' || l === 'en') locale = l;
    const img = formData.get('image');
    hasImage = (img instanceof File && img.size > 0) || (typeof img === 'string' && img.length > 0);
  } else {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof body.presetId === 'string' && body.presetId.trim()) presetId = body.presetId.trim();
    if (typeof body.originVenueId === 'string' && body.originVenueId.trim())
      originVenueId = body.originVenueId.trim();
    if (typeof body.arrivalAt === 'string' && body.arrivalAt.trim())
      arrivalAt = body.arrivalAt.trim();
    simulate = Boolean(body.simulate);
    if (body.locale === 'id' || body.locale === 'en') locale = body.locale;
    hasImage = Boolean(body.image);
  }

  // Must provide at least one source (presetId, image, or originVenueId)
  if (!presetId && !hasImage && !originVenueId) {
    return apiError('BAD_REQUEST', 400, 'Must provide either presetId, image, or originVenueId');
  }
  if (presetId && hasImage) {
    return apiError('BAD_REQUEST', 400, 'Cannot provide both presetId and image');
  }

  const now = Date.now();
  const hexTs = now.toString(16).padStart(12, '0');
  const randomSuffix = Math.random().toString(16).slice(2, 6);
  const analysisId = `0192e2b0-${randomSuffix}-7abc-8def-${hexTs}`;

  const result = buildAnalysisResult({
    input: {
      presetId,
      originVenueId,
      arrivalAt,
      simulate,
      locale,
    },
    scenario,
    analysisId,
  });

  const transcript = buildTranscript({
    result,
    scenario,
  });

  mockDb.saveAnalysis(result);
  mockDb.saveTranscript(analysisId, transcript);

  if (latencyMultiplier > 0) {
    await delay(100 * latencyMultiplier);
  }

  return HttpResponse.json(
    {
      analysisId,
      streamUrl: `/api/v1/analyses/${analysisId}/stream`,
      status: 'QUEUED',
    },
    { status: 202 },
  );
}

type SseClient = Parameters<Parameters<typeof sse>[1]>[0]['client'];

// Known limitation: MSW's SSE mocking does not reproduce server-side Last-Event-ID replay.
// True reconnect replay behaviour is verified against the real API in T-086.
async function handleSseStream(client: SseClient, id: string): Promise<void> {
  const { scenario, latencyMultiplier } = getScenarioConfig();

  let transcript: TranscriptItem[] | undefined = mockDb.getTranscript(id);
  if (!transcript) {
    const analysis = mockDb.getAnalysis(id);
    if (analysis) {
      transcript = buildTranscript({ result: analysis, scenario });
      mockDb.saveTranscript(id, transcript);
    }
  }

  if (!transcript) {
    client.error();
    return;
  }

  for (let i = 0; i < transcript.length; i++) {
    const item = transcript[i]!;

    // Scenario: stream-drop triggers an error mid-stream
    if (scenario === 'stream-drop' && i === 4) {
      client.error();
      return;
    }

    if (latencyMultiplier > 0) {
      await delay(item.delayMs * latencyMultiplier);
    }

    try {
      client.send({
        id: item.id,
        event: item.event.type,
        data: JSON.stringify(item.event),
      });
    } catch {
      return;
    }
  }

  try {
    client.close();
  } catch {
    // Ignore close errors
  }
}

export const analysesHandlers: HttpHandler[] = [
  // Create analysis
  http.post('*/api/v1/analyses', ({ request }) => handleCreateAnalysis(request)),
  http.post('*/api/analyses', ({ request }) => handleCreateAnalysis(request)),

  // SSE Stream
  sse('*/api/v1/analyses/:id/stream', ({ client, params }) => {
    return handleSseStream(client, String(params.id));
  }),
  sse('*/api/analyses/:id/stream', ({ client, params }) => {
    return handleSseStream(client, String(params.id));
  }),

  // Get single analysis snapshot
  http.get('*/api/v1/analyses/:id', ({ params }) => {
    const id = String(params.id);
    const result = mockDb.getAnalysis(id);
    if (!result) {
      return apiError('NOT_FOUND', 404, `Analysis with id "${id}" not found`);
    }
    return ok(result);
  }),
  http.get('*/api/analyses/:id', ({ params }) => {
    const id = String(params.id);
    const result = mockDb.getAnalysis(id);
    if (!result) {
      return apiError('NOT_FOUND', 404, `Analysis with id "${id}" not found`);
    }
    return ok(result);
  }),

  // Regenerate narrative
  http.post('*/api/v1/analyses/:id/regenerate-narrative', async ({ params, request }) => {
    const csrf = checkCsrf(request);
    if (csrf) return csrf;

    const id = String(params.id);
    const existing = mockDb.getAnalysis(id);
    if (!existing) {
      return apiError('NOT_FOUND', 404, `Analysis with id "${id}" not found`);
    }

    const body = (await request.json().catch(() => ({}))) as { locale?: 'en' | 'id' };
    const targetLocale =
      body.locale === 'id' || body.locale === 'en'
        ? body.locale
        : existing.locale === 'en'
          ? 'id'
          : 'en';

    const updated = buildAnalysisResult({
      input: {
        presetId: existing.input.presetId,
        originVenueId: existing.input.origin?.id,
        arrivalAt: existing.input.arrivalAt,
        simulate: existing.simulate,
        locale: targetLocale,
      },
      scenario: getScenarioConfig().scenario,
      analysisId: id,
    });

    mockDb.saveAnalysis(updated);
    return ok(updated);
  }),
  http.post('*/api/analyses/:id/regenerate-narrative', async ({ params, request }) => {
    const csrf = checkCsrf(request);
    if (csrf) return csrf;

    const id = String(params.id);
    const existing = mockDb.getAnalysis(id);
    if (!existing) {
      return apiError('NOT_FOUND', 404, `Analysis with id "${id}" not found`);
    }

    const body = (await request.json().catch(() => ({}))) as { locale?: 'en' | 'id' };
    const targetLocale =
      body.locale === 'id' || body.locale === 'en'
        ? body.locale
        : existing.locale === 'en'
          ? 'id'
          : 'en';

    const updated = buildAnalysisResult({
      input: {
        presetId: existing.input.presetId,
        originVenueId: existing.input.origin?.id,
        arrivalAt: existing.input.arrivalAt,
        simulate: existing.simulate,
        locale: targetLocale,
      },
      scenario: getScenarioConfig().scenario,
      analysisId: id,
    });

    mockDb.saveAnalysis(updated);
    return ok(updated);
  }),
];
