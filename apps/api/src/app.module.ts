import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { ContextModule } from './context/context.module';
import { CrowdModule } from './crowd/crowd.module';
import { CopilotModule } from './copilot/copilot.module';
import { ExploreModule } from './explore/explore.module';
import { LlmModule } from './llm/llm.module';
import { RoutingModule } from './routing/routing.module';
import { TripsModule } from './trips/trips.module';
import { AppConfig } from './config/app-config.service';
import { AppConfigModule } from './config/config.module';
import { buildPinoParams } from './config/logger.config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => buildPinoParams(config.nodeEnv),
    }),
    PrismaModule,
    AuthModule,
    AdminModule,
    RedisModule,
    StorageModule,
    HealthModule,
    CatalogModule,
    ContextModule,
    CrowdModule,
    RoutingModule,
    LlmModule,
    ExploreModule,
    TripsModule,
    CopilotModule,
  ],
})
export class AppModule {}
