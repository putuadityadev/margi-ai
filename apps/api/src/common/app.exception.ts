import { HttpException, type HttpStatus } from '@nestjs/common';
import type { ErrorCode } from './error-codes';

/**
 * Domain HTTP exception carrying a stable machine-readable `ErrorCode` (TDD §4).
 */
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    status: HttpStatus,
  ) {
    super({ code, message }, status);
  }
}
