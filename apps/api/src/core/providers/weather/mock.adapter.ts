import { Injectable } from '@nestjs/common';
import { type LatLng } from '../../geo';
import { addDays, istDate, istMinutesOfDay, istToUtc } from '../../time';
import {
  type WeatherCondition,
  type WeatherDay,
  type WeatherProvider,
  type WeatherReport,
} from './weather.provider';

/** Monthly climate normals for Mathura–Vrindavan: [max °C, min °C, humidity %, typical condition]. */
const NORMALS: [number, number, number, WeatherCondition][] = [
  [22, 7, 70, 'fog'],
  [26, 10, 60, 'haze'],
  [32, 15, 45, 'clear'],
  [38, 21, 30, 'clear'],
  [42, 26, 30, 'haze'],
  [41, 28, 45, 'clouds'],
  [35, 27, 75, 'rain'],
  [33, 26, 80, 'rain'],
  [34, 25, 70, 'clouds'],
  [33, 20, 55, 'clear'],
  [28, 13, 60, 'haze'],
  [23, 8, 70, 'fog'],
];
const RAIN_CHANCE: Record<WeatherCondition, number> = {
  clear: 0,
  haze: 0,
  fog: 5,
  clouds: 20,
  drizzle: 50,
  rain: 70,
  thunderstorm: 80,
  snow: 0,
};

const normalsFor = (date: string): [number, number, number, WeatherCondition] =>
  NORMALS[Number(date.slice(5, 7)) - 1] ?? [30, 20, 50, 'clear'];

/** Small deterministic wobble so days differ but tests stay stable. */
function wobble(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (Math.abs(h) % 5) - 2;
}

/** Plausible, deterministic weather from climate normals (no network). */
@Injectable()
export class MockWeatherAdapter implements WeatherProvider {
  readonly name = 'mock';

  report(at: LatLng, now = new Date()): Promise<WeatherReport> {
    const today = istDate(now);
    const daily: WeatherDay[] = [0, 1, 2, 3, 4].map((n) => {
      const date = addDays(today, n);
      const [max, min, , condition] = normalsFor(date);
      const w = wobble(`${date}:${at.lat.toFixed(1)}:${at.lng.toFixed(1)}`);
      return {
        date,
        minC: min + w,
        maxC: max + w,
        condition,
        rainChancePct: RAIN_CHANCE[condition],
      };
    });
    const first = daily[0] ?? {
      date: today,
      minC: 20,
      maxC: 30,
      condition: 'clear' as const,
      rainChancePct: 0,
    };
    const [, , humidity] = normalsFor(today);
    // Coolest at 05:00, warmest at 15:00 IST.
    const minutes = istMinutesOfDay(now);
    const phase = Math.cos(((minutes / 60 - 15) / 24) * 2 * Math.PI);
    const tempC =
      Math.round((first.minC + ((first.maxC - first.minC) * (phase + 1)) / 2) * 10) / 10;
    const feelsLikeC = tempC >= 30 ? Math.round((tempC + (humidity / 100) * 6) * 10) / 10 : tempC;
    return Promise.resolve({
      now: {
        tempC,
        feelsLikeC,
        humidityPct: humidity,
        windKph: 8 + Math.abs(wobble(today)) * 2,
        condition: first.condition,
        description: first.condition === 'clear' ? 'clear sky' : first.condition,
        observedAt: now,
        sunrise: istToUtc(today, 6, 15),
        sunset: istToUtc(today, 18, 20),
      },
      daily,
    });
  }
}
