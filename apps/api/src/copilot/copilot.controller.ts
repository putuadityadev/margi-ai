import { Body, Controller, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { CopilotReplySchema, CopilotRequestSchema, type CopilotReply } from '@margi-ai/shared';
import { UnknownVenueError } from '@margi-ai/shared/engine';
import { AppException } from '../common/app.exception';
import { GuestSid } from '../common/guest-session';
import { RateLimiter } from '../common/rate-limit';
import { parseInput } from '../common/parse-input';
import { CopilotService } from './copilot.service';

const SIMULATE_FLAG = 'surge';

/** 30 Copilot messages per 5 minutes per visitor protects the LLM budget. */
const limiter = new RateLimiter(30, 5 * 60 * 1000);

/** MARGI Copilot endpoint (TDD §10.8). Always answers: a failed LLM falls back to templates. */
@Controller('copilot')
export class CopilotController {
  constructor(private readonly copilot: CopilotService) {}

  @Post('reply')
  @HttpCode(HttpStatus.OK)
  async reply(
    @GuestSid() sid: string,
    @Body() body: unknown,
    @Query('sim') sim?: string,
  ): Promise<CopilotReply> {
    const request = parseInput(CopilotRequestSchema, body);
    limiter.take(sid);
    try {
      return CopilotReplySchema.parse(await this.copilot.reply(request, sim === SIMULATE_FLAG));
    } catch (error: unknown) {
      if (error instanceof UnknownVenueError) {
        throw new AppException('NOT_FOUND', 'Place not found', HttpStatus.NOT_FOUND);
      }
      throw error;
    }
  }
}
