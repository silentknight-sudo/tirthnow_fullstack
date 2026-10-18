import 'package:flutter_test/flutter_test.dart';
import 'package:tirth_now/features/auth/data/identity_provider.dart';

void main() {
  final idp = MockIdentityProvider();

  test('phone sign-in mints the API mock token with a stable uid', () async {
    final c = await idp.startPhoneSignIn('+919812345678');
    expect(await idp.confirmOtp(c, '123456'), 'mock:phone-919812345678:+919812345678');
  });

  test('wrong OTP is rejected', () async {
    final c = await idp.startPhoneSignIn('+919812345678');
    expect(() => idp.confirmOtp(c, '000000'), throwsA(isA<IdentityException>()));
  });

  test('guests get a mock guest token', () async {
    expect(await idp.signInAsGuest(), startsWith('mock:guest:g-'));
  });
}
