import { Injectable } from '@nestjs/common';
import type {
  DepartureScan,
  GeoPoint,
  SavedTripPlan,
  SaveTripPlanInput,
  TripPlan,
  TripRequest,
} from '@margi-ai/shared';
import {
  evaluateTrip,
  getCatalog,
  scanDepartures,
  type TripContext,
} from '@margi-ai/shared/engine';
import { ExploreService } from '../explore/explore.service';
import { RoutingService } from '../routing/routing.service';
import { TripPlansService } from './trip-plans.service';

/** Chain of points a trip drives through: the origin, then each stop in order. */
function chainOf(request: TripRequest): GeoPoint[] {
  const places = getCatalog().places;
  const points: GeoPoint[] = [request.origin];
  for (const stop of request.stops) {
    const place = places.find((candidate) => candidate.venue.id === stop.venueId);
    if (place) points.push({ lat: place.venue.lat, lng: place.venue.lng });
  }
  return points;
}

/** Trip evaluation on real routing, plus guest-owned saved plans. */
@Injectable()
export class TripsService {
  constructor(
    private readonly explore: ExploreService,
    private readonly routing: RoutingService,
    private readonly plans: TripPlansService,
  ) {}

  /**
   * Engine context whose leg lookup carries routed figures for the trip's own legs.
   * Hypothetical legs (suggestion candidates) are not routed: they use the labelled estimate.
   * `freeFlowOnly` drops live delays, for scans across other departure times.
   */
  async context(
    request: TripRequest,
    simulate: boolean,
    freeFlowOnly = false,
  ): Promise<TripContext> {
    const base = this.explore.tripContext(simulate);
    const lookup = await this.routing.prefetch(chainOf(request), new Date(request.departAt));
    return {
      ...base,
      legOverride: (from, to) => {
        const leg = lookup(from, to);
        if (!leg || !freeFlowOnly) return leg;
        const { liveDelayMinutes: _dropped, ...rest } = leg;
        return rest;
      },
    };
  }

  async evaluate(request: TripRequest, simulate: boolean): Promise<TripPlan> {
    return evaluateTrip(request, await this.context(request, simulate));
  }

  async departures(request: TripRequest, simulate: boolean): Promise<DepartureScan> {
    return scanDepartures(request, await this.context(request, simulate, true));
  }

  list(guestSessionId: string): Promise<SavedTripPlan[]> {
    return this.plans.list(guestSessionId);
  }

  async save(
    guestSessionId: string,
    input: SaveTripPlanInput,
    simulate: boolean,
  ): Promise<SavedTripPlan> {
    const plan = await this.evaluate(input.request, simulate);
    const stopNames = plan.stops.map((stop) => ({
      en: stop.place.venue.nameEn,
      id: stop.place.venue.nameId,
    }));
    return this.plans.save(guestSessionId, input, plan.metrics, stopNames);
  }

  remove(guestSessionId: string, id: string): Promise<boolean> {
    return this.plans.remove(guestSessionId, id);
  }
}
