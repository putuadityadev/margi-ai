import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '../common/app.exception';
import type { User as UserRow } from '../generated/prisma/client';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserRow;
    }
  }
}

/** Requires a signed-in account (401 otherwise). */
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new AppException('UNAUTHORIZED', 'Sign in to continue', HttpStatus.UNAUTHORIZED);
    }
    return true;
  }
}

/** Requires an ADMIN account (401 when signed out, 403 for ordinary users). */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new AppException('UNAUTHORIZED', 'Sign in to continue', HttpStatus.UNAUTHORIZED);
    }
    if (request.user.role !== 'ADMIN') {
      throw new AppException('FORBIDDEN', 'Administrator access required', HttpStatus.FORBIDDEN);
    }
    return true;
  }
}

/** The signed-in account row (only on routes behind AuthGuard). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserRow => {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new AppException('UNAUTHORIZED', 'Sign in to continue', HttpStatus.UNAUTHORIZED);
    }
    return request.user;
  },
);
