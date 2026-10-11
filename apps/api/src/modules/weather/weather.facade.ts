import { Injectable } from '@nestjs/common';
import { type LatLng } from '../../core/geo';
import { WeatherService } from './services/weather.service';

/** Public surface of the weather module (used by AI tools and notifications). */
@Injectable()
export class WeatherFacade {
  constructor(private readonly weather: WeatherService) {}

  report(point: LatLng) {
    return this.weather.report(point);
  }
}
