import { VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ZodValidationPipe } from 'nestjs-zod';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { RequestIdInterceptor } from './common/request-id.interceptor';

/**
 * Applies global Express and NestJS middleware, URI versioning, validation,
 * request correlation, and exception formatting (TDD §4, Clarification C-09).
 */
export function configureApp(app: NestExpressApplication): void {
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cookieParser());

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
