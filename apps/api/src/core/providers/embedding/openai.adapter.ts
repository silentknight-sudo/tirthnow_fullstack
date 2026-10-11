import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { callWithPolicy } from '../call-policy';
import { readJsonOrThrow } from '../http-error';
import { type EmbeddingProvider } from './embedding.provider';

const BATCH = 96;

/** OpenAI embeddings (text-embedding-3-small, 1536-d). Claude has no embedding endpoint. */
@Injectable()
export class OpenAiEmbeddingAdapter implements EmbeddingProvider {
  readonly model: string;
  readonly dimensions: number;
  private readonly apiKey: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    if (!config.ai.openaiApiKey) throw new Error('OPENAI_API_KEY is not configured');
    this.apiKey = config.ai.openaiApiKey;
    this.model = config.ai.embeddingModel;
    this.dimensions = config.ai.embeddingDimensions;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH) {
      const batch = texts.slice(i, i + BATCH);
      const res = await callWithPolicy('openai-embeddings', async () =>
        readJsonOrThrow<{ data: { index: number; embedding: number[] }[] }>(
          'openai-embeddings',
          await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
            body: JSON.stringify({ model: this.model, input: batch, dimensions: this.dimensions }),
          }),
        ),
      );
      out.push(...res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
    }
    return out;
  }
}
