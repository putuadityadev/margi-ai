import { Module } from '@nestjs/common';
import { ExploreModule } from '../explore/explore.module';
import { LearnedPlacesService } from './learned-places.service';
import { PlaceResolverService } from './place-resolver.service';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';

@Module({
  imports: [ExploreModule],
  controllers: [PlacesController],
  providers: [PlaceResolverService, LearnedPlacesService, PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
