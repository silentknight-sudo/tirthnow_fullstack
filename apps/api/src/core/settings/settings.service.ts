import { Injectable } from '@nestjs/common';
import { type AppConfig as AppConfigRow, type ConfigKind, type Prisma } from '@prisma/client';
import { CacheService } from '../cache';
import { PrismaService } from '../prisma';

const CACHE_KEY = 'settings:active';
const CACHE_TTL = 60;

export interface ClientTargeting {
  platform?: 'android' | 'ios' | 'web';
  cityId?: string;
}

export interface PublicSetting {
  key: string;
  kind: ConfigKind;
  value: Prisma.JsonValue;
}

function matchesTargeting(targeting: Prisma.JsonValue, client: ClientTargeting): boolean {
  if (typeof targeting !== 'object' || targeting === null || Array.isArray(targeting)) return true;
  const t = targeting as Record<string, unknown>;
  if (Array.isArray(t.platforms) && client.platform && !t.platforms.includes(client.platform))
    return false;
  if (Array.isArray(t.cityIds) && client.cityId && !t.cityIds.includes(client.cityId)) return false;
  return true;
}

/**
 * Runtime settings from `app_config`: feature flags, banners, min app version, helplines.
 * Cached for 60 s; admin writes call `invalidate()`. Lives in core because many modules read it;
 * the admin module owns writes.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private async active(): Promise<AppConfigRow[]> {
    const rows = await this.cache.getOrSet(CACHE_KEY, CACHE_TTL, async () => {
      const now = new Date();
      return this.prisma.appConfig.findMany({
        where: {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
        },
        orderBy: { key: 'asc' },
      });
    });
    return rows;
  }

  async forClient(client: ClientTargeting = {}): Promise<PublicSetting[]> {
    const rows = await this.active();
    return rows
      .filter((r) => matchesTargeting(r.targeting, client))
      .map((r) => ({ key: r.key, kind: r.kind, value: r.value }));
  }

  async get<T = Prisma.JsonValue>(key: string, fallback: T): Promise<T> {
    const row = (await this.active()).find((r) => r.key === key);
    return row ? (row.value as T) : fallback;
  }

  async isEnabled(flag: string, fallback = false): Promise<boolean> {
    return (await this.get<unknown>(`feature.${flag}`, fallback)) === true;
  }

  async invalidate(): Promise<void> {
    await this.cache.del(CACHE_KEY);
  }
}
