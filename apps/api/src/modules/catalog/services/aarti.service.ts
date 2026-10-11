import { Injectable } from '@nestjs/common';
import { type AartiSchedule, type Prisma } from '@prisma/client';
import { type Lang } from '@tirth-now/shared-types';
import { AppException } from '../../../core/http';
import { t } from '../../../core/i18n';
import { PrismaService } from '../../../core/prisma';
import { addDays, dateRange, isIsoDate, istDate } from '../../../core/time';
import { type AartiInstanceResponse } from '../dto/catalog-responses.dto';
import { expandSchedules, type Occurrence } from './aarti-rules';

const MAX_RANGE_DAYS = 31;

type ScheduleWithTemple = AartiSchedule & { temple?: { nameI18n: Prisma.JsonValue } };

/**
 * The single source of aarti times. Schedules are stored as IST wall-clock + recurrence and
 * expanded here into UTC instants; the AI module must quote times from this service only.
 */
@Injectable()
export class AartiService {
  constructor(private readonly prisma: PrismaService) {}

  resolveRange(from: string | undefined, to: string | undefined): { from: string; to: string } {
    const start = from ?? istDate(new Date());
    const end = to ?? start;
    if (!isIsoDate(start) || !isIsoDate(end))
      throw AppException.badRequest('Dates must be valid YYYY-MM-DD');
    if (end < start) throw AppException.badRequest('"to" must not be before "from"');
    if (dateRange(start, end).length > MAX_RANGE_DAYS) {
      throw AppException.badRequest(`Range is limited to ${MAX_RANGE_DAYS} days`);
    }
    return { from: start, to: end };
  }

  async instancesForTemple(
    templeId: string,
    from: string,
    to: string,
    lang: Lang,
  ): Promise<AartiInstanceResponse[]> {
    const schedules = await this.prisma.aartiSchedule.findMany({ where: { templeId } });
    return expandSchedules(schedules, from, to).map((o) => this.toResponse(o, lang));
  }

  async instancesForTemples(
    templeIds: string[],
    from: string,
    to: string,
    lang: Lang,
  ): Promise<AartiInstanceResponse[]> {
    if (templeIds.length === 0) return [];
    const schedules = await this.prisma.aartiSchedule.findMany({
      where: { templeId: { in: templeIds } },
      include: { temple: { select: { nameI18n: true } } },
    });
    return expandSchedules(schedules, from, to).map((o) => this.toResponse(o, lang));
  }

  async instancesForSchedules(
    scheduleIds: string[],
    from: string,
    to: string,
    lang: Lang,
  ): Promise<AartiInstanceResponse[]> {
    if (scheduleIds.length === 0) return [];
    const schedules = await this.prisma.aartiSchedule.findMany({
      where: { id: { in: scheduleIds }, temple: { deletedAt: null } },
      include: { temple: { select: { nameI18n: true } } },
    });
    return expandSchedules(schedules, from, to).map((o) => this.toResponse(o, lang));
  }

  /** Next aarti that has not ended yet (looks a week ahead). */
  async nextForTemple(
    templeId: string,
    lang: Lang,
    now = new Date(),
  ): Promise<AartiInstanceResponse | null> {
    const today = istDate(now);
    const schedules = await this.prisma.aartiSchedule.findMany({ where: { templeId } });
    const next = expandSchedules(schedules, today, addDays(today, 7)).find((o) => o.endsAt > now);
    return next ? this.toResponse(next, lang) : null;
  }

  /** Upcoming (or in-progress) aartis across a city's temples, soonest first. */
  async upcoming(
    cityId: string | undefined,
    limit: number,
    lang: Lang,
    now = new Date(),
  ): Promise<AartiInstanceResponse[]> {
    const today = istDate(now);
    const schedules = await this.prisma.aartiSchedule.findMany({
      where: { temple: { deletedAt: null, isPublished: true, ...(cityId ? { cityId } : {}) } },
      include: { temple: { select: { nameI18n: true } } },
    });
    return expandSchedules(schedules, today, addDays(today, 1))
      .filter((o) => o.endsAt > now)
      .slice(0, limit)
      .map((o) => this.toResponse(o, lang));
  }

  private toResponse(o: Occurrence<ScheduleWithTemple>, lang: Lang): AartiInstanceResponse {
    const s = o.schedule;
    return {
      scheduleId: s.id,
      templeId: s.templeId,
      ...(s.temple ? { templeName: t(s.temple.nameI18n, lang) } : {}),
      kind: s.kind,
      name: t(s.nameI18n, lang),
      date: o.date,
      localTime: o.localTime,
      startsAt: o.startsAt.toISOString(),
      endsAt: o.endsAt.toISOString(),
      isLiveStreamed: s.isLiveStreamed,
      streamUrl: s.streamUrl,
    };
  }
}
