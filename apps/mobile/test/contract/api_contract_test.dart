// Runs the app's data layer against a live API with mock providers:
//   flutter test test/contract --dart-define=API_CONTRACT_URL=http://localhost:4000
// Skipped when API_CONTRACT_URL is not set (CI runs it after starting the API).
@Tags(['contract'])
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:tirth_now/core/api/api_client.dart';
import 'package:tirth_now/core/api/api_models.dart';
import 'package:tirth_now/core/cache/json_cache.dart';
import 'package:tirth_now/core/format/formatters.dart';
import 'package:tirth_now/core/storage/token_store.dart';
import 'package:tirth_now/features/ai/data/ai_repository.dart';
import 'package:tirth_now/features/bookings/data/bookings_repository.dart';
import 'package:tirth_now/features/catalog/data/catalog_repository.dart';

const baseUrl = String.fromEnvironment('API_CONTRACT_URL');

void main() {
  final skip = baseUrl.isEmpty ? 'set --dart-define=API_CONTRACT_URL to run' : null;
  late ApiClient api;
  late CatalogRepository catalog;
  late BookingsRepository bookings;
  late AiRepository ai;

  setUpAll(() async {
    if (skip != null) return;
    final tokens = MemoryTokenStore();
    api = ApiClient(baseUrl: baseUrl, tokens: tokens, language: () => 'en');
    catalog = CatalogRepository(api, MemoryJsonCache());
    bookings = BookingsRepository(api);
    ai = AiRepository(api);
    // Unique phone per run so the test never collides with seed users.
    final phone = '+9197${DateTime.now().millisecondsSinceEpoch % 100000000}'.padRight(13, '0');
    final res = AuthResultResponse.fromJson(
      asJson(
        await api.post(
          '/auth/firebase',
          body: FirebaseExchangeDto(
            idToken: 'mock:contract-${phone.substring(3)}:$phone',
            device: const DeviceInfoDto(platform: 'android'),
          ).toJson(),
        ),
      ),
    );
    await tokens.write(TokenPair(accessToken: res.accessToken, refreshToken: res.refreshToken));
    expect(res.user.isGuest, isFalse);
  });

  group('catalog', () {
    test('temples, detail and aarti parse', () async {
      final temples = await catalog.temples();
      expect(temples, isNotEmpty);
      final detail = await catalog.temple(temples.first.slug);
      expect(detail.id, temples.first.id);
      final today = istDateString();
      final aarti = await catalog.templeAarti(detail.id, from: today, to: today);
      for (final a in aarti) {
        expect(DateTime.parse(a.startsAt).isUtc, isTrue);
      }
    }, skip: skip);

    test('upcoming aarti, festivals, weather, safety directory', () async {
      expect(await catalog.upcomingAarti(limit: 3), isNotEmpty);
      await catalog.festivals();
      final w = await catalog.weather(city: 'vrindavan');
      expect(w.daily, isNotEmpty);
      final dir = await catalog.safetyDirectory();
      expect(dir.helplines, isNotEmpty);
    }, skip: skip);

    test('aarti reminders round-trip', () async {
      final a = (await catalog.upcomingAarti(limit: 1)).first;
      final r = await catalog.addReminder(a.scheduleId, minutesBefore: 15);
      expect((await catalog.reminders()).map((x) => x.id), contains(r.id));
      await catalog.removeReminder(r.id);
    }, skip: skip);
  });

  group('bookings', () {
    test('hotel order → mock checkout → verified and confirmed', () async {
      final today = DateTime.parse(istDateString());
      String d(DateTime x) => x.toIso8601String().substring(0, 10);
      final checkIn = d(today.add(const Duration(days: 20)));
      final checkOut = d(today.add(const Duration(days: 21)));
      final hotels = await bookings.hotels(checkIn: checkIn, checkOut: checkOut);
      expect(hotels, isNotEmpty);
      final hotel = await bookings.hotel(hotels.first.id, checkIn: checkIn, checkOut: checkOut);
      final room = hotel.roomTypes!.firstWhere((r) => r.available ?? true);
      final key = ApiClient.newIdempotencyKey();
      final dto = CreateOrderDto(
        type: 'hotel',
        hotel: HotelOrderDto(
          roomTypeId: room.id,
          checkIn: checkIn,
          checkOut: checkOut,
          guests: 2,
          rooms: 1,
        ),
      );
      final created = await bookings.createOrder(dto, idempotencyKey: key);
      // Same key → same order (no double booking on retry).
      final replay = await bookings.createOrder(dto, idempotencyKey: key);
      expect(replay.order.id, created.order.id);
      expect(created.order.status, 'pending');
      final intent = created.payment!;
      final checkout = await bookings.mockCheckout(intent.providerOrderId, succeed: true);
      final order = await bookings.verifyPayment(
        created.order.id,
        VerifyPaymentDto(
          providerOrderId: intent.providerOrderId,
          providerPaymentId: checkout['providerPaymentId'] as String,
          signature: checkout['signature'] as String,
        ),
        idempotencyKey: ApiClient.newIdempotencyKey(),
      );
      expect(order.status, 'confirmed');
      expect((await bookings.orders()).map((o) => o.id), contains(order.id));
      final preview = await bookings.cancellationPreview(order.id);
      expect(preview.allowed, isTrue);
      final cancelled = await bookings.cancel(
        order.id,
        idempotencyKey: ApiClient.newIdempotencyKey(),
      );
      expect(['cancelled', 'refunded'], contains(cancelled.status));
    }, skip: skip);

    test('restaurants, experiences and cab quotes parse', () async {
      final restaurants = await bookings.restaurants();
      if (restaurants.isNotEmpty) await bookings.restaurant(restaurants.first.id);
      final experiences = await bookings.experiences();
      if (experiences.isNotEmpty) await bookings.experience(experiences.first.id);
      final temples = await catalog.temples();
      final quotes = await bookings.cabQuotes(
        PointDto(lat: temples[0].lat, lng: temples[0].lng),
        PointDto(lat: temples[1].lat, lng: temples[1].lng),
      );
      expect(quotes.every((q) => q.farePaise > 0), isTrue);
    }, skip: skip);
  });

  group('safety, notifications, reels', () {
    test('SOS trigger → cancel', () async {
      final sos = SosResponse.fromJson(
        asJson(
          await api.post(
            '/safety/sos',
            body: const TriggerSosDto(lat: 27.58, lng: 77.70, accuracyM: 20).toJson(),
            idempotencyKey: ApiClient.newIdempotencyKey(),
          ),
        ),
      );
      expect(sos.shareUrl, isNotEmpty);
      final cancelled = SosResponse.fromJson(
        asJson(await api.post('/safety/sos/${sos.id}/cancel')),
      );
      expect(cancelled.status, 'cancelled');
    }, skip: skip);

    test('notifications page and preferences', () async {
      NotificationPageResponse.fromJson(await api.getJson('/notifications'));
      NotificationPreferencesDto.fromJson(await api.getJson('/notifications/preferences'));
    }, skip: skip);

    test('reels feed parses', () async {
      ReelPageResponse.fromJson(await api.getJson('/reels/feed'));
    }, skip: skip);
  });

  group('AI guide', () {
    test('chat streams tokens and the answer quotes the temple schedule', () async {
      final id = await ai.createSession('en');
      final events = await ai.ask(id, 'When is sandhya aarti at ISKCON Vrindavan?').toList();
      final text = events.whereType<GuideToken>().map((e) => e.text).join();
      expect(events.last, isA<GuideDone>());
      expect(text, contains('IST'));
      final history = await ai.messages(id);
      expect(history.where((m) => !m.isUser).single.content, text);
    }, skip: skip);

    test('planner builds an itinerary with aarti items', () async {
      final plan = await ai.createItinerary(
        CreateItineraryDto(
          days: 1,
          startDate: istDateString(DateTime.now().toUtc().add(const Duration(days: 3))),
        ),
      );
      final items = (plan['dayList'] as List).expand((d) => (d as Map)['items'] as List).toList();
      expect(items, isNotEmpty);
      expect(await ai.share(plan['id'] as String), contains('/shared/'));
    }, skip: skip);
  });
}
