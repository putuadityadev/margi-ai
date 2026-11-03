import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import {
  GeoPointSchema,
  NearbyQuerySchema,
  PlaceDetailQuerySchema,
  PlaceSearchQuerySchema,
  type Area,
  type Corridor,
  type NearbyPlace,
  type NearbyResponse,
  type PlaceDetail,
  type ReverseGeocode,
} from '@margi-ai/shared';
import { buildPlaceDetail } from '@margi-ai/shared/engine';
import { AppException } from '../common/app.exception';
import { parseInput } from '../common/parse-input';
import { CatalogService } from '../catalog/catalog.service';
import { ExploreService } from './explore.service';

const SIMULATE_FLAG = 'surge';

function wantsSimulation(sim: string | undefined): boolean {
  return sim === SIMULATE_FLAG;
}

/** Map-first explore API (TDD §10.7). Every figure is computed by the shared engine. */
@Controller()
export class ExploreController {
  constructor(
    private readonly explore: ExploreService,
    private readonly catalog: CatalogService,
  ) {}

  @Get('explore/nearby')
  async nearby(@Query() raw: Record<string, string>): Promise<NearbyResponse> {
    const query = parseInput(NearbyQuerySchema, raw);
    const ctx = this.explore.exploreContext(
      { lat: query.lat, lng: query.lng },
      query.vibes,
      query.at,
      wantsSimulation(raw.sim),
    );
    return {
      origin: { lat: query.lat, lng: query.lng },
      radiusKm: query.radiusKm,
      generatedAt: ctx.at.toISO() ?? new Date().toISOString(),
      places: await this.explore.nearby(ctx, query.radiusKm, query.at),
    };
  }

  @Get('explore/places/:venueId')
  async place(
    @Param('venueId') venueId: string,
    @Query() raw: Record<string, string>,
  ): Promise<PlaceDetail> {
    const query = parseInput(PlaceDetailQuerySchema, raw);
    const ctx = this.explore.exploreContext(
      { lat: query.lat, lng: query.lng },
      query.vibes,
      query.at,
      wantsSimulation(raw.sim),
    );
    const detail = buildPlaceDetail(
      venueId,
      await this.explore.placeContext(ctx, venueId, query.at),
    );
    if (!detail) throw new AppException('NOT_FOUND', 'Place not found', HttpStatus.NOT_FOUND);
    return detail;
  }

  @Get('explore/search')
  search(@Query() raw: Record<string, string>): NearbyPlace[] {
    const query = parseInput(PlaceSearchQuerySchema, raw);
    return this.explore.search(query.q, { lat: query.lat, lng: query.lng });
  }

  @Get('explore/corridors')
  corridors(): readonly Corridor[] {
    return this.catalog.corridors;
  }

  @Get('geo/areas')
  areas(): readonly Area[] {
    return this.catalog.areas;
  }

  @Get('geo/reverse')
  reverse(@Query() raw: Record<string, string>): ReverseGeocode {
    const point = parseInput(GeoPointSchema, { lat: Number(raw.lat), lng: Number(raw.lng) });
    const result = this.catalog.reverse(point);
    if (!result) throw new AppException('NOT_FOUND', 'No areas configured', HttpStatus.NOT_FOUND);
    return result;
  }
}
