import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
import { setCatalog, type CatalogData, type CatalogPlace } from '@margi-ai/shared/engine';
import { z } from 'zod';
import { AppConfig } from '../config/app-config.service';

const CatalogFileSchema = z.object({
  places: z.array(z.object({ venue: VenueLiteSchema.passthrough() }).passthrough()).min(1),
  corridors: z.array(CorridorSchema),
  regencies: z.array(RegencySchema),
  areas: z.array(AreaSchema),
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

  private locate(): string {
    const candidates = this.config.state.catalogPath
      ? [this.config.state.catalogPath]
      : DEFAULT_CATALOG_PATHS.map((path) => resolve(process.cwd(), path));
    const found = candidates.find((path) => existsSync(path));
    if (!found) throw new Error(`Catalogue file not found. Tried: ${candidates.join(', ')}`);
    return found;
  }
}
