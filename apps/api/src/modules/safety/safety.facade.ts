import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma';
import { SosShareService } from './services/sos-share.service';

/** Public surface of the safety module. */
@Injectable()
export class SafetyFacade {
  constructor(
    private readonly share: SosShareService,
    private readonly prisma: PrismaService,
  ) {}

  isShareActive(token: string): Promise<boolean> {
    return this.share.isActive(token);
  }

  /** SOS events created since a date, by status (admin KPIs). */
  async counts(since: Date): Promise<Record<string, number>> {
    const rows = await this.prisma.sosEvent.groupBy({
      by: ['status'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
  }
}
