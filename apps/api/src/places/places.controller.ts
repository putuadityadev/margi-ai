import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PinPlaceRequestSchema, type PinPlaceResponse } from '@margi-ai/shared';
import { AppException } from '../common/app.exception';
import { GuestSid } from '../common/guest-session';
import { parseInput } from '../common/parse-input';
import { RateLimiter } from '../common/rate-limit';
import { ExploreService } from '../explore/explore.service';
import { LearnedPlacesService } from './learned-places.service';

/** A pin is a deliberate act; 10 per 10 minutes is plenty and keeps the database tidy. */
const limiter = new RateLimiter(10, 10 * 60 * 1000);

@Controller('places')
export class PlacesController {
  constructor(
    private readonly learned: LearnedPlacesService,
    private readonly explore: ExploreService,
  ) {}

  /** Saves a place the traveller marked on the map (search could not find it). Guests may do it. */
  @Post('pin')
  @HttpCode(HttpStatus.OK)
  async pin(@GuestSid() sid: string, @Body() body: unknown): Promise<PinPlaceResponse> {
    const input = parseInput(PinPlaceRequestSchema, body);
    limiter.take(sid);
    const point = { lat: input.lat, lng: input.lng };
    const row = await this.learned.learnPin(input.name, point);
    if (!row) {
      throw new AppException(
        'VALIDATION_FAILED',
        'Invalid input: lat, lng (outside Bali)',
        HttpStatus.BAD_REQUEST,
      );
    }
    const place = this.explore.placeById(row.id, input.origin ?? point);
    if (!place) {
      throw new AppException('NOT_FOUND', 'Place not found', HttpStatus.NOT_FOUND);
    }
    return { place };
  }
}
