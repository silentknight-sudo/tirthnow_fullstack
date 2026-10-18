import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_exception.dart';
import '../../../core/api/api_models.dart';
import '../../../core/cache/json_cache.dart';
import '../../../core/providers.dart';

/// Temples, aarti, festivals, weather. Reads fall back to the offline cache
/// when the network is down, so a pilgrim in a crowded lane still sees times.
class CatalogRepository {
  CatalogRepository(this._api, this._cache);

  final ApiClient _api;
  final JsonCache _cache;

  Future<Object?> _cached(String key, Future<Object?> Function() load) async {
    try {
      final v = await load();
      await _cache.write(key, v);
      return v;
    } on ApiException catch (e) {
      if (!e.isNetwork) rethrow;
      final hit = await _cache.read(key);
      if (hit == null) rethrow;
      return hit;
    }
  }

  Future<List<CityResponse>> cities() async =>
      asJsonList(await _cached('cities', () => _api.get('/cities')))
          .map(CityResponse.fromJson)
          .toList();

  Future<List<TempleSummaryResponse>> temples({String? city, String? tag}) async {
    final key = 'temples:$city:$tag';
    final raw = await _cached(key, () => _api.get('/temples', query: {'city': city, 'tag': tag}));
    return asJsonList(raw).map(TempleSummaryResponse.fromJson).toList();
  }

  Future<TempleDetailResponse> temple(String idOrSlug) async => TempleDetailResponse.fromJson(
    asJson(await _cached('temple:$idOrSlug', () => _api.get('/temples/$idOrSlug'))),
  );

  Future<List<AartiInstanceResponse>> templeAarti(
    String id, {
    required String from,
    required String to,
  }) async {
    final raw = await _cached(
      'aarti:$id:$from:$to',
      () => _api.get('/temples/$id/aarti', query: {'from': from, 'to': to}),
    );
    return asJsonList(raw).map(AartiInstanceResponse.fromJson).toList();
  }

  Future<List<AartiInstanceResponse>> upcomingAarti({String? city, int limit = 10}) async {
    final raw = await _cached(
      'upcoming:$city',
      () => _api.get('/aarti/upcoming', query: {'city': city, 'limit': limit}),
    );
    return asJsonList(raw).map(AartiInstanceResponse.fromJson).toList();
  }

  Future<List<FestivalResponse>> festivals({String? from, String? to}) async {
    final raw = await _cached(
      'festivals',
      () => _api.get('/festivals', query: {'from': from, 'to': to}),
    );
    return asJsonList(raw).map(FestivalResponse.fromJson).toList();
  }

  Future<WeatherResponse> weather({String? city}) async => WeatherResponse.fromJson(
    asJson(await _cached('weather:$city', () => _api.get('/weather', query: {'city': city}))),
  );

  Future<List<SearchResultResponse>> search(String q) async => (await _api.getList(
    '/search',
    query: {'q': q, 'limit': 20},
  )).map(SearchResultResponse.fromJson).toList();

  Future<SafetyDirectoryResponse> safetyDirectory() async => SafetyDirectoryResponse.fromJson(
    asJson(await _cached('safety', () => _api.get('/safety/directory'))),
  );

  // Aarti reminders (signed-in users).
  Future<List<AartiReminderResponse>> reminders() async =>
      (await _api.getList('/aarti-reminders')).map(AartiReminderResponse.fromJson).toList();

  Future<AartiReminderResponse> addReminder(String scheduleId, {int? minutesBefore}) async =>
      AartiReminderResponse.fromJson(
        asJson(
          await _api.post(
            '/aarti-reminders',
            body: CreateAartiReminderDto(
              aartiScheduleId: scheduleId,
              minutesBefore: minutesBefore,
            ).toJson(),
          ),
        ),
      );

  Future<void> removeReminder(String id) => _api.delete('/aarti-reminders/$id');
}

final catalogRepositoryProvider = Provider<CatalogRepository>(
  (ref) => CatalogRepository(ref.watch(apiClientProvider), ref.watch(jsonCacheProvider)),
);

final upcomingAartiProvider = FutureProvider<List<AartiInstanceResponse>>(
  (ref) => ref.watch(catalogRepositoryProvider).upcomingAarti(limit: 8),
);

final festivalsProvider = FutureProvider<List<FestivalResponse>>(
  (ref) => ref.watch(catalogRepositoryProvider).festivals(),
);

final weatherProvider = FutureProvider<WeatherResponse>(
  (ref) => ref.watch(catalogRepositoryProvider).weather(city: 'vrindavan'),
);

final citiesProvider = FutureProvider<List<CityResponse>>(
  (ref) => ref.watch(catalogRepositoryProvider).cities(),
);

/// Selected city filter on the temples tab (`null` = all of Braj).
class CityFilter extends Notifier<String?> {
  @override
  String? build() => null;

  void set(String? id) => state = id;
}

final cityFilterProvider = NotifierProvider<CityFilter, String?>(CityFilter.new);

final templesProvider = FutureProvider<List<TempleSummaryResponse>>(
  (ref) => ref.watch(catalogRepositoryProvider).temples(city: ref.watch(cityFilterProvider)),
);

final templeProvider = FutureProvider.family<TempleDetailResponse, String>(
  (ref, id) => ref.watch(catalogRepositoryProvider).temple(id),
);

final remindersProvider = FutureProvider<List<AartiReminderResponse>>(
  (ref) => ref.watch(catalogRepositoryProvider).reminders(),
);

final safetyDirectoryProvider = FutureProvider<SafetyDirectoryResponse>(
  (ref) => ref.watch(catalogRepositoryProvider).safetyDirectory(),
);
