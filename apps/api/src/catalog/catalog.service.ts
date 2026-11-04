import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  AreaSchema,
  CorridorSchema,
  haversineKm,
  isInBali,
  OpeningHoursSchema,
  type Area,
  type GeoPoint,
  type ReverseGeocode,
} from '@margi-ai/shared';
import {
  setCatalog,
  setEmbeddings,
  type CatalogData,
  type CatalogPlace,
} from '@margi-ai/shared/engine';
import { z } from 'zod';
import { AppConfig } from '../config/app-config.service';
import type { Regency as RegencyRow, Venue as VenueRow } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Static geography (named areas and congestion corridors), not editable places. */
const GeoFileSchema = z.object({
  corridors: z.array(CorridorSchema),
  areas: z.array(AreaSchema),
});

const DEFAULT_GEO_PATHS = [
  '../../packages/shared/data/catalog.json',
  'packages/shared/data/catalog.json',
  'data/catalog.json',
];

/** Tags a place can carry; anything else in the database is rejected at load time. */
const VibeTagsSchema = z.array(
  z.enum([
    'SPIRITUAL',
    'NATURE',
    'BEACH',
    'RICE_FIELDS',
    'WATERFALL',
    'HERITAGE',
    'SUNSET',
    'CULINARY',
  ]),
);

/**
 * The place catalogue. Postgres is the only source of destinations and local businesses (admins
 * edit it from the console, D-032); there is no file fallback: an empty or unreachable database
 * fails loudly. Named areas and congestion corridors are static geography read from the data file.
 */
@Injectable()
export class CatalogService implements OnModuleInit {
  private readonly logger = new Logger(CatalogService.name);
  private data: CatalogData | undefined;
  private areaList: readonly Area[] = [];

  constructor(
    private readonly config: AppConfig,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    const geo = GeoFileSchema.parse(JSON.parse(readFileSync(this.locate(), 'utf-8')));
    this.areaList = geo.areas;
    await this.reload(geo.corridors);
  }

  /** Re-reads places and embeddings from Postgres and re-registers them with the engine. */
  async reload(corridors: CatalogData['corridors'] = this.data?.corridors ?? []): Promise<void> {
    const [venues, regencies] = await Promise.all([
      this.prisma.venue.findMany({ where: { isActive: true }, orderBy: { slug: 'asc' } }),
      this.prisma.regency.findMany({ orderBy: { id: 'asc' } }),
    ]);
    if (venues.length === 0) {
      throw new Error('The place catalogue is empty. Run `npx tsx scripts/seed-catalog.ts` once.');
    }
    const places = venues.map((venue) => this.toPlace(venue));
    this.data = { places, corridors, regencies: regencies.map((row) => this.toRegency(row)) };
    setCatalog(this.data);
    setEmbeddings(this.vectorsOf(venues.filter((venue) => venue.kind !== 'OTHER')));
    this.logger.log({ places: places.length, areas: this.areaList.length }, 'Catalogue loaded');
  }

  /** Adds or replaces one place without a full reload (a place learned from a search). */
  register(row: VenueRow): void {
    if (!this.data) return;
    const place = this.toPlace(row);
    const places = [...this.data.places.filter((existing) => existing.venue.id !== row.id), place];
    this.data = { ...this.data, places };
    setCatalog(this.data);
  }

  get areas(): readonly Area[] {
    return this.areaList;
  }

  get corridors(): CatalogData['corridors'] {
    return this.data?.corridors ?? [];
  }

  /** Nearest curated area to a point, plus whether the point lies inside Bali. */
  reverse(point: GeoPoint): ReverseGeocode | null {
    let best: { area: Area; distanceKm: number } | null = null;
    for (const area of this.areaList) {
      const distanceKm = haversineKm(point, area);
      if (!best || distanceKm < best.distanceKm) best = { area, distanceKm };
    }
    if (!best) return null;
    return {
      area: best.area,
      distanceKm: Math.round(best.distanceKm * 10) / 10,
      isInBali: isInBali(point),
    };
  }

  private toRegency(row: RegencyRow): CatalogData['regencies'][number] {
    return { id: row.id, nameEn: row.nameEn, nameId: row.nameId, phrStatus: row.phrStatus };
  }

  private toPlace(row: VenueRow): CatalogPlace {
    return {
      venue: {
        id: row.id,
        slug: row.slug,
        kind: row.kind,
        category: row.category,
        nameEn: row.nameEn,
        nameId: row.nameId,
        descriptionEn: row.descriptionEn,
        descriptionId: row.descriptionId,
        regencyId: row.regencyId,
        lat: row.lat,
        lng: row.lng,
        imageUrl: row.imageUrl,
        imageCredit: row.imageCredit,
        imageSourceUrl: row.imageSourceUrl,
        imageLicenseUrl: row.imageLicenseUrl,
        source: row.source,
        sourceUrl: row.sourceUrl,
        priceLevel: row.priceLevel,
        isHotspot: row.isHotspot,
        isBufferZone: row.isBufferZone,
        openingHours: OpeningHoursSchema.parse(row.openingHours),
        typicalPeakQueueMinutes: row.typicalPeakQueueMinutes,
        avgDwellMinutes: row.avgDwellMinutes,
        etiquetteTags: row.etiquetteTags,
      },
      vibeTags: VibeTagsSchema.parse(row.vibeTags),
      crowd: {
        peakHour: row.crowdPeakHour,
        peakBusyness: row.crowdPeakBusyness,
        baseBusyness: row.crowdBaseBusyness,
      },
    };
  }

  /**
   * Description embeddings back "same vibe" ranking. A venue without a vector is simply left out
   * of alternatives (D-029); a vector of the wrong width fails the load, it would skew ranking.
   */
  private vectorsOf(venues: readonly VenueRow[]): Record<string, number[]> {
    const { embeddingDimensions } = this.config.ai;
    const vectors: Record<string, number[]> = {};
    let missing = 0;
    for (const venue of venues) {
      const vector = venue.embeddingJson as number[] | null;
      if (!vector) {
        missing += 1;
        continue;
      }
      if (vector.length !== embeddingDimensions) {
        throw new Error(
          `Embedding of ${venue.slug} has ${vector.length} dimensions, expected ${embeddingDimensions}`,
        );
      }
      vectors[venue.id] = vector;
    }
    if (missing > 0) {
      this.logger.warn(
        { missing },
        'Some places have no embedding and are excluded from alternatives',
      );
    }
    return vectors;
  }

  private locate(): string {
    const candidates = this.config.state.catalogPath
      ? [this.config.state.catalogPath]
      : DEFAULT_GEO_PATHS.map((path) => resolve(process.cwd(), path));
    const found = candidates.find((path) => existsSync(path));
    if (!found) throw new Error(`Geography file not found. Tried: ${candidates.join(', ')}`);
    return found;
  }
}
