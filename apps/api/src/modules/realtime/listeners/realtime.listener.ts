import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CacheService } from '../../../core/cache';
import { MaintenanceRegistry } from '../../../core/maintenance';
import { type AartiChangedEvent, CATALOG_EVENTS, CatalogFacade } from '../../catalog';
import { type CabLocationEvent, ORDER_EVENTS, type OrderEvent } from '../../orders';
import { REELS_EVENTS, type ReportedEvent } from '../../reels';
import { SAFETY_EVENTS, type SosEvent } from '../../safety';
import { RealtimePublisher } from '../realtime.publisher';
import { roomName } from '../rooms';

/** Domain events → Socket.IO rooms. Runs in every process; delivery goes through Redis. */
@Injectable()
export class RealtimeListener implements OnModuleInit {
  private readonly logger = new Logger(RealtimeListener.name);

  constructor(
    private readonly rt: RealtimePublisher,
    private readonly catalog: CatalogFacade,
    private readonly cache: CacheService,
    private readonly maintenance: MaintenanceRegistry,
  ) {}

  onModuleInit(): void {
    this.maintenance.registerRecurring('aarti-live', 60_000, () => this.announceStartingAarti());
  }

  @OnEvent(ORDER_EVENTS.confirmed)
  @OnEvent(ORDER_EVENTS.accepted)
  @OnEvent(ORDER_EVENTS.in_progress)
  @OnEvent(ORDER_EVENTS.completed)
  @OnEvent(ORDER_EVENTS.cancelled)
  @OnEvent(ORDER_EVENTS.refunded)
  onOrder(e: OrderEvent): void {
    const payload = {
      orderId: e.orderId,
      code: e.code,
      type: e.type,
      status: e.status,
      from: e.from,
      at: new Date().toISOString(),
    };
    this.rt.toRoom(roomName.order(e.orderId), 'order.status', payload);
    if (e.vendorId && e.status !== 'pending') {
      this.rt.toRoom(roomName.vendor(e.vendorId), 'order.status', payload);
      if (e.status === 'confirmed' && e.from === 'pending')
        this.rt.toRoom(roomName.vendor(e.vendorId), 'order.new', payload);
    }
  }

  @OnEvent(ORDER_EVENTS.cabLocation)
  onCabLocation(e: CabLocationEvent): void {
    this.rt.toRoom(roomName.order(e.orderId), 'cab.location', e);
  }

  @OnEvent(SAFETY_EVENTS.triggered)
  onSosTriggered(e: SosEvent): void {
    this.rt.toRoom(roomName.admin(), 'sos.new', sosPayload(e));
  }

  @OnEvent(SAFETY_EVENTS.dispatched)
  @OnEvent(SAFETY_EVENTS.closed)
  onSosStatus(e: SosEvent): void {
    this.rt.toRoom([roomName.admin(), roomName.sos(e.shareToken)], 'sos.status', sosPayload(e));
  }

  @OnEvent(SAFETY_EVENTS.location)
  onSosLocation(e: SosEvent): void {
    this.rt.toRoom([roomName.admin(), roomName.sos(e.shareToken)], 'sos.location', sosPayload(e));
  }

  @OnEvent(REELS_EVENTS.reported)
  onReported(e: ReportedEvent): void {
    this.rt.toRoom(roomName.admin(), 'moderation.new', e);
  }

  @OnEvent(CATALOG_EVENTS.aartiChanged, { async: true, promisify: true })
  async onAartiChanged(e: AartiChangedEvent): Promise<void> {
    try {
      this.rt.toRoom(roomName.aarti(e.templeId), 'aarti.countdown', {
        templeId: e.templeId,
        next: await this.catalog.nextAarti(e.templeId, 'en'),
      });
    } catch (err) {
      this.logger.error({ err, templeId: e.templeId }, 'aarti countdown push failed');
    }
  }

  /** Every minute: tell aarti rooms when an aarti has just begun (once per occurrence). */
  async announceStartingAarti(now = new Date()): Promise<number> {
    const starting = (
      await this.catalog.upcomingAarti(undefined, 500, 'en', new Date(now.getTime() - 60_000))
    ).filter((a) => {
      const start = Date.parse(a.startsAt);
      return start <= now.getTime() && start > now.getTime() - 60_000;
    });
    let sent = 0;
    for (const a of starting) {
      const key = `rt:aarti-live:${a.scheduleId}:${a.startsAt}`;
      if (!(await this.cache.setIfAbsent(key, 3_600))) continue;
      this.rt.toRoom(roomName.aarti(a.templeId), 'aarti.live', {
        templeId: a.templeId,
        scheduleId: a.scheduleId,
        name: a.name,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        streamUrl: a.streamUrl,
      });
      sent++;
    }
    return sent;
  }
}

function sosPayload(e: SosEvent) {
  return {
    sosId: e.sosId,
    status: e.status,
    lat: e.lat,
    lng: e.lng,
    accuracyM: e.accuracyM,
    batteryPct: e.batteryPct,
    at: e.at,
  };
}
