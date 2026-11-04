import { Global, Module } from '@nestjs/common';
import { TrafficSignalService } from './traffic-signal.service';

@Global()
@Module({
  providers: [TrafficSignalService],
  exports: [TrafficSignalService],
})
export class CrowdModule {}
