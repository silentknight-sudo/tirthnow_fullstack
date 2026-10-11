import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { GoogleSpeechToTextAdapter, GoogleTextToSpeechAdapter } from './google.adapter';
import { MockSpeechToTextAdapter, MockTextToSpeechAdapter } from './mock.adapter';
import { STT_PROVIDER, TTS_PROVIDER } from './speech.provider';

@Module({
  providers: [
    {
      provide: STT_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (c: AppConfig) =>
        c.ai.sttProvider === 'google'
          ? new GoogleSpeechToTextAdapter(c)
          : new MockSpeechToTextAdapter(),
    },
    {
      provide: TTS_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (c: AppConfig) =>
        c.ai.ttsProvider === 'google'
          ? new GoogleTextToSpeechAdapter(c)
          : new MockTextToSpeechAdapter(),
    },
  ],
  exports: [STT_PROVIDER, TTS_PROVIDER],
})
export class SpeechModule {}
