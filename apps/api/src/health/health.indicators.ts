import { Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';

/**
 * Custom Terminus readiness indicators for Postgres (`SELECT 1`), Redis (`PING`), and MinIO (`HeadBucket`) (TDD §10.6).
 */
@Injectable()
export class InfraHealthIndicators {
  constructor(
    private readonly indicator: HealthIndicatorService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
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

  async checkMinio(): Promise<HealthIndicatorResult<'minio'>> {
    const check = this.indicator.check('minio');
    try {
      await this.storage.checkBucket();
      return check.up();
    } catch {
      return check.down({ reason: 'MinIO HeadBucket failed' });
    }
  }
}
