import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthCheck, HealthCheckService, type HealthCheckResult } from '@nestjs/terminus';
import { AppConfig } from '../config/app-config.service';
import { InfraHealthIndicators } from './health.indicators';

export interface LivenessResponse {
  readonly status: 'ok';
  readonly version: string;
  readonly commit: string;
}

/**
 * Liveness (`/api/health`) and readiness (`/api/health/ready`) endpoints (TDD §10.6, Clarification C-09).
 */
@Controller({
  path: 'health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  constructor(
    private readonly config: AppConfig,
    private readonly health: HealthCheckService,
    private readonly indicators: InfraHealthIndicators,
  ) {}

  @Get()
  liveness(): LivenessResponse {
    return {
      status: 'ok',
      version: this.config.version,
      commit: this.config.gitCommit,
    };
  }

  @Get('ready')
  @HealthCheck()
  readiness(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.indicators.checkPostgres(),
      () => this.indicators.checkRedis(),
    ]);
  }
}
