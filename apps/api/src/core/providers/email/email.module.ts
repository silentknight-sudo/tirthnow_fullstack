import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { EMAIL_PROVIDER } from './email.provider';
import { MockEmailAdapter } from './mock.adapter';
import { SmtpEmailAdapter } from './smtp.adapter';

@Module({
  providers: [
    MockEmailAdapter,
    {
      provide: EMAIL_PROVIDER,
      inject: [APP_CONFIG, MockEmailAdapter],
      useFactory: (config: AppConfig, mock: MockEmailAdapter) =>
        config.email.provider === 'smtp' ? new SmtpEmailAdapter(config) : mock,
    },
  ],
  exports: [EMAIL_PROVIDER, MockEmailAdapter],
})
export class EmailModule {}
