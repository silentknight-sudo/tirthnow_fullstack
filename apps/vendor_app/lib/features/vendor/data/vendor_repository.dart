import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_models.dart';
import '../../../core/api/uploads.dart';
import '../../../core/providers.dart';
import '../../auth/data/session_controller.dart';

/// Everything a partner does: onboarding and KYC, listings, orders, coupons,
/// analytics and reviews. All calls are scoped to one vendor id.
class VendorRepository {
  VendorRepository(this._api);

  final ApiClient _api;

  // ───────────── onboarding ─────────────

  Future<List<VendorResponse>> mine() async =>
      (await _api.getList('/vendors/me')).map(VendorResponse.fromJson).toList();

  Future<VendorResponse> get(String id) async =>
      VendorResponse.fromJson(await _api.getJson('/vendors/$id'));

  Future<VendorResponse> create(CreateVendorDto dto) async {
    final v = VendorResponse.fromJson(asJson(await _api.post('/vendors', body: dto.toJson())));
    // The new vendor role arrives in a fresh access token.
    await _api.refresh();
    return v;
  }

  Future<VendorResponse> update(String id, Map<String, dynamic> body) async =>
      VendorResponse.fromJson(asJson(await _api.patch('/vendors/$id', body: body)));

  Future<String> upload(String purpose, Uint8List bytes, String mimeType) =>
      uploadMedia(_api, purpose: purpose, mimeType: mimeType, bytes: bytes);

  Future<void> addKyc(String id, String docType, String mediaId) async => _api.post(
    '/vendors/$id/kyc-documents',
    body: AddKycDocumentDto(docType: docType, mediaId: mediaId).toJson(),
  );

  Future<void> removeKyc(String id, String docId) async =>
      _api.delete('/vendors/$id/kyc-documents/$docId');

  Future<VendorResponse> submit(String id) async =>
      VendorResponse.fromJson(asJson(await _api.post('/vendors/$id/submit')));

  Future<List<BankAccountResponse>> bankAccounts(String id) async =>
      (await _api.getList('/vendors/$id/bank-accounts')).map(BankAccountResponse.fromJson).toList();

  Future<void> addBank(String id, String holder, String number, String ifsc) async => _api.post(
    '/vendors/$id/bank-accounts',
    body: AddBankAccountDto(accountHolder: holder, accountNumber: number, ifsc: ifsc).toJson(),
  );

  Future<List<CityResponse>> cities() async =>
      (await _api.getList('/cities')).map(CityResponse.fromJson).toList();

  // ───────────── dashboard ─────────────

  Future<VendorAnalyticsResponse> analytics(String id, int days) async =>
      VendorAnalyticsResponse.fromJson(
        await _api.getJson('/vendors/$id/analytics', query: {'days': days}),
      );

  Future<List<OrderResponse>> orders(String id, {String? status}) async {
    final page = await _api.getJson('/vendors/$id/orders', query: {'status': status});
    return [
      for (final o in (page['data'] as List<dynamic>? ?? const []))
        OrderResponse.fromJson(asJson(o)),
    ];
  }

  Future<void> orderAction(String id, String orderId, String action, {String? reason}) async =>
      _api.post(
        '/vendors/$id/orders/$orderId/$action',
        body: reason == null ? null : {'reason': reason},
        idempotencyKey: action == 'cancel' || action == 'reject'
            ? ApiClient.newIdempotencyKey()
            : null,
      );

  Future<List<ReviewResponse>> reviews(String id) async {
    final page = await _api.getJson('/vendors/$id/reviews');
    return [
      for (final r in (page['data'] as List<dynamic>? ?? const []))
        ReviewResponse.fromJson(asJson(r)),
    ];
  }

  Future<void> reply(String id, String reviewId, String text) async =>
      _api.post('/vendors/$id/reviews/$reviewId/reply', body: ReplyDto(reply: text).toJson());

  // ───────────── store ─────────────

  Future<List<ProductResponse>> products(String id) async =>
      (await _api.getList('/vendors/$id/products')).map(ProductResponse.fromJson).toList();

  Future<void> saveProduct(String id, Map<String, dynamic> body, {String? productId}) async =>
      productId == null
      ? _api.post('/vendors/$id/products', body: body)
      : _api.patch('/vendors/$id/products/$productId', body: body);

  Future<void> deleteProduct(String id, String productId) async =>
      _api.delete('/vendors/$id/products/$productId');

  // ───────────── coupons ─────────────

  Future<List<CouponResponse>> coupons(String id) async =>
      (await _api.getList('/vendors/$id/coupons')).map(CouponResponse.fromJson).toList();

  Future<void> saveCoupon(String id, Map<String, dynamic> body, {String? couponId}) async =>
      couponId == null
      ? _api.post('/vendors/$id/coupons', body: body)
      : _api.patch('/vendors/$id/coupons/$couponId', body: body);

  // ───────────── cabs ─────────────

  Future<List<VehicleResponse>> vehicles(String id) async =>
      (await _api.getList('/vendors/$id/vehicles')).map(VehicleResponse.fromJson).toList();

  Future<void> saveVehicle(String id, Map<String, dynamic> body, {String? vehicleId}) async =>
      vehicleId == null
      ? _api.post('/vendors/$id/vehicles', body: body)
      : _api.patch('/vendors/$id/vehicles/$vehicleId', body: body);

  Future<List<CabFareResponse>> fares(String id) async =>
      (await _api.getList('/vendors/$id/cab-fares')).map(CabFareResponse.fromJson).toList();

  Future<void> saveFare(String id, String vehicleClass, UpsertCabFareDto dto) async =>
      _api.put('/vendors/$id/cab-fares/$vehicleClass', body: dto.toJson());

  // ───────────── stays ─────────────

  Future<List<HotelResponse>> hotels(String id) async =>
      (await _api.getList('/vendors/$id/hotels')).map(HotelResponse.fromJson).toList();

  Future<void> saveHotel(String id, Map<String, dynamic> body, {String? hotelId}) async =>
      hotelId == null
      ? _api.post('/vendors/$id/hotels', body: body)
      : _api.patch('/vendors/$id/hotels/$hotelId', body: body);

  Future<void> addRoomType(String id, String hotelId, CreateRoomTypeDto dto) async =>
      _api.post('/vendors/$id/hotels/$hotelId/room-types', body: dto.toJson());

  // ───────────── restaurants ─────────────

  Future<List<RestaurantResponse>> restaurants(String id) async =>
      (await _api.getList('/vendors/$id/restaurants')).map(RestaurantResponse.fromJson).toList();

  Future<void> saveRestaurant(String id, Map<String, dynamic> body, {String? restaurantId}) async =>
      restaurantId == null
      ? _api.post('/vendors/$id/restaurants', body: body)
      : _api.patch('/vendors/$id/restaurants/$restaurantId', body: body);

  Future<void> addMenuItem(String id, String restaurantId, CreateMenuItemDto dto) async =>
      _api.post('/vendors/$id/restaurants/$restaurantId/menu-items', body: dto.toJson());

  Future<void> updateMenuItem(String id, String itemId, Map<String, dynamic> body) async =>
      _api.patch('/vendors/$id/menu-items/$itemId', body: body);
}

final vendorRepositoryProvider = Provider<VendorRepository>(
  (ref) => VendorRepository(ref.watch(apiClientProvider)),
);

/// The signed-in partner's vendor (first one), or null before onboarding.
final myVendorProvider = FutureProvider<VendorResponse?>((ref) async {
  final s = ref.watch(sessionProvider);
  if (!s.signedIn || s.isGuest) return null;
  final list = await ref.watch(vendorRepositoryProvider).mine();
  return list.isEmpty ? null : list.first;
});

final citiesProvider = FutureProvider<List<CityResponse>>(
  (ref) => ref.watch(vendorRepositoryProvider).cities(),
);
