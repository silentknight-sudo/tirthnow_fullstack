import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog';
import { WeatherService } from './services/weather.service';
import { WeatherController } from './weather.controller';
import { WeatherFacade } from './weather.facade';

@Module({
  imports: [CatalogModule],
  controllers: [WeatherController],
  providers: [WeatherService, WeatherFacade],
  exports: [WeatherFacade],
})
export class WeatherModule {}
