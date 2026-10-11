import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { type Lang } from '@tirth-now/shared-types';
import { CacheService } from '../../../core/cache';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { type LatLng } from '../../../core/geo';
import { AppException } from '../../../core/http';
import { MaintenanceRegistry } from '../../../core/maintenance';
import { WEATHER_PROVIDER, type WeatherProvider } from '../../../core/providers';
import { CatalogFacade } from '../../catalog';
import { type WeatherQueryDto, type WeatherResponse } from '../dto/weather.dto';
import { advisoriesFor } from './advisories';

type CachedReport = Omit<WeatherResponse, 'advisories' | 'cityId'>;

/** ~1 km grid so nearby requests share a cache entry. */
const cell = (p: LatLng): LatLng => ({
  lat: Math.round(p.lat * 100) / 100,
  lng: Math.round(p.lng * 100) / 100,
});

@Injectable()
export class WeatherService implements OnModuleInit {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    @Inject(WEATHER_PROVIDER) private readonly provider: WeatherProvider,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly cache: CacheService,
    private readonly catalog: CatalogFacade,
    private readonly maintenance: MaintenanceRegistry,
  ) {}

  onModuleInit(): void {
    // Keep every city warm so the home screen never waits on the provider.
    this.maintenance.registerRecurring(
      'prewarm-weather',
      this.config.weather.cacheSeconds * 1000,
      () => this.prewarm(),
    );
  }

  async get(q: WeatherQueryDto, lang: Lang): Promise<WeatherResponse> {
    let point: LatLng;
    let cityId: string | null = null;
    if (q.city) {
      const city = (await this.catalog.citySlugs()).find((c) => c.slug === q.city);
      if (!city) throw AppException.notFound(`Unknown city "${q.city}"`);
      point = { lat: city.lat, lng: city.lng };
      cityId = city.id;
    } else if (q.lat !== undefined && q.lng !== undefined) {
      point = { lat: q.lat, lng: q.lng };
    } else {
      throw AppException.badRequest('Pass city or lat and lng');
    }
    const report = await this.report(point);
    return { ...report, cityId, advisories: advisoriesFor(report.daily, lang) };
  }

  /** Cached report for a point (shared by the AI tools and the trip planner via the facade). */
  async report(point: LatLng): Promise<CachedReport> {
    const c = cell(point);
    return this.cache.getOrSet(
      `weather:${String(c.lat)}:${String(c.lng)}`,
      this.config.weather.cacheSeconds,
      () => this.fetch(c),
    );
  }

  private async fetch(c: LatLng): Promise<CachedReport> {
    const r = await this.provider.report(c);
    return {
      lat: c.lat,
      lng: c.lng,
      now: {
        ...r.now,
        observedAt: r.now.observedAt.toISOString(),
        sunrise: r.now.sunrise?.toISOString() ?? null,
        sunset: r.now.sunset?.toISOString() ?? null,
      },
      daily: r.daily,
      source: this.provider.name,
      fetchedAt: new Date().toISOString(),
    };
  }

  async prewarm(): Promise<number> {
    const cities = await this.catalog.citySlugs();
    let ok = 0;
    for (const city of cities) {
      try {
        const c = cell(city);
        await this.cache.set(
          `weather:${String(c.lat)}:${String(c.lng)}`,
          await this.fetch(c),
          this.config.weather.cacheSeconds,
        );
        ok++;
      } catch (err) {
        this.logger.warn({ err, city: city.slug }, 'weather pre-warm failed');
      }
    }
    return ok;
  }
}
