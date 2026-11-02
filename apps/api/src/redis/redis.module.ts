import { Global, Module } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT, RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: REDIS_CLIENT,
      inject: [RedisService],
      useFactory: (redisService: RedisService): Redis => redisService.client,
    },
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}
