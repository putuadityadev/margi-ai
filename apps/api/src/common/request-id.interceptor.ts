import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { REQUEST_ID_HEADER, resolveRequestId } from './request-id';

/**
 * Ensures every handled HTTP request carries a correlation `x-request-id` on both request and response.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { id?: string }>();
    const res = http.getResponse<Response>();

    const existing = res.getHeader(REQUEST_ID_HEADER);
    const headerValue = req.header(REQUEST_ID_HEADER);
    const requestId =
      typeof existing === 'string' && existing.length > 0
        ? existing
        : typeof req.id === 'string' && req.id.length > 0
          ? req.id
          : resolveRequestId(headerValue);

    req.id = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    return next.handle();
  }
}
