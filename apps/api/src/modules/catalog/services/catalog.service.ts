import { Injectable } from '@nestjs/common';
import { type MediaAsset, type Poi, type Prisma } from '@prisma/client';
import { type Lang } from '@tirth-now/shared-types';
import { CacheService } from '../../../core/cache';
import { boundingBox, haversineKm, type LatLng, round1, withinRadius } from '../../../core/geo';
import { AppException } from '../../../core/http';
import { t, tOrNull } from '../../../core/i18n';
import { PrismaService } from '../../../core/prisma';
import { SettingsService } from '../../../core/settings';
import { addDays, fromDbDate, istDate } from '../../../core/time';
import { FilesFacade } from '../../files';
import {
  type CityResponse,
  type ExploreItemResponse,
  type FestivalResponse,
  type ParikramaRouteResponse,
  type PoiResponse,
  type SafetyDirectoryResponse,
  type TempleDetailResponse,
  type TempleSummaryResponse,
} from '../dto/catalog-responses.dto';
import {
  type ExploreQueryDto,
  type FestivalQueryDto,
  type PoiQueryDto,
  type TempleQueryDto,
} from '../dto/catalog-query.dto';
import { AartiService } from './aarti.service';

const DEFAULT_RADIUS_KM = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TempleWithCover = Prisma.TempleGetPayload<{ include: { cover: true } }>;

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesFacade,
    private readonly aarti: AartiService,
    private readonly cache: CacheService,
    private readonly settings: SettingsService,
  ) {}

  async cities(lang: Lang): Promise<CityResponse[]> {
    const rows = await this.cache.getOrSet('catalog:cities', 300, () =>
      this.prisma.city.findMany({ orderBy: { sortOrder: 'asc' } }),
    );
    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: t(c.nameI18n, lang),
      lat: c.lat,
      lng: c.lng,
    }));
  }

  async cityIdBySlug(slug: string | undefined): Promise<string | undefined> {
    if (!slug) return undefined;
    const city = await this.prisma.city.findUnique({ where: { slug }, select: { id: true } });
    if (!city) throw AppException.notFound(`Unknown city "${slug}"`);
    return city.id;
  }

  // ───────────── Temples ─────────────

  async temples(q: TempleQueryDto, lang: Lang): Promise<TempleSummaryResponse[]> {
    const cityId = await this.cityIdBySlug(q.city);
    const center = q.lat !== undefined && q.lng !== undefined ? { lat: q.lat, lng: q.lng } : null;
    const radius = q.radiusKm ?? DEFAULT_RADIUS_KM;
    const rows = await this.prisma.temple.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        ...(cityId ? { cityId } : {}),
        ...(q.tag ? { tags: { has: q.tag } } : {}),
        ...(center ? boundingBox(center, radius) : {}),
      },
      include: { cover: true },
      orderBy: [{ crowdLevel: 'desc' }, { slug: 'asc' }],
      take: 200,
    });
    const ordered = center ? withinRadius(rows, center, radius) : rows;
    return Promise.all(ordered.map((r) => this.templeSummary(r, lang, center)));
  }

  async temple(idOrSlug: string, lang: Lang): Promise<TempleDetailResponse> {
    const temple = await this.prisma.temple.findFirst({
      where: {
        deletedAt: null,
        isPublished: true,
        ...(UUID.test(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug }),
      },
      include: { cover: true },
    });
    if (!temple) throw AppException.notFound('Temple not found');
    const today = istDate(new Date());
    const [aartiToday, upcoming, gallery] = await Promise.all([
      this.aarti.instancesForTemple(temple.id, today, today, lang),
      this.aarti.nextForTemple(temple.id, lang),
      temple.galleryMediaIds.length > 0
        ? this.prisma.mediaAsset.findMany({
            where: { id: { in: temple.galleryMediaIds }, status: 'ready', deletedAt: null },
          })
        : Promise.resolve([] as MediaAsset[]),
    ]);
    return Object.assign(await this.templeSummary(temple, lang, null), {
      description: tOrNull(temple.descriptionI18n, lang),
      history: tOrNull(temple.historyI18n, lang),
      address: temple.address,
      openingHours: temple.openingHours,
      dressCode: tOrNull(temple.dressCodeI18n, lang),
      galleryUrls: await Promise.all(gallery.map((m) => this.files.url(m, 'medium'))),
      aartiToday,
      nextAarti: upcoming,
    });
  }

  private async templeSummary(
    r: TempleWithCover & { distanceKm?: number },
    lang: Lang,
    center: LatLng | null,
  ): Promise<TempleSummaryResponse> {
    return {
      id: r.id,
      slug: r.slug,
      cityId: r.cityId,
      name: t(r.nameI18n, lang),
      lat: r.lat,
      lng: r.lng,
      tags: r.tags,
      crowdLevel: r.crowdLevel,
      coverUrl:
        r.cover && r.cover.status === 'ready' ? await this.files.url(r.cover, 'medium') : null,
      ...(center ? { distanceKm: r.distanceKm ?? round1(haversineKm(center, r)) } : {}),
    };
  }

  // ───────────── Festivals ─────────────

  async festivals(q: FestivalQueryDto, lang: Lang): Promise<FestivalResponse[]> {
    const cityId = await this.cityIdBySlug(q.city);
    const from = q.from ?? istDate(new Date());
    const to = q.to ?? addDays(from, 180);
    const rows = await this.prisma.festival.findMany({
      where: {
        ...(cityId ? { OR: [{ cityId }, { cityId: null }] } : {}),
        endsOn: { gte: new Date(`${from}T00:00:00Z`) },
        startsOn: { lte: new Date(`${to}T00:00:00Z`) },
      },
      orderBy: { startsOn: 'asc' },
    });
    return rows.map((f) => ({
      id: f.id,
      name: t(f.nameI18n, lang),
      description: tOrNull(f.descriptionI18n, lang),
      startsOn: fromDbDate(f.startsOn),
      endsOn: fromDbDate(f.endsOn),
      cityId: f.cityId,
      templeId: f.templeId,
      crowdAdvisory: tOrNull(f.crowdAdvisoryI18n, lang),
    }));
  }

  // ───────────── POIs & safety ─────────────

  async pois(q: PoiQueryDto, lang: Lang): Promise<PoiResponse[]> {
    const cityId = await this.cityIdBySlug(q.city);
    const center = q.lat !== undefined && q.lng !== undefined ? { lat: q.lat, lng: q.lng } : null;
    const radius = q.radiusKm ?? DEFAULT_RADIUS_KM;
    const rows = await this.prisma.poi.findMany({
      where: {
        deletedAt: null,
        ...(cityId ? { cityId } : {}),
        ...(q.category ? { category: q.category } : {}),
        ...(q.emergency !== undefined ? { isEmergency: q.emergency } : {}),
        ...(center ? boundingBox(center, radius) : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 300,
    });
    const ordered = center ? withinRadius(rows, center, radius) : rows;
    return ordered.map((p) => this.poiResponse(p, lang));
  }

  poiResponse(p: Poi & { distanceKm?: number }, lang: Lang): PoiResponse {
    return {
      id: p.id,
      cityId: p.cityId,
      category: p.category,
      name: t(p.nameI18n, lang),
      lat: p.lat,
      lng: p.lng,
      address: p.address,
      phoneE164: p.phoneE164,
      is24x7: p.is24x7,
      isEmergency: p.isEmergency,
      ...(p.distanceKm !== undefined ? { distanceKm: p.distanceKm } : {}),
    };
  }

  /** Emergency POIs + national helplines; cached on the device for offline use. */
  async safetyDirectory(lang: Lang): Promise<SafetyDirectoryResponse> {
    const [pois, helplines, latest] = await Promise.all([
      this.prisma.poi.findMany({
        where: { deletedAt: null, isEmergency: true },
        orderBy: [{ cityId: 'asc' }, { category: 'asc' }],
      }),
      this.settings.get<{ name: string; phone: string }[]>('safety.helplines', [
        { name: 'Emergency (all services)', phone: '112' },
      ]),
      this.prisma.poi.aggregate({ _max: { updatedAt: true } }),
    ]);
    return {
      helplines,
      pois: pois.map((p) => this.poiResponse(p, lang)),
      updatedAt: (latest._max.updatedAt ?? new Date(0)).toISOString(),
    };
  }

  async nearestEmergencyPois(center: LatLng, lang: Lang, perCategory = 2): Promise<PoiResponse[]> {
    const rows = await this.prisma.poi.findMany({
      where: { deletedAt: null, isEmergency: true, ...boundingBox(center, 30) },
    });
    const sorted = withinRadius(rows, center, 30);
    const counts = new Map<string, number>();
    const picked = sorted.filter((p) => {
      const n = counts.get(p.category) ?? 0;
      counts.set(p.category, n + 1);
      return n < perCategory;
    });
    return picked.map((p) => this.poiResponse(p, lang));
  }

  // ───────────── Explore & parikrama ─────────────

  async explore(q: ExploreQueryDto, lang: Lang): Promise<ExploreItemResponse[]> {
    const cityId = await this.cityIdBySlug(q.city);
    const rows = await this.prisma.exploreItem.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        ...(cityId ? { cityId } : {}),
        ...(q.kind ? { kind: q.kind } : {}),
      },
      include: { cover: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: 200,
    });
    return Promise.all(rows.map((r) => this.exploreResponse(r, lang)));
  }

  async exploreItem(id: string, lang: Lang): Promise<ExploreItemResponse> {
    const row = await this.prisma.exploreItem.findFirst({
      where: { id, deletedAt: null, isPublished: true },
      include: { cover: true },
    });
    if (!row) throw AppException.notFound('Explore item not found');
    return this.exploreResponse(row, lang);
  }

  private async exploreResponse(
    r: Prisma.ExploreItemGetPayload<{ include: { cover: true } }>,
    lang: Lang,
  ): Promise<ExploreItemResponse> {
    return {
      id: r.id,
      cityId: r.cityId,
      kind: r.kind,
      title: t(r.titleI18n, lang),
      body: tOrNull(r.bodyI18n, lang),
      lat: r.lat,
      lng: r.lng,
      coverUrl:
        r.cover && r.cover.status === 'ready' ? await this.files.url(r.cover, 'medium') : null,
    };
  }

  async parikramaRoutes(lang: Lang): Promise<ParikramaRouteResponse[]> {
    const rows = await this.prisma.parikramaRoute.findMany({
      orderBy: { slug: 'asc' },
      select: { slug: true },
    });
    return Promise.all(rows.map((r) => this.parikramaRoute(r.slug, lang)));
  }

  async parikramaRoute(slug: string, lang: Lang): Promise<ParikramaRouteResponse> {
    const route = await this.prisma.parikramaRoute.findUnique({
      where: { slug },
      include: { stops: { orderBy: { seq: 'asc' }, include: { temple: true, poi: true } } },
    });
    if (!route) throw AppException.notFound('Route not found');
    return {
      id: route.id,
      slug: route.slug,
      name: t(route.nameI18n, lang),
      description: tOrNull(route.descriptionI18n, lang),
      distanceM: route.distanceM,
      estDurationMin: route.estDurationMin,
      polyline: route.polyline,
      difficulty: route.difficulty,
      stops: route.stops.map((s) => {
        const place = s.temple ?? s.poi;
        return {
          seq: s.seq,
          templeId: s.templeId,
          poiId: s.poiId,
          name: place ? t(place.nameI18n, lang) : '',
          lat: place?.lat ?? null,
          lng: place?.lng ?? null,
          note: tOrNull(s.noteI18n, lang),
        };
      }),
    };
  }
}
