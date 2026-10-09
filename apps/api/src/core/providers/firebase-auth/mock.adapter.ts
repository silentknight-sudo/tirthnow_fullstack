import { Injectable } from '@nestjs/common';
import {
  type FirebaseAuthProvider,
  InvalidFirebaseTokenError,
  type VerifiedFirebaseIdentity,
} from './firebase-auth.provider';

const UID = /^[A-Za-z0-9_-]{3,128}$/;
const E164 = /^\+[1-9]\d{6,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Local stand-in for Firebase. Token formats (see docs/INTEGRATIONS.md):
 *   mock:<uid>                       e.g. mock:demo-user
 *   mock:<uid>:<+E164 phone>         phone OTP sign-in
 *   mock:<uid>:<email>               Google/Apple sign-in (email treated as verified)
 *   mock:<uid>:<phone>:<email>
 *   mock:guest:<uid>                 anonymous guest
 */
@Injectable()
export class MockFirebaseAuthAdapter implements FirebaseAuthProvider {
  verifyIdToken(idToken: string): Promise<VerifiedFirebaseIdentity> {
    const parts = idToken.split(':');
    if (parts[0] !== 'mock' || parts.length < 2) {
      return Promise.reject(new InvalidFirebaseTokenError('expected mock:<uid>[:phone][:email]'));
    }
    if (parts[1] === 'guest') {
      const uid = parts[2];
      if (!uid || !UID.test(uid) || parts.length > 3) {
        return Promise.reject(new InvalidFirebaseTokenError('expected mock:guest:<uid>'));
      }
      return Promise.resolve({
        uid,
        phoneE164: null,
        email: null,
        emailVerified: false,
        isAnonymous: true,
        signInProvider: 'anonymous',
        displayName: null,
      });
    }
    const [, uid, ...rest] = parts;
    if (!uid || !UID.test(uid) || rest.length > 2) {
      return Promise.reject(new InvalidFirebaseTokenError('malformed mock token'));
    }
    let phone: string | null = null;
    let email: string | null = null;
    for (const part of rest) {
      if (E164.test(part) && phone === null) phone = part;
      else if (EMAIL.test(part) && email === null) email = part.toLowerCase();
      else return Promise.reject(new InvalidFirebaseTokenError(`unrecognised segment "${part}"`));
    }
    return Promise.resolve({
      uid,
      phoneE164: phone,
      email,
      emailVerified: email !== null,
      isAnonymous: false,
      signInProvider: phone ? 'phone' : email ? 'google.com' : 'custom',
      displayName: null,
    });
  }
}
