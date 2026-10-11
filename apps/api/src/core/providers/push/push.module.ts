import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { FcmPushAdapter } from './fcm.adapter';
import { MockPushAdapter } from './mock.adapter';
import { PUSH_PROVIDER } from './push.provider';

@Module({
  providers: [
    MockPushAdapter,
    {
      provide: PUSH_PROVIDER,
      inject: [APP_CONFIG, MockPushAdapter],
      useFactory: (config: AppConfig, mock: MockPushAdapter) =>
        config.messaging.pushProvider === 'fcm' ? new FcmPushAdapter(config) : mock,
    },
  ],
  exports: [PUSH_PROVIDER, MockPushAdapter],
})
export class PushModule {}
