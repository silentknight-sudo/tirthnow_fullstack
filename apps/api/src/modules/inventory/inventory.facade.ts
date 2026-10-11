import { Injectable } from '@nestjs/common';
import {
  type Experience,
  type ExperienceSlot,
  type Prisma,
  type Restaurant,
  type VehicleClass,
} from '@prisma/client';
import { AppException } from '../../core/http';
import { t } from '../../core/i18n';
import { PrismaService } from '../../core/prisma';
import { VendorsFacade } from '../vendors';
import { type CabQuoteResponse } from './dto/cabs.dto';
import { type CabQuoteInput, CabsService } from './services/cabs.service';
import { ExperiencesService } from './services/experiences.service';
import { type CancellationPolicy, parsePolicy } from './services/policy';
import { type FoodLine, RestaurantsService } from './services/restaurants.service';
import {
  RoomInventoryService,
  type StayNight,
  stayNights,
} from './services/room-inventory.service';

export interface HotelStayContext {
  hotelId: string;
  hotelName: string;
  vendorId: string;
  roomTypeId: string;
  roomTypeName: string;
  maxGuests: number;
  address: string;
  checkinTime: Date;
  checkoutTime: Date;
  cancellationPolicy: CancellationPolicy;
  nights: string[];
}

/** Public surface of the inventory module (used by orders). */
@Injectable()
export class InventoryFacade {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsFacade,
    private readonly rooms: RoomInventoryService,
    private readonly cabs: CabsService,
    private readonly restaurants: RestaurantsService,
    private readonly experiences: ExperiencesService,
  ) {}

  /** Validate a bookable stay and return what the order needs to snapshot. */
  async hotelStayContext(
    roomTypeId: string,
    checkIn: string,
    checkOut: string,
  ): Promise<HotelStayContext> {
    const nights = stayNights(checkIn, checkOut);
    const rt = await this.prisma.roomType.findFirst({
      where: { id: roomTypeId, deletedAt: null, hotel: { deletedAt: null, isPublished: true } },
      include: { hotel: true },
    });
    if (!rt || !(await this.vendors.isActive(rt.hotel.vendorId)))
      throw AppException.notFound('Room type not found');
    return {
      hotelId: rt.hotelId,
      hotelName: t(rt.hotel.nameI18n, 'en'),
      vendorId: rt.hotel.vendorId,
      roomTypeId: rt.id,
      roomTypeName: t(rt.nameI18n, 'en'),
      maxGuests: rt.maxGuests,
      address: rt.hotel.address,
      checkinTime: rt.hotel.checkinTime,
      checkoutTime: rt.hotel.checkoutTime,
      cancellationPolicy: parsePolicy(rt.hotel.cancellationPolicy),
      nights,
    };
  }

  holdRooms(
    tx: Prisma.TransactionClient,
    roomTypeId: string,
    nights: string[],
    rooms: number,
  ): Promise<StayNight[]> {
    return this.rooms.hold(tx, roomTypeId, nights, rooms);
  }

  releaseRooms(
    tx: Prisma.TransactionClient,
    roomTypeId: string,
    nights: string[],
    rooms: number,
  ): Promise<void> {
    return this.rooms.release(tx, roomTypeId, nights, rooms);
  }

  cabQuotes(input: CabQuoteInput): Promise<CabQuoteResponse[]> {
    return this.cabs.quotes(input);
  }

  pickVehicle(vendorId: string, vehicleClass: VehicleClass) {
    return this.cabs.pickVehicle(vendorId, vehicleClass);
  }

  async vehicle(vehicleId: string) {
    return this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
  }

  priceFoodOrder(
    restaurantId: string,
    items: { menuItemId: string; quantity: number }[],
  ): Promise<{ restaurant: Restaurant; lines: FoodLine[]; subtotalPaise: number }> {
    return this.restaurants.priceOrder(restaurantId, items);
  }

  async experienceForSlot(slotId: string): Promise<{
    slot: ExperienceSlot;
    experience: Experience;
    cancellationPolicy: CancellationPolicy;
  }> {
    const slot = await this.prisma.experienceSlot.findUnique({
      where: { id: slotId },
      include: { experience: true },
    });
    if (
      !slot ||
      slot.experience.deletedAt ||
      !slot.experience.isPublished ||
      !(await this.vendors.isActive(slot.experience.vendorId))
    ) {
      throw AppException.notFound('Slot not found');
    }
    return {
      slot,
      experience: slot.experience,
      cancellationPolicy: parsePolicy(slot.experience.cancellationPolicy),
    };
  }

  holdSlot(tx: Prisma.TransactionClient, slotId: string, seats: number) {
    return this.experiences.holdSlot(tx, slotId, seats);
  }

  releaseSlot(tx: Prisma.TransactionClient, slotId: string, seats: number): Promise<void> {
    return this.experiences.releaseSlot(tx, slotId, seats);
  }

  /** For reviews: the listing exists and which vendor owns it. */
  async listingVendor(
    type: 'hotel' | 'restaurant' | 'experience',
    id: string,
  ): Promise<string | null> {
    const where = { id, deletedAt: null };
    const row =
      type === 'hotel'
        ? await this.prisma.hotel.findFirst({ where, select: { vendorId: true } })
        : type === 'restaurant'
          ? await this.prisma.restaurant.findFirst({ where, select: { vendorId: true } })
          : await this.prisma.experience.findFirst({ where, select: { vendorId: true } });
    return row?.vendorId ?? null;
  }

  /** Denormalised rating on hotels (reviews module keeps it current). */
  async setHotelRating(hotelId: string, avg: number, count: number): Promise<void> {
    await this.prisma.hotel.update({
      where: { id: hotelId },
      data: { ratingAvg: avg, ratingCount: count },
    });
  }
}

export type { CabQuoteInput, CancellationPolicy, FoodLine, StayNight };
