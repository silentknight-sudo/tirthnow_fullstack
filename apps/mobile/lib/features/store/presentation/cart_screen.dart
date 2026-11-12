import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../auth/data/session_controller.dart';
import '../../bookings/presentation/checkout_flow.dart';
import '../data/store_repository.dart';
import 'store_screen.dart' show QtyStepper;

/// Cart and checkout: delivery or pickup, coupon, and the full bill
/// (items, coupon, 18 % GST, 5 % platform charge) priced by the API.
class CartScreen extends ConsumerStatefulWidget {
  const CartScreen({super.key});

  @override
  ConsumerState<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends ConsumerState<CartScreen> {
  final _form = GlobalKey<FormState>();
  final _coupon = TextEditingController();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _line1 = TextEditingController();
  final _city = TextEditingController(text: 'Vrindavan');
  final _pin = TextEditingController();
  final _notes = TextEditingController();
  String _mode = 'delivery';
  String? _applied;
  PriceQuoteResponse? _quote;
  int? _quotedBase;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final user = ref.read(sessionProvider).user;
    _name.text = user?.displayName ?? '';
    final phone = user?.phoneE164 ?? '';
    _phone.text = phone.startsWith('+91') ? phone.substring(3) : phone;
  }

  @override
  void dispose() {
    for (final c in [_coupon, _name, _phone, _line1, _city, _pin, _notes]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _refreshQuote(CartState cart, {String? code}) async {
    if (cart.vendorId == null) return;
    try {
      final q = await ref
          .read(storeRepositoryProvider)
          .quote(cart.vendorId!, cart.basePaise, couponCode: code ?? _applied);
      if (!mounted) return;
      setState(() {
        _quote = q;
        _quotedBase = cart.basePaise;
        if (code != null) _applied = q.couponError == null ? code : null;
      });
      if (code != null && q.couponError != null) showSnack(context, q.couponError!);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  Future<void> _place(CartState cart) async {
    if (_mode == 'delivery' && !(_form.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    final dto = CreateOrderDto(
      type: 'product',
      couponCode: _applied,
      product: ProductOrderDto(
        mode: _mode,
        items: [
          for (final l in cart.lines.values)
            ProductLineInputDto(productId: l.$1.id, quantity: l.$2),
        ],
        address: _mode == 'delivery'
            ? DeliveryAddressDto(
                name: _name.text.trim(),
                phoneE164: '+91${_phone.text.trim()}',
                line1: _line1.text.trim(),
                city: _city.text.trim(),
                pincode: _pin.text.trim(),
              )
            : null,
        notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
      ),
    );
    await placeOrder(context, ref, dto, description: cart.vendorName);
    if (!mounted) return;
    setState(() => _busy = false);
    ref
      ..read(cartProvider.notifier).clear()
      ..invalidate(storeProductsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final cart = ref.watch(cartProvider);
    if (cart.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(l.stCart)),
        body: EmptyState(icon: Icons.shopping_bag_outlined, message: l.stCartEmpty),
      );
    }
    if (_quotedBase != cart.basePaise) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _refreshQuote(cart));
    }
    final q = _quote;
    InputDecoration deco(String label, {String? prefix}) => InputDecoration(
      labelText: label,
      prefixText: prefix,
      isDense: true,
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
    );
    return Scaffold(
      backgroundColor: const Color(0xFFFFFBF3),
      appBar: AppBar(title: Text(l.stCart)),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(14, 8, 14, 24),
          children: [
            Row(
              children: [
                const Icon(Icons.storefront_rounded, color: TnColors.saffron),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    cart.vendorName ?? '',
                    style: const TextStyle(
                      fontFamily: 'Cormorant',
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            _Card(
              child: Column(
                children: [
                  for (final line in cart.lines.values)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(10),
                            child: SizedBox(
                              width: 52,
                              height: 52,
                              child: line.$1.imageUrls.isEmpty
                                  ? const ColoredBox(color: TnColors.paper2)
                                  : Image.network(line.$1.imageUrls.first, fit: BoxFit.cover),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  line.$1.name,
                                  maxLines: 2,
                                  style: const TextStyle(fontWeight: FontWeight.w700),
                                ),
                                Text(
                                  formatRupees(line.$1.pricePaise * line.$2),
                                  style: const TextStyle(color: TnColors.muted, fontSize: 12.5),
                                ),
                              ],
                            ),
                          ),
                          QtyStepper(
                            qty: line.$2,
                            onMinus: () => ref.read(cartProvider.notifier).decrement(line.$1.id),
                            onPlus: () => ref.read(cartProvider.notifier).add(line.$1),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Text(l.stHowGet, style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: [
                ButtonSegment(
                  value: 'delivery',
                  icon: const Icon(Icons.local_shipping_outlined),
                  label: Text(l.stDelivery),
                ),
                ButtonSegment(
                  value: 'pickup',
                  icon: const Icon(Icons.storefront_outlined),
                  label: Text(l.stPickup),
                ),
              ],
              selected: {_mode},
              onSelectionChanged: (s) => setState(() => _mode = s.first),
            ),
            if (_mode == 'delivery') ...[
              const SizedBox(height: 12),
              _Card(
                child: Column(
                  children: [
                    TextFormField(
                      controller: _name,
                      decoration: deco(l.displayName),
                      validator: (v) => (v ?? '').trim().length < 2 ? l.enterYourName : null,
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _phone,
                      keyboardType: TextInputType.phone,
                      maxLength: 10,
                      decoration: deco(l.stPhone, prefix: '+91 ').copyWith(counterText: ''),
                      validator: (v) => RegExp(r'^[6-9]\d{9}$').hasMatch((v ?? '').trim())
                          ? null
                          : l.stPhoneInvalid,
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _line1,
                      decoration: deco(l.stAddress),
                      validator: (v) => (v ?? '').trim().length < 5 ? l.stAddressInvalid : null,
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _city,
                            decoration: deco(l.stCity),
                            validator: (v) => (v ?? '').trim().length < 2 ? l.stCity : null,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextFormField(
                            controller: _pin,
                            keyboardType: TextInputType.number,
                            maxLength: 6,
                            decoration: deco(l.stPincode).copyWith(counterText: ''),
                            validator: (v) =>
                                RegExp(r'^\d{6}$').hasMatch((v ?? '').trim()) ? null : l.stPincode,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ] else ...[
              const SizedBox(height: 10),
              Text(l.stPickupNote, style: const TextStyle(color: TnColors.muted)),
            ],
            const SizedBox(height: 10),
            TextField(
              controller: _notes,
              maxLength: 300,
              decoration: deco(l.stNotes).copyWith(counterText: ''),
            ),
            const SizedBox(height: 14),
            _Card(
              child: Row(
                children: [
                  const Icon(Icons.local_offer_outlined, color: TnColors.saffron),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _applied != null
                        ? Text(
                            l.stCouponApplied(_applied!),
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF2F9E44),
                            ),
                          )
                        : TextField(
                            controller: _coupon,
                            textCapitalization: TextCapitalization.characters,
                            decoration: InputDecoration(
                              hintText: l.stCouponHint,
                              border: InputBorder.none,
                              isDense: true,
                            ),
                          ),
                  ),
                  TextButton(
                    onPressed: () {
                      if (_applied != null) {
                        setState(() => _applied = null);
                        _refreshQuote(cart);
                      } else if (_coupon.text.trim().isNotEmpty) {
                        _refreshQuote(cart, code: _coupon.text.trim().toUpperCase());
                      }
                    },
                    child: Text(_applied != null ? l.stRemove : l.stApply),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Text(l.stBill, style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            _Card(
              child: q == null
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  : Column(
                      children: [
                        _Line(l.stItemTotal, formatRupees(q.basePaise)),
                        if (q.discountPaise > 0)
                          _Line(
                            l.stCouponDiscount,
                            '− ${formatRupees(q.discountPaise)}',
                            color: const Color(0xFF2F9E44),
                          ),
                        _Line(l.stGst, formatRupees(q.taxPaise)),
                        _Line(l.stPlatformFee, formatRupees(q.feePaise)),
                        const Divider(height: 18),
                        _Line(l.stToPay, formatRupees(q.totalPaise), bold: true),
                      ],
                    ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 6, 14, 12),
          child: FilledButton(
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(54),
              backgroundColor: TnColors.navy,
            ),
            onPressed: _busy || q == null ? null : () => _place(cart),
            child: _busy
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Text(
                    q == null
                        ? l.stPlaceOrder
                        : '${l.stPlaceOrder} · ${formatRupees(q.totalPaise)}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
          ),
        ),
      ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: TnColors.line),
    ),
    child: child,
  );
}

class _Line extends StatelessWidget {
  const _Line(this.label, this.value, {this.bold = false, this.color});
  final String label;
  final String value;
  final bool bold;
  final Color? color;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
              fontSize: bold ? 16 : 14,
            ),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            fontSize: bold ? 16 : 14,
            color: color,
          ),
        ),
      ],
    ),
  );
}

/// Route helper used by the store's cart icon.
void openCart(BuildContext context) => context.push('/store/cart');
