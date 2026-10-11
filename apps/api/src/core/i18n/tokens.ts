const STOP = new Set([
  'the',
  'a',
  'an',
  'of',
  'and',
  'or',
  'is',
  'are',
  'to',
  'in',
  'at',
  'on',
  'for',
  'what',
  'when',
  'how',
  'does',
  'do',
  'kab',
  'hai',
  'ka',
  'ki',
  'ke',
]);

/** Lowercased word tokens (any script, combining marks kept), minus short and stop words. */
export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? []).filter(
    (t) => t.length > 1 && !STOP.has(t),
  );
}
