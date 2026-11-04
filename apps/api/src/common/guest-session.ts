import { randomUUID } from 'node:crypto';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export const GUEST_COOKIE = 'margi_sid';
const GUEST_COOKIE_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      guestSid?: string;
    }
  }
}

/**
 * Guest-first identity (PRD D-01): every visitor gets an anonymous, httpOnly session id that
 * owns their saved plans. It carries no personal data and is never linked to a location.
 */
export function guestSessionMiddleware(secureCookie: boolean) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const existing = cookies?.[GUEST_COOKIE];
    if (existing && UUID_PATTERN.test(existing)) {
      req.guestSid = existing;
      next();
      return;
    }
    const sid = randomUUID();
    res.cookie(GUEST_COOKIE, sid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookie,
      maxAge: GUEST_COOKIE_MAX_AGE_MS,
    });
    req.guestSid = sid;
    next();
  };
}

/** Injects the anonymous guest session id into a controller method. */
export const GuestSid = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.guestSid ?? '';
  },
);
