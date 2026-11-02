import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
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
    RedisModule,
    StorageModule,
    HealthModule,
  ],
})
export class AppModule {}
