import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tirth_now/core/api/api_client.dart';
import 'package:tirth_now/core/api/api_exception.dart';
import 'package:tirth_now/core/storage/token_store.dart';

/// Scripted HTTP: records requests and answers with [handler].
class FakeAdapter implements HttpClientAdapter {
  FakeAdapter(this.handler);

  final Future<(int, Object?)> Function(RequestOptions o) handler;
  final requests = <RequestOptions>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions o,
    Stream<Uint8List>? body,
    Future<void>? cancel,
  ) async {
    requests.add(o);
    final (status, json) = await handler(o);
    return ResponseBody.fromString(
      jsonEncode(json),
      status,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  late MemoryTokenStore tokens;
  setUp(() async {
    tokens = MemoryTokenStore();
    await tokens.write(const TokenPair(accessToken: 'old', refreshToken: 'r1'));
  });

  ApiClient client(FakeAdapter api, FakeAdapter refresh, {void Function()? expired}) {
    final dio = Dio()..httpClientAdapter = api;
    final refreshDio = Dio()..httpClientAdapter = refresh;
    return ApiClient(
      baseUrl: 'http://api.test',
      tokens: tokens,
      language: () => 'hi',
      onSessionExpired: expired,
      dio: dio,
      refreshDio: refreshDio,
    );
  }

  test('sends language, bearer token and idempotency key', () async {
    final api = FakeAdapter((o) async => (201, {'ok': true}));
    final c = client(api, FakeAdapter((_) async => (500, null)));
    await c.post('/orders', body: {'type': 'hotel'}, idempotencyKey: 'k-1');
    final r = api.requests.single;
    expect(r.uri.toString(), 'http://api.test/v1/orders');
    expect(r.headers['Accept-Language'], 'hi');
    expect(r.headers['Authorization'], 'Bearer old');
    expect(r.headers['Idempotency-Key'], 'k-1');
  });

  test('concurrent 401s trigger exactly one refresh, then retry with the new token', () async {
    final api = FakeAdapter((o) async {
      return o.headers['Authorization'] == 'Bearer new'
          ? (200, {'ok': true})
          : (
              401,
              {
                'error': {'code': 'AUTH_TOKEN_EXPIRED', 'message': 'expired'},
              },
            );
    });
    final refreshGate = Completer<void>();
    final refresh = FakeAdapter((o) async {
      await refreshGate.future;
      return (200, {'accessToken': 'new', 'refreshToken': 'r2'});
    });
    final c = client(api, refresh);
    final calls = [c.get('/me'), c.get('/orders'), c.get('/notifications')];
    await Future<void>.delayed(const Duration(milliseconds: 20));
    refreshGate.complete();
    final results = await Future.wait(calls);
    expect(results, everyElement(equals({'ok': true})));
    expect(
      refresh.requests,
      hasLength(1),
      reason: 'refresh tokens rotate; a second refresh would trip reuse detection',
    );
    expect(jsonDecode(jsonEncode(refresh.requests.single.data)), {'refreshToken': 'r1'});
    expect((await tokens.read())!.refreshToken, 'r2');
  });

  test('a rejected refresh clears tokens and reports session expiry', () async {
    var expired = 0;
    final api = FakeAdapter(
      (o) async => (
        401,
        {
          'error': {'code': 'AUTH_TOKEN_EXPIRED', 'message': 'expired'},
        },
      ),
    );
    final refresh = FakeAdapter(
      (o) async => (
        401,
        {
          'error': {'code': 'AUTH_REFRESH_REUSED', 'message': 'reused'},
        },
      ),
    );
    final c = client(api, refresh, expired: () => expired++);
    await expectLater(
      c.get('/me'),
      throwsA(isA<ApiException>().having((e) => e.status, 'status', 401)),
    );
    expect(await tokens.read(), isNull);
    expect(expired, 1);
  });

  test('maps API error bodies to ApiException codes', () async {
    final api = FakeAdapter(
      (o) async => (
        409,
        {
          'error': {'code': 'ORDER_INVALID_TRANSITION', 'message': 'Not allowed', 'requestId': 'r'},
        },
      ),
    );
    final c = client(api, FakeAdapter((_) async => (500, null)));
    await expectLater(
      c.post('/orders/1/cancel'),
      throwsA(isA<ApiException>().having((e) => e.code, 'code', 'ORDER_INVALID_TRANSITION')),
    );
  });
}
