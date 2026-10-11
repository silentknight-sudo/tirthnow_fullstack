import { Injectable } from '@nestjs/common';
import { type Order, type OrderType } from '@prisma/client';
import { PrismaService } from '../../core/prisma';
import { type OrderDetails, readDetails } from './services/order-details';

/** Public surface of the orders module. */
@Injectable()
export class OrdersFacade {
  constructor(private readonly prisma: PrismaService) {}

  async get(orderId: string): Promise<(Order & { parsed: OrderDetails }) | null> {
    const o = await this.prisma.order.findUnique({ where: { id: orderId } });
    return o ? { ...o, parsed: readDetails(o.details) } : null;
  }

  /** Completed order of this user for a listing (verified reviews). */
  async completedOrderFor(
    userId: string,
    orderId: string,
  ): Promise<(Order & { parsed: OrderDetails }) | null> {
    const o = await this.prisma.order.findFirst({
      where: { id: orderId, userId, status: { in: ['completed', 'refunded'] } },
    });
    return o ? { ...o, parsed: readDetails(o.details) } : null;
  }

  async counts(
    since: Date,
  ): Promise<{ type: OrderType; status: string; count: number; gmvPaise: number }[]> {
    const rows = await this.prisma.order.groupBy({
      by: ['type', 'status'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { totalPaise: true },
    });
    return rows.map((r) => ({
      type: r.type,
      status: r.status,
      count: r._count._all,
      gmvPaise: r._sum.totalPaise ?? 0,
    }));
  }
}
