import { httpJson, HttpJsonError } from './http-json';

function respondWith(body: string, status = 200): void {
  global.fetch = jest.fn().mockResolvedValue(new Response(body, { status })) as typeof fetch;
}

describe('httpJson', () => {
  it('parses plain JSON', async () => {
    respondWith('{"a":1}');
    await expect(httpJson('http://x', { timeoutMs: 100 })).resolves.toEqual({ a: 1 });
  });

  it('ignores provider keep-alive comment lines before the JSON', async () => {
    respondWith(': OPENROUTER PROCESSING\n\n{"ok":true}');
    await expect(httpJson('http://x', { timeoutMs: 100 })).resolves.toEqual({ ok: true });
  });

  it('turns non-2xx answers and non-JSON bodies into HttpJsonError', async () => {
    respondWith('nope', 502);
    await expect(httpJson('http://x', { timeoutMs: 100 })).rejects.toBeInstanceOf(HttpJsonError);
    respondWith('<html>');
    await expect(httpJson('http://x', { timeoutMs: 100 })).rejects.toThrow(/non-JSON/);
  });
});
