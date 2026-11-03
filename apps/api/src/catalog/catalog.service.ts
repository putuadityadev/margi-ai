import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  AreaSchema,
  CorridorSchema,
  haversineKm,
  isInBali,
  RegencySchema,
  VenueLiteSchema,
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

const CatalogFileSchema = z.object({
  places: z.array(z.object({ venue: VenueLiteSchema.passthrough() }).passthrough()).min(1),
  corridors: z.array(CorridorSchema),
  regencies: z.array(RegencySchema),
  areas: z.array(AreaSchema),
});

const EmbeddingFileSchema = z.object({
  model: z.string(),
  dimensions: z.number().int().positive(),
  vectors: z.record(z.string(), z.array(z.number())),
});

/** Candidate locations of the seed file, relative to the API working directory. */
const DEFAULT_CATALOG_PATHS = [
  '../../packages/shared/data/catalog.json',
  'packages/shared/data/catalog.json',
  'data/catalog.json',
];

/**
 * Curated Bali catalogue (places, areas, corridors, regencies) loaded once at start-up and
 * registered with the shared engine. The JSON is exported from the reviewed dataset
 * (`scripts/export-catalog.mjs`); Postgres seeding for the admin UI is tracked in T-091.
 */
@Injectable()
export class CatalogService implements OnModuleInit {
  private readonly logger = new Logger(CatalogService.name);
  private data: CatalogData | undefined;
  private areaList: readonly Area[] = [];

  constructor(private readonly config: AppConfig) {}

  onModuleInit(): void {
    const path = this.locate();
    const parsed = CatalogFileSchema.parse(JSON.parse(readFileSync(path, 'utf-8')));
    this.data = {
      places: parsed.places as unknown as CatalogPlace[],
      corridors: parsed.corridors,
      regencies: parsed.regencies,
    };
    this.areaList = parsed.areas;
    setCatalog(this.data);
    this.loadEmbeddings(
      path,
      parsed.places.map((place) => place.venue.id),
    );
    this.logger.log(
      {
        places: parsed.places.length,
        areas: parsed.areas.length,
        corridors: parsed.corridors.length,
      },
      'Catalogue loaded',
    );
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

  /**
   * Registers the description embeddings that back "same vibe" ranking. A missing file is a
   * degraded start (no alternatives), never an excuse to invent similarity (D-029); a malformed
   * file fails the boot because it would silently skew ranking.
   */
  private loadEmbeddings(catalogPath: string, venueIds: readonly string[]): void {
    const path = resolve(dirname(catalogPath), 'embeddings.json');
    if (!existsSync(path)) {
      this.logger.warn(
        { path },
        'embeddings.json not found: place alternatives will be empty. Run scripts/embed-catalog.ts',
      );
      return;
    }
    const { embeddingDimensions } = this.config.ai;
    const file = EmbeddingFileSchema.parse(JSON.parse(readFileSync(path, 'utf-8')));
    if (file.dimensions !== embeddingDimensions) {
      throw new Error(
        `embeddings.json has ${file.dimensions} dimensions, EMBEDDING_DIMENSIONS is ${embeddingDimensions}`,
      );
    }
    const missing = venueIds.filter((id) => !file.vectors[id]);
    const wrongSize = Object.entries(file.vectors).filter(
      ([, vector]) => vector.length !== embeddingDimensions,
    );
    if (wrongSize.length > 0) {
      throw new Error(`embeddings.json has ${wrongSize.length} vectors of the wrong length`);
    }
    if (missing.length > 0) {
      this.logger.warn(
        { missing: missing.length },
        'Some places have no embedding and are excluded from alternatives',
      );
    }
    setEmbeddings(file.vectors);
    this.logger.log(
      { vectors: Object.keys(file.vectors).length, model: file.model },
      'Embeddings loaded',
    );
  }

  private locate(): string {
    const candidates = this.config.state.catalogPath
      ? [this.config.state.catalogPath]
      : DEFAULT_CATALOG_PATHS.map((path) => resolve(process.cwd(), path));
    const found = candidates.find((path) => existsSync(path));
    if (!found) throw new Error(`Catalogue file not found. Tried: ${candidates.join(', ')}`);
    return found;
  }
}
