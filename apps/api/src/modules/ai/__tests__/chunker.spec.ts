import { chunkText, estimateTokens } from '../services/chunker';

describe('chunkText', () => {
  it('keeps headings with their text and does not cross sections', () => {
    const chunks = chunkText(
      '# Banke Bihari\n\nOpens at 7:45.\n\n## Darshan\n\nThe curtain is drawn often.\n\n# ISKCON\n\nMangala arati at 4:30.',
    );
    expect(chunks.map((c) => c.heading)).toEqual([
      'Banke Bihari',
      'Banke Bihari › Darshan',
      'ISKCON',
    ]);
    expect(chunks[1]?.content).toBe('Banke Bihari › Darshan\n\nThe curtain is drawn often.');
  });

  it('splits long text near the target size with overlap', () => {
    const sentence = 'Pilgrims walk the Vrindavan parikrama barefoot in the early morning light. ';
    const chunks = chunkText(sentence.repeat(200), { target: 500, overlap: 80 });
    expect(chunks.length).toBeGreaterThan(5);
    for (const c of chunks) expect(c.tokenCount).toBeLessThanOrEqual(500 + 80 + 10);
    // Each chunk after the first starts with the tail of the previous one.
    const prevTail = chunks[0]?.content.slice(-60) ?? '';
    expect(chunks[1]?.content).toContain(prevTail.slice(prevTail.indexOf(' ') + 1));
  });

  it('estimates Devanagari as denser than Latin text', () => {
    expect(estimateTokens('बांके बिहारी मंदिर')).toBeGreaterThan(estimateTokens('Banke Bihari'));
  });
});

import { citationsIn } from '../services/chat.service';
import { validatePlan } from '../services/planner.service';

describe('citationsIn', () => {
  const src = (n: number) => ({
    id: `c${String(n)}`,
    documentId: `d${String(n)}`,
    title: `T${String(n)}`,
    sourceRef: null,
    content: '',
    score: 1,
  });
  it('maps used markers to sources, ignoring unknown numbers', () => {
    expect(
      citationsIn('A [2] and [1], again [2], bogus [9].', [src(1), src(2)]).map((c) => c.n),
    ).toEqual([1, 2]);
  });
});

describe('validatePlan', () => {
  const days = [
    {
      dayIndex: 0,
      date: '2026-11-01',
      cityId: 'c',
      cityName: 'Vrindavan',
      candidates: [{ ref: 'd0c0' }, { ref: 'd0c1' }],
    },
  ] as never;
  it('accepts plans that only use offered refs', () => {
    expect(
      validatePlan(
        JSON.stringify({
          title: 'x',
          days: [{ dayIndex: 0, note: null, items: [{ ref: 'd0c1', note: null }] }],
        }),
        days,
      ),
    ).toEqual([]);
  });
  it('reports invented refs, duplicates, missing days and bad JSON', () => {
    expect(validatePlan('nope', days)).toEqual(['not valid JSON']);
    expect(validatePlan(JSON.stringify({ title: 'x', days: [] }), days)).toEqual([
      'day 0 is missing',
    ]);
    expect(
      validatePlan(
        JSON.stringify({
          title: 'x',
          days: [
            {
              dayIndex: 0,
              note: null,
              items: [
                { ref: 'zz', note: null },
                { ref: 'd0c0', note: null },
                { ref: 'd0c0', note: null },
              ],
            },
          ],
        }),
        days,
      ),
    ).toEqual(['ref zz is not a candidate for day 0', 'ref d0c0 used twice']);
    expect(
      validatePlan(
        JSON.stringify({ title: 'x', days: [{ dayIndex: 0, note: null, items: [], extra: 1 }] }),
        days,
      )[0],
    ).toMatch(/Unrecognized key/);
  });
});
