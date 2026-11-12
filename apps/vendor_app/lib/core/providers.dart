import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/data/identity_provider.dart';
import 'api/api_client.dart';
import 'cache/json_cache.dart';
import 'config/app_config.dart';
import 'storage/token_store.dart';

/// Overridden in `main()` and in tests.
final appConfigProvider = Provider<AppConfig>((ref) => AppConfig.fromEnvironment());

final tokenStoreProvider = Provider<TokenStore>((ref) => SecureTokenStore());

final jsonCacheProvider = Provider<JsonCache>((ref) => MemoryJsonCache());

final identityProviderProvider = Provider<IdentityProvider>((ref) {
  final config = ref.watch(appConfigProvider);
  return config.authProvider == AuthProviderKind.firebase
      ? FirebaseIdentityProvider()
      : MockIdentityProvider();
});

/// UI language. `en` or `hi`.
class LocaleController extends Notifier<Locale> {
  @override
  Locale build() => const Locale('en');

  void set(String code) => state = Locale(code == 'hi' ? 'hi' : 'en');
}

final localeProvider = NotifierProvider<LocaleController, Locale>(LocaleController.new);

/// Bumped when the refresh token is rejected so the session can sign out.
class SessionExpiry extends Notifier<int> {
  @override
  int build() => 0;

  void expire() => state++;
}

final sessionExpiryProvider = NotifierProvider<SessionExpiry, int>(SessionExpiry.new);

final apiClientProvider = Provider<ApiClient>((ref) {
  final config = ref.watch(appConfigProvider);
  return ApiClient(
    baseUrl: config.apiBaseUrl,
    tokens: ref.watch(tokenStoreProvider),
    language: () => ref.read(localeProvider).languageCode,
    onSessionExpired: () => ref.read(sessionExpiryProvider.notifier).expire(),
  );
});
