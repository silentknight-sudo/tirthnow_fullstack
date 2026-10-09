import { InvalidFirebaseTokenError } from '../firebase-auth.provider';
import { MockFirebaseAuthAdapter } from '../mock.adapter';

describe('MockFirebaseAuthAdapter', () => {
  const adapter = new MockFirebaseAuthAdapter();

  it('parses a phone sign-in', async () => {
    await expect(adapter.verifyIdToken('mock:u-1:+919876543210')).resolves.toMatchObject({
      uid: 'u-1',
      phoneE164: '+919876543210',
      email: null,
      isAnonymous: false,
      signInProvider: 'phone',
    });
  });

  it('parses an email sign-in as verified', async () => {
    await expect(adapter.verifyIdToken('mock:u-2:Pilgrim@Example.com')).resolves.toMatchObject({
      email: 'pilgrim@example.com',
      emailVerified: true,
      signInProvider: 'google.com',
    });
  });

  it('parses phone and email together', async () => {
    const id = await adapter.verifyIdToken('mock:u-3:+919876543210:a@b.co');
    expect(id.phoneE164).toBe('+919876543210');
    expect(id.email).toBe('a@b.co');
  });

  it('parses guests', async () => {
    await expect(adapter.verifyIdToken('mock:guest:g-1')).resolves.toMatchObject({
      uid: 'g-1',
      isAnonymous: true,
    });
  });

  it.each([
    '',
    'mock',
    'real-token',
    'mock:guest:',
    'mock:u:notaphone',
    'mock:u:+91:x@y.z:extra',
    'mock:a b',
  ])('rejects %p', async (token) => {
    await expect(adapter.verifyIdToken(token)).rejects.toBeInstanceOf(InvalidFirebaseTokenError);
  });
});
