import { Injectable } from '@nestjs/common';
import { AppException } from '../../../core/http';
import { PrismaService } from '../../../core/prisma';
import { IdentityFacade } from '../../identity';
import { type SharedSosResponse } from '../dto/safety.dto';
import { readTrail } from './safety.service';

const TOKEN = /^[A-Za-z0-9_-]{20,30}$/;

/** Public live-location view for the people an SOS was shared with. */
@Injectable()
export class SosShareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: IdentityFacade,
  ) {}

  async isActive(token: string): Promise<boolean> {
    if (!TOKEN.test(token)) return false;
    const sos = await this.prisma.sosEvent.findUnique({
      where: { shareToken: token },
      select: { status: true, shareExpiresAt: true },
    });
    return (
      !!sos &&
      (sos.status === 'triggered' || sos.status === 'dispatched') &&
      sos.shareExpiresAt > new Date()
    );
  }

  async view(token: string): Promise<SharedSosResponse> {
    const sos = TOKEN.test(token)
      ? await this.prisma.sosEvent.findUnique({ where: { shareToken: token } })
      : null;
    if (!sos) throw AppException.notFound('This link is not valid');
    const [user] = await this.identity.getContacts([sos.userId]);
    const name = user?.displayName?.split(' ')[0] ?? 'Traveller';
    const active =
      (sos.status === 'triggered' || sos.status === 'dispatched') &&
      sos.shareExpiresAt > new Date();
    // Once it is over the location is no longer shared.
    return {
      name,
      state: active ? 'active' : 'ended',
      lat: active ? sos.lat : null,
      lng: active ? sos.lng : null,
      accuracyM: active ? sos.accuracyM : null,
      batteryPct: active ? sos.batteryPct : null,
      updatedAt: sos.updatedAt.toISOString(),
      expiresAt: sos.shareExpiresAt.toISOString(),
      trail: active
        ? readTrail(sos.locationTrail)
            .slice(-50)
            .map((p) => ({ lat: p.lat, lng: p.lng, at: p.at }))
        : [],
    };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${String(c.charCodeAt(0))};`);

/** Minimal page for contacts without the app: refreshes every 15 s and links to a map. */
export function sharePageHtml(v: SharedSosResponse): string {
  const body =
    v.state === 'active' && v.lat !== null && v.lng !== null
      ? `<p class="alert">${esc(v.name)} has asked for help.</p>
         <p>Last location (updated ${esc(new Date(v.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }))} IST${v.accuracyM !== null ? `, ±${String(v.accuracyM)} m` : ''}${v.batteryPct !== null ? `, battery ${String(v.batteryPct)}%` : ''}):</p>
         <p><a class="btn" href="https://www.google.com/maps/search/?api=1&query=${String(v.lat)},${String(v.lng)}">Open in Maps</a></p>
         <p>Call <a href="tel:112">112</a> if you cannot reach them.</p>`
      : `<p>${esc(v.name)} is no longer sharing their location. The SOS has ended.</p>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Tirth Now SOS</title>${v.state === 'active' ? '<meta http-equiv="refresh" content="15">' : ''}
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:2rem auto;padding:0 1rem;color:#1f2937}.alert{font-size:1.4rem;font-weight:700;color:#b91c1c}.btn{display:inline-block;padding:.75rem 1.25rem;background:#b91c1c;color:#fff;border-radius:.5rem;text-decoration:none}</style>
</head><body><h1>Tirth Now SOS</h1>${body}</body></html>`;
}
