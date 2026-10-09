import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config';
import { FirebaseAuthAdapter } from './firebase.adapter';
import { FIREBASE_AUTH_PROVIDER } from './firebase-auth.provider';
import { MockFirebaseAuthAdapter } from './mock.adapter';

@Module({
  providers: [
    {
      provide: FIREBASE_AUTH_PROVIDER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        config.firebase.provider === 'firebase'
          ? new FirebaseAuthAdapter(config)
          : new MockFirebaseAuthAdapter(),
    },
  ],
  exports: [FIREBASE_AUTH_PROVIDER],
})
export class FirebaseAuthModule {}
