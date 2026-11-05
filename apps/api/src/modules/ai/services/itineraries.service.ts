import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { type Itinerary, type ItineraryDay, type ItineraryItem, type Prisma } from '@prisma/client';
import { type ItineraryPlan, type Lang } from '@tirth-now/shared-types';
import { type AuthPrincipal } from '../../../core/auth';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import {
  AppException,
  afterCursor,
  definedFields,
  NEWEST_FIRST,
  pageSize,
  toPage,
} from '../../../core/http';
import { t } from '../../../core/i18n';
import { PrismaService } from '../../../core/prisma';
import { dbDate, fromDbDate } from '../../../core/time';
import { type CreateItineraryDto, type UpdateItineraryDto } from '../dto/ai.dto';
import { renderItineraryPdf } from './itinerary-pdf';
import { type ScheduledDay } from './planner.service';

type Full = Itinerary & { dayList: (ItineraryDay & { items: ItineraryItem[] })[] };
const INCLUDE = {
  dayList: {
    orderBy: { dayIndex: 'asc' as const },
    include: { items: { orderBy: { seq: 'asc' as const } } },
  },
};

export interface TripInfo {
  tripType: 'solo' | 'family' | 'group';
  groupName: string | null;
  members: { name: string; age?: number; phone?: string; role?: string }[];
  stay: {
    hotelId?: string;
    name: string;
    nightlyPaise?: number;
    rooms?: number;
    checkInTime?: string;
    address?: string;
    notes?: string;
  } | null;
  travel: {
    arrivalMode: string;
    from?: string;
    arrivalTime?: string;
    departureTime?: string;
    localTransport?: string;
    details?: string;
  } | null;
  notes: string | null;
  pace: string;
  mode: 'ai' | 'custom';
}

export interface ItineraryResponse {
  id: string;
  title: string;
  startDate: string;
  days: number;
  partySize: number;
  budgetPaise: number | null;
  status: string;
  estimatedCostPaise: number;
  shareUrl: string | null;
  generatedBy: string | null;
  trip: TripInfo;
  dayList: {
    dayIndex: number;
    date: string;
    cityId: string | null;
    note: string | null;
    items: {
      id: string;
      seq: number;
      kind: string;
      title: string;
      templeId: string | null;
      aartiScheduleId: string | null;
      startsAt: string | null;
      endsAt: string | null;
      travelDistanceM: number | null;
      travelDurationMin: number | null;
      estCostPaise: number | null;
      note: string | null;
    }[];
  }[];
}

@Injectable()
export class ItinerariesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async save(
    user: AuthPrincipal,
    dto: CreateItineraryDto,
    lang: Lang,
    plan: ItineraryPlan,
    days: ScheduledDay[],
    model: string,
    raw: unknown,
  ): Promise<ItineraryResponse> {
    const id = await this.prisma.$transaction(async (tx) => {
      const it = await tx.itinerary.create({
        data: {
          userId: user.userId,
          title: plan.title.slice(0, 120),
          startDate: dbDate(dto.startDate),
          days: dto.days,
          budgetPaise: dto.budgetPaise ?? null,
          partySize: dto.partySize ?? 1,
          preferences: {
            cities: dto.cities ?? [],
            interests: dto.interests ?? [],
            pace: dto.pace ?? 'normal',
            accessibility: definedFields(dto.accessibility),
            lang,
            mode: dto.mode ?? 'ai',
            trip: JSON.parse(
              JSON.stringify({
                tripType: dto.tripType ?? (dto.members?.length ? 'group' : 'solo'),
                groupName: dto.groupName ?? null,
                members: dto.members ?? [],
                stay: dto.stay ?? null,
                travel: dto.travel ?? null,
                notes: dto.notes ?? null,
              }),
            ) as Prisma.InputJsonObject,
          },
          model,
          rawLlmOutput: raw === null ? undefined : { text: raw },
        },
      });
      for (const d of days) {
        const day = await tx.itineraryDay.create({
          data: {
            itineraryId: it.id,
            dayIndex: d.dayIndex,
            date: dbDate(d.date),
            cityId: d.cityId,
            notesI18n: d.note
              ? { [lang]: d.note, ...(lang === 'en' ? {} : { en: d.note }) }
              : undefined,
          },
        });
        await tx.itineraryItem.createMany({
          data: d.items.map((item, seq) => ({
            dayId: day.id,
            seq,
            kind: item.kind,
            templeId: item.templeId,
            aartiScheduleId: item.aartiScheduleId,
            title: item.title,
            startsAt: item.startsAt ? new Date(item.startsAt) : null,
            endsAt: item.endsAt ? new Date(item.endsAt) : null,
            travelDistanceM: item.travelDistanceM,
            travelDurationMin: item.travelDurationMin,
            estCostPaise: item.costPaise || null,
            note: item.note,
          })),
        });
      }
      return it.id;
    });
    return this.response(await this.full(id), lang);
  }

  async list(user: AuthPrincipal, q: { cursor?: string; limit?: number }) {
    const limit = pageSize(q.limit);
    const rows = await this.prisma.itinerary.findMany({
      where: { userId: user.userId, deletedAt: null, ...afterCursor(q.cursor) },
      orderBy: NEWEST_FIRST,
      take: limit + 1,
    });
    return toPage(rows, limit, (r) => ({
      id: r.id,
      title: r.title,
      startDate: fromDbDate(r.startDate),
      days: r.days,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async get(user: AuthPrincipal, id: string, lang: Lang): Promise<ItineraryResponse> {
    return this.response(await this.owned(user, id), lang);
  }

  async update(
    user: AuthPrincipal,
    id: string,
    dto: UpdateItineraryDto,
    lang: Lang,
  ): Promise<ItineraryResponse> {
    const it = await this.owned(user, id);
    await this.prisma.$transaction(async (tx) => {
      if (dto.title !== undefined || dto.status !== undefined) {
        await tx.itinerary.update({
          where: { id },
          data: {
            ...(dto.title !== undefined ? { title: dto.title } : {}),
            ...(dto.status !== undefined ? { status: dto.status } : {}),
          },
        });
      }
      if (dto.removeItemIds?.length) {
        const dayIds = it.dayList.map((d) => d.id);
        await tx.itineraryItem.deleteMany({
          where: { id: { in: dto.removeItemIds }, dayId: { in: dayIds } },
        });
      }
    });
    return this.response(await this.full(id), lang);
  }

  async remove(user: AuthPrincipal, id: string): Promise<void> {
    await this.owned(user, id);
    await this.prisma.itinerary.update({
      where: { id },
      data: { deletedAt: new Date(), shareToken: null },
    });
  }

  async share(user: AuthPrincipal, id: string): Promise<{ shareUrl: string; token: string }> {
    const it = await this.owned(user, id);
    const token = it.shareToken ?? randomBytes(12).toString('base64url');
    if (!it.shareToken)
      await this.prisma.itinerary.update({ where: { id }, data: { shareToken: token } });
    return { token, shareUrl: this.shareUrl(token) };
  }

  async shared(token: string, lang: Lang): Promise<ItineraryResponse> {
    const it = /^[A-Za-z0-9_-]{16}$/.test(token)
      ? await this.prisma.itinerary.findFirst({
          where: { shareToken: token, deletedAt: null },
          include: INCLUDE,
        })
      : null;
    if (!it) throw AppException.notFound('This itinerary link is not valid');
    // Shared copies hide the owner's budget and members' phone numbers.
    const r = this.response(it, lang);
    return {
      ...r,
      budgetPaise: null,
      trip: { ...r.trip, members: r.trip.members.map(({ phone: _phone, ...m }) => m) },
    };
  }

  async pdf(user: AuthPrincipal, id: string, lang: Lang): Promise<Buffer> {
    return renderItineraryPdf(this.response(await this.owned(user, id), lang), lang);
  }

  private shareUrl(token: string): string {
    return `${this.config.publicUrl.replace(/\/$/, '')}/v1/ai/itineraries/shared/${token}`;
  }

  private async full(id: string): Promise<Full> {
    return this.prisma.itinerary.findUniqueOrThrow({ where: { id }, include: INCLUDE });
  }

  private async owned(user: AuthPrincipal, id: string): Promise<Full> {
    const it = await this.prisma.itinerary.findFirst({
      where: { id, userId: user.userId, deletedAt: null },
      include: INCLUDE,
    });
    if (!it) throw AppException.notFound('Itinerary not found');
    return it;
  }

  private response(it: Full, lang: Lang): ItineraryResponse {
    const dayList = it.dayList.map((d) => ({
      dayIndex: d.dayIndex,
      date: fromDbDate(d.date),
      cityId: d.cityId,
      note: d.notesI18n ? t(d.notesI18n, lang) || null : null,
      items: d.items.map((i) => ({
        id: i.id,
        seq: i.seq,
        kind: i.kind,
        title: i.title,
        templeId: i.templeId,
        aartiScheduleId: i.aartiScheduleId,
        startsAt: i.startsAt?.toISOString() ?? null,
        endsAt: i.endsAt?.toISOString() ?? null,
        travelDistanceM: i.travelDistanceM,
        travelDurationMin: i.travelDurationMin,
        estCostPaise: i.estCostPaise,
        note: i.note,
      })),
    }));
    return {
      id: it.id,
      title: it.title,
      startDate: fromDbDate(it.startDate),
      days: it.days,
      partySize: it.partySize,
      budgetPaise: it.budgetPaise,
      status: it.status,
      estimatedCostPaise: dayList
        .flatMap((d) => d.items)
        .reduce((s, i) => s + (i.estCostPaise ?? 0), 0),
      shareUrl: it.shareToken ? this.shareUrl(it.shareToken) : null,
      generatedBy: it.model,
      trip: tripOf(it.preferences),
      dayList,
    };
  }
}

function tripOf(prefs: unknown): TripInfo {
  const p = (prefs && typeof prefs === 'object' ? prefs : {}) as Record<string, unknown>;
  const raw = (p.trip && typeof p.trip === 'object' ? p.trip : {}) as Partial<TripInfo>;
  return {
    tripType: raw.tripType ?? 'solo',
    groupName: raw.groupName ?? null,
    members: Array.isArray(raw.members) ? raw.members : [],
    stay: raw.stay ?? null,
    travel: raw.travel ?? null,
    notes: raw.notes ?? null,
    pace: typeof p.pace === 'string' ? p.pace : 'normal',
    mode: p.mode === 'custom' ? 'custom' : 'ai',
  };
}
