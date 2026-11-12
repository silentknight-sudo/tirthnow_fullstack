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

  /**
   * A vendor's sales for the last `days` days (IST calendar days). Earnings are what the
   * vendor keeps under ADR-0021: total − platform fee.
   */
  async salesSummary(vendorId: string, days: number) {
    const since = new Date(Date.now() - days * 86_400_000);
    const orders = await this.prisma.order.findMany({
      where: { vendorId, createdAt: { gte: since }, deletedAt: null },
      select: {
        status: true,
        totalPaise: true,
        feePaise: true,
        subtotalPaise: true,
        discountPaise: true,
        createdAt: true,
        items: { select: { snapshot: true, quantity: true, totalPaise: true } },
      },
    });
    const SOLD = new Set(['confirmed', 'in_progress', 'completed']);
    const byDay = new Map<string, { orders: number; earningsPaise: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000 + 5.5 * 3_600_000).toISOString().slice(0, 10);
      byDay.set(d, { orders: 0, earningsPaise: 0 });
    }
    const items = new Map<string, { name: string; quantity: number; salesPaise: number }>();
    const statusCounts: Record<string, number> = {};
    let sold = 0;
    let gross = 0;
    let earnings = 0;
    let discounts = 0;
    for (const o of orders) {
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
      if (!SOLD.has(o.status)) continue;
      sold++;
      gross += o.totalPaise;
      earnings += o.totalPaise - o.feePaise;
      discounts += o.discountPaise;
      const day = new Date(o.createdAt.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
      const b = byDay.get(day);
      if (b) {
        b.orders++;
        b.earningsPaise += o.totalPaise - o.feePaise;
      }
      for (const it of o.items) {
        const snap = it.snapshot as Record<string, unknown>;
        const pick = [snap.name, snap.roomTypeName, snap.vehicleClass, snap.title].find(
          (v): v is string => typeof v === 'string',
        );
        const name = pick ?? 'Item';
        const cur = items.get(name) ?? { name, quantity: 0, salesPaise: 0 };
        cur.quantity += it.quantity;
        cur.salesPaise += it.totalPaise;
        items.set(name, cur);
      }
    }
    return {
      days,
      ordersCount: sold,
      grossPaise: gross,
      earningsPaise: earnings,
      discountsPaise: discounts,
      avgOrderPaise: sold ? Math.round(gross / sold) : 0,
      statusCounts,
      daily: [...byDay.entries()].map(([date, v]) => ({ date, ...v })),
      topItems: [...items.values()].sort((a, b) => b.salesPaise - a.salesPaise).slice(0, 5),
    };
  }

  async counts(
    since: Date,
    until: Date = new Date(),
  ): Promise<{ type: OrderType; status: string; count: number; gmvPaise: number }[]> {
    const rows = await this.prisma.order.groupBy({
      by: ['type', 'status'],
      where: { createdAt: { gte: since, lt: until } },
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
