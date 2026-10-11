import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { type CabFare, type Prisma, type Vehicle, type VehicleClass } from '@prisma/client';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { haversineKm, type LatLng } from '../../../core/geo';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { MAPS_PROVIDER, type MapsProvider } from '../../../core/providers';
import { CatalogFacade } from '../../catalog';
import { VendorsFacade } from '../../vendors';
import {
  type CabEstimateDto,
  type CabQuoteResponse,
  type CreateVehicleDto,
  type FixedRouteDto,
  type UpdateVehicleDto,
  type UpsertCabFareDto,
  type VehicleResponse,
} from '../dto/cabs.dto';
import { meteredFare } from './fare';

const CITY_RADIUS_KM = 8;
const MAX_TRIP_KM = 300;

export interface CabQuoteInput {
  pickup: LatLng;
  drop: LatLng;
  at: Date;
  vehicleClass?: VehicleClass;
  vendorId?: string;
}

@Injectable()
export class CabsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsFacade,
    private readonly catalog: CatalogFacade,
    private readonly audit: AuditService,
    @Inject(MAPS_PROVIDER) private readonly maps: MapsProvider,
  ) {}

  // ───────────── vehicles ─────────────

  async listVehicles(vendorId: string): Promise<VehicleResponse[]> {
    const rows = await this.prisma.vehicle.findMany({
      where: { vendorId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(vehicleResponse);
  }

  async createVehicle(
    actor: AuthPrincipal,
    vendorId: string,
    dto: CreateVehicleDto,
  ): Promise<VehicleResponse> {
    const v = await this.prisma.vehicle.create({
      data: {
        vendorId,
        class: dto.class,
        registrationNo: dto.registrationNo,
        model: dto.model ?? null,
        seats: dto.seats,
        driverName: dto.driverName ?? null,
        driverPhoneE164: dto.driverPhoneE164 ?? null,
        driverUserId: dto.driverUserId ?? null,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({
      actor,
      action: 'vehicle.create',
      entityType: 'vehicle',
      entityId: v.id,
      after: v,
    });
    return vehicleResponse(v);
  }

  async updateVehicle(
    actor: AuthPrincipal,
    vendorId: string,
    vehicleId: string,
    dto: UpdateVehicleDto,
  ): Promise<VehicleResponse> {
    const before = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, vendorId, deletedAt: null },
    });
    if (!before) throw AppException.notFound('Vehicle not found');
    const v = await this.prisma.vehicle.update({ where: { id: vehicleId }, data: dto });
    await this.audit.record({
      actor,
      action: 'vehicle.update',
      entityType: 'vehicle',
      entityId: vehicleId,
      before,
      after: dto,
    });
    return vehicleResponse(v);
  }

  async removeVehicle(actor: AuthPrincipal, vendorId: string, vehicleId: string): Promise<void> {
    const res = await this.prisma.vehicle.updateMany({
      where: { id: vehicleId, vendorId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
    if (res.count === 0) throw AppException.notFound('Vehicle not found');
    await this.audit.record({
      actor,
      action: 'vehicle.delete',
      entityType: 'vehicle',
      entityId: vehicleId,
    });
  }

  // ───────────── fares ─────────────

  async listFares(vendorId: string): Promise<CabFare[]> {
    return this.prisma.cabFare.findMany({ where: { vendorId }, orderBy: { class: 'asc' } });
  }

  async upsertFare(
    actor: AuthPrincipal,
    vendorId: string,
    vehicleClass: VehicleClass,
    dto: UpsertCabFareDto,
  ): Promise<CabFare> {
    const data = {
      baseFarePaise: dto.baseFarePaise,
      perKmPaise: dto.perKmPaise,
      perMinPaise: dto.perMinPaise,
      minFarePaise: dto.minFarePaise,
      nightSurchargePct: dto.nightSurchargePct ?? 0,
      fixedRoutes: (dto.fixedRoutes ?? []).map((r) => ({
        from: r.from,
        to: r.to,
        farePaise: r.farePaise,
      })) as Prisma.InputJsonArray,
    };
    const fare = await this.prisma.cabFare.upsert({
      where: { vendorId_class: { vendorId, class: vehicleClass } },
      create: { vendorId, class: vehicleClass, ...data },
      update: data,
    });
    await this.audit.record({
      actor,
      action: 'cab_fare.upsert',
      entityType: 'cab_fare',
      entityId: fare.id,
      after: fare,
    });
    return fare;
  }

  // ───────────── quotes ─────────────

  estimate(dto: CabEstimateDto): Promise<CabQuoteResponse[]> {
    return this.quotes({
      pickup: dto.pickup,
      drop: dto.drop,
      at: dto.at ? new Date(dto.at) : new Date(),
      vehicleClass: dto.class,
    });
  }

  /**
   * Cheapest quote per vehicle class across active vendors that have an active vehicle of that
   * class. Orders re-run this with the chosen vendor so the price is computed server-side.
   */
  async quotes(input: CabQuoteInput): Promise<CabQuoteResponse[]> {
    const straightKm = haversineKm(input.pickup, input.drop);
    if (straightKm < 0.2) throw AppException.badRequest('Pickup and drop are too close');
    if (straightKm > MAX_TRIP_KM)
      throw AppException.badRequest(`Trips are limited to ${MAX_TRIP_KM} km`);
    if (input.at.getTime() < Date.now() - 5 * 60_000)
      throw AppException.badRequest('Pickup time is in the past');

    const activeIds = await this.vendors.activeVendorIds();
    const vendorIds = input.vendorId ? activeIds.filter((id) => id === input.vendorId) : activeIds;
    const fares = await this.prisma.cabFare.findMany({
      where: {
        vendorId: { in: vendorIds },
        ...(input.vehicleClass ? { class: input.vehicleClass } : {}),
      },
      include: { vendor: { select: { displayName: true } } },
    });
    if (fares.length === 0) return [];
    const vehicles = await this.prisma.vehicle.findMany({
      where: { vendorId: { in: fares.map((f) => f.vendorId) }, isActive: true, deletedAt: null },
      select: { vendorId: true, class: true, seats: true },
    });
    const route = await this.maps.route(input.pickup, input.drop, 'drive');
    const [fromCity, toCity] = await Promise.all([
      this.nearestCity(input.pickup),
      this.nearestCity(input.drop),
    ]);

    const best = new Map<VehicleClass, CabQuoteResponse>();
    for (const fare of fares) {
      const fleet = vehicles.filter((v) => v.vendorId === fare.vendorId && v.class === fare.class);
      if (fleet.length === 0) continue;
      const fixed = this.fixedFare(fare.fixedRoutes, fromCity, toCity);
      const metered = meteredFare(fare, route.distanceM, route.durationS, input.at);
      const quote: CabQuoteResponse = {
        class: fare.class,
        vendorId: fare.vendorId,
        vendorName: fare.vendor.displayName,
        farePaise: fixed ?? metered.farePaise,
        distanceM: route.distanceM,
        durationS: route.durationS,
        nightSurchargeApplied: fixed === null && metered.night,
        fixedRoute: fixed !== null,
        seats: Math.max(...fleet.map((v) => v.seats)),
      };
      const current = best.get(fare.class);
      if (!current || quote.farePaise < current.farePaise) best.set(fare.class, quote);
    }
    return [...best.values()].sort((a, b) => a.farePaise - b.farePaise);
  }

  /** Pick a vehicle for a confirmed booking (least recently assigned is good enough for v1). */
  async pickVehicle(vendorId: string, vehicleClass: VehicleClass): Promise<Vehicle | null> {
    return this.prisma.vehicle.findFirst({
      where: { vendorId, class: vehicleClass, isActive: true, deletedAt: null },
      orderBy: { updatedAt: 'asc' },
    });
  }

  private fixedFare(raw: Prisma.JsonValue, from: string | null, to: string | null): number | null {
    if (!from || !to || from === to || !Array.isArray(raw)) return null;
    for (const r of raw as unknown as FixedRouteDto[]) {
      if ((r.from === from && r.to === to) || (r.from === to && r.to === from)) return r.farePaise;
    }
    return null;
  }

  private async nearestCity(p: LatLng): Promise<string | null> {
    const cities = await this.catalog.citySlugs();
    let best: { slug: string; km: number } | null = null;
    for (const c of cities) {
      const km = haversineKm(p, c);
      if (km <= CITY_RADIUS_KM && (!best || km < best.km)) best = { slug: c.slug, km };
    }
    return best?.slug ?? null;
  }
}

function vehicleResponse(v: Vehicle): VehicleResponse {
  return {
    id: v.id,
    class: v.class,
    registrationNo: v.registrationNo,
    model: v.model,
    seats: v.seats,
    driverName: v.driverName,
    driverPhoneE164: v.driverPhoneE164,
    driverUserId: v.driverUserId,
    isActive: v.isActive,
  };
}

export const noCabsAvailable = () =>
  new AppException(
    ERROR_CODES.INVENTORY_UNAVAILABLE,
    HttpStatus.CONFLICT,
    'No cab is available for this trip',
  );
