import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { LLM_PROVIDER, type LlmProvider } from '../llm/llm.provider';
import { LlmModule } from '../llm/llm.module';
import { LlmModerationAdapter } from './llm.adapter';
import { MockModerationAdapter } from './mock.adapter';
import { MODERATION_PROVIDER } from './moderation.provider';

@Module({
  imports: [LlmModule],
  providers: [
    {
      provide: MODERATION_PROVIDER,
      inject: [APP_CONFIG, LLM_PROVIDER],
      useFactory: (config: AppConfig, llm: LlmProvider) =>
        config.moderation.provider === 'llm'
          ? new LlmModerationAdapter(llm)
          : new MockModerationAdapter(),
    },
  ],
  exports: [MODERATION_PROVIDER],
})
export class ModerationProviderModule {}
