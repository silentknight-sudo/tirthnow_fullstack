import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma';
import { dbDate } from '../../core/time';

/** Public surface of the ai module (admin KPIs). */
@Injectable()
export class AiFacade {
  constructor(private readonly prisma: PrismaService) {}

  async usage(
    fromDate: string,
    toDate: string,
  ): Promise<{ requests: number; inputTokens: number; outputTokens: number; users: number }> {
    const rows = await this.prisma.aiUsage.aggregate({
      where: { date: { gte: dbDate(fromDate), lte: dbDate(toDate) } },
      _sum: { requests: true, inputTokens: true, outputTokens: true },
      _count: { userId: true },
    });
    return {
      requests: rows._sum.requests ?? 0,
      inputTokens: rows._sum.inputTokens ?? 0,
      outputTokens: rows._sum.outputTokens ?? 0,
      users: rows._count.userId,
    };
  }
}
