import { AppException } from '../app.exception';
import { afterCursor, decodeCursor, encodeCursor, toPage } from '../pagination';

const row = (i: number) => ({
  id: `id-${String(i).padStart(2, '0')}`,
  createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
});

describe('cursor pagination', () => {
  it('round-trips cursors', () => {
    const key = { createdAt: '2026-01-01T00:00:00.000Z', id: 'abc' };
    expect(decodeCursor(encodeCursor(key))).toEqual(key);
    expect(decodeCursor(undefined)).toBeNull();
  });

  it('rejects tampered cursors', () => {
    expect(() => decodeCursor('not-base64-json')).toThrow(AppException);
  });

  it('builds a page and a next cursor only when more rows exist', () => {
    const rows = [row(5), row(4), row(3)];
    const page = toPage(rows, 2);
    expect(page.data).toHaveLength(2);
    expect(decodeCursor(page.nextCursor ?? undefined)).toEqual({
      createdAt: row(4).createdAt.toISOString(),
      id: 'id-04',
    });
    expect(toPage(rows, 3).nextCursor).toBeNull();
  });

  it('produces a keyset filter', () => {
    const cursor = encodeCursor({ createdAt: '2026-01-01T00:04:00.000Z', id: 'id-04' });
    expect(afterCursor(cursor)).toEqual({
      OR: [
        { createdAt: { lt: new Date('2026-01-01T00:04:00.000Z') } },
        { createdAt: new Date('2026-01-01T00:04:00.000Z'), id: { lt: 'id-04' } },
      ],
    });
    expect(afterCursor(undefined)).toEqual({});
  });
});
