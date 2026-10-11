import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { type Lang } from '@tirth-now/shared-types';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { boundingBox, haversineKm, round1 } from '../../../core/geo';
import { AppException } from '../../../core/http';
import { i18nJson, t, tOrNull } from '../../../core/i18n';
import { PrismaService } from '../../../core/prisma';
import { dbTime, fromDbTime } from '../../../core/time';
import { CatalogFacade } from '../../catalog';
import { FilesFacade } from '../../files';
import { VendorsFacade } from '../../vendors';
import {
  type CreateHotelDto,
  type CreateRoomTypeDto,
  type HotelResponse,
  type HotelSearchQueryDto,
  type RoomTypeResponse,
  type StayQueryDto,
  type UpdateHotelDto,
  type UpdateRoomTypeDto,
} from '../dto/hotels.dto';
import { assertCanPublish } from './listing-guard';
import { parsePolicy } from './policy';
import { RoomInventoryService, stayNights } from './room-inventory.service';

type HotelRow = Prisma.HotelGetPayload<{ include: { roomTypes: true } }>;

@Injectable()
export class HotelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: RoomInventoryService,
    private readonly vendors: VendorsFacade,
    private readonly catalog: CatalogFacade,
    private readonly files: FilesFacade,
    private readonly audit: AuditService,
  ) {}

  // ───────────── vendor side ─────────────

  async create(
    actor: AuthPrincipal,
    vendorId: string,
    dto: CreateHotelDto,
  ): Promise<HotelResponse> {
    await assertCanPublish(this.vendors, vendorId, dto.isPublished);
    const hotel = await this.prisma.hotel.create({
      data: {
        vendorId,
        cityId: dto.cityId,
        nameI18n: i18nJson(dto.name),
        descriptionI18n: dto.description ? i18nJson(dto.description) : undefined,
        lat: dto.lat,
        lng: dto.lng,
        address: dto.address,
        starRating: dto.starRating ?? null,
        amenities: dto.amenities ?? [],
        checkinTime: dbTime(dto.checkinTime ?? '12:00'),
        checkoutTime: dbTime(dto.checkoutTime ?? '11:00'),
        cancellationPolicy: (dto.cancellationPolicy ??
          parsePolicy(null)) as unknown as Prisma.InputJsonObject,
        isPublished: dto.isPublished ?? false,
      },
      include: { roomTypes: true },
    });
    await this.audit.record({
      actor,
      action: 'hotel.create',
      entityType: 'hotel',
      entityId: hotel.id,
      after: hotel,
    });
    return this.toResponse(hotel, 'en', { withRooms: true });
  }

  async update(
    actor: AuthPrincipal,
    vendorId: string,
    hotelId: string,
    dto: UpdateHotelDto,
  ): Promise<HotelResponse> {
    const before = await this.owned(vendorId, hotelId);
    await assertCanPublish(this.vendors, vendorId, dto.isPublished);
    const hotel = await this.prisma.hotel.update({
      where: { id: hotelId },
      data: {
        cityId: dto.cityId,
        nameI18n: dto.name ? i18nJson(dto.name) : undefined,
        descriptionI18n: dto.description ? i18nJson(dto.description) : undefined,
        lat: dto.lat,
        lng: dto.lng,
        address: dto.address,
        starRating: dto.starRating,
        amenities: dto.amenities,
        checkinTime: dto.checkinTime ? dbTime(dto.checkinTime) : undefined,
        checkoutTime: dto.checkoutTime ? dbTime(dto.checkoutTime) : undefined,
        cancellationPolicy: dto.cancellationPolicy as unknown as Prisma.InputJsonObject | undefined,
        isPublished: dto.isPublished,
      },
      include: { roomTypes: { where: { deletedAt: null } } },
    });
    await this.audit.record({
      actor,
      action: 'hotel.update',
      entityType: 'hotel',
      entityId: hotelId,
      before,
      after: dto,
    });
    return this.toResponse(hotel, 'en', { withRooms: true });
  }

  async remove(actor: AuthPrincipal, vendorId: string, hotelId: string): Promise<void> {
    await this.owned(vendorId, hotelId);
    await this.prisma.hotel.update({
      where: { id: hotelId },
      data: { deletedAt: new Date(), isPublished: false },
    });
    await this.audit.record({
      actor,
      action: 'hotel.delete',
      entityType: 'hotel',
      entityId: hotelId,
    });
  }

  async listForVendor(vendorId: string): Promise<HotelResponse[]> {
    const rows = await this.prisma.hotel.findMany({
      where: { vendorId, deletedAt: null },
      include: { roomTypes: { where: { deletedAt: null } } },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(rows.map((h) => this.toResponse(h, 'en', { withRooms: true })));
  }

  async createRoomType(
    actor: AuthPrincipal,
    vendorId: string,
    hotelId: string,
    dto: CreateRoomTypeDto,
  ): Promise<RoomTypeResponse> {
    await this.owned(vendorId, hotelId);
    await this.files.requireAllReady(dto.mediaIds ?? []);
    const rt = await this.prisma.$transaction(async (tx) => {
      const created = await tx.roomType.create({
        data: {
          hotelId,
          nameI18n: i18nJson(dto.name),
          maxGuests: dto.maxGuests,
          basePricePaise: dto.basePricePaise,
          totalRooms: dto.totalRooms,
          amenities: dto.amenities ?? [],
          mediaIds: dto.mediaIds ?? [],
        },
      });
      await this.inventory.materialize(created.id, tx);
      return created;
    });
    await this.audit.record({
      actor,
      action: 'room_type.create',
      entityType: 'room_type',
      entityId: rt.id,
      after: rt,
    });
    return this.roomTypeResponse(rt, 'en');
  }

  async updateRoomType(
    actor: AuthPrincipal,
    vendorId: string,
    roomTypeId: string,
    dto: UpdateRoomTypeDto,
  ): Promise<RoomTypeResponse> {
    const before = await this.ownedRoomType(vendorId, roomTypeId);
    await this.files.requireAllReady(dto.mediaIds ?? []);
    const rt = await this.prisma.roomType.update({
      where: { id: roomTypeId },
      data: {
        nameI18n: dto.name ? i18nJson(dto.name) : undefined,
        maxGuests: dto.maxGuests,
        basePricePaise: dto.basePricePaise,
        totalRooms: dto.totalRooms,
        amenities: dto.amenities,
        mediaIds: dto.mediaIds,
      },
    });
    await this.inventory.applyRoomTypeChange(roomTypeId, {
      oldTotal: before.totalRooms,
      newTotal: dto.totalRooms,
      oldPrice: before.basePricePaise,
      newPrice: dto.basePricePaise,
    });
    await this.audit.record({
      actor,
      action: 'room_type.update',
      entityType: 'room_type',
      entityId: roomTypeId,
      before,
      after: dto,
    });
    return this.roomTypeResponse(rt, 'en');
  }

  async removeRoomType(actor: AuthPrincipal, vendorId: string, roomTypeId: string): Promise<void> {
    await this.ownedRoomType(vendorId, roomTypeId);
    await this.prisma.roomType.update({
      where: { id: roomTypeId },
      data: { deletedAt: new Date() },
    });
    await this.audit.record({
      actor,
      action: 'room_type.delete',
      entityType: 'room_type',
      entityId: roomTypeId,
    });
  }

  async ownedRoomType(vendorId: string, roomTypeId: string) {
    const rt = await this.prisma.roomType.findFirst({
      where: { id: roomTypeId, deletedAt: null, hotel: { vendorId, deletedAt: null } },
    });
    if (!rt) throw AppException.notFound('Room type not found');
    return rt;
  }

  private async owned(vendorId: string, hotelId: string) {
    const hotel = await this.prisma.hotel.findFirst({
      where: { id: hotelId, vendorId, deletedAt: null },
    });
    if (!hotel) throw AppException.notFound('Hotel not found');
    return hotel;
  }

  // ───────────── public side ─────────────

  async search(q: HotelSearchQueryDto, lang: Lang): Promise<HotelResponse[]> {
    const cityId = q.city ? await this.catalog.cityIdBySlug(q.city) : undefined;
    const center = q.lat !== undefined && q.lng !== undefined ? { lat: q.lat, lng: q.lng } : null;
    const radius = q.radiusKm ?? 10;
    const hasDates = q.checkIn !== undefined || q.checkOut !== undefined;
    if (hasDates && (!q.checkIn || !q.checkOut))
      throw AppException.badRequest('Pass both checkIn and checkOut');
    const nights = q.checkIn && q.checkOut ? stayNights(q.checkIn, q.checkOut) : null;
    const rooms = q.rooms ?? 1;
    const guests = q.guests ?? 2;

    const hotels = await this.prisma.hotel.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        vendorId: { in: await this.vendors.activeVendorIds() },
        ...(cityId ? { cityId } : {}),
        ...(center ? boundingBox(center, radius) : {}),
      },
      include: { roomTypes: { where: { deletedAt: null } } },
      take: 200,
    });

    const results: HotelResponse[] = [];
    for (const h of hotels) {
      const distanceKm = center ? round1(haversineKm(center, h)) : undefined;
      if (distanceKm !== undefined && distanceKm > radius) continue;
      let fromPrice: number | null = null;
      for (const rt of h.roomTypes) {
        if (rt.maxGuests * rooms < guests) continue;
        if (nights) {
          const quote = await this.inventory.quote(rt.id, nights, rooms);
          if (!quote.available) continue;
          const avg = Math.round(quote.totalPaise / rooms / nights.length);
          fromPrice = fromPrice === null ? avg : Math.min(fromPrice, avg);
        } else {
          fromPrice =
            fromPrice === null ? rt.basePricePaise : Math.min(fromPrice, rt.basePricePaise);
        }
      }
      if (fromPrice === null) continue;
      if (q.priceMax !== undefined && fromPrice > q.priceMax) continue;
      results.push(
        Object.assign(
          await this.toResponse(h, lang, { withRooms: false }),
          { fromPricePaise: fromPrice },
          distanceKm !== undefined ? { distanceKm } : {},
        ),
      );
    }
    return results.sort((a, b) =>
      center
        ? (a.distanceKm ?? 0) - (b.distanceKm ?? 0)
        : (a.fromPricePaise ?? 0) - (b.fromPricePaise ?? 0),
    );
  }

  async detail(hotelId: string, q: StayQueryDto, lang: Lang): Promise<HotelResponse> {
    const hotel = await this.prisma.hotel.findFirst({
      where: {
        id: hotelId,
        deletedAt: null,
        isPublished: true,
        vendorId: { in: await this.vendors.activeVendorIds() },
      },
      include: { roomTypes: { where: { deletedAt: null }, orderBy: { basePricePaise: 'asc' } } },
    });
    if (!hotel) throw AppException.notFound('Hotel not found');
    const nights = q.checkIn && q.checkOut ? stayNights(q.checkIn, q.checkOut) : null;
    return this.toResponse(hotel, lang, {
      withRooms: true,
      nights,
      rooms: q.rooms ?? 1,
      guests: q.guests ?? 1,
    });
  }

  async toResponse(
    h: HotelRow,
    lang: Lang,
    opts: { withRooms: boolean; nights?: string[] | null; rooms?: number; guests?: number },
  ): Promise<HotelResponse> {
    const firstMedia = h.roomTypes.flatMap((r) => r.mediaIds)[0];
    const cover = firstMedia
      ? await this.prisma.mediaAsset.findFirst({ where: { id: firstMedia, status: 'ready' } })
      : null;
    const roomTypes = opts.withRooms
      ? await Promise.all(
          h.roomTypes.map((rt) =>
            this.roomTypeResponse(rt, lang, opts.nights ?? null, opts.rooms ?? 1, opts.guests ?? 1),
          ),
        )
      : undefined;
    const available = roomTypes?.filter((r) => r.available !== false) ?? [];
    return {
      id: h.id,
      vendorId: h.vendorId,
      cityId: h.cityId,
      name: t(h.nameI18n, lang),
      description: tOrNull(h.descriptionI18n, lang),
      lat: h.lat,
      lng: h.lng,
      address: h.address,
      starRating: h.starRating,
      amenities: h.amenities,
      checkinTime: fromDbTime(h.checkinTime).text,
      checkoutTime: fromDbTime(h.checkoutTime).text,
      cancellationPolicy: parsePolicy(h.cancellationPolicy),
      ratingAvg: Number(h.ratingAvg),
      ratingCount: h.ratingCount,
      isPublished: h.isPublished,
      coverUrl: cover ? await this.files.url(cover, 'medium') : null,
      fromPricePaise:
        available.length > 0 ? Math.min(...available.map((r) => r.basePricePaise)) : null,
      ...(roomTypes ? { roomTypes } : {}),
    };
  }

  private async roomTypeResponse(
    rt: Prisma.RoomTypeGetPayload<object>,
    lang: Lang,
    nights: string[] | null = null,
    rooms = 1,
    guests = 1,
  ): Promise<RoomTypeResponse> {
    const media =
      rt.mediaIds.length > 0
        ? await this.prisma.mediaAsset.findMany({
            where: { id: { in: rt.mediaIds }, status: 'ready' },
          })
        : [];
    const base: RoomTypeResponse = {
      id: rt.id,
      name: t(rt.nameI18n, lang),
      maxGuests: rt.maxGuests,
      basePricePaise: rt.basePricePaise,
      totalRooms: rt.totalRooms,
      amenities: rt.amenities,
      imageUrls: await Promise.all(media.map((m) => this.files.url(m, 'medium'))),
    };
    if (!nights) return base;
    const quote = await this.inventory.quote(rt.id, nights, rooms);
    return Object.assign(base, {
      available: quote.available && rt.maxGuests * rooms >= guests,
      roomsLeft: quote.roomsLeft,
      stayTotalPaise: quote.totalPaise,
      nights: quote.nights,
    });
  }
}
