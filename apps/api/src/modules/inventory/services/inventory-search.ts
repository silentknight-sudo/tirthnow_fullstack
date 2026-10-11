import { Injectable, type OnModuleInit } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { type Lang } from '@tirth-now/shared-types';
import { t } from '../../../core/i18n';
import { PrismaService } from '../../../core/prisma';
import { CatalogFacade, type SearchResultResponse } from '../../catalog';
import { VendorsFacade } from '../../vendors';

interface Row {
  id: string;
  type: string;
  name: Prisma.JsonValue;
  lat: number | null;
  lng: number | null;
  score: number;
}

/** Adds hotels, restaurants and experiences of active vendors to global search. */
@Injectable()
export class InventorySearchSource implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogFacade,
    private readonly vendors: VendorsFacade,
  ) {}

  onModuleInit(): void {
    this.catalog.registerSearchSource({
      types: ['hotel', 'restaurant', 'experience'],
      search: (q, limit, lang) => this.search(q, limit, lang),
    });
  }

  private async search(q: string, limit: number, lang: Lang): Promise<SearchResultResponse[]> {
    const vendorIds = await this.vendors.activeVendorIds();
    if (vendorIds.length === 0) return [];
    const score = (col: string) => `GREATEST(
      word_similarity($1, lower(${col}->>'en')),
      word_similarity($1, coalesce(${col}->>'hi', '')),
      CASE WHEN lower(${col}->>'en') LIKE '%' || $1 || '%' THEN 0.9 ELSE 0 END)::float`;
    const rows = await this.prisma.$queryRawUnsafe<Row[]>(
      `SELECT * FROM (
         SELECT id, 'hotel' AS type, name_i18n AS name, lat, lng, ${score('name_i18n')} AS score
           FROM hotels WHERE deleted_at IS NULL AND is_published AND vendor_id = ANY($2::uuid[])
         UNION ALL
         SELECT id, 'restaurant', name_i18n, lat, lng, ${score('name_i18n')}
           FROM restaurants WHERE deleted_at IS NULL AND is_published AND vendor_id = ANY($2::uuid[])
         UNION ALL
         SELECT id, 'experience', title_i18n, NULL::float, NULL::float, ${score('title_i18n')}
           FROM experiences WHERE deleted_at IS NULL AND is_published AND vendor_id = ANY($2::uuid[])
       ) s WHERE score >= 0.3 ORDER BY score DESC LIMIT $3`,
      q,
      vendorIds,
      limit,
    );
    return rows.map((r) => ({
      type: r.type,
      id: r.id,
      title: t(r.name, lang),
      subtitle: null,
      score: Math.round(r.score * 1000) / 1000,
      lat: r.lat,
      lng: r.lng,
    }));
  }
}
