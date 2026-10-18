import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

@immutable
class TokenPair {
  const TokenPair({required this.accessToken, required this.refreshToken});

  final String accessToken;
  final String refreshToken;
}

/// Keeps the API token pair. Production uses the platform keystore.
abstract interface class TokenStore {
  Future<TokenPair?> read();
  Future<void> write(TokenPair tokens);
  Future<void> clear();
}

class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  static const _accessKey = 'tn.accessToken';
  static const _refreshKey = 'tn.refreshToken';
  final FlutterSecureStorage _storage;

  @override
  Future<TokenPair?> read() async {
    final access = await _storage.read(key: _accessKey);
    final refresh = await _storage.read(key: _refreshKey);
    if (access == null || refresh == null) return null;
    return TokenPair(accessToken: access, refreshToken: refresh);
  }

  @override
  Future<void> write(TokenPair tokens) async {
    await _storage.write(key: _accessKey, value: tokens.accessToken);
    await _storage.write(key: _refreshKey, value: tokens.refreshToken);
  }

  @override
  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}

/// For tests and previews.
class MemoryTokenStore implements TokenStore {
  TokenPair? _tokens;

  @override
  Future<TokenPair?> read() async => _tokens;

  @override
  Future<void> write(TokenPair tokens) async => _tokens = tokens;

  @override
  Future<void> clear() async => _tokens = null;
}
