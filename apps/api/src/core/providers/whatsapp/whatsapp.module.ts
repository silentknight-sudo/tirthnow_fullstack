import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { MetaWhatsAppAdapter } from './meta.adapter';
import { MockWhatsAppAdapter } from './mock.adapter';
import { WHATSAPP_PROVIDER } from './whatsapp.provider';

@Module({
  providers: [
    MockWhatsAppAdapter,
    {
      provide: WHATSAPP_PROVIDER,
      inject: [APP_CONFIG, MockWhatsAppAdapter],
      useFactory: (config: AppConfig, mock: MockWhatsAppAdapter) =>
        config.messaging.whatsappProvider === 'meta' ? new MetaWhatsAppAdapter(config) : mock,
    },
  ],
  exports: [WHATSAPP_PROVIDER, MockWhatsAppAdapter],
})
export class WhatsAppModule {}
