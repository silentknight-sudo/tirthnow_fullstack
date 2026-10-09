/** Identity proven by a Firebase ID token (phone OTP, Google, Apple or anonymous). */
export interface VerifiedFirebaseIdentity {
  uid: string;
  phoneE164: string | null;
  email: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  signInProvider: string;
  displayName: string | null;
}

export interface FirebaseAuthProvider {
  /** Resolves the identity, or rejects with InvalidFirebaseTokenError. */
  verifyIdToken(idToken: string): Promise<VerifiedFirebaseIdentity>;
}

export const FIREBASE_AUTH_PROVIDER = Symbol('FIREBASE_AUTH_PROVIDER');

export class InvalidFirebaseTokenError extends Error {
  constructor(reason: string) {
    super(`Invalid Firebase ID token: ${reason}`);
    this.name = 'InvalidFirebaseTokenError';
  }
}
