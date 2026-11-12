import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_models.dart';
import '../../../core/providers.dart';

/// Temple Store catalogue (approved vendors only) and checkout price quotes.
class StoreRepository {
  StoreRepository(this._api);

  final ApiClient _api;

  Future<List<ProductResponse>> products({String? category, String? q}) async =>
      (await _api.getList(
        '/store/products',
        query: {'category': category, 'q': q},
      )).map(ProductResponse.fromJson).toList();

  Future<List<CategoryResponse>> categories() async =>
      (await _api.getList('/store/categories')).map(CategoryResponse.fromJson).toList();

  Future<PriceQuoteResponse> quote(String vendorId, int basePaise, {String? couponCode}) async =>
      PriceQuoteResponse.fromJson(
        asJson(
          await _api.post(
            '/store/quote',
            body: PriceQuoteDto(
              vendorId: vendorId,
              basePaise: basePaise,
              couponCode: couponCode,
            ).toJson(),
          ),
        ),
      );
}

final storeRepositoryProvider = Provider<StoreRepository>(
  (ref) => StoreRepository(ref.watch(apiClientProvider)),
);

/// Selected category chip (null = all).
final storeCategoryProvider = NotifierProvider<StoreCategory, String?>(StoreCategory.new);

class StoreCategory extends Notifier<String?> {
  @override
  String? build() => null;

  void set(String? v) => state = v;
}

final storeProductsProvider = FutureProvider.autoDispose<List<ProductResponse>>(
  (ref) => ref.watch(storeRepositoryProvider).products(category: ref.watch(storeCategoryProvider)),
);

final storeCategoriesProvider = FutureProvider.autoDispose<List<CategoryResponse>>(
  (ref) => ref.watch(storeRepositoryProvider).categories(),
);

/// One store per cart (one order per store). Lines keep the product snapshot.
class CartState {
  const CartState({this.vendorId, this.vendorName, this.lines = const {}});

  final String? vendorId;
  final String? vendorName;
  final Map<String, (ProductResponse, int)> lines;

  int get count => lines.values.fold(0, (s, l) => s + l.$2);
  int get basePaise => lines.values.fold(0, (s, l) => s + l.$1.pricePaise.toInt() * l.$2);
  int get displayPaise => lines.values.fold(0, (s, l) => s + l.$1.displayPricePaise.toInt() * l.$2);
  int qty(String productId) => lines[productId]?.$2 ?? 0;
  bool get isEmpty => lines.isEmpty;
}

enum AddResult { added, otherStore, outOfStock }

class Cart extends Notifier<CartState> {
  @override
  CartState build() => const CartState();

  AddResult add(ProductResponse p, {bool replace = false}) {
    if (state.vendorId != null && state.vendorId != p.vendorId && !replace) {
      return AddResult.otherStore;
    }
    final base = replace || state.vendorId != p.vendorId
        ? <String, (ProductResponse, int)>{}
        : {...state.lines};
    final q = (base[p.id]?.$2 ?? 0) + 1;
    if (q > p.stock) return AddResult.outOfStock;
    base[p.id] = (p, q);
    state = CartState(vendorId: p.vendorId, vendorName: p.vendorName, lines: base);
    return AddResult.added;
  }

  void decrement(String productId) {
    final l = state.lines[productId];
    if (l == null) return;
    final next = {...state.lines};
    if (l.$2 <= 1) {
      next.remove(productId);
    } else {
      next[productId] = (l.$1, l.$2 - 1);
    }
    state = next.isEmpty
        ? const CartState()
        : CartState(vendorId: state.vendorId, vendorName: state.vendorName, lines: next);
  }

  void clear() => state = const CartState();
}

final cartProvider = NotifierProvider<Cart, CartState>(Cart.new);
