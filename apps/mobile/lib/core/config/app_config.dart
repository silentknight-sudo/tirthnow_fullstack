import 'package:flutter/foundation.dart';

/// Which identity backend proves who the user is (ADR-0002).
enum AuthProviderKind { mock, firebase }

/// Which payment checkout the app opens.
enum PaymentProviderKind { mock, razorpay }

/// Build-time configuration, set with `--dart-define` (see apps/mobile/README.md).
/// Nothing secret lives here: the Razorpay key id is a public key.
@immutable
class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.authProvider,
    required this.paymentProvider,
    required this.razorpayKeyId,
  });

  factory AppConfig.fromEnvironment() {
    const base = String.fromEnvironment('API_BASE_URL');
    const auth = String.fromEnvironment('AUTH_PROVIDER', defaultValue: 'mock');
    const pay = String.fromEnvironment('PAYMENT_PROVIDER', defaultValue: 'mock');
    const rzp = String.fromEnvironment('RAZORPAY_KEY_ID');
    return AppConfig(
      apiBaseUrl: base.isNotEmpty ? base : _defaultBaseUrl(),
      authProvider: auth == 'firebase' ? AuthProviderKind.firebase : AuthProviderKind.mock,
      paymentProvider: pay == 'razorpay' ? PaymentProviderKind.razorpay : PaymentProviderKind.mock,
      razorpayKeyId: rzp,
    );
  }

  /// Origin of the API, without the `/v1` prefix (e.g. `http://10.0.2.2:4000`).
  final String apiBaseUrl;
  final AuthProviderKind authProvider;
  final PaymentProviderKind paymentProvider;
  final String razorpayKeyId;

  static String _defaultBaseUrl() {
    // The Android emulator reaches the host machine on 10.0.2.2.
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:4000';
    }
    return 'http://localhost:4000';
  }
}
