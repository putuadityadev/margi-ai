import { z } from 'zod';

const optionalString = () =>
  z.preprocess((value) => (value === '' ? undefined : value), z.string().min(1).optional());

const optionalUrl = () =>
  z.preprocess((value) => (value === '' ? undefined : value), z.url().optional());

const booleanFromEnv = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === '') {
      return defaultValue;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return true;
      }
      if (normalized === 'false' || normalized === '0') {
        return false;
      }
    }
    return value;
  }, z.boolean());

/**
 * Validated server environment schema covering every variable in TDD §18.2.
 */
export const EnvSchema = z
  .object({
    // App
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_URL: z.url().default('http://localhost:5173'),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    APP_VERSION: z.string().min(1).default('0.1.0'),
    GIT_COMMIT: z.string().min(1).default('dev'),

    // Database / Cache / Storage
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().min(1).default('us-east-1'),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    S3_BUCKET_UPLOADS: z.string().min(1).default('user-uploads'),
    S3_BUCKET_PUBLIC: z.string().min(1).default('public-venues'),

    // Auth
    JWT_ACCESS_SECRET: z.string().min(8),
    JWT_ACCESS_TTL: z.string().min(2).default('15m'),
    REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
    GOOGLE_CLIENT_ID: optionalString(),
    GOOGLE_CLIENT_SECRET: optionalString(),
    GOOGLE_CALLBACK_URL: optionalUrl(),
    ADMIN_EMAILS: z.string().default(''),
    RESEND_API_KEY: optionalString(),
    MAIL_FROM: z.string().min(3).default('MARGI AI <no-reply@margiai.id>'),

    // AI (OpenRouter)
    OPENROUTER_API_KEY: optionalString(),
    LLM_VISION_MODEL: z.string().min(1).default('google/gemini-2.5-flash'),
    LLM_AGENT_MODEL: z.string().min(1).default('google/gemini-2.5-flash'),
    LLM_FALLBACK_MODELS: z.string().default('openai/gpt-4o-mini,anthropic/claude-haiku-4.5'),
    EMBEDDING_MODEL: z.string().min(1).default('openai/text-embedding-3-small'),
    EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
    LLM_MOCK: booleanFromEnv(false),
    COS_FLOOR: z.coerce.number().min(-1).max(1).default(0.2),
    COS_CEIL: z.coerce.number().min(-1).max(1).default(0.85),

    // Telemetry
    BESTTIME_API_KEY_PRIVATE: optionalString(),
    BESTTIME_API_KEY_PUBLIC: optionalString(),
    SIM_SURGE_PERCENT: z.coerce.number().int().min(100).max(200).default(115),

    // Observability
    SENTRY_DSN: optionalUrl(),
    METRICS_BASIC_AUTH: optionalString(),
  })
  .superRefine((env, ctx) => {
    if (env.COS_FLOOR >= env.COS_CEIL) {
      ctx.addIssue({
        code: 'custom',
        path: ['COS_FLOOR'],
        message: 'COS_FLOOR must be strictly less than COS_CEIL',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

/**
 * Validates raw environment variables at boot.
 * Lists invalid or missing variable names without printing secret values.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const keys = [
      ...new Set(parsed.error.issues.map((issue) => issue.path.join('.') || 'root')),
    ].join(', ');
    throw new Error(`Invalid environment configuration: ${keys}`);
  }
  return parsed.data;
}
