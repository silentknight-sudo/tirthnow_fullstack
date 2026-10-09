import { Global, Module } from '@nestjs/common';
import { EmailModule } from './email/email.module';
import { FirebaseAuthModule } from './firebase-auth/firebase-auth.module';

/** Every external integration, each selected by its <X>_PROVIDER env var (ADR-0003). */
@Global()
@Module({
  imports: [FirebaseAuthModule, EmailModule],
  exports: [FirebaseAuthModule, EmailModule],
})
export class ProvidersModule {}
