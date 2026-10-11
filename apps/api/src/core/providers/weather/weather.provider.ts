import { type LatLng } from '../../geo';

export type WeatherCondition =
  'clear' | 'clouds' | 'rain' | 'drizzle' | 'thunderstorm' | 'fog' | 'haze' | 'snow';

export interface WeatherNow {
  tempC: number;
  feelsLikeC: number;
  humidityPct: number;
  windKph: number;
  condition: WeatherCondition;
  description: string;
  observedAt: Date;
  sunrise: Date | null;
  sunset: Date | null;
}

export interface WeatherDay {
  /** IST calendar date, YYYY-MM-DD. */
  date: string;
  minC: number;
  maxC: number;
  condition: WeatherCondition;
  rainChancePct: number;
}

export interface WeatherReport {
  now: WeatherNow;
  /** Today and the next days, as far as the provider forecasts (usually 5). */
  daily: WeatherDay[];
}

/** OpenWeather today; IMD or others can implement the same interface. */
export interface WeatherProvider {
  readonly name: string;
  report(at: LatLng): Promise<WeatherReport>;
}

export const WEATHER_PROVIDER = Symbol('WEATHER_PROVIDER');
