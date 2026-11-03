import { Body, Controller, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { CopilotReplySchema, CopilotRequestSchema, type CopilotReply } from '@margi-ai/shared';
import { UnknownVenueError } from '@margi-ai/shared/engine';
import { AppException } from '../common/app.exception';
import { parseInput } from '../common/parse-input';
import { CopilotService } from './copilot.service';

const SIMULATE_FLAG = 'surge';

/** MARGI Copilot endpoint (TDD §10.8). Always answers: a failed LLM falls back to templates. */
@Controller('copilot')
export class CopilotController {
  constructor(private readonly copilot: CopilotService) {}

  @Post('reply')
  @HttpCode(HttpStatus.OK)
  async reply(@Body() body: unknown, @Query('sim') sim?: string): Promise<CopilotReply> {
    const request = parseInput(CopilotRequestSchema, body);
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
