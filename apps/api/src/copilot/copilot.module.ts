import { Module } from '@nestjs/common';
import { ExploreModule } from '../explore/explore.module';
import { PlacesModule } from '../places/places.module';
import { TripsModule } from '../trips/trips.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { CopilotController } from './copilot.controller';
import { CopilotService } from './copilot.service';

@Module({
  imports: [ExploreModule, TripsModule, PlacesModule],
  controllers: [CopilotController, ChatController],
  providers: [CopilotService, ChatService],
})
export class CopilotModule {}
