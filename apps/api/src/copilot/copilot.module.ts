import { Module } from '@nestjs/common';
import { ExploreModule } from '../explore/explore.module';
import { TripsModule } from '../trips/trips.module';
import { CopilotController } from './copilot.controller';
import { CopilotService } from './copilot.service';

@Module({
  imports: [ExploreModule, TripsModule],
  controllers: [CopilotController],
  providers: [CopilotService],
})
export class CopilotModule {}
