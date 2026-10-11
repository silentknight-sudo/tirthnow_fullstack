import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { MockWeatherAdapter } from './mock.adapter';
import { OpenWeatherAdapter } from './openweather.adapter';
import { WEATHER_PROVIDER } from './weather.provider';

@Module({
  providers: [
    {
      provide: WEATHER_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        config.weather.provider === 'openweather'
          ? new OpenWeatherAdapter(config)
          : new MockWeatherAdapter(),
    },
  ],
  exports: [WEATHER_PROVIDER],
})
export class WeatherProviderModule {}
