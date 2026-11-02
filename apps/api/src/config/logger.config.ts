import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import { REQUEST_ID_HEADER, resolveRequestId } from '../common/request-id';

/**
 * Redaction paths enforced across all structured JSON logs (TDD §16, SKILL.md §5).
 */
export const LOG_REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.tokenHash',
  '*.apiKey',
  '*.secret',
] as const;

/**
 * Builds the `nestjs-pino` logger configuration for the given runtime environment.
 */
export function buildPinoParams(nodeEnv: 'development' | 'test' | 'production'): Params {
  return {
    pinoHttp: {
      level: nodeEnv === 'test' ? 'silent' : nodeEnv === 'development' ? 'debug' : 'info',
      redact: {
        paths: [...LOG_REDACT_PATHS],
        censor: '[REDACTED]',
      },
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const incoming = req.headers[REQUEST_ID_HEADER];
        const requestId = resolveRequestId(Array.isArray(incoming) ? incoming[0] : incoming);
        res.setHeader(REQUEST_ID_HEADER, requestId);
        return requestId;
      },
    },
  };
}
