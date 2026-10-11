import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { MockSmsAdapter } from './mock.adapter';
import { Msg91SmsAdapter } from './msg91.adapter';
import { SMS_PROVIDER } from './sms.provider';

@Module({
  providers: [
    MockSmsAdapter,
    {
      provide: SMS_PROVIDER,
      inject: [APP_CONFIG, MockSmsAdapter],
      useFactory: (config: AppConfig, mock: MockSmsAdapter) =>
        config.messaging.smsProvider === 'msg91' ? new Msg91SmsAdapter(config) : mock,
    },
  ],
  exports: [SMS_PROVIDER, MockSmsAdapter],
})
export class SmsModule {}
