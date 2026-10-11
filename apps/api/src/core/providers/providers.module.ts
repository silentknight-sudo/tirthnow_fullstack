import { Global, Module } from '@nestjs/common';
import { EmailModule } from './email/email.module';
import { FirebaseAuthModule } from './firebase-auth/firebase-auth.module';
import { MapsModule } from './maps/maps.module';
import { PaymentModule } from './payment/payment.module';
import { StorageModule } from './storage/storage.module';

/** Every external integration, each selected by its <X>_PROVIDER env var (ADR-0003). */
@Global()
@Module({
  imports: [FirebaseAuthModule, EmailModule, StorageModule, MapsModule, PaymentModule],
  exports: [FirebaseAuthModule, EmailModule, StorageModule, MapsModule, PaymentModule],
})
export class ProvidersModule {}
