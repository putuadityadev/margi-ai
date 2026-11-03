import { Module } from '@nestjs/common';
import { ExploreModule } from '../explore/explore.module';
import { TripPlansService } from './trip-plans.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [ExploreModule],
  controllers: [TripsController],
  providers: [TripsService, TripPlansService],
  exports: [TripsService],
})
export class TripsModule {}
