import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ChatRequestSchema, type ChatReply } from '@margi-ai/shared';
import { GuestSid } from '../common/guest-session';
import { parseInput } from '../common/parse-input';
import { RateLimiter } from '../common/rate-limit';
import { ChatService } from './chat.service';

/** 20 messages per 5 minutes per visitor: far above a real conversation, far below a script. */
const limiter = new RateLimiter(20, 5 * 60 * 1000);

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post('reply')
  @HttpCode(HttpStatus.OK)
  reply(@GuestSid() sid: string, @Body() body: unknown): Promise<ChatReply> {
    const request = parseInput(ChatRequestSchema, body);
    limiter.take(sid);
    return this.chat.reply(request);
  }
}
