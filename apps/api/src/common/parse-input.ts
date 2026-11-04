import { HttpStatus } from '@nestjs/common';
import type { z } from 'zod';
import { AppException } from './app.exception';

/**
 * Validates untrusted input (query string or body) against a shared Zod schema.
 * Failures become the standard `VALIDATION_FAILED` error naming only the offending fields.
 */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.') || 'input'))];
  throw new AppException(
    'VALIDATION_FAILED',
    `Invalid input: ${fields.join(', ')}`,
    HttpStatus.BAD_REQUEST,
  );
}
