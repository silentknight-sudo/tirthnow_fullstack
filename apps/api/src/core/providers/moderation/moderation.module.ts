import { Module } from '@nestjs/common';
import { MockModerationAdapter } from './mock.adapter';
import { MODERATION_PROVIDER } from './moderation.provider';

/** MODERATION_PROVIDER=llm is added with the LLM provider (AI module). */
@Module({
  providers: [{ provide: MODERATION_PROVIDER, useClass: MockModerationAdapter }],
  exports: [MODERATION_PROVIDER],
})
export class ModerationProviderModule {}
