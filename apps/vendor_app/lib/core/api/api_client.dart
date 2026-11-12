import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';

import '../storage/token_store.dart';
import 'api_exception.dart';
import 'sse.dart';

typedef Json = Map<String, dynamic>;

/// Thin wrapper over Dio for the Tirth Now API:
/// * `/v1` prefix and `Accept-Language` on every call,
/// * bearer token from [TokenStore],
/// * one shared refresh when a call gets 401 (refresh tokens rotate, so
///   concurrent refreshes would trip reuse detection),
/// * `Idempotency-Key` for booking, payment and SOS calls.
class ApiClient {
  ApiClient({
    required String baseUrl,
    required this.tokens,
    required this.language,
    this.onSessionExpired,
    Dio? dio,
    Dio? refreshDio,
  }) : _dio = dio ?? Dio(),
       _refreshDio = refreshDio ?? Dio() {
    final options = BaseOptions(
      baseUrl: '$baseUrl/v1',
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      contentType: Headers.jsonContentType,
    );
    _dio.options = options;
    _refreshDio.options = options;
    _dio.interceptors.add(InterceptorsWrapper(onRequest: _onRequest, onError: _onError));
  }

  final TokenStore tokens;

  /// Current UI language (`en` or `hi`).
  final String Function() language;

  /// Called when the refresh token is rejected; the app signs the user out.
  final void Function()? onSessionExpired;

  final Dio _dio;
  final Dio _refreshDio;
  Future<bool>? _refreshing;
  static const _uuid = Uuid();

  /// A fresh key per user action; retries of the same action reuse it.
  static String newIdempotencyKey() => _uuid.v4();

  Future<void> _onRequest(RequestOptions o, RequestInterceptorHandler h) async {
    o.headers['Accept-Language'] = language();
    final t = await tokens.read();
    if (t != null && o.extra['skipAuth'] != true) {
      o.headers['Authorization'] = 'Bearer ${t.accessToken}';
    }
    h.next(o);
  }

  Future<void> _onError(DioException e, ErrorInterceptorHandler h) async {
    final req = e.requestOptions;
    final isAuthCall = req.path.startsWith('/auth/');
    if (e.response?.statusCode != 401 || isAuthCall || req.extra['retried'] == true) {
      return h.next(e);
    }
    final ok = await refresh();
    if (!ok) return h.next(e);
    final t = await tokens.read();
    req.extra['retried'] = true;
    if (t != null) req.headers['Authorization'] = 'Bearer ${t.accessToken}';
    try {
      final res = await _dio.fetch<dynamic>(req);
      h.resolve(res);
    } on DioException catch (err) {
      h.next(err);
    }
  }

  /// Rotates the token pair once, however many calls are waiting.
  Future<bool> refresh() => _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);

  Future<bool> _doRefresh() async {
    final current = await tokens.read();
    if (current == null) return false;
    try {
      final res = await _refreshDio.post<Json>(
        '/auth/refresh',
        data: {'refreshToken': current.refreshToken},
      );
      final body = res.data;
      if (body == null) return false;
      await tokens.write(
        TokenPair(
          accessToken: body['accessToken'] as String,
          refreshToken: body['refreshToken'] as String,
        ),
      );
      return true;
    } on DioException {
      await tokens.clear();
      onSessionExpired?.call();
      return false;
    }
  }

  Future<Object?> _send(
    String method,
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    String? idempotencyKey,
    bool auth = true,
  }) async {
    try {
      final res = await _dio.request<Object?>(
        path,
        data: body,
        queryParameters: query == null ? null : _clean(query),
        options: Options(
          method: method,
          headers: {'Idempotency-Key': ?idempotencyKey},
          extra: {'skipAuth': !auth},
        ),
      );
      return res.data;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }

  static Map<String, dynamic> _clean(Map<String, dynamic> q) => {
    for (final e in q.entries)
      if (e.value != null) e.key: e.value.toString(),
  };

  Future<Object?> get(String path, {Map<String, dynamic>? query, bool auth = true}) =>
      _send('GET', path, query: query, auth: auth);

  Future<Object?> post(String path, {Object? body, String? idempotencyKey}) =>
      _send('POST', path, body: body ?? <String, dynamic>{}, idempotencyKey: idempotencyKey);

  Future<Object?> patch(String path, {Object? body}) => _send('PATCH', path, body: body);

  Future<Object?> put(String path, {Object? body}) => _send('PUT', path, body: body);

  Future<Object?> delete(String path) => _send('DELETE', path);

  /// GET returning a JSON object.
  Future<Json> getJson(String path, {Map<String, dynamic>? query, bool auth = true}) async =>
      asJson(await get(path, query: query, auth: auth));

  /// GET returning a JSON array of objects.
  Future<List<Json>> getList(String path, {Map<String, dynamic>? query}) async =>
      asJsonList(await get(path, query: query));

  /// POST to an endpoint that answers with server-sent events.
  Stream<SseEvent> postSse(String path, {required Object body}) async* {
    final Response<ResponseBody> res;
    try {
      res = await _dio.post<ResponseBody>(
        path,
        data: body,
        options: Options(
          responseType: ResponseType.stream,
          headers: {'Accept': 'text/event-stream'},
        ),
      );
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
    final stream = res.data?.stream;
    if (stream == null) return;
    yield* parseSse(stream.cast<List<int>>().transform(utf8.decoder));
  }

  /// Raw bytes (PDFs, audio).
  Future<List<int>> getBytes(String path) async {
    try {
      final res = await _dio.get<List<int>>(
        path,
        options: Options(responseType: ResponseType.bytes),
      );
      return res.data ?? const [];
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

Json asJson(Object? v) {
  if (v is Map) return v.cast<String, dynamic>();
  throw const ApiException(code: 'BAD_RESPONSE', message: 'Unexpected response');
}

List<Json> asJsonList(Object? v) {
  if (v is List) return v.map(asJson).toList();
  // Cursor pages: { data: [...], nextCursor }.
  if (v is Map && v['data'] is List) return asJsonList(v['data']);
  if (v is Map && v['items'] is List) return asJsonList(v['items']);
  throw const ApiException(code: 'BAD_RESPONSE', message: 'Unexpected response');
}
