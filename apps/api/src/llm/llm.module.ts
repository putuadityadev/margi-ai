import { Global, Module } from '@nestjs/common';
import { OpenRouterClient } from './openrouter.client';

@Global()
@Module({
  providers: [OpenRouterClient],
  exports: [OpenRouterClient],
})
export class LlmModule {}
