const TAG = /^[\p{L}\p{M}\p{N}_]{1,40}$/u;
const IN_TEXT = /#([\p{L}\p{M}\p{N}_]{1,40})/gu;
export const MAX_HASHTAGS = 15;

/** Explicit tags plus #tags in the caption: lowercased, without '#', unique, at most 15. */
export function normalizeHashtags(
  explicit: string[] | undefined,
  caption: string | undefined,
): string[] {
  const fromCaption = [...(caption ?? '').matchAll(IN_TEXT)].map((m) => m[1] ?? '');
  const all = [...(explicit ?? []), ...fromCaption]
    .map((t) => t.trim().replace(/^#+/, '').toLowerCase())
    .filter((t) => TAG.test(t));
  return [...new Set(all)].slice(0, MAX_HASHTAGS);
}

/** Hot score: engagement decays with age (hours), HN-style. */
export function hotScore(
  r: {
    likeCount: number;
    commentCount: number;
    saveCount: number;
    viewCount: number;
    createdAt: Date;
  },
  now = new Date(),
): number {
  const ageHours = Math.max(0, (now.getTime() - r.createdAt.getTime()) / 3_600_000);
  const engagement =
    1 + r.likeCount * 3 + r.commentCount * 4 + r.saveCount * 5 + r.viewCount * 0.05;
  return engagement / Math.pow(ageHours + 2, 1.5);
}

/** Keyset cursor over (score desc, id desc). */
export function encodeScoreCursor(score: number, id: string): string {
  return Buffer.from(JSON.stringify({ s: score, id })).toString('base64url');
}

export function decodeScoreCursor(cursor: string | undefined): { s: number; id: string } | null {
  if (!cursor) return null;
  try {
    const v = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      s?: unknown;
      id?: unknown;
    };
    if (typeof v.s === 'number' && Number.isFinite(v.s) && typeof v.id === 'string')
      return { s: v.s, id: v.id };
  } catch {
    // fall through
  }
  return null;
}
