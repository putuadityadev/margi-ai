import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { AppException } from './app.exception';
import type { ErrorCode } from './error-codes';
import { REQUEST_ID_HEADER, resolveRequestId } from './request-id';

interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
  };
}

/**
 * Maps every thrown error into the standard MARGI AI error envelope `{ error: { code, message, requestId } }` (TDD §4).
 */
@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string }>();
    const res = ctx.getResponse<Response>();

    const existingHeader = res.getHeader(REQUEST_ID_HEADER);
    const requestId =
      typeof existingHeader === 'string' && existingHeader.length > 0
        ? existingHeader
        : typeof req.id === 'string' && req.id.length > 0
          ? req.id
          : resolveRequestId(req.header(REQUEST_ID_HEADER));

    res.setHeader(REQUEST_ID_HEADER, requestId);

    if (res.headersSent) {
      return;
    }

    const mapped = this.mapException(exception, requestId);
    const payload: ErrorEnvelope = {
      error: {
        code: mapped.code,
        message: mapped.message,
        requestId,
      },
    };

    res.status(mapped.status).json(payload);
  }

  private mapException(
    exception: unknown,
    requestId: string,
  ): { status: number; code: ErrorCode; message: string } {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: exception.message,
      };
    }

    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      const issues =
        typeof zodError === 'object' &&
        zodError !== null &&
        'issues' in zodError &&
        Array.isArray((zodError as { issues?: unknown }).issues)
          ? (zodError as { issues: Array<{ path?: PropertyKey[]; message?: string }> }).issues
          : undefined;
      const summary = issues
        ? issues
            .map((issue) => {
              const path = (issue.path ?? []).map(String).join('.');
              return path ? `${path}: ${issue.message ?? 'invalid'}` : (issue.message ?? 'invalid');
            })
            .join('; ')
        : 'Request validation failed';
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_FAILED',
        message: summary || 'Request validation failed',
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        code: this.statusToErrorCode(status),
        message: this.extractHttpMessage(exception),
      };
    }

    this.logger.error(
      {
        err: exception,
        requestId,
      },
      'Unhandled exception caught by AllExceptionsFilter',
    );

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL',
      message: 'Internal server error',
    };
  }

  private statusToErrorCode(status: number): ErrorCode {
    switch (status) {
      case 400:
      case 422:
        return 'VALIDATION_FAILED';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 429:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL';
    }
  }

  private extractHttpMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (typeof response === 'object' && response !== null && 'message' in response) {
      const msg = (response as { message?: unknown }).message;
      if (typeof msg === 'string') {
        return msg;
      }
      if (Array.isArray(msg)) {
        return msg.map(String).join('; ');
      }
    }
    return exception.message || 'Request failed';
  }
}
