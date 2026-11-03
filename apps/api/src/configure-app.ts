import { VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { csrfHeaderMiddleware } from './common/csrf-header';
import { guestSessionMiddleware } from './common/guest-session';
import { RequestIdInterceptor } from './common/request-id.interceptor';

/**
 * Applies global Express and NestJS middleware, URI versioning, validation,
 * request correlation, and exception formatting (TDD §4, Clarification C-09).
 */
export function configureApp(app: NestExpressApplication, secureCookies = false): void {
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());
  app.use(csrfHeaderMiddleware);
  app.use(guestSessionMiddleware(secureCookies));

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalInterceptors(new RequestIdInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();
}
