import { HttpStatus, Injectable, type OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { AppException } from '../../../core/http';
import { MaintenanceRegistry } from '../../../core/maintenance';
import { PrismaService } from '../../../core/prisma';
import {
  addDays,
  dateRange,
  dbDate,
  fromDbDate,
  isIsoDate,
  istDate,
  istWeekday,
} from '../../../core/time';
import { type CalendarDayResponse, type UpdateCalendarDto } from '../dto/hotels.dto';

export const INVENTORY_HORIZON_DAYS = 365;
const MAX_CALENDAR_DAYS = 120;
export const MAX_STAY_NIGHTS = 30;

type Db = PrismaService | Prisma.TransactionClient;

export interface StayNight {
  date: string;
  pricePaise: number;
}

export interface StayQuote {
  nights: StayNight[];
  roomsLeft: number;
  available: boolean;
  /** Sum of nightly prices × rooms. */
  totalPaise: number;
}

export const unavailable = (msg: string) =>
  new AppException(ERROR_CODES.INVENTORY_UNAVAILABLE, HttpStatus.CONFLICT, msg);

/** Validates an IST stay and returns its nights (check-in inclusive, check-out exclusive). */
export function stayNights(
  checkIn: string,
  checkOut: string,
  today = istDate(new Date()),
): string[] {
  if (!isIsoDate(checkIn) || !isIsoDate(checkOut))
    throw AppException.badRequest('Dates must be valid YYYY-MM-DD');
  if (checkIn < today) throw AppException.badRequest('Check-in cannot be in the past');
  if (checkOut <= checkIn) throw AppException.badRequest('Check-out must be after check-in');
  const nights = dateRange(checkIn, addDays(checkOut, -1));
  if (nights.length > MAX_STAY_NIGHTS)
    throw AppException.badRequest(`Stays are limited to ${MAX_STAY_NIGHTS} nights`);
  return nights;
}

/**
 * Date-level room inventory (one row per room type and night). Holds lock rows FOR UPDATE in
 * date order (deadlock-safe) and the `available >= 0` CHECK is the last line of defence.
 */
@Injectable()
export class RoomInventoryService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly maintenance: MaintenanceRegistry,
  ) {}

  onModuleInit(): void {
    this.maintenance.register('room-inventory-horizon', () => this.extendHorizon());
  }

  /** Create missing nights from today up to the horizon. */
  async materialize(roomTypeId: string, db: Db = this.prisma): Promise<number> {
    const rt = await db.roomType.findUniqueOrThrow({ where: { id: roomTypeId } });
    const today = istDate(new Date());
    const dates = dateRange(today, addDays(today, INVENTORY_HORIZON_DAYS - 1));
    const res = await db.roomInventory.createMany({
      skipDuplicates: true,
      data: dates.map((d) => ({
        roomTypeId,
        stayDate: dbDate(d),
        total: rt.totalRooms,
        available: rt.totalRooms,
        pricePaise: rt.basePricePaise,
      })),
    });
    return res.count;
  }

  async extendHorizon(): Promise<number> {
    const types = await this.prisma.roomType.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    let created = 0;
    for (const t of types) created += await this.materialize(t.id);
    return created;
  }

  async calendar(roomTypeId: string, from: string, to: string): Promise<CalendarDayResponse[]> {
    this.checkRange(from, to);
    const rows = await this.prisma.roomInventory.findMany({
      where: { roomTypeId, stayDate: { gte: dbDate(from), lte: dbDate(to) } },
      orderBy: { stayDate: 'asc' },
    });
    return rows.map((r) => ({
      date: fromDbDate(r.stayDate),
      total: r.total,
      available: r.available,
      booked: r.total - r.available,
      pricePaise: r.pricePaise,
      stopSell: r.stopSell,
    }));
  }

  async updateCalendar(roomTypeId: string, dto: UpdateCalendarDto): Promise<CalendarDayResponse[]> {
    this.checkRange(dto.from, dto.to);
    if (dto.pricePaise === undefined && dto.total === undefined && dto.stopSell === undefined) {
      throw AppException.badRequest('Nothing to update: pass pricePaise, total and/or stopSell');
    }
    const dates = dateRange(dto.from, dto.to).filter(
      (d) => !dto.weekdays || dto.weekdays.includes(istWeekday(d)),
    );
    await this.prisma.$transaction(async (tx) => {
      await this.materialize(roomTypeId, tx);
      const rows = await tx.$queryRaw<{ stay_date: Date; total: number; available: number }[]>`
        SELECT stay_date, total, available FROM room_inventory
        WHERE room_type_id = ${roomTypeId}::uuid AND stay_date = ANY(${dates.map(dbDate)}::date[])
        ORDER BY stay_date FOR UPDATE`;
      for (const r of rows) {
        const data: Prisma.RoomInventoryUpdateInput = {};
        if (dto.pricePaise !== undefined) data.pricePaise = dto.pricePaise;
        if (dto.stopSell !== undefined) data.stopSell = dto.stopSell;
        if (dto.total !== undefined) {
          const booked = r.total - r.available;
          if (dto.total < booked) {
            throw unavailable(
              `${fromDbDate(r.stay_date)} already has ${booked} rooms booked; total cannot go below that`,
            );
          }
          data.total = dto.total;
          data.available = dto.total - booked;
        }
        await tx.roomInventory.update({
          where: { roomTypeId_stayDate: { roomTypeId, stayDate: r.stay_date } },
          data,
        });
      }
    });
    return this.calendar(roomTypeId, dto.from, dto.to);
  }

  /** Room-type level changes apply to future nights that still use the old defaults. */
  async applyRoomTypeChange(
    roomTypeId: string,
    change: { oldTotal: number; newTotal?: number; oldPrice: number; newPrice?: number },
  ): Promise<void> {
    const today = dbDate(istDate(new Date()));
    await this.prisma.$transaction(async (tx) => {
      if (change.newTotal !== undefined && change.newTotal !== change.oldTotal) {
        const rows = await tx.$queryRaw<{ stay_date: Date; total: number; available: number }[]>`
          SELECT stay_date, total, available FROM room_inventory
          WHERE room_type_id = ${roomTypeId}::uuid AND stay_date >= ${today}::date AND total = ${change.oldTotal}
          ORDER BY stay_date FOR UPDATE`;
        for (const r of rows) {
          const booked = r.total - r.available;
          const total = Math.max(change.newTotal, booked);
          await tx.roomInventory.update({
            where: { roomTypeId_stayDate: { roomTypeId, stayDate: r.stay_date } },
            data: { total, available: total - booked },
          });
        }
      }
      if (change.newPrice !== undefined && change.newPrice !== change.oldPrice) {
        await tx.roomInventory.updateMany({
          where: { roomTypeId, stayDate: { gte: today }, pricePaise: change.oldPrice },
          data: { pricePaise: change.newPrice },
        });
      }
    });
  }

  /** Read-only availability and price for a stay. */
  async quote(
    roomTypeId: string,
    nights: string[],
    rooms: number,
    db: Db = this.prisma,
  ): Promise<StayQuote> {
    const rows = await db.roomInventory.findMany({
      where: { roomTypeId, stayDate: { in: nights.map(dbDate) } },
      orderBy: { stayDate: 'asc' },
    });
    const complete = rows.length === nights.length;
    const roomsLeft = complete ? Math.min(...rows.map((r) => (r.stopSell ? 0 : r.available))) : 0;
    const priced = rows.map((r) => ({ date: fromDbDate(r.stayDate), pricePaise: r.pricePaise }));
    return {
      nights: priced,
      roomsLeft: Math.max(0, roomsLeft),
      available: complete && roomsLeft >= rooms,
      totalPaise: priced.reduce((sum, n) => sum + n.pricePaise, 0) * rooms,
    };
  }

  /** Decrement availability for every night, inside the caller's transaction. */
  async hold(
    tx: Prisma.TransactionClient,
    roomTypeId: string,
    nights: string[],
    rooms: number,
  ): Promise<StayNight[]> {
    const rows = await tx.$queryRaw<
      { stay_date: Date; available: number; price_paise: number; stop_sell: boolean }[]
    >`
      SELECT stay_date, available, price_paise, stop_sell FROM room_inventory
      WHERE room_type_id = ${roomTypeId}::uuid AND stay_date = ANY(${nights.map(dbDate)}::date[])
      ORDER BY stay_date FOR UPDATE`;
    if (rows.length !== nights.length)
      throw unavailable('Some nights are not open for booking yet');
    const short = rows.find((r) => r.stop_sell || r.available < rooms);
    if (short) throw unavailable(`Not enough rooms on ${fromDbDate(short.stay_date)}`);
    await tx.$executeRaw`
      UPDATE room_inventory SET available = available - ${rooms}, updated_at = now()
      WHERE room_type_id = ${roomTypeId}::uuid AND stay_date = ANY(${nights.map(dbDate)}::date[])`;
    return rows.map((r) => ({ date: fromDbDate(r.stay_date), pricePaise: r.price_paise }));
  }

  /** Give rooms back (cancellation, expired hold). Never exceeds the night's total. */
  async release(
    tx: Prisma.TransactionClient,
    roomTypeId: string,
    nights: string[],
    rooms: number,
  ): Promise<void> {
    await tx.$executeRaw`
      UPDATE room_inventory SET available = LEAST(total, available + ${rooms}), updated_at = now()
      WHERE room_type_id = ${roomTypeId}::uuid AND stay_date = ANY(${nights.map(dbDate)}::date[])`;
  }

  private checkRange(from: string, to: string): void {
    if (!isIsoDate(from) || !isIsoDate(to) || to < from)
      throw AppException.badRequest('Invalid date range');
    if (dateRange(from, to).length > MAX_CALENDAR_DAYS)
      throw AppException.badRequest(`Calendar range is limited to ${MAX_CALENDAR_DAYS} days`);
  }
}
