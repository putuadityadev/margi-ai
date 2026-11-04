/**
 * One-off, explicit import of the reviewed catalogue (packages/shared/data) into Postgres:
 *   npx tsx scripts/seed-catalog.ts
 * After this the database is the only source of places: the API never reads catalog.json for
 * places at runtime and has no fallback when the database is empty or down. Idempotent (upserts
 * by id); places an admin created through the console are left untouched.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client';

const dataDir = resolve(import.meta.dirname, '../../../packages/shared/data');
const envPath = resolve(import.meta.dirname, '../../../.env');

function readEnv(): Record<string, string> {
  const values: Record<string, string> = {};
  if (!existsSync(envPath)) return values;
  for (const line of readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match?.[1]) values[match[1]] = (match[2] ?? '').replace(/^["']|["']$/g, '');
  }
  return values;
}

interface SeedPlace {
  venue: Record<string, unknown> & { id: string };
  vibeTags: string[];
  crowd: { peakHour: number; peakBusyness: number; baseBusyness: number };
}

const url = process.env.DATABASE_URL ?? readEnv().DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const pool = new Pool({ connectionString: url });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const catalog = JSON.parse(readFileSync(resolve(dataDir, 'catalog.json'), 'utf-8')) as {
  places: SeedPlace[];
  regencies: { id: string; nameEn: string; nameId: string; phrStatus: 'DONOR' | 'RECIPIENT' }[];
};
const embeddingsPath = resolve(dataDir, 'embeddings.json');
const vectors: Record<string, number[]> = existsSync(embeddingsPath)
  ? (JSON.parse(readFileSync(embeddingsPath, 'utf-8')) as { vectors: Record<string, number[]> })
      .vectors
  : {};

async function main(): Promise<void> {
  for (const regency of catalog.regencies) {
    await prisma.regency.upsert({ where: { id: regency.id }, update: regency, create: regency });
  }
  let count = 0;
  for (const place of catalog.places) {
    const v = place.venue as Record<string, never>;
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
      isHotspot: v.isHotspot,
      isBufferZone: v.isBufferZone,
      openingHours: v.openingHours,
      typicalPeakQueueMinutes: v.typicalPeakQueueMinutes,
      avgDwellMinutes: v.avgDwellMinutes,
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
      ...(vectors[place.venue.id] ? { embeddingJson: vectors[place.venue.id] } : {}),
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
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
