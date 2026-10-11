import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type Prisma } from '@prisma/client';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { CacheService } from '../../../core/cache';
import { AppException } from '../../../core/http';
import { i18nJson, type I18nTextDto } from '../../../core/i18n';
import { PrismaService } from '../../../core/prisma';
import { dbDate, dbTime } from '../../../core/time';
import { FilesFacade } from '../../files';
import {
  type CreateAartiScheduleDto,
  type CreateCityDto,
  type CreateExploreItemDto,
  type CreateFestivalDto,
  type CreatePoiDto,
  type CreateTempleDto,
  type UpdateAartiScheduleDto,
  type UpdateCityDto,
  type UpdateExploreItemDto,
  type UpdateFestivalDto,
  type UpdatePoiDto,
  type UpdateTempleDto,
  type UpsertParikramaRouteDto,
} from '../dto/catalog-admin.dto';
import { type AartiChangedEvent, CATALOG_EVENTS } from '../events';
import { parseRecurrence } from './aarti-rules';

const opt = <T, R>(v: T | undefined, map: (x: T) => R): R | undefined =>
  v === undefined ? undefined : map(v);
const i18n = (v: I18nTextDto | undefined) => opt(v, i18nJson);

/** CMS writes for the catalog (admin only). Every change is audited. */
@Injectable()
export class CatalogAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesFacade,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
    private readonly events: EventEmitter2,
  ) {}

  private async checkMedia(ids: (string | undefined)[]): Promise<void> {
    for (const id of ids) {
      if (id) await this.files.requireReady(id, { kinds: ['image'] });
    }
  }

  // ───────────── cities ─────────────

  async createCity(actor: AuthPrincipal, dto: CreateCityDto) {
    const city = await this.prisma.city.create({
      data: {
        slug: dto.slug,
        nameI18n: i18nJson(dto.name),
        lat: dto.lat,
        lng: dto.lng,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.record({
      actor,
      action: 'city.create',
      entityType: 'city',
      entityId: city.id,
      after: city,
    });
    await this.cache.del('catalog:cities');
    return city;
  }

  async updateCity(actor: AuthPrincipal, id: string, dto: UpdateCityDto) {
    const before = await this.prisma.city.findUnique({ where: { id } });
    if (!before) throw AppException.notFound('City not found');
    const city = await this.prisma.city.update({
      where: { id },
      data: {
        slug: dto.slug,
        nameI18n: i18n(dto.name),
        lat: dto.lat,
        lng: dto.lng,
        sortOrder: dto.sortOrder,
      },
    });
    await this.audit.record({
      actor,
      action: 'city.update',
      entityType: 'city',
      entityId: id,
      before,
      after: city,
    });
    await this.cache.del('catalog:cities');
    return city;
  }

  // ───────────── temples ─────────────

  async createTemple(actor: AuthPrincipal, dto: CreateTempleDto) {
    await this.checkMedia([dto.coverMediaId, ...(dto.galleryMediaIds ?? [])]);
    const temple = await this.prisma.temple.create({
      data: {
        cityId: dto.cityId,
        slug: dto.slug,
        nameI18n: i18nJson(dto.name),
        descriptionI18n: i18n(dto.description),
        historyI18n: i18n(dto.history),
        dressCodeI18n: i18n(dto.dressCode),
        lat: dto.lat,
        lng: dto.lng,
        address: dto.address ?? null,
        openingHours: (dto.openingHours ?? {}) as Prisma.InputJsonObject,
        tags: dto.tags ?? [],
        coverMediaId: dto.coverMediaId ?? null,
        galleryMediaIds: dto.galleryMediaIds ?? [],
        crowdLevel: dto.crowdLevel ?? 0,
        isPublished: dto.isPublished ?? true,
      },
    });
    await this.audit.record({
      actor,
      action: 'temple.create',
      entityType: 'temple',
      entityId: temple.id,
      after: temple,
    });
    return temple;
  }

  async updateTemple(actor: AuthPrincipal, id: string, dto: UpdateTempleDto) {
    const before = await this.prisma.temple.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw AppException.notFound('Temple not found');
    await this.checkMedia([dto.coverMediaId, ...(dto.galleryMediaIds ?? [])]);
    const temple = await this.prisma.temple.update({
      where: { id },
      data: {
        cityId: dto.cityId,
        slug: dto.slug,
        nameI18n: i18n(dto.name),
        descriptionI18n: i18n(dto.description),
        historyI18n: i18n(dto.history),
        dressCodeI18n: i18n(dto.dressCode),
        lat: dto.lat,
        lng: dto.lng,
        address: dto.address,
        openingHours: dto.openingHours as Prisma.InputJsonObject | undefined,
        tags: dto.tags,
        coverMediaId: dto.coverMediaId,
        galleryMediaIds: dto.galleryMediaIds,
        crowdLevel: dto.crowdLevel,
        isPublished: dto.isPublished,
      },
    });
    await this.audit.record({
      actor,
      action: 'temple.update',
      entityType: 'temple',
      entityId: id,
      before,
      after: temple,
    });
    return temple;
  }

  async deleteTemple(actor: AuthPrincipal, id: string): Promise<void> {
    const res = await this.prisma.temple.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), isPublished: false },
    });
    if (res.count === 0) throw AppException.notFound('Temple not found');
    await this.audit.record({ actor, action: 'temple.delete', entityType: 'temple', entityId: id });
  }

  // ───────────── aarti schedules ─────────────

  async listAarti(templeId: string) {
    return this.prisma.aartiSchedule.findMany({
      where: { templeId },
      orderBy: [{ season: 'asc' }, { localTime: 'asc' }],
    });
  }

  private validateSchedule(dto: UpdateAartiScheduleDto): void {
    if (dto.recurrence !== undefined) {
      try {
        parseRecurrence(dto.recurrence);
      } catch (err) {
        throw AppException.badRequest((err as Error).message);
      }
    }
    if (dto.validFrom && dto.validTo && dto.validTo < dto.validFrom) {
      throw AppException.badRequest('validTo must not be before validFrom');
    }
  }

  async createAarti(actor: AuthPrincipal, templeId: string, dto: CreateAartiScheduleDto) {
    this.validateSchedule(dto);
    const temple = await this.prisma.temple.findFirst({ where: { id: templeId, deletedAt: null } });
    if (!temple) throw AppException.notFound('Temple not found');
    const row = await this.prisma.aartiSchedule.create({
      data: {
        templeId,
        kind: dto.kind,
        nameI18n: i18nJson(dto.name),
        localTime: dbTime(dto.localTime),
        durationMin: dto.durationMin ?? 15,
        recurrence: dto.recurrence ?? 'FREQ=DAILY',
        validFrom: opt(dto.validFrom, dbDate) ?? null,
        validTo: opt(dto.validTo, dbDate) ?? null,
        season: dto.season ?? 'all',
        isLiveStreamed: dto.isLiveStreamed ?? false,
        streamUrl: dto.streamUrl ?? null,
      },
    });
    await this.afterAartiChange(actor, 'aarti.create', templeId, row.id, null, row);
    return row;
  }

  async updateAarti(actor: AuthPrincipal, id: string, dto: UpdateAartiScheduleDto) {
    this.validateSchedule(dto);
    const before = await this.prisma.aartiSchedule.findUnique({ where: { id } });
    if (!before) throw AppException.notFound('Schedule not found');
    const row = await this.prisma.aartiSchedule.update({
      where: { id },
      data: {
        kind: dto.kind,
        nameI18n: i18n(dto.name),
        localTime: opt(dto.localTime, dbTime),
        durationMin: dto.durationMin,
        recurrence: dto.recurrence,
        validFrom: opt(dto.validFrom, dbDate),
        validTo: opt(dto.validTo, dbDate),
        season: dto.season,
        isLiveStreamed: dto.isLiveStreamed,
        streamUrl: dto.streamUrl,
      },
    });
    await this.afterAartiChange(actor, 'aarti.update', row.templeId, id, before, row);
    return row;
  }

  async deleteAarti(actor: AuthPrincipal, id: string): Promise<void> {
    const before = await this.prisma.aartiSchedule.findUnique({ where: { id } });
    if (!before) throw AppException.notFound('Schedule not found');
    await this.prisma.aartiSchedule.delete({ where: { id } });
    await this.afterAartiChange(actor, 'aarti.delete', before.templeId, id, before, null);
  }

  private async afterAartiChange(
    actor: AuthPrincipal,
    action: string,
    templeId: string,
    id: string,
    before: unknown,
    after: unknown,
  ) {
    await this.audit.record({
      actor,
      action,
      entityType: 'aarti_schedule',
      entityId: id,
      before,
      after,
    });
    const event: AartiChangedEvent = { templeId };
    this.events.emit(CATALOG_EVENTS.aartiChanged, event);
  }

  // ───────────── festivals ─────────────

  async createFestival(actor: AuthPrincipal, dto: CreateFestivalDto) {
    if (dto.endsOn < dto.startsOn)
      throw AppException.badRequest('endsOn must not be before startsOn');
    await this.checkMedia([dto.coverMediaId]);
    const row = await this.prisma.festival.create({
      data: {
        cityId: dto.cityId ?? null,
        templeId: dto.templeId ?? null,
        nameI18n: i18nJson(dto.name),
        descriptionI18n: i18n(dto.description),
        crowdAdvisoryI18n: i18n(dto.crowdAdvisory),
        startsOn: dbDate(dto.startsOn),
        endsOn: dbDate(dto.endsOn),
        coverMediaId: dto.coverMediaId ?? null,
      },
    });
    await this.audit.record({
      actor,
      action: 'festival.create',
      entityType: 'festival',
      entityId: row.id,
      after: row,
    });
    return row;
  }

  async updateFestival(actor: AuthPrincipal, id: string, dto: UpdateFestivalDto) {
    const before = await this.prisma.festival.findUnique({ where: { id } });
    if (!before) throw AppException.notFound('Festival not found');
    await this.checkMedia([dto.coverMediaId]);
    const row = await this.prisma.festival.update({
      where: { id },
      data: {
        cityId: dto.cityId,
        templeId: dto.templeId,
        nameI18n: i18n(dto.name),
        descriptionI18n: i18n(dto.description),
        crowdAdvisoryI18n: i18n(dto.crowdAdvisory),
        startsOn: opt(dto.startsOn, dbDate),
        endsOn: opt(dto.endsOn, dbDate),
        coverMediaId: dto.coverMediaId,
      },
    });
    if (row.endsOn < row.startsOn)
      throw AppException.badRequest('endsOn must not be before startsOn');
    await this.audit.record({
      actor,
      action: 'festival.update',
      entityType: 'festival',
      entityId: id,
      before,
      after: row,
    });
    return row;
  }

  async deleteFestival(actor: AuthPrincipal, id: string): Promise<void> {
    const res = await this.prisma.festival.deleteMany({ where: { id } });
    if (res.count === 0) throw AppException.notFound('Festival not found');
    await this.audit.record({
      actor,
      action: 'festival.delete',
      entityType: 'festival',
      entityId: id,
    });
  }

  // ───────────── POIs ─────────────

  async createPoi(actor: AuthPrincipal, dto: CreatePoiDto) {
    const row = await this.prisma.poi.create({
      data: {
        cityId: dto.cityId,
        category: dto.category,
        nameI18n: i18nJson(dto.name),
        lat: dto.lat,
        lng: dto.lng,
        address: dto.address ?? null,
        phoneE164: dto.phoneE164 ?? null,
        is24x7: dto.is24x7 ?? false,
        isEmergency: dto.isEmergency ?? false,
      },
    });
    await this.audit.record({
      actor,
      action: 'poi.create',
      entityType: 'poi',
      entityId: row.id,
      after: row,
    });
    return row;
  }

  async updatePoi(actor: AuthPrincipal, id: string, dto: UpdatePoiDto) {
    const before = await this.prisma.poi.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw AppException.notFound('POI not found');
    const row = await this.prisma.poi.update({
      where: { id },
      data: {
        cityId: dto.cityId,
        category: dto.category,
        nameI18n: i18n(dto.name),
        lat: dto.lat,
        lng: dto.lng,
        address: dto.address,
        phoneE164: dto.phoneE164,
        is24x7: dto.is24x7,
        isEmergency: dto.isEmergency,
      },
    });
    await this.audit.record({
      actor,
      action: 'poi.update',
      entityType: 'poi',
      entityId: id,
      before,
      after: row,
    });
    return row;
  }

  async deletePoi(actor: AuthPrincipal, id: string): Promise<void> {
    const res = await this.prisma.poi.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (res.count === 0) throw AppException.notFound('POI not found');
    await this.audit.record({ actor, action: 'poi.delete', entityType: 'poi', entityId: id });
  }

  // ───────────── explore ─────────────

  async createExplore(actor: AuthPrincipal, dto: CreateExploreItemDto) {
    await this.checkMedia([dto.coverMediaId]);
    const row = await this.prisma.exploreItem.create({
      data: {
        cityId: dto.cityId,
        kind: dto.kind,
        titleI18n: i18nJson(dto.title),
        bodyI18n: i18n(dto.body),
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        coverMediaId: dto.coverMediaId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isPublished: dto.isPublished ?? true,
      },
    });
    await this.audit.record({
      actor,
      action: 'explore.create',
      entityType: 'explore_item',
      entityId: row.id,
      after: row,
    });
    return row;
  }

  async updateExplore(actor: AuthPrincipal, id: string, dto: UpdateExploreItemDto) {
    const before = await this.prisma.exploreItem.findFirst({ where: { id, deletedAt: null } });
    if (!before) throw AppException.notFound('Explore item not found');
    await this.checkMedia([dto.coverMediaId]);
    const row = await this.prisma.exploreItem.update({
      where: { id },
      data: {
        cityId: dto.cityId,
        kind: dto.kind,
        titleI18n: i18n(dto.title),
        bodyI18n: i18n(dto.body),
        lat: dto.lat,
        lng: dto.lng,
        coverMediaId: dto.coverMediaId,
        sortOrder: dto.sortOrder,
        isPublished: dto.isPublished,
      },
    });
    await this.audit.record({
      actor,
      action: 'explore.update',
      entityType: 'explore_item',
      entityId: id,
      before,
      after: row,
    });
    return row;
  }

  async deleteExplore(actor: AuthPrincipal, id: string): Promise<void> {
    const res = await this.prisma.exploreItem.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (res.count === 0) throw AppException.notFound('Explore item not found');
    await this.audit.record({
      actor,
      action: 'explore.delete',
      entityType: 'explore_item',
      entityId: id,
    });
  }

  // ───────────── parikrama ─────────────

  async upsertParikrama(actor: AuthPrincipal, slug: string, dto: UpsertParikramaRouteDto) {
    for (const [i, stop] of dto.stops.entries()) {
      if (!stop.templeId === !stop.poiId)
        throw AppException.badRequest(`Stop ${i + 1} needs exactly one of templeId or poiId`);
    }
    const route = await this.prisma.$transaction(async (tx) => {
      const data = {
        nameI18n: i18nJson(dto.name),
        descriptionI18n: i18n(dto.description),
        distanceM: dto.distanceM,
        estDurationMin: dto.estDurationMin,
        polyline: dto.polyline ?? null,
        difficulty: dto.difficulty ?? null,
      };
      const r = await tx.parikramaRoute.upsert({
        where: { slug },
        create: { slug, ...data },
        update: data,
      });
      await tx.parikramaRouteStop.deleteMany({ where: { routeId: r.id } });
      await tx.parikramaRouteStop.createMany({
        data: dto.stops.map((s, seq) => ({
          routeId: r.id,
          seq,
          templeId: s.templeId ?? null,
          poiId: s.poiId ?? null,
          noteI18n: i18n(s.note),
        })),
      });
      return r;
    });
    await this.audit.record({
      actor,
      action: 'parikrama.upsert',
      entityType: 'parikrama_route',
      entityId: route.id,
      after: dto,
    });
    return route;
  }
}
