import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AppConfig } from '../config/app-config.service';
import {
  assertEmbeddingDimensionsMatch,
  EmbeddingDimensionMismatchError,
  parseVectorDimensions,
  PrismaService,
} from './prisma.service';

function createFakeConfig(
  embeddingDimensions: number,
  nodeEnv: 'development' | 'test' = 'test',
): AppConfig {
  return {
    nodeEnv,
    databaseUrl: 'postgresql://margi:margi_dev_only@127.0.0.1:5432/margi_dev',
    ai: {
      embeddingDimensions,
    },
  } as unknown as AppConfig;
}

describe('PrismaService and pgvector schema invariants', () => {
  it('parses valid vector(n) formatted types and rejects malformed ones', () => {
    expect(parseVectorDimensions('vector(1536)')).toBe(1536);
    expect(parseVectorDimensions(' vector(768) ')).toBe(768);
    expect(parseVectorDimensions('text')).toBeNull();
    expect(parseVectorDimensions('vector(0)')).toBeNull();
  });

  it('passes when EMBEDDING_DIMENSIONS matches Venue.embedding and throws clearly on mismatch', () => {
    expect(() => assertEmbeddingDimensionsMatch('vector(1536)', 1536)).not.toThrow();
    expect(() => assertEmbeddingDimensionsMatch('vector(1536)', 768)).toThrow(
      EmbeddingDimensionMismatchError,
    );
    expect(() => assertEmbeddingDimensionsMatch('vector(1536)', 768)).toThrow(
      /768.*vector\(1536\)/,
    );
  });

  it('aborts boot in onModuleInit when EMBEDDING_DIMENSIONS=768 disagrees with vector(1536)', async () => {
    const service = new PrismaService(createFakeConfig(768, 'development'));
    jest
      .spyOn(service, '$queryRaw')
      .mockResolvedValueOnce([{ column_type: 'vector(1536)' }] as never);

    await expect(service.onModuleInit()).rejects.toThrow(EmbeddingDimensionMismatchError);
    await service.onModuleDestroy();
  });

  it('keeps initial migration SQL ordered with vector extension before Venue and HNSW index after', () => {
    const migrationPath = join(
      __dirname,
      '..',
      '..',
      'prisma',
      'migrations',
      '20261102000000_init',
      'migration.sql',
    );
    const sql = readFileSync(migrationPath, 'utf8');

    const extIdx = sql.indexOf('CREATE EXTENSION IF NOT EXISTS vector;');
    const venueIdx = sql.indexOf('CREATE TABLE "Venue"');
    const hnswIdx = sql.indexOf(
      'CREATE INDEX venue_embedding_hnsw ON "Venue" USING hnsw (embedding vector_cosine_ops);',
    );

    expect(extIdx).toBeGreaterThan(-1);
    expect(venueIdx).toBeGreaterThan(extIdx);
    expect(hnswIdx).toBeGreaterThan(venueIdx);
    expect(sql).toContain('"embedding" vector(1536)');
    expect(sql).toContain('"typicalDelayMinutes" INTEGER NOT NULL DEFAULT 0');
  });
});
