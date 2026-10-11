import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { GoogleMapsAdapter } from './google.adapter';
import { MAPS_PROVIDER } from './maps.provider';
import { MockMapsAdapter } from './mock.adapter';

@Module({
  providers: [
    {
      provide: MAPS_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        config.maps.provider === 'google' ? new GoogleMapsAdapter(config) : new MockMapsAdapter(),
    },
  ],
  exports: [MAPS_PROVIDER],
})
export class MapsModule {}
