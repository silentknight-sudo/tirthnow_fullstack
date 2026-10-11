import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { type Itinerary, type ItineraryDay, type ItineraryItem } from '@prisma/client';
import { type ItineraryPlan, type Lang } from '@tirth-now/shared-types';
import PDFDocument from 'pdfkit';
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
import { type ScheduledDay } from './planner.service';

type Full = Itinerary & { dayList: (ItineraryDay & { items: ItineraryItem[] })[] };
const INCLUDE = {
  dayList: {
    orderBy: { dayIndex: 'asc' as const },
    include: { items: { orderBy: { seq: 'asc' as const } } },
  },
};

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
    // Shared copies hide the owner's budget.
    return { ...this.response(it, lang), budgetPaise: null };
  }

  async pdf(user: AuthPrincipal, id: string, lang: Lang): Promise<Buffer> {
    const r = this.response(await this.owned(user, id), lang);
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: r.title } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      }),
    );
    const time = (iso: string | null) =>
      iso
        ? new Date(iso).toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : '';
    doc.fontSize(20).text(r.title).moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor('#555')
      .text(
        `${r.startDate} · ${String(r.days)} day(s) · party of ${String(r.partySize)} · est. ₹${String(Math.round(r.estimatedCostPaise / 100))}`,
      )
      .fillColor('#000')
      .moveDown();
    for (const d of r.dayList) {
      doc.fontSize(14).text(`Day ${String(d.dayIndex + 1)} — ${d.date}`);
      if (d.note) doc.fontSize(10).fillColor('#555').text(d.note).fillColor('#000');
      doc.moveDown(0.3);
      for (const item of d.items) {
        doc.fontSize(11).text(`${time(item.startsAt)}  ${item.title}`, { continued: false });
        const extra = [
          item.travelDurationMin ? `~${String(item.travelDurationMin)} min travel` : null,
          item.note,
        ]
          .filter(Boolean)
          .join(' · ');
        if (extra) doc.fontSize(9).fillColor('#666').text(`        ${extra}`).fillColor('#000');
      }
      doc.moveDown();
    }
    doc
      .fontSize(8)
      .fillColor('#888')
      .text(
        'Aarti times come from temple schedules and can change on festival days. Please confirm locally.',
      );
    doc.end();
    return done;
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
      dayList,
    };
  }
}
