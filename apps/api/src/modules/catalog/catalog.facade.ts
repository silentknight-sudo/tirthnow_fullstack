import { Injectable } from '@nestjs/common';
import { type Lang } from '@tirth-now/shared-types';
import { type LatLng } from '../../core/geo';
import { PrismaService } from '../../core/prisma';
import {
  type AartiInstanceResponse,
  type PoiResponse,
  type TempleSummaryResponse,
} from './dto/catalog-responses.dto';
import { AartiService } from './services/aarti.service';
import { CatalogService } from './services/catalog.service';
import { type SearchSource, SearchService } from './services/search.service';

/** Public surface of the catalog module. */
@Injectable()
export class CatalogFacade {
  constructor(
    private readonly catalog: CatalogService,
    private readonly aarti: AartiService,
    private readonly search: SearchService,
    private readonly prisma: PrismaService,
  ) {}

  async cityExists(cityId: string): Promise<boolean> {
    return (await this.prisma.city.count({ where: { id: cityId } })) === 1;
  }

  cityIdBySlug(slug: string): Promise<string | undefined> {
    return this.catalog.cityIdBySlug(slug);
  }

  async citySlugs(): Promise<
    { id: string; slug: string; name: string; lat: number; lng: number }[]
  > {
    return (await this.catalog.cities('en')).map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      lat: c.lat,
      lng: c.lng,
    }));
  }

  temples(filter: { city?: string; tag?: string }, lang: Lang): Promise<TempleSummaryResponse[]> {
    return this.catalog.temples(filter, lang);
  }

  async templesByIds(ids: string[], lang: Lang): Promise<TempleSummaryResponse[]> {
    const all = await this.catalog.temples({}, lang);
    return all.filter((t) => ids.includes(t.id));
  }

  async templeExists(templeId: string): Promise<boolean> {
    return (await this.prisma.temple.count({ where: { id: templeId, deletedAt: null } })) === 1;
  }

  /** Authoritative aarti times (IST dates). */
  aartiInstances(
    templeIds: string[],
    from: string,
    to: string,
    lang: Lang,
  ): Promise<AartiInstanceResponse[]> {
    return this.aarti.instancesForTemples(templeIds, from, to, lang);
  }

  /** Occurrences of specific schedules between two IST dates (reminders). */
  aartiOccurrences(
    scheduleIds: string[],
    from: string,
    to: string,
    lang: Lang,
  ): Promise<AartiInstanceResponse[]> {
    return this.aarti.instancesForSchedules(scheduleIds, from, to, lang);
  }

  nextAarti(templeId: string, lang: Lang, now?: Date): Promise<AartiInstanceResponse | null> {
    return this.aarti.nextForTemple(templeId, lang, now);
  }

  upcomingAarti(
    cityId: string | undefined,
    limit: number,
    lang: Lang,
    now?: Date,
  ): Promise<AartiInstanceResponse[]> {
    return this.aarti.upcoming(cityId, limit, lang, now);
  }

  async aartiSchedule(scheduleId: string) {
    return this.prisma.aartiSchedule.findUnique({
      where: { id: scheduleId },
      include: { temple: true },
    });
  }

  nearestEmergencyPois(center: LatLng, lang: Lang): Promise<PoiResponse[]> {
    return this.catalog.nearestEmergencyPois(center, lang);
  }

  registerSearchSource(source: SearchSource): void {
    this.search.register(source);
  }
}
