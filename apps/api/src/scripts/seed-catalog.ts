/* eslint-disable no-console -- command-line script, output is its interface */
/**
 * One-off, explicit import of the reviewed catalogue (packages/shared/data) into Postgres.
 *   dev:        pnpm --filter api db:seed
 *   production: docker compose run --rm api node dist/scripts/seed-catalog.js
 * After this the database is the only source of places: the API never reads catalog.json for
 * places at runtime and has no fallback when the database is empty or down. Idempotent (upserts
 * by id); places an admin created through the console are left untouched.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient, type Prisma } from '../generated/prisma/client';

// In development the variables come from the repository .env; in production from the container.
try {
  process.loadEnvFile(resolve(process.cwd(), '../../.env'));
} catch {
  // No .env file here: rely on the environment.
}

type VenueFields = Pick<
  Prisma.VenueUncheckedCreateInput,
  | 'slug'
  | 'kind'
  | 'category'
  | 'nameEn'
  | 'nameId'
  | 'descriptionEn'
  | 'descriptionId'
  | 'regencyId'
  | 'lat'
  | 'lng'
  | 'isHotspot'
  | 'isBufferZone'
  | 'typicalPeakQueueMinutes'
  | 'avgDwellMinutes'
  | 'imageUrl'
>;

interface SeedPlace {
  venue: VenueFields & {
    id: string;
    openingHours: Prisma.InputJsonValue;
    priceLevel?: number | null;
    imageCredit?: string | null;
    imageSourceUrl?: string | null;
    imageLicenseUrl?: string | null;
    etiquetteTags?: string[];
    source?: string | null;
    sourceUrl?: string | null;
  };
  vibeTags: string[];
  crowd: { peakHour: number; peakBusyness: number; baseBusyness: number };
}

interface SeedFile {
  places: SeedPlace[];
  regencies: { id: string; nameEn: string; nameId: string; phrStatus: 'DONOR' | 'RECIPIENT' }[];
}

function dataDir(): string {
  const candidates = [
    process.env.CATALOG_DATA_DIR,
    resolve(process.cwd(), 'data'),
    resolve(process.cwd(), '../../packages/shared/data'),
  ].filter((path): path is string => Boolean(path));
  const found = candidates.find((path) => existsSync(resolve(path, 'catalog.json')));
  if (!found) throw new Error(`catalog.json not found. Tried: ${candidates.join(', ')}`);
  return found;
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const dir = dataDir();
  const catalog = JSON.parse(readFileSync(resolve(dir, 'catalog.json'), 'utf-8')) as SeedFile;
  const embeddingsPath = resolve(dir, 'embeddings.json');
  const vectors: Record<string, number[]> = existsSync(embeddingsPath)
    ? (JSON.parse(readFileSync(embeddingsPath, 'utf-8')) as { vectors: Record<string, number[]> })
        .vectors
    : {};

  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    for (const regency of catalog.regencies) {
      await prisma.regency.upsert({ where: { id: regency.id }, update: regency, create: regency });
    }
    let count = 0;
    for (const place of catalog.places) {
      const v = place.venue;
      const vector = vectors[place.venue.id];
      const data = {
        slug: v.slug,
        kind: v.kind,
        category: v.category,
        nameEn: v.nameEn,
        nameId: v.nameId,
        descriptionEn: v.descriptionEn,
        descriptionId: v.descriptionId,
        regencyId: v.regencyId,
        lat: v.lat,
        lng: v.lng,
        isHotspot: v.isHotspot ?? false,
        isBufferZone: v.isBufferZone ?? false,
        openingHours: v.openingHours,
        typicalPeakQueueMinutes: v.typicalPeakQueueMinutes ?? 0,
        avgDwellMinutes: v.avgDwellMinutes ?? 60,
        priceLevel: v.priceLevel ?? null,
        imageUrl: v.imageUrl,
        imageCredit: v.imageCredit ?? null,
        imageSourceUrl: v.imageSourceUrl ?? null,
        imageLicenseUrl: v.imageLicenseUrl ?? null,
        etiquetteTags: v.etiquetteTags ?? [],
        source: v.source ?? null,
        sourceUrl: v.sourceUrl ?? null,
        vibeTags: place.vibeTags,
        crowdPeakHour: place.crowd.peakHour,
        crowdPeakBusyness: place.crowd.peakBusyness,
        crowdBaseBusyness: place.crowd.baseBusyness,
        ...(vector ? { embeddingJson: vector } : {}),
        isActive: true,
      };
      await prisma.venue.upsert({
        where: { id: place.venue.id },
        update: data,
        create: { id: place.venue.id, ...data },
      });
      count += 1;
    }
    console.log(`Seeded ${catalog.regencies.length} regencies and ${count} places.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
