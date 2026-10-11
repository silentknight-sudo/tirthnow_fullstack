import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AppException } from './app.exception';

export const MAX_PAGE_SIZE = 50;

export class CursorQueryDto {
  @ApiPropertyOptional({ description: 'Opaque cursor from the previous page' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit?: number;
}

export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

/** Keyset position: newest-first lists order by (createdAt desc, id desc). */
export interface CursorKey {
  createdAt: string;
  id: string;
}

export function encodeCursor(key: CursorKey): string {
  return Buffer.from(JSON.stringify(key)).toString('base64url');
}

export function decodeCursor(cursor: string | undefined): CursorKey | null {
  if (!cursor) return null;
  try {
    const v: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (
      typeof v === 'object' &&
      v !== null &&
      typeof (v as CursorKey).createdAt === 'string' &&
      typeof (v as CursorKey).id === 'string' &&
      !Number.isNaN(Date.parse((v as CursorKey).createdAt))
    ) {
      return { createdAt: (v as CursorKey).createdAt, id: (v as CursorKey).id };
    }
  } catch {
    // fall through
  }
  throw AppException.badRequest('Invalid cursor');
}

/** Prisma `where` fragment for rows strictly after the cursor in (createdAt desc, id desc) order. */
export function afterCursor(cursor: string | undefined): object {
  const key = decodeCursor(cursor);
  if (!key) return {};
  const at = new Date(key.createdAt);
  return { OR: [{ createdAt: { lt: at } }, { createdAt: at, id: { lt: key.id } }] };
}

export const NEWEST_FIRST = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

/** Fetch `limit + 1` rows, then call this to build the page. */
export function toPage<T extends { createdAt: Date; id: string }, R = T>(
  rows: T[],
  limit: number,
  map: (row: T) => R = (row) => row as unknown as R,
): Page<R> {
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  const last = slice.at(-1);
  return {
    data: slice.map(map),
    nextCursor:
      hasMore && last
        ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
        : null,
  };
}

export function pageSize(limit: number | undefined): number {
  return limit ?? 20;
}
