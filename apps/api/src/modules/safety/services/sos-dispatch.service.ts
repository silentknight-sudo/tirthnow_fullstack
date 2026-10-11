import { Injectable, Logger } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { isLang } from '@tirth-now/shared-types';
import { PrismaService } from '../../../core/prisma';
import { CatalogFacade } from '../../catalog';
import { IdentityFacade } from '../../identity';
import { NotificationsFacade } from '../../notifications';
import { SAFETY_EVENTS } from '../events';
import { SafetyService } from './safety.service';

interface DispatchResult {
  notificationIds: string[];
  contactsNotified: number;
  appUsersNotified: number;
  police: string | null;
  outcomes?: Record<string, string>;
}

const asResult = (v: Prisma.JsonValue): Partial<DispatchResult> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? v : {};

/** sos queue jobs: alert emergency contacts (SMS, WhatsApp, push) and tell them when it is over. */
@Injectable()
export class SosDispatchService {
  private readonly logger = new Logger(SosDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityFacade,
    private readonly catalog: CatalogFacade,
    private readonly notifications: NotificationsFacade,
    private readonly safety: SafetyService,
  ) {}

  async dispatch(sosId: string): Promise<string> {
    const sos = await this.prisma.sosEvent.findUnique({ where: { id: sosId } });
    if (!sos) return 'missing';
    if (sos.dispatchedAt) return 'already-dispatched';
    if (sos.status !== 'triggered') return `skipped-${sos.status}`;

    // Create the notification rows once; a retried job re-delivers the same rows.
    let result = asResult(sos.dispatchResult);
    if (!result.notificationIds) {
      const [user] = await this.identity.getContacts([sos.userId]);
      const name = user?.displayName ?? user?.phoneE164 ?? 'A Tirth Now traveller';
      const contacts = await this.identity.emergencyContacts(sos.userId);
      const police = (
        await this.catalog.nearestEmergencyPois({ lat: sos.lat, lng: sos.lng }, 'en')
      ).find((p) => p.category === 'police');
      const policeText = police
        ? `${police.name}${police.phoneE164 ? ` ${police.phoneE164}` : ''}`
        : '112';
      const vars = { name, link: this.safety.shareUrl(sos.shareToken), police: policeText };
      const lang = user && isLang(user.preferredLang) ? user.preferredLang : 'en';

      const ids: string[] = [];
      ids.push(
        ...(await this.notifications.notifyPhones({
          recipients: contacts.map((c) => ({ phone: c.phoneE164, lang })),
          key: 'sos_alert',
          vars,
          channels: ['sms'],
          enqueue: false,
        })),
      );
      ids.push(
        ...(await this.notifications.notifyPhones({
          recipients: contacts
            .filter((c) => c.notifyWhatsapp)
            .map((c) => ({ phone: c.phoneE164, lang })),
          key: 'sos_alert',
          vars,
          channels: ['whatsapp'],
          enqueue: false,
        })),
      );
      const appUsers = [
        ...(await this.identity.findUserIdsByPhones(contacts.map((c) => c.phoneE164))).values(),
      ].filter((id) => id !== sos.userId);
      ids.push(
        ...(await this.notifications.notifyUsers({
          userIds: appUsers,
          key: 'sos_alert',
          vars,
          channels: ['push'],
          payload: { type: 'sos', shareToken: sos.shareToken },
          enqueue: false,
        })),
      );
      result = {
        notificationIds: ids,
        contactsNotified: contacts.length,
        appUsersNotified: appUsers.length,
        police: police?.name ?? null,
      };
      await this.prisma.sosEvent.update({
        where: { id: sos.id },
        data: { dispatchResult: result },
      });
    }

    const outcomes = await this.notifications.deliverNow(result.notificationIds ?? []);
    // A SOS closed while we were sending keeps its status (and its contacts hear it is over).
    await this.prisma.sosEvent.updateMany({
      where: { id: sos.id, status: 'triggered' },
      data: { status: 'dispatched' },
    });
    const dispatched = await this.prisma.sosEvent.update({
      where: { id: sos.id },
      data: { dispatchedAt: new Date(), dispatchResult: { ...result, outcomes } },
    });
    if (dispatched.status === 'cancelled' || dispatched.status === 'resolved')
      await this.notifySafe(sos.id);
    this.safety.emit(SAFETY_EVENTS.dispatched, dispatched);
    this.logger.warn({ sosId, contacts: result.contactsNotified, outcomes }, 'SOS dispatched');
    return 'dispatched';
  }

  async notifySafe(sosId: string): Promise<string> {
    const sos = await this.prisma.sosEvent.findUnique({ where: { id: sosId } });
    if (!sos?.dispatchedAt) return 'skipped';
    const [user] = await this.identity.getContacts([sos.userId]);
    const name = user?.displayName ?? user?.phoneE164 ?? 'The traveller';
    const lang = user && isLang(user.preferredLang) ? user.preferredLang : 'en';
    const contacts = await this.identity.emergencyContacts(sos.userId);
    const ids = await this.notifications.notifyPhones({
      recipients: contacts.map((c) => ({ phone: c.phoneE164, lang })),
      key: 'sos_resolved',
      vars: { name },
      channels: ['sms'],
      enqueue: false,
    });
    const appUsers = [
      ...(await this.identity.findUserIdsByPhones(contacts.map((c) => c.phoneE164))).values(),
    ].filter((id) => id !== sos.userId);
    ids.push(
      ...(await this.notifications.notifyUsers({
        userIds: appUsers,
        key: 'sos_resolved',
        vars: { name },
        channels: ['push'],
        enqueue: false,
      })),
    );
    await this.notifications.deliverNow(ids);
    return 'notified';
  }
}
