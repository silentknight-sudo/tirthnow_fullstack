import { type Prisma } from '@prisma/client';
import { type Policy } from '../cancellation';

/** Typed view over orders.details (a JSON snapshot written at creation). */
export interface OrderDetails {
  cityId?: string | null;
  vendorName?: string;
  cancellationPolicy?: Policy;
  subStatus?: string | null;
  vendorAcceptedAt?: string | null;
  hotel?: {
    hotelId: string;
    hotelName: string;
    roomTypeId: string;
    roomTypeName: string;
    checkIn: string;
    checkOut: string;
    nights: string[];
    rooms: number;
    guests: number;
    guestName?: string;
    guestPhone?: string;
    specialRequests?: string;
    address: string;
  };
  cab?: {
    vehicleClass: string;
    pickup: { lat: number; lng: number; address?: string };
    drop: { lat: number; lng: number; address?: string };
    pickupAt: string;
    distanceM: number;
    durationS: number;
    fixedRoute: boolean;
    passengers?: number;
    vehicle?: {
      id: string;
      registrationNo: string;
      model: string | null;
      driverName: string | null;
      driverPhoneE164: string | null;
      driverUserId: string | null;
    };
  };
  food?: { restaurantId: string; restaurantName: string; mode: string; notes?: string };
  experience?: {
    experienceId: string;
    title: string;
    slotId: string;
    startsAt: string;
    seats: number;
  };
}

export function readDetails(value: Prisma.JsonValue): OrderDetails {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
}

export function toJson(details: OrderDetails): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(details)) as Prisma.InputJsonObject;
}
