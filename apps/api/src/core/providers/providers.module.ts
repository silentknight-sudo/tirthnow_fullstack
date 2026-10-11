import { Global, Module } from '@nestjs/common';
import { EmailModule } from './email/email.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { FirebaseAuthModule } from './firebase-auth/firebase-auth.module';
import { LlmModule } from './llm/llm.module';
import { MapsModule } from './maps/maps.module';
import { ModerationProviderModule } from './moderation/moderation.module';
import { PaymentModule } from './payment/payment.module';
import { PushModule } from './push/push.module';
import { SmsModule } from './sms/sms.module';
import { SpeechModule } from './speech/speech.module';
import { StorageModule } from './storage/storage.module';
import { TransitProviderModule } from './transit/transit.module';
import { VideoModule } from './video/video.module';
import { VisionModule } from './vision/vision.module';
import { WeatherProviderModule } from './weather/weather.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';

const MODULES = [
  FirebaseAuthModule,
  EmailModule,
  StorageModule,
  MapsModule,
  PaymentModule,
  PushModule,
  SmsModule,
  WhatsAppModule,
  WeatherProviderModule,
  TransitProviderModule,
  VideoModule,
  ModerationProviderModule,
  LlmModule,
  EmbeddingModule,
  SpeechModule,
  VisionModule,
];

/** Every external integration, each selected by its <X>_PROVIDER env var (ADR-0003). */
@Global()
@Module({ imports: MODULES, exports: MODULES })
export class ProvidersModule {}
