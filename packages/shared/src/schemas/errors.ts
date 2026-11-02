import { z } from 'zod';

export const ERROR_CODES = [
  'VALIDATION_FAILED',
  'NOT_FOUND',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'RATE_LIMITED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL',
  'ANALYSIS_IMAGE_INVALID',
  'NOT_A_SCENE',
  'TIMEOUT',
  'LLM_FAILED',
  'VENUE_CLOSED',
  'ANALYSIS_NOT_FOUND',
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_EMAIL_EXISTS',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_INVALID',
] as const;

export const ErrorCodeSchema = z.string();
export type ErrorCode = (typeof ERROR_CODES)[number] | (string & {});

/**
 * Standard API error payload envelope returned by NestJS AllExceptionsFilter (TDD §4).
 */
export const ApiErrorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});
export type ApiErrorPayload = z.infer<typeof ApiErrorPayloadSchema>;

export const ApiErrorSchema = z.object({
  error: ApiErrorPayloadSchema,
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
