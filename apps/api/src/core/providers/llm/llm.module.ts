import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { AnthropicLlmAdapter } from './anthropic.adapter';
import { LLM_PROVIDER } from './llm.provider';
import { MockLlmAdapter } from './mock.adapter';

@Module({
  providers: [
    MockLlmAdapter,
    {
      provide: LLM_PROVIDER,
      inject: [APP_CONFIG, MockLlmAdapter],
      useFactory: (config: AppConfig, mock: MockLlmAdapter) =>
        config.ai.llmProvider === 'anthropic' ? new AnthropicLlmAdapter(config) : mock,
    },
  ],
  exports: [LLM_PROVIDER, MockLlmAdapter],
})
export class LlmModule {}
