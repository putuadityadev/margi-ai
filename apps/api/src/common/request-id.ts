import { randomBytes } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Generates an RFC 9562 time-ordered UUIDv7 using platform crypto primitives.
 */
export function generateUuidV7(nowMs: number = Date.now()): string {
  const bytes = randomBytes(16);
  const timestamp = BigInt(nowMs);

  bytes[0] = Number((timestamp >> 40n) & 0xffn);
  bytes[1] = Number((timestamp >> 32n) & 0xffn);
  bytes[2] = Number((timestamp >> 24n) & 0xffn);
  bytes[3] = Number((timestamp >> 16n) & 0xffn);
  bytes[4] = Number((timestamp >> 8n) & 0xffn);
  bytes[5] = Number(timestamp & 0xffn);

  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Preserves a safe caller-supplied `x-request-id` or generates a fresh UUIDv7.
 */
export function resolveRequestId(incoming: string | undefined): string {
  if (incoming !== undefined && SAFE_REQUEST_ID_PATTERN.test(incoming)) {
    return incoming;
  }
  return generateUuidV7();
}
