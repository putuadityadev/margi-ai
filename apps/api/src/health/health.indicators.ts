import { Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

/**
 * Custom Terminus readiness indicators for Postgres (`SELECT 1`) and Redis (`PING`) (TDD §10.6).
 */
@Injectable()
export class InfraHealthIndicators {
  constructor(
    private readonly indicator: HealthIndicatorService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async checkPostgres(): Promise<HealthIndicatorResult<'postgres'>> {
    const check = this.indicator.check('postgres');
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return check.up();
    } catch {
      return check.down({ reason: 'Postgres query failed' });
    }
  }

  async checkRedis(): Promise<HealthIndicatorResult<'redis'>> {
    const check = this.indicator.check('redis');
    try {
      const reply = await this.redis.ping();
      return reply === 'PONG' ? check.up() : check.down({ reason: 'Unexpected PING reply' });
    } catch {
      return check.down({ reason: 'Redis PING failed' });
    }
  }
}
