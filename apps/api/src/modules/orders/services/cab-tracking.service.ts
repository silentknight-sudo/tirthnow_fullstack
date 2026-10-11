import { HttpStatus, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ERROR_CODES } from '@tirth-now/shared-types';
import { type AuthPrincipal } from '../../../core/auth';
import { CacheService } from '../../../core/cache';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { type CabLocationDto, type CabTrackingResponse } from '../dto/orders.dto';
import { type CabLocationEvent, ORDER_EVENTS } from '../events';

const TTL_S = 30 * 60;
const key = (orderId: string) => `cab-loc:${orderId}`;

/** Driver location for active cab orders: last point in Redis, live points over Socket.IO. */
@Injectable()
export class CabTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly events: EventEmitter2,
  ) {}

  async update(vendorId: string, orderId: string, dto: CabLocationDto): Promise<CabLocationEvent> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, vendorId, type: 'cab', status: { not: 'pending' } },
      select: { status: true },
    });
    if (!order) throw AppException.notFound('Order not found');
    if (order.status !== 'confirmed' && order.status !== 'in_progress') {
      throw new AppException(
        ERROR_CODES.CONFLICT,
        HttpStatus.CONFLICT,
        'Tracking is only for upcoming or ongoing rides',
      );
    }
    const event: CabLocationEvent = {
      orderId,
      lat: dto.lat,
      lng: dto.lng,
      headingDeg: dto.headingDeg ?? null,
      speedKph: dto.speedKph ?? null,
      at: new Date().toISOString(),
    };
    await this.cache.set(key(orderId), event, TTL_S);
    this.events.emit(ORDER_EVENTS.cabLocation, event);
    return event;
  }

  async forUser(user: AuthPrincipal, orderId: string): Promise<CabTrackingResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId: user.userId, type: 'cab' },
      select: { status: true },
    });
    if (!order) throw AppException.notFound('Order not found');
    const live =
      order.status === 'confirmed' || order.status === 'in_progress'
        ? await this.cache.get<CabLocationEvent>(key(orderId))
        : null;
    return {
      orderId,
      lat: live?.lat ?? null,
      lng: live?.lng ?? null,
      headingDeg: live?.headingDeg ?? null,
      speedKph: live?.speedKph ?? null,
      at: live?.at ?? null,
      room: `order:${orderId}`,
    };
  }
}
