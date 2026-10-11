import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma';

/** Public surface of the reels module (admin KPIs). */
@Injectable()
export class ReelsFacade {
  constructor(private readonly prisma: PrismaService) {}

  async counts(since: Date): Promise<{ reels: number; openReports: number }> {
    const [reels, openReports] = await Promise.all([
      this.prisma.reel.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      this.prisma.report.count({ where: { status: 'open' } }),
    ]);
    return { reels, openReports };
  }
}
