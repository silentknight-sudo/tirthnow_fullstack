import { decodeScoreCursor, encodeScoreCursor, hotScore, normalizeHashtags } from '../hashtags';

describe('reel helpers', () => {
  it('normalizes hashtags from the list and the caption', () => {
    expect(
      normalizeHashtags(
        ['#Vrindavan', 'holi', 'bad tag', 'HOLI'],
        'Evening #Aarti at #बांकेबिहारी #holi',
      ),
    ).toEqual(['vrindavan', 'holi', 'aarti', 'बांकेबिहारी']);
    expect(
      normalizeHashtags(
        Array.from({ length: 30 }, (_, i) => `t${String(i)}`),
        '',
      ),
    ).toHaveLength(15);
  });

  it('ranks fresh engagement above stale engagement', () => {
    const now = new Date('2026-10-11T12:00:00Z');
    const fresh = hotScore(
      {
        likeCount: 10,
        commentCount: 0,
        saveCount: 0,
        viewCount: 100,
        createdAt: new Date('2026-10-11T10:00:00Z'),
      },
      now,
    );
    const old = hotScore(
      {
        likeCount: 50,
        commentCount: 5,
        saveCount: 5,
        viewCount: 1000,
        createdAt: new Date('2026-10-04T10:00:00Z'),
      },
      now,
    );
    expect(fresh).toBeGreaterThan(old);
  });

  it('round-trips score cursors and rejects junk', () => {
    expect(decodeScoreCursor(encodeScoreCursor(1.25, 'abc'))).toEqual({ s: 1.25, id: 'abc' });
    expect(decodeScoreCursor('not-base64-json')).toBeNull();
    expect(decodeScoreCursor(undefined)).toBeNull();
  });
});
