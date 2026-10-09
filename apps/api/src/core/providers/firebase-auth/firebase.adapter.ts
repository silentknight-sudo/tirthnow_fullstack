import { Inject, Injectable } from '@nestjs/common';
import { type App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { type Auth, getAuth } from 'firebase-admin/auth';
import { APP_CONFIG, type AppConfig } from '../../config';
import { callWithPolicy, isTransientError } from '../call-policy';
import {
  type FirebaseAuthProvider,
  InvalidFirebaseTokenError,
  type VerifiedFirebaseIdentity,
} from './firebase-auth.provider';

const APP_NAME = 'tirth-now-auth';

/** Real adapter: verifies ID tokens with firebase-admin (checks revocation too). */
@Injectable()
export class FirebaseAuthAdapter implements FirebaseAuthProvider {
  private readonly auth: Auth;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const { projectId, clientEmail, privateKey } = config.firebase;
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Firebase credentials are not configured');
    }
    const existing = getApps().find((a) => a.name === APP_NAME);
    const app: App =
      existing ??
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }, APP_NAME);
    this.auth = getAuth(app);
  }

  async verifyIdToken(idToken: string): Promise<VerifiedFirebaseIdentity> {
    try {
      const decoded = await callWithPolicy(
        'firebase-auth',
        () => this.auth.verifyIdToken(idToken, true),
        {
          timeoutMs: 5_000,
          retries: 2,
        },
      );
      const provider = decoded.firebase.sign_in_provider;
      return {
        uid: decoded.uid,
        phoneE164: decoded.phone_number ?? null,
        email: decoded.email?.toLowerCase() ?? null,
        emailVerified: decoded.email_verified === true,
        isAnonymous: provider === 'anonymous',
        signInProvider: provider,
        displayName: typeof decoded.name === 'string' ? decoded.name : null,
      };
    } catch (err) {
      if (isTransientError(err)) throw err;
      throw new InvalidFirebaseTokenError(
        err instanceof Error ? err.message : 'verification failed',
      );
    }
  }
}
