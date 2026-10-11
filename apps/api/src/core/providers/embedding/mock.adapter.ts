import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { tokens } from '../../i18n/tokens';
import { type EmbeddingProvider } from './embedding.provider';

const DIMS = 1536;
/**
 * Bag-of-words hashed into 1536 dimensions, L2-normalised: texts sharing words are close,
 * so retrieval behaves sensibly offline and in tests.
 */
@Injectable()
export class MockEmbeddingAdapter implements EmbeddingProvider {
  readonly model = 'mock-bow-1536';
  readonly dimensions = DIMS;

  embed(texts: string[]): Promise<number[][]> {
    return Promise.resolve(texts.map(embedOne));
  }
}

function embedOne(text: string): number[] {
  const v = new Array<number>(DIMS).fill(0);
  for (const t of tokens(text)) {
    const h = createHash('sha256').update(t).digest();
    const idx = h.readUInt32BE(0) % DIMS;
    v[idx] = (v[idx] ?? 0) + (h.readUInt8(4) % 2 === 0 ? 1 : -1);
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  if (norm === 0) {
    v[0] = 1;
    return v;
  }
  return v.map((x) => x / norm);
}
