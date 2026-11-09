import { randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { type Trip } from '@prisma/client';
import { ERROR_CODES, type Lang } from '@tirth-now/shared-types';
import { type AuthPrincipal } from '../../../core/auth';
import { APP_CONFIG, type AppConfig } from '../../../core/config';
import { AppException, afterCursor, NEWEST_FIRST, pageSize, toPage } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { IdentityFacade } from '../../identity';
import { NotificationsFacade } from '../../notifications';
import {
  type FamilyGroupResponse,
  type SharedTripResponse,
  type StartTripDto,
  type TripLocationDto,
  type TripPageResponse,
  type TripResponse,
  type TripShareResponse,
} from '../dto/trips.dto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Trips (start, end, history), consent-based live location and family
 * groups. Location is stored only while the traveller shares it, and only
 * members who joined a group with its code can see it.
 */
@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityFacade,
    private readonly notifications: NotificationsFacade,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  // ───────────── trips ─────────────

  async start(user: AuthPrincipal, dto: StartTripDto, lang: Lang): Promise<TripResponse> {
    const active = await this.prisma.trip.findFirst({
      where: { userId: user.userId, status: 'active' },
    });
    if (active) throw AppException.conflict('You already have a trip in progress; end it first');
    const trip = await this.prisma.trip.create({
      data: {
        userId: user.userId,
        title: dto.title?.trim() || (lang === 'hi' ? 'ब्रज यात्रा' : 'Braj yatra'),
        fromPlace: dto.fromPlace?.trim() || null,
        itineraryId: dto.itineraryId ?? null,
        sharingLocation: dto.shareLocation ?? false,
      },
    });
    await this.notify(user.userId, trip, 'started');
    return this.toResponse(trip);
  }

  async end(user: AuthPrincipal, id: string): Promise<TripResponse> {
    const trip = await this.owned(user, id);
    if (trip.status === 'ended') return this.toResponse(trip);
    const ended = await this.prisma.trip.update({
      where: { id },
      // Ending a trip stops sharing and revokes the tracking link.
      data: { status: 'ended', endedAt: new Date(), sharingLocation: false, shareToken: null },
    });
    await this.notify(user.userId, ended, 'ended');
    return this.toResponse(ended);
  }

  async active(user: AuthPrincipal): Promise<TripResponse | null> {
    const trip = await this.prisma.trip.findFirst({
      where: { userId: user.userId, status: 'active' },
    });
    return trip ? this.toResponse(trip) : null;
  }

  async history(
    user: AuthPrincipal,
    q: { cursor?: string; limit?: number },
  ): Promise<TripPageResponse> {
    const limit = pageSize(q.limit);
    const rows = await this.prisma.trip.findMany({
      where: { userId: user.userId, ...afterCursor(q.cursor) },
      orderBy: NEWEST_FIRST,
      take: limit + 1,
    });
    return toPage(rows, limit, (t) => this.toResponse(t));
  }

  async setSharing(user: AuthPrincipal, id: string, sharing: boolean): Promise<TripResponse> {
    const trip = await this.owned(user, id);
    if (trip.status !== 'active') throw AppException.conflict('This trip has ended');
    const updated = await this.prisma.trip.update({
      where: { id },
      data: sharing
        ? { sharingLocation: true }
        : // Pausing forgets the last position, so nobody sees a stale location.
          {
            sharingLocation: false,
            lastLat: null,
            lastLng: null,
            lastAccuracyM: null,
            lastLocationAt: null,
          },
    });
    return this.toResponse(updated);
  }

  async location(
    user: AuthPrincipal,
    id: string,
    dto: TripLocationDto,
  ): Promise<{ stored: boolean }> {
    const trip = await this.owned(user, id);
    if (trip.status !== 'active') throw AppException.conflict('This trip has ended');
    if (!trip.sharingLocation) return { stored: false };
    await this.prisma.trip.update({
      where: { id },
      data: {
        lastLat: dto.lat,
        lastLng: dto.lng,
        lastAccuracyM: dto.accuracyM ?? null,
        lastLocationAt: new Date(),
      },
    });
    return { stored: true };
  }

  async share(user: AuthPrincipal, id: string, lang: Lang): Promise<TripShareResponse> {
    const trip = await this.owned(user, id);
    if (trip.status !== 'active') throw AppException.conflict('This trip has ended');
    const token = trip.shareToken ?? randomBytes(12).toString('base64url');
    if (!trip.shareToken)
      await this.prisma.trip.update({ where: { id }, data: { shareToken: token } });
    const url = this.shareUrl(token);
    const message =
      lang === 'hi'
        ? `मेरी TirthNow तीर्थयात्रा "${trip.title}" शुरू हो गई है 🙏 यहाँ से मेरी यात्रा देखें: ${url}`
        : `My TirthNow pilgrimage "${trip.title}" has started 🙏 Follow my trip here: ${url}`;
    return { shareUrl: url, message };
  }

  async unshare(user: AuthPrincipal, id: string): Promise<void> {
    await this.owned(user, id);
    await this.prisma.trip.update({ where: { id }, data: { shareToken: null } });
  }

  async shared(token: string): Promise<SharedTripResponse> {
    const trip = /^[A-Za-z0-9_-]{16}$/.test(token)
      ? await this.prisma.trip.findUnique({ where: { shareToken: token } })
      : null;
    if (!trip) throw AppException.notFound('This trip link is not valid or was stopped');
    const name = (await this.identity.publicProfiles([trip.userId])).get(trip.userId)?.displayName;
    const visible = trip.sharingLocation && trip.status === 'active';
    return {
      name: name ?? 'Yatri',
      title: trip.title,
      fromPlace: trip.fromPlace,
      status: trip.status,
      startedAt: trip.startedAt.toISOString(),
      endedAt: trip.endedAt?.toISOString() ?? null,
      sharing: visible,
      lat: visible ? trip.lastLat : null,
      lng: visible ? trip.lastLng : null,
      locationAt: visible ? (trip.lastLocationAt?.toISOString() ?? null) : null,
    };
  }

  // ───────────── family groups ─────────────

  async createGroup(user: AuthPrincipal, name: string): Promise<FamilyGroupResponse> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = Array.from(randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join(
        '',
      );
      const exists = await this.prisma.familyGroup.findUnique({ where: { joinCode: code } });
      if (exists) continue;
      const g = await this.prisma.familyGroup.create({
        data: {
          ownerId: user.userId,
          name: name.trim(),
          joinCode: code,
          members: { create: { userId: user.userId, isOwner: true, sharing: false } },
        },
      });
      return this.group(user, g.id);
    }
    throw AppException.conflict('Could not create a join code; try again');
  }

  async joinGroup(user: AuthPrincipal, code: string): Promise<FamilyGroupResponse> {
    const g = await this.prisma.familyGroup.findUnique({ where: { joinCode: code.toUpperCase() } });
    if (!g) throw AppException.notFound('No family group with this code');
    const count = await this.prisma.familyMember.count({ where: { groupId: g.id } });
    if (count >= 30) throw AppException.conflict('This family group is full');
    await this.prisma.familyMember.upsert({
      where: { groupId_userId: { groupId: g.id, userId: user.userId } },
      // Joining never shares location by itself: the member turns it on.
      create: { groupId: g.id, userId: user.userId, sharing: false },
      update: {},
    });
    return this.group(user, g.id);
  }

  async myGroups(user: AuthPrincipal): Promise<FamilyGroupResponse[]> {
    const rows = await this.prisma.familyMember.findMany({
      where: { userId: user.userId },
      orderBy: { joinedAt: 'asc' },
      select: { groupId: true },
    });
    return Promise.all(rows.map((r) => this.group(user, r.groupId)));
  }

  async setGroupSharing(
    user: AuthPrincipal,
    groupId: string,
    sharing: boolean,
  ): Promise<FamilyGroupResponse> {
    await this.membership(user, groupId);
    await this.prisma.familyMember.update({
      where: { groupId_userId: { groupId, userId: user.userId } },
      data: { sharing },
    });
    return this.group(user, groupId);
  }

  async leaveGroup(user: AuthPrincipal, groupId: string): Promise<void> {
    const me = await this.membership(user, groupId);
    if (me.isOwner) {
      await this.prisma.familyGroup.delete({ where: { id: groupId } });
      return;
    }
    await this.prisma.familyMember.delete({
      where: { groupId_userId: { groupId, userId: user.userId } },
    });
  }

  async removeMember(
    user: AuthPrincipal,
    groupId: string,
    memberId: string,
  ): Promise<FamilyGroupResponse> {
    const me = await this.membership(user, groupId);
    if (!me.isOwner)
      throw AppException.forbidden(
        ERROR_CODES.AUTH_FORBIDDEN,
        'Only the group owner can remove members',
      );
    if (memberId === user.userId) throw AppException.badRequest('Leave the group instead');
    await this.prisma.familyMember.deleteMany({ where: { groupId, userId: memberId } });
    return this.group(user, groupId);
  }

  private async membership(user: AuthPrincipal, groupId: string) {
    const me = await this.prisma.familyMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.userId } },
    });
    // Same answer for "missing" and "not a member" so group ids cannot be probed.
    if (!me) throw AppException.notFound('Family group not found');
    return me;
  }

  private async group(user: AuthPrincipal, groupId: string): Promise<FamilyGroupResponse> {
    await this.membership(user, groupId);
    const g = await this.prisma.familyGroup.findUniqueOrThrow({
      where: { id: groupId },
      include: { members: { orderBy: { joinedAt: 'asc' } } },
    });
    const ids = g.members.map((m) => m.userId);
    const [profiles, trips] = await Promise.all([
      this.identity.publicProfiles(ids),
      this.prisma.trip.findMany({ where: { userId: { in: ids }, status: 'active' } }),
    ]);
    const tripOf = new Map(trips.map((t) => [t.userId, t]));
    return {
      id: g.id,
      name: g.name,
      joinCode: g.joinCode,
      isOwner: g.ownerId === user.userId,
      members: g.members.map((m) => {
        const p = profiles.get(m.userId);
        const t = tripOf.get(m.userId);
        // Both consents: the member shares with this group AND the trip is sharing.
        const visible = !!t && m.sharing && t.sharingLocation;
        return {
          userId: m.userId,
          name: p?.displayName ?? 'Yatri',
          avatarUrl: p?.avatarUrl ?? null,
          isOwner: m.isOwner,
          isMe: m.userId === user.userId,
          sharing: m.sharing,
          trip: t
            ? {
                id: t.id,
                title: t.title,
                fromPlace: t.fromPlace,
                startedAt: t.startedAt.toISOString(),
              }
            : null,
          lat: visible ? t.lastLat : null,
          lng: visible ? t.lastLng : null,
          locationAt: visible ? (t.lastLocationAt?.toISOString() ?? null) : null,
        };
      }),
    };
  }

  // ───────────── helpers ─────────────

  private async owned(user: AuthPrincipal, id: string): Promise<Trip> {
    const trip = await this.prisma.trip.findFirst({ where: { id, userId: user.userId } });
    if (!trip) throw AppException.notFound('Trip not found');
    return trip;
  }

  private shareUrl(token: string): string {
    return `${this.config.publicUrl}/t/${token}`;
  }

  /** Trip start/end to the traveller, and a heads-up to their family groups. */
  private async notify(userId: string, trip: Trip, what: 'started' | 'ended'): Promise<void> {
    try {
      await this.notifications.notifyUsers({
        userIds: [userId],
        key: what === 'started' ? 'trip_started' : 'trip_ended',
        vars: {},
        payload: { type: `trip.${what}`, tripId: trip.id },
      });
      const groups = await this.prisma.familyMember.findMany({
        where: { userId },
        select: { groupId: true },
      });
      if (groups.length === 0) return;
      const family = await this.prisma.familyMember.findMany({
        where: { groupId: { in: groups.map((g) => g.groupId) }, userId: { not: userId } },
        select: { userId: true },
      });
      const others = [...new Set(family.map((f) => f.userId))];
      if (others.length === 0) return;
      const name =
        (await this.identity.publicProfiles([userId])).get(userId)?.displayName ?? 'Yatri';
      await this.notifications.notifyUsers({
        userIds: others,
        key: what === 'started' ? 'family_trip_started' : 'family_trip_ended',
        vars: { name, trip: trip.title },
        payload: { type: `family.trip_${what}`, tripId: trip.id },
      });
    } catch (err) {
      // A notification problem must never fail starting or ending a trip.
      this.logger.warn({ err, tripId: trip.id }, 'trip notification failed');
    }
  }

  private toResponse(t: Trip): TripResponse {
    return {
      id: t.id,
      title: t.title,
      fromPlace: t.fromPlace,
      itineraryId: t.itineraryId,
      status: t.status,
      startedAt: t.startedAt.toISOString(),
      endedAt: t.endedAt?.toISOString() ?? null,
      sharingLocation: t.sharingLocation,
      shareUrl: t.shareToken ? this.shareUrl(t.shareToken) : null,
      lastLat: t.lastLat,
      lastLng: t.lastLng,
      lastLocationAt: t.lastLocationAt?.toISOString() ?? null,
    };
  }
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

/** Browser view of a shared trip link (auto-refreshes while live). */
export function sharedTripHtml(v: SharedTripResponse): string {
  const ist = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  const loc =
    v.sharing && v.lat !== null && v.lng !== null
      ? `<div class="card"><p class="muted">Live location · updated ${esc(v.locationAt ? ist(v.locationAt) : '')} IST</p>
         <iframe title="map" loading="lazy" src="https://www.google.com/maps?q=${String(v.lat)},${String(v.lng)}&z=15&output=embed"></iframe>
         <a class="btn" href="https://www.google.com/maps/search/?api=1&query=${String(v.lat)},${String(v.lng)}">Open in Google Maps</a></div>`
      : `<div class="card muted">${v.status === 'active' ? `${esc(v.name)} is not sharing their location right now.` : 'This trip has ended.'}</div>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>TirthNow · ${esc(v.title)}</title>${v.status === 'active' ? '<meta http-equiv="refresh" content="30">' : ''}
<style>body{font-family:system-ui,sans-serif;margin:0;background:#FFFCF7;color:#1F2333}header{background:#1B2A4E;color:#fff;padding:20px;border-bottom:4px solid #FF9933}
header b{font-size:22px}header b span{color:#FF9933}main{max-width:34rem;margin:0 auto;padding:16px}.pill{display:inline-block;padding:4px 10px;border-radius:20px;font-size:13px;font-weight:700;color:#fff;background:${v.status === 'active' ? '#2F9E44' : '#6B7083'}}
.card{background:#fff;border:1px solid #E7E2D9;border-radius:14px;padding:14px;margin:12px 0}.muted{color:#6B7083}iframe{width:100%;height:260px;border:0;border-radius:10px}
.btn{display:block;text-align:center;margin-top:10px;padding:12px;background:#FF9933;color:#fff;border-radius:10px;text-decoration:none;font-weight:700}</style>
</head><body><header><b>Tirth<span>Now</span></b><div>${esc(v.name)}'s pilgrimage</div></header><main>
<h2>${esc(v.title)}</h2><span class="pill">${v.status === 'active' ? 'Trip in progress' : 'Completed'}</span>
<div class="card"><p>Started: <b>${esc(ist(v.startedAt))}</b>${v.fromPlace ? ` · From <b>${esc(v.fromPlace)}</b>` : ''}</p>${v.endedAt ? `<p>Completed: <b>${esc(ist(v.endedAt))}</b></p>` : ''}</div>
${loc}<p class="muted">Shared by the traveller with their consent. They can stop sharing at any time.</p></main></body></html>`;
}
