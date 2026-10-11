import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { EMBEDDING_PROVIDER } from './embedding.provider';
import { MockEmbeddingAdapter } from './mock.adapter';
import { OpenAiEmbeddingAdapter } from './openai.adapter';

@Module({
  providers: [
    {
      provide: EMBEDDING_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        config.ai.embeddingProvider === 'openai'
          ? new OpenAiEmbeddingAdapter(config)
          : new MockEmbeddingAdapter(),
    },
  ],
  exports: [EMBEDDING_PROVIDER],
})
export class EmbeddingModule {}
