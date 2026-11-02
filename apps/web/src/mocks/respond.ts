import { HttpResponse, delay } from 'msw';
import { getScenarioConfig } from './scenario';

/**
 * Creates a standard JSON 200/201 response with simulated network latency.
 */
export async function ok<T extends object | unknown[] | string | number | boolean | null>(
  data: T,
  init?: ResponseInit,
): Promise<Response> {
  const { latencyMultiplier } = getScenarioConfig();
  if (latencyMultiplier > 0) {
    await delay(120 * latencyMultiplier);
  }
  return HttpResponse.json(data, init);
}

/**
 * Creates a standard API error response matching TDD §4 format:
 * `{ error: { code, message, requestId } }`
 */
export async function apiError(code: string, status: number, message: string): Promise<Response> {
  const { latencyMultiplier } = getScenarioConfig();
  if (latencyMultiplier > 0) {
    await delay(100 * latencyMultiplier);
  }
  return HttpResponse.json(
    {
      error: {
        code,
        message,
        requestId: `mock-${Date.now().toString(36)}`,
      },
    },
    { status },
  );
}

/**
 * Validates the CSRF prevention header `X-Requested-With: margi-ai` on non-GET mutations (TDD §11).
 */
export function checkCsrf(request: Request): Response | null {
  const header = request.headers.get('x-requested-with');
  if (header !== 'margi-ai') {
    return HttpResponse.json(
      {
        error: {
          code: 'FORBIDDEN',
          message: 'Missing or invalid X-Requested-With security header',
          requestId: `mock-csrf-${Date.now().toString(36)}`,
        },
      },
      { status: 403 },
    );
  }
  return null;
}
