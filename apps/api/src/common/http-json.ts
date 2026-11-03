export class HttpJsonError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = 'HttpJsonError';
  }
}

export interface HttpJsonOptions {
  readonly method?: 'GET' | 'POST';
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
  /** Hard ceiling for the whole request, in milliseconds. */
  readonly timeoutMs: number;
}

/**
 * JSON request with a mandatory timeout. Every external call in the API goes through this,
 * so no provider can hold a request open (engineering rule: no unbounded waits).
 * Throws `HttpJsonError` for network failures, timeouts, non-2xx statuses, and non-JSON bodies.
 */
export async function httpJson(url: string, options: HttpJsonOptions): Promise<unknown> {
  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers: {
      accept: 'application/json',
      ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
      ...options.headers,
    },
    signal: AbortSignal.timeout(options.timeoutMs),
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.name : 'unknown';
    throw new HttpJsonError(`Request failed (${reason})`, null);
  }
  if (!response.ok) {
    throw new HttpJsonError(`Provider answered ${response.status}`, response.status);
  }
  try {
    return await response.json();
  } catch {
    throw new HttpJsonError('Provider returned a non-JSON body', response.status);
  }
}
