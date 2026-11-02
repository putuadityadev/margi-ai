import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppConfig } from './config/app-config.service';
import { AppConfigModule } from './config/config.module';
import { buildPinoParams } from './config/logger.config';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => buildPinoParams(config.nodeEnv),
    }),
  ],
})
export class AppModule {}
