import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type Lang } from '@tirth-now/shared-types';
import { t } from '../../../core/i18n';
import { PrismaService } from '../../../core/prisma';
import { type SearchResultResponse } from '../dto/catalog-responses.dto';

/** A module that contributes results to global search (e.g. inventory adds hotels). */
export interface SearchSource {
  types: string[];
  search(q: string, limit: number, lang: Lang): Promise<SearchResultResponse[]>;
}

interface Row {
  id: string;
  name_i18n: Prisma.JsonValue;
  extra: Prisma.JsonValue;
  lat: number | null;
  lng: number | null;
  score: number;
}

/**
 * Global search: Postgres trigram similarity over English and Hindi names (plus exact tag
 * hits) for catalog content; other modules register additional sources.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly sources: SearchSource[] = [];

  constructor(private readonly prisma: PrismaService) {}

  register(source: SearchSource): void {
    this.sources.push(source);
  }

  availableTypes(): string[] {
    return ['temple', 'explore', 'poi', ...this.sources.flatMap((s) => s.types)];
  }

  async search(
    q: string,
    types: string[] | null,
    limit: number,
    lang: Lang,
  ): Promise<SearchResultResponse[]> {
    const query = q.trim().toLowerCase();
    const want = (type: string) => !types || types.includes(type);
    const jobs: Promise<SearchResultResponse[]>[] = [];
    if (want('temple')) jobs.push(this.temples(query, limit, lang));
    if (want('explore')) jobs.push(this.explore(query, limit, lang));
    if (want('poi')) jobs.push(this.pois(query, limit, lang));
    for (const source of this.sources) {
      if (source.types.some(want)) {
        jobs.push(
          source
            .search(query, limit, lang)
            .then((rows) => rows.filter((r) => want(r.type)))
            .catch((err: unknown) => {
              this.logger.error({ err, types: source.types }, 'search source failed');
              return [];
            }),
        );
      }
    }
    const all = (await Promise.all(jobs)).flat();
    return all.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private async temples(q: string, limit: number, lang: Lang): Promise<SearchResultResponse[]> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT t.id, t.name_i18n, c.name_i18n AS extra, t.lat, t.lng,
        GREATEST(
          word_similarity(${q}, lower(t.name_i18n->>'en')),
          word_similarity(${q}, coalesce(t.name_i18n->>'hi', '')),
          CASE WHEN ${q} = ANY(t.tags) THEN 0.6 ELSE 0 END,
          CASE WHEN lower(t.name_i18n->>'en') LIKE '%' || ${q} || '%' THEN 0.9 ELSE 0 END
        )::float AS score
      FROM temples t JOIN cities c ON c.id = t.city_id
      WHERE t.deleted_at IS NULL AND t.is_published
      ORDER BY score DESC
      LIMIT ${limit}`;
    return rows
      .filter((r) => r.score >= 0.3)
      .map((r) => ({
        type: 'temple',
        id: r.id,
        title: t(r.name_i18n, lang),
        subtitle: t(r.extra, lang),
        score: round(r.score),
        lat: r.lat,
        lng: r.lng,
      }));
  }

  private async explore(q: string, limit: number, lang: Lang): Promise<SearchResultResponse[]> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT e.id, e.title_i18n AS name_i18n, to_jsonb(e.kind::text) AS extra, e.lat, e.lng,
        GREATEST(
          word_similarity(${q}, lower(e.title_i18n->>'en')),
          word_similarity(${q}, coalesce(e.title_i18n->>'hi', '')),
          CASE WHEN lower(e.title_i18n->>'en') LIKE '%' || ${q} || '%' THEN 0.85 ELSE 0 END
        )::float AS score
      FROM explore_items e
      WHERE e.deleted_at IS NULL AND e.is_published
      ORDER BY score DESC
      LIMIT ${limit}`;
    return rows
      .filter((r) => r.score >= 0.3)
      .map((r) => ({
        type: 'explore',
        id: r.id,
        title: t(r.name_i18n, lang),
        subtitle: typeof r.extra === 'string' ? r.extra : null,
        score: round(r.score),
        lat: r.lat,
        lng: r.lng,
      }));
  }

  private async pois(q: string, limit: number, lang: Lang): Promise<SearchResultResponse[]> {
    const rows = await this.prisma.$queryRaw<Row[]>`
      SELECT p.id, p.name_i18n, to_jsonb(p.category::text) AS extra, p.lat, p.lng,
        GREATEST(
          word_similarity(${q}, lower(p.name_i18n->>'en')),
          word_similarity(${q}, coalesce(p.name_i18n->>'hi', '')),
          CASE WHEN ${q} = p.category::text THEN 0.7 ELSE 0 END
        )::float AS score
      FROM pois p
      WHERE p.deleted_at IS NULL
      ORDER BY score DESC
      LIMIT ${limit}`;
    return rows
      .filter((r) => r.score >= 0.35)
      .map((r) => ({
        type: 'poi',
        id: r.id,
        title: t(r.name_i18n, lang),
        subtitle: typeof r.extra === 'string' ? r.extra : null,
        score: round(r.score),
        lat: r.lat,
        lng: r.lng,
      }));
  }
}

const round = (n: number) => Math.round(n * 1000) / 1000;
