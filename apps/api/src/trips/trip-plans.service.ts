import { Injectable } from '@nestjs/common';
import {
  SavedTripPlanSchema,
  type SavedTripPlan,
  type SaveTripPlanInput,
  type TripMetrics,
} from '@margi-ai/shared';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Origin coordinates are rounded to 2 decimals (about 1 km) before storage: no precise GPS at rest. */
const ORIGIN_DECIMALS = 2;
const MAX_PLANS_PER_GUEST = 50;

function roundOrigin(request: SaveTripPlanInput['request']): SaveTripPlanInput['request'] {
  const factor = 10 ** ORIGIN_DECIMALS;
  return {
    ...request,
    origin: {
      lat: Math.round(request.origin.lat * factor) / factor,
      lng: Math.round(request.origin.lng * factor) / factor,
    },
  };
}

/** Guest-first saved plans (D-026): owned by the anonymous session cookie, no account needed. */
@Injectable()
export class TripPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async list(guestSessionId: string): Promise<SavedTripPlan[]> {
    const rows = await this.prisma.tripPlan.findMany({
      where: { guestSessionId },
      orderBy: { createdAt: 'desc' },
      take: MAX_PLANS_PER_GUEST,
    });
    return rows.map((row) =>
      SavedTripPlanSchema.parse({
        id: row.id,
        title: row.title,
        situation: row.situation,
        request: row.request,
        changeLog: row.changeLog,
        metrics: row.metrics,
        stopNames: row.stopNames,
        savedAt: row.createdAt.toISOString(),
      }),
    );
  }

  async save(
    guestSessionId: string,
    input: SaveTripPlanInput,
    metrics: TripMetrics,
    stopNames: ReadonlyArray<{ en: string; id: string }>,
  ): Promise<SavedTripPlan> {
    const request = roundOrigin(input.request);
    const row = await this.prisma.tripPlan.create({
      data: {
        guestSessionId,
        title: input.title,
        situation: input.situation,
        request: request,
        metrics: metrics,
        stopNames: stopNames,
        changeLog: input.changeLog,
      },
    });
    return SavedTripPlanSchema.parse({
      ...input,
      request,
      id: row.id,
      metrics,
      stopNames,
      savedAt: row.createdAt.toISOString(),
    });
  }

  /** Deletes a plan owned by the caller; false when it does not exist or belongs to someone else. */
  async remove(guestSessionId: string, id: string): Promise<boolean> {
    const result = await this.prisma.tripPlan.deleteMany({ where: { id, guestSessionId } });
    return result.count > 0;
  }
}
