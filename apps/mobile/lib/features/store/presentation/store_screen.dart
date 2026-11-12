import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../../l10n/app_localizations.dart';
import '../data/store_repository.dart';

const _cream = Color(0xFFFFFBF3);

String storeCategoryLabel(AppLocalizations l, String key) => switch (key) {
  'pooja_thali' => l.stCatThali,
  'diya_dhoop' => l.stCatDiya,
  'garland' => l.stCatGarland,
  'prasad' => l.stCatPrasad,
  'poshak' => l.stCatPoshak,
  'tilak_mala' => l.stCatTilak,
  'idols' => l.stCatIdols,
  'books' => l.stCatBooks,
  _ => l.stCatOther,
};

IconData storeCategoryIcon(String key) => switch (key) {
  'pooja_thali' => Icons.brightness_7_rounded,
  'diya_dhoop' => Icons.local_fire_department_rounded,
  'garland' => Icons.local_florist_rounded,
  'prasad' => Icons.cookie_rounded,
  'poshak' => Icons.checkroom_rounded,
  'tilak_mala' => Icons.spa_rounded,
  'idols' => Icons.temple_hindu_rounded,
  'books' => Icons.menu_book_rounded,
  _ => Icons.category_rounded,
};

/// Temple Store: products listed by approved store vendors; one store per cart.
class StoreScreen extends ConsumerStatefulWidget {
  const StoreScreen({super.key});

  @override
  ConsumerState<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends ConsumerState<StoreScreen> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final products = ref.watch(storeProductsProvider);
    final categories = ref.watch(storeCategoriesProvider).value ?? const [];
    final selected = ref.watch(storeCategoryProvider);
    final cart = ref.watch(cartProvider);
    return Scaffold(
      backgroundColor: _cream,
      body: RefreshIndicator(
        onRefresh: () async {
          ref
            ..invalidate(storeProductsProvider)
            ..invalidate(storeCategoriesProvider);
          await ref.read(storeProductsProvider.future);
        },
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              expandedHeight: 230,
              backgroundColor: TnColors.navy,
              foregroundColor: Colors.white,
              title: Text(l.poojaItems),
              actions: [_CartButton(count: cart.count)],
              flexibleSpace: FlexibleSpaceBar(
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.asset('assets/images/canva/hero-store.jpg', fit: BoxFit.cover),
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Color(0x991C3C6B), Color(0x220C1A30), Color(0xE60C1A30)],
                        ),
                      ),
                    ),
                    Positioned(
                      left: 16,
                      right: 16,
                      bottom: 16,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l.stHeroTitle,
                            style: const TextStyle(
                              fontFamily: 'Cormorant',
                              color: Colors.white,
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              height: 1.05,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            l.stHeroSub,
                            style: const TextStyle(color: Colors.white70, fontSize: 12.5),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 6),
                child: TextField(
                  onChanged: (v) => setState(() => _q = v.trim().toLowerCase()),
                  decoration: InputDecoration(
                    hintText: l.stSearch,
                    prefixIcon: const Icon(Icons.search_rounded),
                    filled: true,
                    fillColor: Colors.white,
                    isDense: true,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(28),
                      borderSide: const BorderSide(color: TnColors.line),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(28),
                      borderSide: const BorderSide(color: TnColors.line),
                    ),
                  ),
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 46,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                  children: [
                    _CatChip(
                      label: l.poojaAll,
                      icon: Icons.apps_rounded,
                      selected: selected == null,
                      onTap: () => ref.read(storeCategoryProvider.notifier).set(null),
                    ),
                    for (final c in categories)
                      _CatChip(
                        label: storeCategoryLabel(l, c.key),
                        icon: storeCategoryIcon(c.key),
                        selected: selected == c.key,
                        onTap: () => ref.read(storeCategoryProvider.notifier).set(c.key),
                      ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 6, 16, 2),
                child: Row(
                  children: [
                    const Icon(Icons.verified_rounded, size: 16, color: Color(0xFF2F9E44)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        l.stTrust,
                        style: const TextStyle(fontSize: 12, color: TnColors.muted),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            products.when(
              loading: () =>
                  const SliverFillRemaining(child: Center(child: CircularProgressIndicator())),
              error: (e, _) => SliverFillRemaining(
                child: ErrorPanel(error: e, onRetry: () => ref.invalidate(storeProductsProvider)),
              ),
              data: (list) {
                final shown = _q.isEmpty
                    ? list
                    : list.where((p) => p.name.toLowerCase().contains(_q)).toList();
                if (shown.isEmpty) {
                  return SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(icon: Icons.storefront_rounded, message: l.stEmpty),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 120),
                  sliver: SliverGrid.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 0.6,
                    ),
                    itemCount: shown.length,
                    itemBuilder: (_, i) => _ProductCard(product: shown[i]),
                  ),
                );
              },
            ),
          ],
        ),
      ),
      bottomNavigationBar: cart.isEmpty ? null : _CartBar(cart: cart),
    );
  }
}

class _CartButton extends StatelessWidget {
  const _CartButton({required this.count});
  final int count;

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: context.l10n.stCart,
    onPressed: () => context.push('/store/cart'),
    icon: Badge(
      isLabelVisible: count > 0,
      label: Text('$count'),
      backgroundColor: TnColors.saffron,
      child: const Icon(Icons.shopping_bag_outlined),
    ),
  );
}

class _CatChip extends StatelessWidget {
  const _CatChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(right: 8),
    child: Material(
      color: selected ? TnColors.navy : Colors.white,
      shape: StadiumBorder(side: BorderSide(color: selected ? TnColors.navy : TnColors.line)),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          child: Row(
            children: [
              Icon(icon, size: 17, color: selected ? Colors.white : TnColors.saffron),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                  color: selected ? Colors.white : TnColors.ink,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

/// Adds to the cart; offers to start a new cart when the item is from another store.
Future<void> addToCart(BuildContext context, WidgetRef ref, ProductResponse p) async {
  final l = context.l10n;
  final r = ref.read(cartProvider.notifier).add(p);
  if (r == AddResult.outOfStock) {
    showSnack(context, l.stOnlyLeft(p.stock.toInt()));
  } else if (r == AddResult.otherStore) {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(l.stReplaceTitle),
        content: Text(l.stReplaceBody(ref.read(cartProvider).vendorName ?? '', p.vendorName)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: Text(l.cancel)),
          FilledButton(onPressed: () => Navigator.pop(c, true), child: Text(l.stReplaceOk)),
        ],
      ),
    );
    if (ok ?? false) ref.read(cartProvider.notifier).add(p, replace: true);
  }
}

class _ProductCard extends ConsumerWidget {
  const _ProductCard({required this.product});
  final ProductResponse product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = product;
    final qty = ref.watch(cartProvider.select((c) => c.qty(p.id)));
    final off = p.mrpPaise != null && p.mrpPaise! > p.pricePaise
        ? ((1 - p.pricePaise / p.mrpPaise!) * 100).round()
        : 0;
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      clipBehavior: Clip.antiAlias,
      elevation: 0,
      child: InkWell(
        onTap: () => showProductSheet(context, p),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: TnColors.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    _ProductImage(urls: p.imageUrls),
                    if (off > 0)
                      Positioned(
                        left: 8,
                        top: 8,
                        child: _Pill(text: l.stOff(off), color: const Color(0xFF2F9E44)),
                      ),
                    if (p.stock > 0 && p.stock <= 5)
                      Positioned(
                        right: 8,
                        top: 8,
                        child: _Pill(text: l.stOnlyLeft(p.stock.toInt()), color: TnColors.sos),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      p.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 13.5,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(Icons.storefront_rounded, size: 12, color: TnColors.muted),
                        const SizedBox(width: 3),
                        Expanded(
                          child: Text(
                            p.vendorName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 11, color: TnColors.muted),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                formatRupees(p.displayPricePaise),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  fontSize: 15.5,
                                  color: TnColors.navy,
                                ),
                              ),
                              Text(
                                l.stInclTax,
                                style: const TextStyle(fontSize: 9.5, color: TnColors.muted),
                              ),
                            ],
                          ),
                        ),
                        if (p.stock <= 0)
                          Text(
                            l.stSoldOut,
                            style: const TextStyle(
                              color: TnColors.sos,
                              fontWeight: FontWeight.w700,
                            ),
                          )
                        else if (qty == 0)
                          SizedBox(
                            height: 34,
                            child: FilledButton(
                              style: FilledButton.styleFrom(
                                backgroundColor: TnColors.saffron,
                                padding: const EdgeInsets.symmetric(horizontal: 14),
                              ),
                              onPressed: () => addToCart(context, ref, p),
                              child: Text(
                                l.stAdd,
                                style: const TextStyle(fontWeight: FontWeight.w800),
                              ),
                            ),
                          )
                        else
                          QtyStepper(
                            qty: qty,
                            onMinus: () => ref.read(cartProvider.notifier).decrement(p.id),
                            onPlus: () => addToCart(context, ref, p),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text, required this.color});
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
    decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(8)),
    child: Text(
      text,
      style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.w800),
    ),
  );
}

class _ProductImage extends StatelessWidget {
  const _ProductImage({required this.urls});
  final List<String> urls;

  @override
  Widget build(BuildContext context) => urls.isEmpty
      ? const ColoredBox(
          color: TnColors.paper2,
          child: Icon(Icons.image_outlined, color: TnColors.muted, size: 40),
        )
      : Image.network(
          urls.first,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => const ColoredBox(color: TnColors.paper2),
        );
}

class QtyStepper extends StatelessWidget {
  const QtyStepper({required this.qty, required this.onMinus, required this.onPlus, super.key});
  final int qty;
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  @override
  Widget build(BuildContext context) => Container(
    height: 34,
    decoration: BoxDecoration(color: TnColors.navy, borderRadius: BorderRadius.circular(18)),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          visualDensity: VisualDensity.compact,
          iconSize: 18,
          color: Colors.white,
          onPressed: onMinus,
          icon: const Icon(Icons.remove_rounded),
        ),
        Text(
          '$qty',
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
        ),
        IconButton(
          visualDensity: VisualDensity.compact,
          iconSize: 18,
          color: Colors.white,
          onPressed: onPlus,
          icon: const Icon(Icons.add_rounded),
        ),
      ],
    ),
  );
}

class _CartBar extends StatelessWidget {
  const _CartBar({required this.cart});
  final CartState cart;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 6, 12, 10),
        child: Material(
          color: TnColors.navy,
          borderRadius: BorderRadius.circular(20),
          child: InkWell(
            borderRadius: BorderRadius.circular(20),
            onTap: () => context.push('/store/cart'),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              child: Row(
                children: [
                  const Icon(Icons.shopping_bag_rounded, color: Colors.white),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l.stItems(cart.count),
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        Text(
                          formatRupees(cart.displayPaise),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    l.stViewCart,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                  ),
                  const Icon(Icons.chevron_right_rounded, color: Colors.white),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

Future<void> showProductSheet(BuildContext context, ProductResponse p) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _cream,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      builder: (_) => _ProductSheet(product: p),
    );

class _ProductSheet extends ConsumerWidget {
  const _ProductSheet({required this.product});
  final ProductResponse product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = product;
    final qty = ref.watch(cartProvider.select((c) => c.qty(p.id)));
    final tax = p.displayPricePaise - p.pricePaise;
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.82,
      maxChildSize: 0.95,
      builder: (_, sc) => ListView(
        controller: sc,
        padding: EdgeInsets.zero,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(26)),
            child: SizedBox(height: 300, child: _ProductImage(urls: p.imageUrls)),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(storeCategoryIcon(p.category), size: 16, color: TnColors.saffron),
                    const SizedBox(width: 6),
                    Text(
                      storeCategoryLabel(l, p.category),
                      style: const TextStyle(
                        color: TnColors.saffron,
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  p.name,
                  style: const TextStyle(
                    fontFamily: 'Cormorant',
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: TnColors.ink,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.storefront_rounded, size: 15, color: TnColors.muted),
                    const SizedBox(width: 4),
                    Text(p.vendorName, style: const TextStyle(color: TnColors.muted)),
                    const Spacer(),
                    if (p.soldCount > 0)
                      Text(
                        l.stSold(p.soldCount.toInt()),
                        style: const TextStyle(color: TnColors.muted, fontSize: 12),
                      ),
                  ],
                ),
                if (p.description != null) ...[
                  const SizedBox(height: 12),
                  Text(p.description!, style: const TextStyle(height: 1.45)),
                ],
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: TnColors.line),
                  ),
                  child: Column(
                    children: [
                      _Row(l.stPrice, formatRupees(p.pricePaise)),
                      _Row(l.stTaxAndFee, formatRupees(tax)),
                      const Divider(height: 18),
                      _Row(l.stYouPay, formatRupees(p.displayPricePaise), bold: true),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                if (p.stock <= 0)
                  Center(
                    child: Text(
                      l.stSoldOut,
                      style: const TextStyle(color: TnColors.sos, fontWeight: FontWeight.w800),
                    ),
                  )
                else
                  Row(
                    children: [
                      if (qty > 0)
                        QtyStepper(
                          qty: qty,
                          onMinus: () => ref.read(cartProvider.notifier).decrement(p.id),
                          onPlus: () => addToCart(context, ref, p),
                        ),
                      if (qty > 0) const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton.icon(
                          style: FilledButton.styleFrom(
                            minimumSize: const Size.fromHeight(50),
                            backgroundColor: qty > 0 ? TnColors.navy : TnColors.saffron,
                          ),
                          onPressed: () {
                            if (qty > 0) {
                              Navigator.pop(context);
                              context.push('/store/cart');
                            } else {
                              addToCart(context, ref, p);
                            }
                          },
                          icon: Icon(
                            qty > 0 ? Icons.shopping_bag_rounded : Icons.add_shopping_cart_rounded,
                          ),
                          label: Text(qty > 0 ? l.stViewCart : l.stAddToCart),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value, {this.bold = false});
  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w500),
          ),
        ),
        Text(value, style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w600)),
      ],
    ),
  );
}
