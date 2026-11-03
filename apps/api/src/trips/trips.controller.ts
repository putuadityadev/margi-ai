import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  DepartureScanSchema,
  SavedTripPlanSchema,
  SaveTripPlanInputSchema,
  TripInsightSchema,
  TripPlanSchema,
  TripRequestSchema,
  type DepartureScan,
  type SavedTripPlan,
  type TripInsight,
  type TripPlan,
} from '@margi-ai/shared';
import { UnknownVenueError } from '@margi-ai/shared/engine';
import { AppException } from '../common/app.exception';
import { GuestSid } from '../common/guest-session';
import { parseInput } from '../common/parse-input';
import { TripsService } from './trips.service';

const SIMULATE_FLAG = 'surge';

function unknownVenueToNotFound(error: unknown): never {
  if (error instanceof UnknownVenueError) {
    throw new AppException('NOT_FOUND', 'Place not found', HttpStatus.NOT_FOUND);
  }
  throw error;
}

/** Trip planner API (TDD §10.8). Plans belong to the anonymous guest session cookie. */
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluate(@Body() body: unknown, @Query('sim') sim?: string): Promise<TripPlan> {
    const request = parseInput(TripRequestSchema, body);
    try {
      return TripPlanSchema.parse(await this.trips.evaluate(request, sim === SIMULATE_FLAG));
    } catch (error: unknown) {
      return unknownVenueToNotFound(error);
    }
  }

  @Post('departures')
  @HttpCode(HttpStatus.OK)
  async departures(@Body() body: unknown, @Query('sim') sim?: string): Promise<DepartureScan> {
    const request = parseInput(TripRequestSchema, body);
    try {
      return DepartureScanSchema.parse(await this.trips.departures(request, sim === SIMULATE_FLAG));
    } catch (error: unknown) {
      return unknownVenueToNotFound(error);
    }
  }

  @Post('insight')
  @HttpCode(HttpStatus.OK)
  async insight(@Body() body: unknown, @Query('sim') sim?: string): Promise<TripInsight> {
    const request = parseInput(TripRequestSchema, body);
    try {
      return TripInsightSchema.parse(await this.trips.insight(request, sim === SIMULATE_FLAG));
    } catch (error: unknown) {
      return unknownVenueToNotFound(error);
    }
  }

  @Get('plans')
  list(@GuestSid() sid: string): Promise<SavedTripPlan[]> {
    return this.trips.list(sid);
  }

  @Post('plans')
  async save(
    @GuestSid() sid: string,
    @Body() body: unknown,
    @Query('sim') sim?: string,
  ): Promise<SavedTripPlan> {
    const input = parseInput(SaveTripPlanInputSchema, body);
    try {
      return SavedTripPlanSchema.parse(await this.trips.save(sid, input, sim === SIMULATE_FLAG));
    } catch (error: unknown) {
      return unknownVenueToNotFound(error);
    }
  }

  @Delete('plans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@GuestSid() sid: string, @Param('id') id: string): Promise<void> {
    const removed = await this.trips.remove(sid, id);
    if (!removed) throw new AppException('NOT_FOUND', 'Plan not found', HttpStatus.NOT_FOUND);
  }
}
