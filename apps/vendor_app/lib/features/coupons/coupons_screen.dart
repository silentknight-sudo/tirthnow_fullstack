import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_models.dart';
import '../../core/format/formatters.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../shared/partner_ui.dart';
import '../vendor/data/vendor_repository.dart';

final _couponsProvider = FutureProvider.family<List<CouponResponse>, String>(
  (ref, id) => ref.watch(vendorRepositoryProvider).coupons(id),
);

class CouponsScreen extends ConsumerWidget {
  const CouponsScreen({required this.vendorId, super.key});

  final String vendorId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.coupons)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _couponForm(context, ref, vendorId),
        icon: const Icon(Icons.add),
        label: Text(l.addCoupon),
      ),
      body: AsyncView(
        value: ref.watch(_couponsProvider(vendorId)),
        onRetry: () => ref.invalidate(_couponsProvider(vendorId)),
        builder: (list) => list.isEmpty
            ? EmptyState(icon: Icons.local_offer_outlined, message: l.couponsSub)
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                itemCount: list.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (_, i) => _CouponCard(vendorId: vendorId, c: list[i]),
              ),
      ),
    );
  }
}

class _CouponCard extends ConsumerWidget {
  const _CouponCard({required this.vendorId, required this.c});

  final String vendorId;
  final CouponResponse c;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final off = c.kind == 'percent'
        ? '${c.percentBps / 100}% OFF'
        : '${formatRupees(c.flatPaise)} OFF';
    final ends = c.endsAt == null ? null : DateTime.tryParse(c.endsAt!);
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: c.isActive
              ? const [Color(0xFF1C3C6B), Color(0xFF0C1A30)]
              : const [Color(0xFF8A93A3), Color(0xFF6B7385)],
        ),
        borderRadius: BorderRadius.circular(18),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  off,
                  style: const TextStyle(
                    color: TnColors.accentSoft,
                    fontWeight: FontWeight.w800,
                    fontSize: 20,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.white54),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    c.code,
                    style: const TextStyle(
                      color: Colors.white,
                      letterSpacing: 2,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  [
                    if (c.minOrderPaise > 0) '${l.minOrder}: ${formatRupees(c.minOrderPaise)}',
                    l.used('${c.usedCount}${c.usageLimit == null ? '' : '/${c.usageLimit}'}'),
                    if (ends != null) '→ ${formatIstDate(ends, locale: context.lang)}',
                  ].join(' · '),
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          Column(
            children: [
              Switch(
                value: c.isActive,
                onChanged: (on) async {
                  try {
                    await ref.read(vendorRepositoryProvider).saveCoupon(vendorId, {
                      'isActive': on,
                    }, couponId: c.id);
                    ref.invalidate(_couponsProvider(vendorId));
                  } on Object catch (e) {
                    if (context.mounted) showSnack(context, errorText(context, e));
                  }
                },
              ),
              Text(l.active, style: const TextStyle(color: Colors.white70, fontSize: 11)),
            ],
          ),
        ],
      ),
    );
  }
}

Future<void> _couponForm(BuildContext context, WidgetRef ref, String vid) {
  final l = context.l10n;
  final form = GlobalKey<FormState>();
  final code = TextEditingController();
  final value = TextEditingController();
  final minOrder = TextEditingController(text: '0');
  final maxDisc = TextEditingController();
  final limit = TextEditingController();
  final days = TextEditingController();
  var kind = 'percent';
  return showFormSheet<void>(
    context,
    l.addCoupon,
    StatefulBuilder(
      builder: (context, setState) => Form(
        key: form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: code,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(labelText: l.couponCode),
              validator: (v) => RegExp(r'^[A-Z0-9]{4,16}$').hasMatch((v ?? '').trim().toUpperCase())
                  ? null
                  : l.invalidValue,
            ),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              segments: [
                ButtonSegment(
                  value: 'percent',
                  label: Text(l.percentOff),
                  icon: const Icon(Icons.percent_rounded),
                ),
                ButtonSegment(
                  value: 'flat',
                  label: Text(l.flatOff),
                  icon: const Icon(Icons.currency_rupee_rounded),
                ),
              ],
              selected: {kind},
              onSelectionChanged: (s) => setState(() => kind = s.first),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: value,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: '${l.discountValue} (${kind == 'percent' ? '%' : '₹'})',
              ),
              validator: (v) {
                final n = double.tryParse((v ?? '').trim());
                if (n == null) return l.required;
                return kind == 'percent'
                    ? (n < 1 || n > 90 ? l.invalidValue : null)
                    : (n < 1 ? l.invalidValue : null);
              },
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: minOrder,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: l.minOrder),
                    validator: (v) => toPaise(v ?? '') == null ? l.invalidValue : null,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: maxDisc,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: l.maxDiscount),
                    validator: (v) => rupeesField(l, v, optional: true),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: limit,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: l.usageLimit),
                    validator: (v) => intField(l, v, min: 1, max: 1000000, optional: true),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: days,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: l.validDays),
                    validator: (v) => intField(l, v, min: 1, max: 365, optional: true),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () {
                if (!form.currentState!.validate()) return;
                final n = double.parse(value.text.trim());
                final d = int.tryParse(days.text.trim());
                final body = <String, dynamic>{
                  'code': code.text.trim().toUpperCase(),
                  'kind': kind,
                  if (kind == 'percent')
                    'percentBps': (n * 100).round()
                  else
                    'flatPaise': (n * 100).round(),
                  'minOrderPaise': toPaise(minOrder.text) ?? 0,
                  'maxDiscountPaise': ?toPaise(maxDisc.text),
                  'usageLimit': ?int.tryParse(limit.text.trim()),
                  if (d != null)
                    'endsAt': DateTime.now().toUtc().add(Duration(days: d)).toIso8601String(),
                  'isActive': true,
                };
                () async {
                  try {
                    await ref.read(vendorRepositoryProvider).saveCoupon(vid, body);
                    ref.invalidate(_couponsProvider(vid));
                    if (context.mounted) Navigator.pop(context);
                  } on Object catch (e) {
                    if (context.mounted) showSnack(context, errorText(context, e));
                  }
                }();
              },
              child: Text(l.save),
            ),
          ],
        ),
      ),
    ),
  );
}
