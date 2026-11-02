import type { IncomingMessage, ServerResponse } from 'node:http';
import { Writable } from 'node:stream';
import pino from 'pino';
import { buildPinoParams, LOG_REDACT_PATHS } from './logger.config';

describe('logger.config', () => {
  it('emits structured JSON lines and redacts cookies, authorization, passwords, and tokens', () => {
    const lines: string[] = [];
    const sink = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        lines.push(chunk.toString('utf8').trim());
        callback();
      },
    });

    const logger = pino(
      {
        level: 'info',
        redact: {
          paths: [...LOG_REDACT_PATHS],
          censor: '[REDACTED]',
        },
      },
      sink,
    );

    const cookieSecret = 'margi_at=eyJhbGciOiJIUzI1NiJ9.secret; margi_rt=rt_live_secret';
    const authSecret = 'Bearer sk-or-v1-ultra-secret-token';
    const setCookieSecret = 'margi_rt=rotated_secret_value; HttpOnly';
    const passwordSecret = 'hunter2-super-secret';
    const tokenSecret = 'verify-email-raw-token-999';
    const apiKeySecret = 'sk-or-v1-live-openrouter-key';

    logger.info(
      {
        req: {
          headers: {
            cookie: cookieSecret,
            authorization: authSecret,
            'x-request-id': 'req-123',
          },
        },
        res: {
          headers: {
            'set-cookie': setCookieSecret,
          },
        },
        payload: {
          password: passwordSecret,
          token: tokenSecret,
          apiKey: apiKeySecret,
        },
      },
      'request completed',
    );

    expect(lines).toHaveLength(1);
    const rawLine = lines[0] ?? '';

    expect(rawLine).not.toContain(cookieSecret);
    expect(rawLine).not.toContain('rt_live_secret');
    expect(rawLine).not.toContain(authSecret);
    expect(rawLine).not.toContain('sk-or-v1-ultra-secret-token');
    expect(rawLine).not.toContain(setCookieSecret);
    expect(rawLine).not.toContain(passwordSecret);
    expect(rawLine).not.toContain(tokenSecret);
    expect(rawLine).not.toContain(apiKeySecret);

    const parsed = JSON.parse(rawLine) as {
      msg: string;
      req: { headers: { cookie: string; authorization: string; 'x-request-id': string } };
      res: { headers: { 'set-cookie': string } };
      payload: { password: string; token: string; apiKey: string };
    };

    expect(parsed.msg).toBe('request completed');
    expect(parsed.req.headers['x-request-id']).toBe('req-123');
    expect(parsed.req.headers.cookie).toBe('[REDACTED]');
    expect(parsed.req.headers.authorization).toBe('[REDACTED]');
    expect(parsed.res.headers['set-cookie']).toBe('[REDACTED]');
    expect(parsed.payload.password).toBe('[REDACTED]');
    expect(parsed.payload.token).toBe('[REDACTED]');
    expect(parsed.payload.apiKey).toBe('[REDACTED]');
  });

  it('preserves safe x-request-id headers and generates UUIDv7 for unsafe or missing ones', () => {
    const params = buildPinoParams('production');
    const pinoHttp = params.pinoHttp as {
      genReqId: (req: IncomingMessage, res: ServerResponse) => string;
    };

    const headersOut: Record<string, string> = {};
    const fakeRes = {
      setHeader: (name: string, value: string) => {
        headersOut[name] = value;
      },
    } as unknown as ServerResponse;

    const preserved = pinoHttp.genReqId(
      { headers: { 'x-request-id': 'caller-trace-001' } } as unknown as IncomingMessage,
      fakeRes,
    );
    expect(preserved).toBe('caller-trace-001');
    expect(headersOut['x-request-id']).toBe('caller-trace-001');

    const generated = pinoHttp.genReqId(
      { headers: { 'x-request-id': 'bad\r\nheader' } } as unknown as IncomingMessage,
      fakeRes,
    );
    expect(generated).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
