import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { AppConfig } from '../config/app-config.service';
import { PrismaClient } from '../generated/prisma/client';

const PG_CONNECT_TIMEOUT_MS = 3_000;
const VECTOR_TYPE_PATTERN = /^vector\((\d+)\)$/i;

/**
 * Thrown at startup when `EMBEDDING_DIMENSIONS` disagrees with `Venue.embedding` column width (TDD §5).
 */
export class EmbeddingDimensionMismatchError extends Error {
  constructor(expectedDimensions: number, actualColumnType: string) {
    super(
      `Embedding dimension mismatch: EMBEDDING_DIMENSIONS is ${expectedDimensions}, ` +
        `but database column "Venue"."embedding" is ${actualColumnType}. ` +
        'Run a column migration and re-embed all venues before booting.',
    );
    this.name = 'EmbeddingDimensionMismatchError';
  }
}

/**
 * Extracts `n` from Postgres formatted type strings such as `vector(1536)`.
 */
export function parseVectorDimensions(formattedType: string): number | null {
  const match = VECTOR_TYPE_PATTERN.exec(formattedType.trim());
  const rawDim = match?.[1];
  if (!rawDim) {
    return null;
  }
  const parsed = Number.parseInt(rawDim, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Asserts that the configured `EMBEDDING_DIMENSIONS` matches the Postgres `vector(n)` column definition.
 */
export function assertEmbeddingDimensionsMatch(
  formattedType: string,
  expectedDimensions: number,
): void {
  const actual = parseVectorDimensions(formattedType);
  if (actual === null || actual !== expectedDimensions) {
    throw new EmbeddingDimensionMismatchError(expectedDimensions, formattedType);
  }
}

/**
 * Shared Prisma 7 client backed by `@prisma/adapter-pg` with lifecycle hooks and pgvector dimension verification.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor(private readonly config: AppConfig) {
    const pool = new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: PG_CONNECT_TIMEOUT_MS,
    });
    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    if (this.config.nodeEnv === 'test') {
      return;
    }

    try {
      await this.verifyEmbeddingDimensions();
    } catch (error: unknown) {
      if (error instanceof EmbeddingDimensionMismatchError) {
        throw error;
      }
      this.logger.warn(
        { err: error },
        'Database unreachable during boot dimension check; readiness probe will report unhealthy',
      );
    }
  }

  /**
   * Queries `pg_attribute` / `format_type` for `"Venue"."embedding"` and verifies it equals `EMBEDDING_DIMENSIONS`.
   */
  async verifyEmbeddingDimensions(): Promise<void> {
    const rows = await this.$queryRaw<Array<{ column_type: string }>>`
      SELECT pg_catalog.format_type(a.atttypid, a.atttypmod) AS column_type
      FROM pg_catalog.pg_attribute a
      JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
      JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = current_schema()
        AND c.relname = 'Venue'
        AND a.attname = 'embedding'
        AND a.attnum > 0
        AND NOT a.attisdropped
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) {
      return;
    }

    assertEmbeddingDimensionsMatch(row.column_type, this.config.ai.embeddingDimensions);
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
