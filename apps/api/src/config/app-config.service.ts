import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

/**
 * Typed configuration facade injected across API modules.
 * Prevents direct `process.env` reads outside `src/config/`.
 */
@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get nodeEnv(): Env['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get appUrl(): string {
    return this.config.get('APP_URL', { infer: true });
  }

  get port(): number {
    return this.config.get('API_PORT', { infer: true });
  }

  get version(): string {
    return this.config.get('APP_VERSION', { infer: true });
  }

  get gitCommit(): string {
    return this.config.get('GIT_COMMIT', { infer: true });
  }

  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  get redisUrl(): string {
    return this.config.get('REDIS_URL', { infer: true });
  }

  get storage() {
    return {
      endpoint: this.config.get('S3_ENDPOINT', { infer: true }),
      region: this.config.get('S3_REGION', { infer: true }),
      accessKey: this.config.get('S3_ACCESS_KEY', { infer: true }),
      secretKey: this.config.get('S3_SECRET_KEY', { infer: true }),
      uploadsBucket: this.config.get('S3_BUCKET_UPLOADS', { infer: true }),
      publicBucket: this.config.get('S3_BUCKET_PUBLIC', { infer: true }),
    } as const;
  }

  get auth() {
    const adminList = this.config
      .get('ADMIN_EMAILS', { infer: true })
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);

    return {
      jwtAccessSecret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      jwtAccessTtl: this.config.get('JWT_ACCESS_TTL', { infer: true }),
      refreshTtlDays: this.config.get('REFRESH_TTL_DAYS', { infer: true }),
      googleClientId: this.config.get('GOOGLE_CLIENT_ID', { infer: true }),
      googleClientSecret: this.config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
      googleCallbackUrl: this.config.get('GOOGLE_CALLBACK_URL', { infer: true }),
      adminEmails: adminList,
      resendApiKey: this.config.get('RESEND_API_KEY', { infer: true }),
      mailFrom: this.config.get('MAIL_FROM', { infer: true }),
    } as const;
  }

  get ai() {
    const fallbacks = this.config
      .get('LLM_FALLBACK_MODELS', { infer: true })
      .split(',')
      .map((model) => model.trim())
      .filter((model) => model.length > 0);

    return {
      openRouterApiKey: this.config.get('OPENROUTER_API_KEY', { infer: true }),
      visionModel: this.config.get('LLM_VISION_MODEL', { infer: true }),
      agentModel: this.config.get('LLM_AGENT_MODEL', { infer: true }),
      fallbackModels: fallbacks,
      embeddingModel: this.config.get('EMBEDDING_MODEL', { infer: true }),
      embeddingDimensions: this.config.get('EMBEDDING_DIMENSIONS', { infer: true }),
      mock: this.config.get('LLM_MOCK', { infer: true }),
    } as const;
  }

  get scoring() {
    return {
      cosFloor: this.config.get('COS_FLOOR', { infer: true }),
      cosCeil: this.config.get('COS_CEIL', { infer: true }),
      simSurgePercent: this.config.get('SIM_SURGE_PERCENT', { infer: true }),
    } as const;
  }

  get telemetry() {
    return {
      bestTimePrivateKey: this.config.get('BESTTIME_API_KEY_PRIVATE', { infer: true }),
      bestTimePublicKey: this.config.get('BESTTIME_API_KEY_PUBLIC', { infer: true }),
    } as const;
  }

  get observability() {
    return {
      sentryDsn: this.config.get('SENTRY_DSN', { infer: true }),
      metricsBasicAuth: this.config.get('METRICS_BASIC_AUTH', { infer: true }),
    } as const;
  }
}
