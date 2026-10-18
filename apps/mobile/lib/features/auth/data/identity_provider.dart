import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:uuid/uuid.dart';

/// A pending phone verification (OTP sent, waiting for the code).
class PhoneChallenge {
  PhoneChallenge(this.phoneE164, this.verificationId);

  final String phoneE164;
  final String verificationId;
}

class IdentityException implements Exception {
  const IdentityException(this.code);

  /// `invalid-otp`, `invalid-phone`, `too-many-requests`, `unavailable`.
  final String code;
}

/// Proves who the user is and returns an ID token for `POST /v1/auth/firebase`
/// (ADR-0002). Firebase in production; a mock that mints the API's
/// `mock:<uid>:<phone>` tokens locally.
abstract interface class IdentityProvider {
  Future<PhoneChallenge> startPhoneSignIn(String phoneE164);
  Future<String> confirmOtp(PhoneChallenge challenge, String code);
  Future<String> signInAsGuest();
  Future<void> signOut();
}

class MockIdentityProvider implements IdentityProvider {
  MockIdentityProvider({this.validOtp = '123456'});

  final String validOtp;
  static const _uuid = Uuid();

  @override
  Future<PhoneChallenge> startPhoneSignIn(String phoneE164) async =>
      PhoneChallenge(phoneE164, 'mock-${_uuid.v4()}');

  @override
  Future<String> confirmOtp(PhoneChallenge challenge, String code) async {
    if (code != validOtp) throw const IdentityException('invalid-otp');
    // Same phone → same uid, so a returning tester keeps their bookings.
    final uid = 'phone-${challenge.phoneE164.replaceAll(RegExp(r'\D'), '')}';
    return 'mock:$uid:${challenge.phoneE164}';
  }

  @override
  Future<String> signInAsGuest() async => 'mock:guest:g-${_uuid.v4()}';

  @override
  Future<void> signOut() async {}
}

/// Firebase Auth adapter. Needs the Firebase project files listed in
/// docs/CLIENT_SETUP_TODO.md and `Firebase.initializeApp()` at startup.
class FirebaseIdentityProvider implements IdentityProvider {
  FirebaseIdentityProvider([fb.FirebaseAuth? auth]) : _auth = auth ?? fb.FirebaseAuth.instance;

  final fb.FirebaseAuth _auth;

  @override
  Future<PhoneChallenge> startPhoneSignIn(String phoneE164) async {
    final verificationId = await _verify(phoneE164);
    return PhoneChallenge(phoneE164, verificationId);
  }

  Future<String> _verify(String phone) {
    final done = Completer<String>();
    unawaited(
      _auth.verifyPhoneNumber(
        phoneNumber: phone,
        verificationCompleted: (_) {},
        verificationFailed: (e) {
          if (!done.isCompleted) {
            done.completeError(
              IdentityException(e.code == 'invalid-phone-number' ? 'invalid-phone' : e.code),
            );
          }
        },
        codeSent: (id, _) {
          if (!done.isCompleted) done.complete(id);
        },
        codeAutoRetrievalTimeout: (_) {},
      ),
    );
    return done.future;
  }

  @override
  Future<String> confirmOtp(PhoneChallenge challenge, String code) async {
    try {
      final cred = fb.PhoneAuthProvider.credential(
        verificationId: challenge.verificationId,
        smsCode: code,
      );
      final current = _auth.currentUser;
      final result = current != null && current.isAnonymous
          ? await current.linkWithCredential(cred)
          : await _auth.signInWithCredential(cred);
      final token = await result.user?.getIdToken();
      if (token == null) throw const IdentityException('unavailable');
      return token;
    } on fb.FirebaseAuthException catch (e) {
      throw IdentityException(e.code == 'invalid-verification-code' ? 'invalid-otp' : e.code);
    }
  }

  @override
  Future<String> signInAsGuest() async {
    final result = await _auth.signInAnonymously();
    final token = await result.user?.getIdToken();
    if (token == null) throw const IdentityException('unavailable');
    return token;
  }

  @override
  Future<void> signOut() => _auth.signOut();
}
