import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_models.dart';
import '../../../core/providers.dart';
import '../../../core/storage/token_store.dart';
import 'identity_provider.dart';

/// Who is signed in. `user == null` means signed out.
@immutable
class Session {
  const Session({this.user, this.restoring = false});

  final AuthUserResponse? user;

  /// True while stored tokens are checked at startup.
  final bool restoring;

  bool get signedIn => user != null;
  bool get isGuest => user?.isGuest ?? true;
}

class SessionController extends Notifier<Session> {
  @override
  Session build() {
    ref.listen(sessionExpiryProvider, (_, _) => _clearLocal());
    Future.microtask(_restore);
    return const Session(restoring: true);
  }

  ApiClient get _api => ref.read(apiClientProvider);
  TokenStore get _tokens => ref.read(tokenStoreProvider);
  IdentityProvider get _identity => ref.read(identityProviderProvider);

  Future<void> _restore() async {
    final t = await _tokens.read();
    if (t == null) {
      state = const Session();
      return;
    }
    try {
      await _setUser(AuthUserResponse.fromJson(await _api.getJson('/me')));
    } on Object {
      // Offline: keep the last known user while the tokens are still stored.
      final cached = await ref.read(jsonCacheProvider).read('me');
      final still = await _tokens.read();
      state = still != null && cached is Map
          ? Session(user: AuthUserResponse.fromJson(cached.cast<String, dynamic>()))
          : const Session();
    }
  }

  Future<PhoneChallenge> startPhone(String phoneE164) => _identity.startPhoneSignIn(phoneE164);

  Future<void> confirmOtp(PhoneChallenge challenge, String code) async {
    final idToken = await _identity.confirmOtp(challenge, code);
    await _exchange(idToken);
  }

  Future<void> continueAsGuest() async => _exchange(await _identity.signInAsGuest());

  Future<void> _exchange(String idToken) async {
    final res = AuthResultResponse.fromJson(
      asJson(
        await _api.post(
          '/auth/firebase',
          body: FirebaseExchangeDto(
            idToken: idToken,
            device: DeviceInfoDto(
              platform: kIsWeb
                  ? 'web'
                  : defaultTargetPlatform == TargetPlatform.iOS
                  ? 'ios'
                  : 'android',
              appVersion: '0.1.0',
            ),
          ).toJson(),
        ),
      ),
    );
    await _tokens.write(TokenPair(accessToken: res.accessToken, refreshToken: res.refreshToken));
    await _setUser(res.user);
  }

  Future<void> refreshUser() async {
    await _setUser(AuthUserResponse.fromJson(await _api.getJson('/me')));
  }

  Future<void> _setUser(AuthUserResponse user) async {
    await ref.read(jsonCacheProvider).write('me', user.toJson());
    state = Session(user: user);
  }

  Future<void> signOut() async {
    if (await _tokens.read() != null) {
      try {
        await _api.post('/auth/logout', body: const LogoutDto().toJson());
      } on Object {
        // Signing out locally must always work, even offline.
      }
    }
    await _identity.signOut();
    await _clearLocal();
  }

  Future<void> deleteAccount() async {
    await _api.delete('/me');
    await _identity.signOut();
    await _clearLocal();
  }

  Future<void> _clearLocal() async {
    await _tokens.clear();
    state = const Session();
  }
}

final sessionProvider = NotifierProvider<SessionController, Session>(SessionController.new);
