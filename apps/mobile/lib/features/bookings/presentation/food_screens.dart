import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../reviews/presentation/reviews_section.dart';
import '../data/bookings_repository.dart';
import 'checkout_flow.dart';

class RestaurantsScreen extends ConsumerWidget {
  const RestaurantsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.food)),
      body: AsyncView(
        value: ref.watch(restaurantsProvider),
        onRetry: () => ref.invalidate(restaurantsProvider),
        builder: (list) => list.isEmpty
            ? const EmptyState(icon: Icons.restaurant_outlined)
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                itemCount: list.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (_, i) {
                  final r = list[i];
                  return Card(
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(14),
                      title: Text(r.name, style: Theme.of(context).textTheme.titleMedium),
                      subtitle: Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: [
                            if (r.isPureVeg) Pill(l.veg, color: TnColors.success),
                            if (r.isSatvik) Pill(l.satvik, color: TnColors.gold),
                            if (r.address != null)
                              Text(r.address!, style: const TextStyle(color: TnColors.muted)),
                          ],
                        ),
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push('/book/restaurants/${r.id}'),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

class RestaurantDetailScreen extends ConsumerStatefulWidget {
  const RestaurantDetailScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<RestaurantDetailScreen> createState() => _RestaurantDetailScreenState();
}

class _RestaurantDetailScreenState extends ConsumerState<RestaurantDetailScreen> {
  final Map<String, int> _cart = {};

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final restaurant = ref.watch(restaurantProvider(widget.id));
    return AsyncView(
      value: restaurant,
      onRetry: () => ref.invalidate(restaurantProvider(widget.id)),
      builder: (r) {
        final menu = (r.menu ?? const <MenuItemResponse>[]).where((m) => m.isAvailable).toList();
        final total = menu.fold<num>(0, (sum, m) => sum + m.pricePaise * (_cart[m.id] ?? 0));
        final byCategory = <String, List<MenuItemResponse>>{};
        for (final m in menu) {
          byCategory.putIfAbsent(m.category, () => []).add(m);
        }
        return Scaffold(
          appBar: AppBar(title: Text(r.name)),
          body: ListView(
            padding: const EdgeInsets.only(bottom: 120),
            children: [
              for (final entry in byCategory.entries) ...[
                SectionTitle(entry.key),
                for (final m in entry.value)
                  ListTile(
                    title: Text(m.name),
                    subtitle: Text(formatRupees(m.pricePaise, locale: context.lang)),
                    trailing: _Qty(
                      value: _cart[m.id] ?? 0,
                      onChanged: r.acceptsOrders
                          ? (v) => setState(() => v == 0 ? _cart.remove(m.id) : _cart[m.id] = v)
                          : null,
                    ),
                  ),
              ],
              ReviewsSection(targetType: 'restaurant', targetId: r.id),
            ],
          ),
          bottomNavigationBar: _cart.isEmpty
              ? null
              : SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: FilledButton(
                      onPressed: () => placeOrder(
                        context,
                        ref,
                        CreateOrderDto(
                          type: 'food',
                          food: FoodOrderDto(
                            restaurantId: r.id,
                            mode: 'pickup',
                            items: [
                              for (final e in _cart.entries)
                                FoodLineDto(menuItemId: e.key, quantity: e.value),
                            ],
                          ),
                        ),
                        description: r.name,
                      ),
                      child: Text(l.payNow(formatRupees(total, locale: context.lang))),
                    ),
                  ),
                ),
        );
      },
    );
  }
}

class _Qty extends StatelessWidget {
  const _Qty({required this.value, required this.onChanged});

  final int value;
  final ValueChanged<int>? onChanged;

  @override
  Widget build(BuildContext context) {
    final change = onChanged;
    if (value == 0) {
      return OutlinedButton(
        onPressed: change == null ? null : () => change(1),
        child: Text(context.l10n.addToOrder),
      );
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          icon: const Icon(Icons.remove_circle_outline),
          onPressed: change == null ? null : () => change(value - 1),
        ),
        Text('$value'),
        IconButton(
          icon: const Icon(Icons.add_circle_outline),
          onPressed: change == null || value >= 20 ? null : () => change(value + 1),
        ),
      ],
    );
  }
}
