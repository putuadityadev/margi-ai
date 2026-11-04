import { HttpStatus } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppException } from './app.exception';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_HEADER = 'x-requested-with';
export const CSRF_VALUE = 'margi-ai';

/**
 * CSRF guard (TDD §11): state-changing requests must carry `X-Requested-With: margi-ai`, which
 * a cross-site form post cannot set. The web client adds it to every non-GET call.
 */
export function csrfHeaderMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || req.header(CSRF_HEADER) === CSRF_VALUE) {
    next();
    return;
  }
  next(new AppException('FORBIDDEN', 'Missing or invalid security header', HttpStatus.FORBIDDEN));
}
