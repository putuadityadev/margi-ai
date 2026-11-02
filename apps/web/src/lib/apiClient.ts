import type { z } from 'zod';
import { ApiErrorSchema } from '@margi-ai/shared';

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId?: string | undefined;
  readonly details?: unknown;

  constructor(
    message: string,
    status: number,
    code: string = 'UNKNOWN',
    requestId?: string | undefined,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export interface ApiClientOptions<T = unknown> extends Omit<RequestInit, 'body'> {
  body?: unknown;
  schema?: z.ZodType<T>;
  params?: Record<string, string | number | boolean | undefined>;
}

const DEFAULT_API_BASE = '/api/v1';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return DEFAULT_API_BASE;
}

export async function apiClient<T>(path: string, options: ApiClientOptions<T> = {}): Promise<T> {
  const { body, schema, params, headers: customHeaders, method = 'GET', ...restOptions } = options;
  const baseUrl = getApiBaseUrl();

  let urlPath = path.startsWith('http')
    ? path
    : `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      urlPath += (urlPath.includes('?') ? '&' : '?') + queryString;
    }
  }

  const headers = new Headers(customHeaders);
  const isNonGet = method.toUpperCase() !== 'GET' && method.toUpperCase() !== 'HEAD';

  // Enforce CSRF header on all non-GET requests (TDD §11)
  if (isNonGet && !headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'margi-ai');
  }

  let requestBody: BodyInit | undefined;

  if (body instanceof FormData) {
    requestBody = body;
    // Let browser set multipart boundary
  } else if (body !== undefined && body !== null) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    requestBody = JSON.stringify(body);
  }

  const fetchInit: RequestInit = {
    method,
    headers,
    credentials: 'include',
    ...restOptions,
  };
  if (requestBody !== undefined) {
    fetchInit.body = requestBody;
  }

  const response = await fetch(urlPath, fetchInit);

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  if (!response.ok) {
    let errorCode = 'UNKNOWN';
    let errorMessage = response.statusText || 'API Request Failed';
    let requestId: string | undefined;

    try {
      const errorJson: unknown = await response.json();
      const parsed = ApiErrorSchema.safeParse(errorJson);
      if (parsed.success) {
        errorCode = parsed.data.error.code;
        errorMessage = parsed.data.error.message;
        requestId = parsed.data.error.requestId;
      }
    } catch {
      // Body not JSON
    }

    throw new ApiClientError(errorMessage, response.status, errorCode, requestId);
  }

  const data: unknown = await response.json();

  if (schema) {
    return schema.parse(data);
  }

  return data as T;
}
