import { Module } from '@nestjs/common';
import { MockTransitAdapter } from './mock.adapter';
import { TRANSIT_PROVIDER } from './transit.provider';

/** Only a mock today; TRANSIT_PROVIDER gains a real value when a data partner is chosen (ADR-0012). */
@Module({
  providers: [{ provide: TRANSIT_PROVIDER, useClass: MockTransitAdapter }],
  exports: [TRANSIT_PROVIDER],
})
export class TransitProviderModule {}
