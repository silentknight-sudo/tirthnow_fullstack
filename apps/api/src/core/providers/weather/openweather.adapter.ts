import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { type LatLng } from '../../geo';
import { istDate } from '../../time';
import { callWithPolicy } from '../call-policy';
import { readJsonOrThrow } from '../http-error';
import {
  type WeatherCondition,
  type WeatherDay,
  type WeatherProvider,
  type WeatherReport,
} from './weather.provider';

interface OwCondition {
  main: string;
  description: string;
}
interface OwCurrent {
  dt: number;
  weather: OwCondition[];
  main: { temp: number; feels_like: number; humidity: number };
  wind: { speed: number };
  sys: { sunrise?: number; sunset?: number };
}
interface OwForecast {
  list: {
    dt: number;
    main: { temp_min: number; temp_max: number };
    weather: OwCondition[];
    pop?: number;
  }[];
}

const CONDITIONS: Record<string, WeatherCondition> = {
  Clear: 'clear',
  Clouds: 'clouds',
  Rain: 'rain',
  Drizzle: 'drizzle',
  Thunderstorm: 'thunderstorm',
  Snow: 'snow',
  Mist: 'fog',
  Fog: 'fog',
};
export const mapCondition = (main: string | undefined): WeatherCondition =>
  main ? (CONDITIONS[main] ?? 'haze') : 'clear';
const round1 = (n: number) => Math.round(n * 10) / 10;

/** OpenWeather current weather + 5-day / 3-hour forecast (free tier), aggregated per IST day. */
@Injectable()
export class OpenWeatherAdapter implements WeatherProvider {
  readonly name = 'openweather';
  private readonly apiKey: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    if (!config.weather.openWeatherApiKey) throw new Error('OPENWEATHER_API_KEY is not configured');
    this.apiKey = config.weather.openWeatherApiKey;
  }

  async report(at: LatLng): Promise<WeatherReport> {
    const q = `lat=${String(at.lat)}&lon=${String(at.lng)}&units=metric&appid=${this.apiKey}`;
    const get = <T>(path: string) =>
      callWithPolicy(
        'openweather',
        async () =>
          readJsonOrThrow<T>(
            'openweather',
            await fetch(`https://api.openweathermap.org/data/2.5/${path}?${q}`),
          ),
        {
          timeoutMs: 5_000,
          retries: 2,
        },
      );
    const [cur, fc] = await Promise.all([get<OwCurrent>('weather'), get<OwForecast>('forecast')]);
    return { now: toNow(cur), daily: toDaily(fc) };
  }
}

function toNow(c: OwCurrent): WeatherReport['now'] {
  return {
    tempC: round1(c.main.temp),
    feelsLikeC: round1(c.main.feels_like),
    humidityPct: Math.round(c.main.humidity),
    windKph: round1(c.wind.speed * 3.6),
    condition: mapCondition(c.weather[0]?.main),
    description: c.weather[0]?.description ?? '',
    observedAt: new Date(c.dt * 1000),
    sunrise: c.sys.sunrise ? new Date(c.sys.sunrise * 1000) : null,
    sunset: c.sys.sunset ? new Date(c.sys.sunset * 1000) : null,
  };
}

export function toDaily(f: OwForecast): WeatherDay[] {
  const days = new Map<
    string,
    { min: number; max: number; pop: number; counts: Map<WeatherCondition, number> }
  >();
  for (const slot of f.list) {
    const date = istDate(new Date(slot.dt * 1000));
    const d = days.get(date) ?? {
      min: Infinity,
      max: -Infinity,
      pop: 0,
      counts: new Map<WeatherCondition, number>(),
    };
    d.min = Math.min(d.min, slot.main.temp_min);
    d.max = Math.max(d.max, slot.main.temp_max);
    d.pop = Math.max(d.pop, slot.pop ?? 0);
    const cond = mapCondition(slot.weather[0]?.main);
    d.counts.set(cond, (d.counts.get(cond) ?? 0) + 1);
    days.set(date, d);
  }
  return [...days.entries()].map(([date, d]) => ({
    date,
    minC: round1(d.min),
    maxC: round1(d.max),
    condition: [...d.counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'clear',
    rainChancePct: Math.round(d.pop * 100),
  }));
}
