import { randomBytes } from 'node:crypto';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { type Prisma, type SosEvent as SosRow } from '@prisma/client';
import { ERROR_CODES, type Lang } from '@tirth-now/shared-types';
import { type Queue } from 'bullmq';
import { AuditService } from '../../../core/audit';
import { type AuthPrincipal } from '../../../core/auth';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { QUEUES } from '../../../core/queue';
import { SettingsService } from '../../../core/settings';
import { CatalogFacade } from '../../catalog';
import {
  type ResolveSosDto,
  type SosLocationDto,
  type SosResponse,
  type TriggerSosDto,
} from '../dto/safety.dto';
import { SAFETY_EVENTS, type SosEvent } from '../events';

export const DISPATCH_SOS_JOB = 'dispatch-sos';
export const NOTIFY_SAFE_JOB = 'notify-safe';
/** An accidental trigger can be cancelled this long after it was sent. */
export const CANCEL_GRACE_MS = 2 * 60_000;
const TRAIL_MAX = 500;
const ACTIVE = ['triggered', 'dispatched'] as const;

export interface TrailPoint {
  lat: number;
  lng: number;
  accuracyM: number | null;
  at: string;
}

export function readTrail(value: Prisma.JsonValue): TrailPoint[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((p) => {
    if (typeof p !== 'object' || p === null || Array.isArray(p)) return [];
    const { lat, lng, accuracyM, at } = p as Record<string, unknown>;
    return typeof lat === 'number' && typeof lng === 'number' && typeof at === 'string'
      ? [{ lat, lng, accuracyM: typeof accuracyM === 'number' ? accuracyM : null, at }]
      : [];
  });
}

export function dispatchCount(value: Prisma.JsonValue): number {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return 0;
  const n = (value as Record<string, unknown>).contactsNotified;
  return typeof n === 'number' ? n : 0;
}

@Injectable()
export class SafetyService {
  private readonly logger = new Logger(SafetyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogFacade,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @InjectQueue(QUEUES.sos) private readonly queue: Queue,
  ) {}

  /**
   * SOS: always recorded. A user with an active SOS gets that one back (with the new position);
   * beyond SOS_MAX_PER_10_MIN new events are refused but still audited.
   */
  async trigger(
    user: AuthPrincipal,
    dto: TriggerSosDto,
    idempotencyKey: string,
    lang: Lang,
  ): Promise<SosResponse> {
    const existing = await this.prisma.sosEvent.findFirst({
      where: {
        userId: user.userId,
        status: { in: [...ACTIVE] },
        shareExpiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      const updated = await this.appendLocation(existing, dto);
      return this.response(updated, lang);
    }
    const since = new Date(Date.now() - 10 * 60_000);
    const recent = await this.prisma.sosEvent.count({
      where: { userId: user.userId, createdAt: { gte: since } },
    });
    if (recent >= this.config.sos.maxPer10Min) {
      await this.audit.record({
        actor: user,
        action: 'sos.rate_limited',
        entityType: 'sos_event',
        after: { lat: dto.lat, lng: dto.lng, recent },
      });
      this.logger.warn({ userId: user.userId, recent }, 'SOS rate limited');
      throw new AppException(
        ERROR_CODES.SOS_RATE_LIMITED,
        HttpStatus.TOO_MANY_REQUESTS,
        'Too many SOS alerts in 10 minutes. Call 112 for emergencies.',
      );
    }
    const now = new Date();
    const sos = await this.prisma.sosEvent.upsert({
      where: { userId_idempotencyKey: { userId: user.userId, idempotencyKey } },
      update: {},
      create: {
        userId: user.userId,
        lat: dto.lat,
        lng: dto.lng,
        accuracyM: dto.accuracyM ?? null,
        batteryPct: dto.batteryPct ?? null,
        locationTrail: [
          { lat: dto.lat, lng: dto.lng, accuracyM: dto.accuracyM ?? null, at: now.toISOString() },
        ],
        shareToken: randomBytes(16).toString('base64url'),
        shareExpiresAt: new Date(now.getTime() + this.config.sos.shareHours * 3_600_000),
        idempotencyKey,
      },
    });
    await this.queue.add(
      DISPATCH_SOS_JOB,
      { sosId: sos.id },
      {
        jobId: `sos-${sos.id}`,
        priority: 1,
        attempts: 5,
        backoff: { type: 'exponential', delay: 2_000 },
      },
    );
    await this.audit.record({
      actor: user,
      action: 'sos.triggered',
      entityType: 'sos_event',
      entityId: sos.id,
      after: { lat: dto.lat, lng: dto.lng },
    });
    this.emit(SAFETY_EVENTS.triggered, sos);
    this.logger.warn({ sosId: sos.id, userId: user.userId }, 'SOS triggered');
    return this.response(sos, lang);
  }

  async get(user: AuthPrincipal, id: string, lang: Lang): Promise<SosResponse> {
    return this.response(await this.owned(user, id), lang);
  }

  async updateLocation(
    user: AuthPrincipal,
    id: string,
    dto: SosLocationDto,
  ): Promise<{ ok: true }> {
    const sos = await this.owned(user, id);
    if (
      !ACTIVE.includes(sos.status as (typeof ACTIVE)[number]) ||
      sos.shareExpiresAt <= new Date()
    ) {
      throw new AppException(
        ERROR_CODES.CONFLICT,
        HttpStatus.CONFLICT,
        'This SOS is no longer active',
      );
    }
    await this.appendLocation(sos, dto);
    return { ok: true };
  }

  async cancel(user: AuthPrincipal, id: string, lang: Lang): Promise<SosResponse> {
    const sos = await this.owned(user, id);
    if (!ACTIVE.includes(sos.status as (typeof ACTIVE)[number])) return this.response(sos, lang);
    if (Date.now() - sos.createdAt.getTime() > CANCEL_GRACE_MS) {
      throw new AppException(
        ERROR_CODES.CONFLICT,
        HttpStatus.CONFLICT,
        'The cancel window has passed; mark yourself safe instead',
      );
    }
    return this.response(await this.close(sos, 'cancelled', user, null), lang);
  }

  async resolve(
    user: AuthPrincipal,
    id: string,
    dto: ResolveSosDto,
    lang: Lang,
  ): Promise<SosResponse> {
    const sos = await this.owned(user, id);
    if (!ACTIVE.includes(sos.status as (typeof ACTIVE)[number])) return this.response(sos, lang);
    return this.response(await this.close(sos, 'resolved', user, dto.note ?? null), lang);
  }

  /** Admin handling from the live SOS board. */
  async adminResolve(admin: AuthPrincipal, id: string, dto: ResolveSosDto): Promise<SosRow> {
    const sos = await this.prisma.sosEvent.findUnique({ where: { id } });
    if (!sos) throw AppException.notFound('SOS not found');
    if (!ACTIVE.includes(sos.status as (typeof ACTIVE)[number])) return sos;
    return this.close(sos, dto.falseAlarm ? 'false_alarm' : 'resolved', admin, dto.note ?? null);
  }

  private async close(
    sos: SosRow,
    status: 'cancelled' | 'resolved' | 'false_alarm',
    actor: AuthPrincipal,
    note: string | null,
  ): Promise<SosRow> {
    const isAdmin = actor.userId !== sos.userId;
    const claimed = await this.prisma.sosEvent.updateMany({
      where: { id: sos.id, status: { in: [...ACTIVE] } },
      data: {
        status,
        resolvedAt: new Date(),
        ...(isAdmin ? { handledById: actor.userId } : {}),
        shareExpiresAt: new Date(),
      },
    });
    const updated = await this.prisma.sosEvent.findUniqueOrThrow({ where: { id: sos.id } });
    if (claimed.count === 1) {
      await this.audit.record({
        actor,
        action: `sos.${status}`,
        entityType: 'sos_event',
        entityId: sos.id,
        before: { status: sos.status },
        after: { status, note },
      });
      // Contacts who were alerted hear that it is over (cancelled before dispatch: nobody was told).
      if (updated.dispatchedAt && status !== 'false_alarm') {
        await this.queue.add(
          NOTIFY_SAFE_JOB,
          { sosId: sos.id },
          { jobId: `sos-safe-${sos.id}`, priority: 1, attempts: 5 },
        );
      }
      this.emit(SAFETY_EVENTS.closed, updated);
    }
    return updated;
  }

  private async appendLocation(sos: SosRow, p: SosLocationDto): Promise<SosRow> {
    const point: TrailPoint = {
      lat: p.lat,
      lng: p.lng,
      accuracyM: p.accuracyM ?? null,
      at: new Date().toISOString(),
    };
    // Append in SQL so concurrent updates never lose points; keep the newest TRAIL_MAX.
    await this.prisma.$executeRaw`
      UPDATE sos_events SET
        lat = ${p.lat}, lng = ${p.lng},
        accuracy_m = COALESCE(${p.accuracyM ?? null}::int, accuracy_m),
        battery_pct = COALESCE(${p.batteryPct ?? null}::smallint, battery_pct),
        location_trail = (
          SELECT COALESCE(jsonb_agg(e ORDER BY i), '[]'::jsonb) FROM (
            SELECT e, i FROM jsonb_array_elements(location_trail || ${JSON.stringify([point])}::jsonb) WITH ORDINALITY AS t(e, i)
            ORDER BY i DESC LIMIT ${TRAIL_MAX}
          ) newest
        ),
        updated_at = now()
      WHERE id = ${sos.id}::uuid`;
    const updated = await this.prisma.sosEvent.findUniqueOrThrow({ where: { id: sos.id } });
    this.emit(SAFETY_EVENTS.location, updated);
    return updated;
  }

  private async owned(user: AuthPrincipal, id: string): Promise<SosRow> {
    const sos = await this.prisma.sosEvent.findFirst({ where: { id, userId: user.userId } });
    if (!sos) throw AppException.notFound('SOS not found');
    return sos;
  }

  shareUrl(token: string): string {
    return `${this.config.publicUrl.replace(/\/$/, '')}/s/${token}`;
  }

  async response(sos: SosRow, lang: Lang): Promise<SosResponse> {
    const [help, helplines] = await Promise.all([
      this.catalog.nearestEmergencyPois({ lat: sos.lat, lng: sos.lng }, lang),
      this.settings.get<{ name: string; phone: string }[]>('safety.helplines', [
        { name: 'Emergency (all services)', phone: '112' },
      ]),
    ]);
    const active = ACTIVE.includes(sos.status as (typeof ACTIVE)[number]);
    return {
      id: sos.id,
      status: sos.status,
      lat: sos.lat,
      lng: sos.lng,
      shareUrl: this.shareUrl(sos.shareToken),
      shareExpiresAt: sos.shareExpiresAt.toISOString(),
      createdAt: sos.createdAt.toISOString(),
      dispatchedAt: sos.dispatchedAt?.toISOString() ?? null,
      resolvedAt: sos.resolvedAt?.toISOString() ?? null,
      contactsNotified: dispatchCount(sos.dispatchResult),
      cancellableForS: active
        ? Math.max(0, Math.ceil((sos.createdAt.getTime() + CANCEL_GRACE_MS - Date.now()) / 1000))
        : 0,
      nearestHelp: help.map((p) => ({
        name: p.name,
        category: p.category,
        phoneE164: p.phoneE164,
        lat: p.lat,
        lng: p.lng,
        ...(p.distanceKm !== undefined ? { distanceKm: p.distanceKm } : {}),
      })),
      helplines,
    };
  }

  emit(name: string, sos: SosRow): void {
    const event: SosEvent = {
      sosId: sos.id,
      userId: sos.userId,
      shareToken: sos.shareToken,
      status: sos.status,
      lat: sos.lat,
      lng: sos.lng,
      accuracyM: sos.accuracyM,
      batteryPct: sos.batteryPct,
      at: new Date().toISOString(),
    };
    void this.events.emitAsync(name, event).catch((err: unknown) => {
      this.logger.error({ err, event: name }, 'SOS event listener failed');
    });
  }
}
