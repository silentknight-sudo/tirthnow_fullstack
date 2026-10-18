import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_models.dart';
import '../../../core/providers.dart';

/// Inventory search, orders and payments.
class BookingsRepository {
  BookingsRepository(this._api);

  final ApiClient _api;

  Future<List<HotelResponse>> hotels({
    String? checkIn,
    String? checkOut,
    int guests = 2,
    int rooms = 1,
  }) async => (await _api.getList(
    '/hotels',
    query: {'checkIn': checkIn, 'checkOut': checkOut, 'guests': guests, 'rooms': rooms},
  )).map(HotelResponse.fromJson).toList();

  Future<HotelResponse> hotel(
    String id, {
    String? checkIn,
    String? checkOut,
    int guests = 2,
    int rooms = 1,
  }) async => HotelResponse.fromJson(
    await _api.getJson(
      '/hotels/$id',
      query: {'checkIn': checkIn, 'checkOut': checkOut, 'guests': guests, 'rooms': rooms},
    ),
  );

  Future<List<CabQuoteResponse>> cabQuotes(PointDto pickup, PointDto drop) async => asJsonList(
    await _api.post(
      '/cabs/estimate',
      body: CabEstimateDto(pickup: pickup, drop: drop).toJson(),
    ),
  ).map(CabQuoteResponse.fromJson).toList();

  Future<List<RestaurantResponse>> restaurants({bool? veg, bool? satvik}) async =>
      (await _api.getList(
        '/restaurants',
        query: {'veg': veg, 'satvik': satvik},
      )).map(RestaurantResponse.fromJson).toList();

  Future<RestaurantResponse> restaurant(String id) async =>
      RestaurantResponse.fromJson(await _api.getJson('/restaurants/$id'));

  Future<List<ExperienceResponse>> experiences() async =>
      (await _api.getList('/experiences')).map(ExperienceResponse.fromJson).toList();

  Future<ExperienceResponse> experience(String id) async =>
      ExperienceResponse.fromJson(await _api.getJson('/experiences/$id', query: {'days': 14}));

  /// Creates an order. [idempotencyKey] must stay the same across retries of
  /// one tap so a flaky network never books twice.
  Future<CreateOrderResponse> createOrder(
    CreateOrderDto dto, {
    required String idempotencyKey,
  }) async => CreateOrderResponse.fromJson(
    asJson(await _api.post('/orders', body: dto.toJson(), idempotencyKey: idempotencyKey)),
  );

  Future<List<OrderResponse>> orders() async =>
      (await _api.getList('/orders', query: {'limit': 50})).map(OrderResponse.fromJson).toList();

  Future<OrderResponse> order(String id) async =>
      OrderResponse.fromJson(await _api.getJson('/orders/$id'));

  Future<PaymentIntentResponse> pay(String orderId) async =>
      PaymentIntentResponse.fromJson(asJson(await _api.post('/orders/$orderId/pay')));

  Future<OrderResponse> verifyPayment(
    String orderId,
    VerifyPaymentDto dto, {
    required String idempotencyKey,
  }) async => OrderResponse.fromJson(
    asJson(
      await _api.post(
        '/orders/$orderId/payments/verify',
        body: dto.toJson(),
        idempotencyKey: idempotencyKey,
      ),
    ),
  );

  Future<CancellationPreviewResponse> cancellationPreview(String orderId) async =>
      CancellationPreviewResponse.fromJson(await _api.getJson('/orders/$orderId/cancellation'));

  Future<OrderResponse> cancel(String orderId, {required String idempotencyKey}) async =>
      OrderResponse.fromJson(
        asJson(
          await _api.post(
            '/orders/$orderId/cancel',
            body: const CancelOrderDto(reasonCode: 'user_request').toJson(),
            idempotencyKey: idempotencyKey,
          ),
        ),
      );

  Future<CabTrackingResponse> tracking(String orderId) async =>
      CabTrackingResponse.fromJson(await _api.getJson('/orders/$orderId/tracking'));

  /// Test-mode stand-in for the gateway SDK (`PAYMENT_PROVIDER=mock`, dev API only).
  Future<Json> mockCheckout(String providerOrderId, {required bool succeed}) async => asJson(
    await _api.post(
      '/dev/payments/checkout',
      body: {'providerOrderId': providerOrderId, 'outcome': succeed ? 'success' : 'failure'},
    ),
  );
}

final bookingsRepositoryProvider = Provider<BookingsRepository>(
  (ref) => BookingsRepository(ref.watch(apiClientProvider)),
);

final ordersProvider = FutureProvider<List<OrderResponse>>(
  (ref) => ref.watch(bookingsRepositoryProvider).orders(),
);

final orderProvider = FutureProvider.family<OrderResponse, String>(
  (ref, id) => ref.watch(bookingsRepositoryProvider).order(id),
);

final restaurantsProvider = FutureProvider<List<RestaurantResponse>>(
  (ref) => ref.watch(bookingsRepositoryProvider).restaurants(),
);

final restaurantProvider = FutureProvider.family<RestaurantResponse, String>(
  (ref, id) => ref.watch(bookingsRepositoryProvider).restaurant(id),
);

final experiencesProvider = FutureProvider<List<ExperienceResponse>>(
  (ref) => ref.watch(bookingsRepositoryProvider).experiences(),
);

final experienceProvider = FutureProvider.family<ExperienceResponse, String>(
  (ref, id) => ref.watch(bookingsRepositoryProvider).experience(id),
);
