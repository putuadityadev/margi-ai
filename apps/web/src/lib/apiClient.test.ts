import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { server } from '../mocks/node';
import { apiClient } from './apiClient';
import { queryKeys } from './queryKeys';
import { track } from './track';
import { mapErrorCodeToMessage } from './errors';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('apiClient', () => {
  it('successfully fetches and parses response with schema', async () => {
    const result = await apiClient('/presets', {
      schema: z.array(z.object({ id: z.string(), titleEn: z.string() })),
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.id).toBeDefined();
  });

  it('throws ZodError on schema mismatch', async () => {
    await expect(
      apiClient('/presets', {
        schema: z.object({ unexpectedKey: z.string() }),
      }),
    ).rejects.toThrow();
  });

  it('parses error payload into ApiClientError with code and requestId', async () => {
    server.use(
      http.get('*/api/v1/test-error', () => {
        return HttpResponse.json(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Resource not found',
              requestId: 'req-12345',
            },
          },
          { status: 404 },
        );
      }),
    );

    await expect(apiClient('/test-error')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 404,
      code: 'NOT_FOUND',
      requestId: 'req-12345',
      message: 'Resource not found',
    });
  });

  it('attaches X-Requested-With: margi-ai on non-GET requests', async () => {
    let capturedCsrfHeader: string | null = null;

    server.use(
      http.post('*/api/v1/test-csrf', ({ request }) => {
        capturedCsrfHeader = request.headers.get('X-Requested-With');
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiClient('/test-csrf', {
      method: 'POST',
      body: { test: true },
    });

    expect(capturedCsrfHeader).toBe('margi-ai');
  });

  it('handles 204 No Content returning undefined', async () => {
    server.use(
      http.post('*/api/v1/test-204', () => {
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await apiClient('/test-204', { method: 'POST' });
    expect(result).toBeUndefined();
  });
});

describe('track (product events)', () => {
  it('fires event and never throws error', () => {
    expect(() => {
      track('preset_clicked', { presetId: 'lempuyang-morning' });
    }).not.toThrow();
  });
});

describe('mapErrorCodeToMessage', () => {
  it('maps known error codes to i18n keys', () => {
    const msg = mapErrorCodeToMessage('NOT_A_SCENE', (k) => `translated:${k}`);
    expect(msg).toBe('translated:analyzer.notASceneMessage');
  });

  it('maps fallback error code', () => {
    const msg = mapErrorCodeToMessage('UNKNOWN_CODE', (k) => `translated:${k}`);
    expect(msg).toBe('translated:common.genericErrorMessage');
  });
});

describe('queryKeys factory', () => {
  it('generates predictable query keys', () => {
    expect(queryKeys.presets.all).toEqual(['presets']);
    expect(queryKeys.origins.all).toEqual(['origins']);
    expect(queryKeys.system.status).toEqual(['system', 'status']);
    expect(queryKeys.venues.forecast('venue-123')).toEqual(['venues', 'venue-123', 'forecast']);
  });
});
