import { HttpStatus, Injectable } from '@nestjs/common';
import { type Experience, type ExperienceSlot, type Prisma } from '@prisma/client';
import { ERROR_CODES, type Lang } from '@tirth-now/shared-types';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { AppException } from '../../../core/http';
import { i18nJson, t, tOrNull } from '../../../core/i18n';
import { PrismaService } from '../../../core/prisma';
import { istToUtc } from '../../../core/time';
import { CatalogFacade } from '../../catalog';
import { VendorsFacade } from '../../vendors';
import {
  type CreateExperienceDto,
  type CreateSlotsDto,
  type ExperienceQueryDto,
  type ExperienceResponse,
  type SlotQueryDto,
  type SlotResponse,
  type UpdateExperienceDto,
} from '../dto/experiences.dto';
import { assertCanPublish } from './listing-guard';
import { parsePolicy } from './policy';

const unavailable = (msg: string) =>
  new AppException(ERROR_CODES.INVENTORY_UNAVAILABLE, HttpStatus.CONFLICT, msg);

@Injectable()
export class ExperiencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendors: VendorsFacade,
    private readonly catalog: CatalogFacade,
    private readonly audit: AuditService,
  ) {}

  async listForVendor(vendorId: string): Promise<ExperienceResponse[]> {
    const rows = await this.prisma.experience.findMany({
      where: { vendorId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((e) => this.toResponse(e, 'en', null));
  }

  async create(
    actor: AuthPrincipal,
    vendorId: string,
    dto: CreateExperienceDto,
  ): Promise<ExperienceResponse> {
    await assertCanPublish(this.vendors, vendorId, dto.isPublished);
    const e = await this.prisma.experience.create({
      data: {
        vendorId,
        cityId: dto.cityId,
        kind: dto.kind,
        titleI18n: i18nJson(dto.title),
        descriptionI18n: dto.description ? i18nJson(dto.description) : undefined,
        pricePaise: dto.pricePaise,
        durationMin: dto.durationMin,
        maxGroupSize: dto.maxGroupSize,
        cancellationPolicy: (dto.cancellationPolicy ??
          parsePolicy(null)) as unknown as Prisma.InputJsonObject,
        isPublished: dto.isPublished ?? false,
      },
    });
    await this.audit.record({
      actor,
      action: 'experience.create',
      entityType: 'experience',
      entityId: e.id,
      after: e,
    });
    return this.toResponse(e, 'en', null);
  }

  async update(
    actor: AuthPrincipal,
    vendorId: string,
    id: string,
    dto: UpdateExperienceDto,
  ): Promise<ExperienceResponse> {
    const before = await this.owned(vendorId, id);
    await assertCanPublish(this.vendors, vendorId, dto.isPublished);
    const e = await this.prisma.experience.update({
      where: { id },
      data: {
        cityId: dto.cityId,
        kind: dto.kind,
        titleI18n: dto.title ? i18nJson(dto.title) : undefined,
        descriptionI18n: dto.description ? i18nJson(dto.description) : undefined,
        pricePaise: dto.pricePaise,
        durationMin: dto.durationMin,
        maxGroupSize: dto.maxGroupSize,
        cancellationPolicy: dto.cancellationPolicy as unknown as Prisma.InputJsonObject | undefined,
        isPublished: dto.isPublished,
      },
    });
    await this.audit.record({
      actor,
      action: 'experience.update',
      entityType: 'experience',
      entityId: id,
      before,
      after: dto,
    });
    return this.toResponse(e, 'en', null);
  }

  async remove(actor: AuthPrincipal, vendorId: string, id: string): Promise<void> {
    await this.owned(vendorId, id);
    await this.prisma.experience.update({
      where: { id },
      data: { deletedAt: new Date(), isPublished: false },
    });
    await this.audit.record({
      actor,
      action: 'experience.delete',
      entityType: 'experience',
      entityId: id,
    });
  }

  async createSlots(
    actor: AuthPrincipal,
    vendorId: string,
    id: string,
    dto: CreateSlotsDto,
  ): Promise<SlotResponse[]> {
    const exp = await this.owned(vendorId, id);
    if (dto.capacity > exp.maxGroupSize * 10)
      throw AppException.badRequest('Capacity is unrealistically high for this experience');
    const starts = dto.dates.flatMap((d) =>
      dto.times.map((tm) => {
        const [h, m] = tm.split(':').map(Number) as [number, number];
        return istToUtc(d, h, m);
      }),
    );
    if (starts.some((s) => s.getTime() < Date.now()))
      throw AppException.badRequest('Slots must be in the future');
    await this.prisma.experienceSlot.createMany({
      skipDuplicates: true,
      data: starts.map((startsAt) => ({ experienceId: id, startsAt, capacity: dto.capacity })),
    });
    await this.audit.record({
      actor,
      action: 'experience.slots_create',
      entityType: 'experience',
      entityId: id,
      after: dto,
    });
    return this.slots(id, { days: 60 });
  }

  async removeSlot(actor: AuthPrincipal, vendorId: string, slotId: string): Promise<void> {
    const slot = await this.prisma.experienceSlot.findFirst({
      where: { id: slotId, experience: { vendorId } },
    });
    if (!slot) throw AppException.notFound('Slot not found');
    if (slot.booked > 0) throw AppException.conflict('This slot has bookings; cancel them first');
    await this.prisma.experienceSlot.delete({ where: { id: slotId } });
    await this.audit.record({
      actor,
      action: 'experience.slot_delete',
      entityType: 'experience_slot',
      entityId: slotId,
    });
  }

  private async owned(vendorId: string, id: string): Promise<Experience> {
    const e = await this.prisma.experience.findFirst({ where: { id, vendorId, deletedAt: null } });
    if (!e) throw AppException.notFound('Experience not found');
    return e;
  }

  // ───────────── public ─────────────

  async search(q: ExperienceQueryDto, lang: Lang): Promise<ExperienceResponse[]> {
    const cityId = q.city ? await this.catalog.cityIdBySlug(q.city) : undefined;
    const rows = await this.prisma.experience.findMany({
      where: {
        deletedAt: null,
        isPublished: true,
        vendorId: { in: await this.vendors.activeVendorIds() },
        ...(cityId ? { cityId } : {}),
        ...(q.kind ? { kind: q.kind } : {}),
      },
      orderBy: { pricePaise: 'asc' },
      take: 200,
    });
    return rows.map((e) => this.toResponse(e, lang, null));
  }

  async detail(id: string, q: SlotQueryDto, lang: Lang): Promise<ExperienceResponse> {
    const e = await this.prisma.experience.findFirst({
      where: {
        id,
        deletedAt: null,
        isPublished: true,
        vendorId: { in: await this.vendors.activeVendorIds() },
      },
    });
    if (!e) throw AppException.notFound('Experience not found');
    return this.toResponse(e, lang, await this.slots(id, q));
  }

  async slots(experienceId: string, q: { from?: string; days?: number }): Promise<SlotResponse[]> {
    const from = q.from ? new Date(q.from) : new Date();
    const to = new Date(from.getTime() + (q.days ?? 14) * 86_400_000);
    const rows = await this.prisma.experienceSlot.findMany({
      where: { experienceId, startsAt: { gte: from, lt: to } },
      orderBy: { startsAt: 'asc' },
    });
    return rows.map(slotResponse);
  }

  /** Reserve seats inside the caller's transaction. */
  async holdSlot(
    tx: Prisma.TransactionClient,
    slotId: string,
    seats: number,
  ): Promise<{ slot: ExperienceSlot; experience: Experience }> {
    const rows = await tx.$queryRaw<
      ExperienceSlot[]
    >`SELECT * FROM experience_slots WHERE id = ${slotId}::uuid FOR UPDATE`;
    const row = rows[0];
    if (!row) throw AppException.notFound('Slot not found');
    const slot = await tx.experienceSlot.findUniqueOrThrow({
      where: { id: slotId },
      include: { experience: true },
    });
    if (slot.startsAt.getTime() < Date.now() + 30 * 60_000)
      throw unavailable('Bookings close 30 minutes before the start');
    if (slot.capacity - slot.booked < seats)
      throw unavailable(`Only ${slot.capacity - slot.booked} places left`);
    if (seats > slot.experience.maxGroupSize)
      throw AppException.badRequest(`At most ${slot.experience.maxGroupSize} people per booking`);
    const updated = await tx.experienceSlot.update({
      where: { id: slotId },
      data: { booked: { increment: seats } },
    });
    return { slot: updated, experience: slot.experience };
  }

  async releaseSlot(tx: Prisma.TransactionClient, slotId: string, seats: number): Promise<void> {
    await tx.$executeRaw`UPDATE experience_slots SET booked = GREATEST(0, booked - ${seats}), updated_at = now() WHERE id = ${slotId}::uuid`;
  }

  toResponse(e: Experience, lang: Lang, slots: SlotResponse[] | null): ExperienceResponse {
    return {
      id: e.id,
      vendorId: e.vendorId,
      cityId: e.cityId,
      kind: e.kind,
      title: t(e.titleI18n, lang),
      description: tOrNull(e.descriptionI18n, lang),
      pricePaise: e.pricePaise,
      durationMin: e.durationMin,
      maxGroupSize: e.maxGroupSize,
      cancellationPolicy: parsePolicy(e.cancellationPolicy),
      isPublished: e.isPublished,
      ...(slots ? { slots } : {}),
    };
  }
}

function slotResponse(s: ExperienceSlot): SlotResponse {
  return {
    id: s.id,
    startsAt: s.startsAt.toISOString(),
    capacity: s.capacity,
    booked: s.booked,
    remaining: s.capacity - s.booked,
  };
}
