import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_models.dart';
import '../../core/format/formatters.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../shared/partner_ui.dart';
import '../vendor/data/vendor_repository.dart';

final vendorOrdersProvider = FutureProvider.family<List<OrderResponse>, (String, String)>(
  (ref, k) => ref.watch(vendorRepositoryProvider).orders(k.$1, status: k.$2),
);

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({required this.vendor, super.key});

  final VendorResponse vendor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final tabs = [
      ('confirmed', l.ordersPending),
      ('in_progress', l.ordersActive),
      ('completed', l.ordersDone),
      ('cancelled', l.ordersCancelled),
    ];
    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l.tabOrders),
          bottom: TabBar(isScrollable: true, tabs: [for (final t in tabs) Tab(text: t.$2)]),
        ),
        body: TabBarView(
          children: [for (final t in tabs) _OrderList(vendorId: vendor.id, status: t.$1)],
        ),
      ),
    );
  }
}

class _OrderList extends ConsumerWidget {
  const _OrderList({required this.vendorId, required this.status});

  final String vendorId;
  final String status;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final key = (vendorId, status);
    return RefreshIndicator(
      onRefresh: () => ref.refresh(vendorOrdersProvider(key).future),
      child: AsyncView(
        value: ref.watch(vendorOrdersProvider(key)),
        onRetry: () => ref.invalidate(vendorOrdersProvider(key)),
        builder: (list) => list.isEmpty
            ? ListView(
                children: [
                  const SizedBox(height: 80),
                  EmptyState(icon: Icons.inbox_outlined, message: context.l10n.emptyList),
                ],
              )
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                itemCount: list.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (_, i) => _OrderCard(vendorId: vendorId, order: list[i]),
              ),
      ),
    );
  }
}

class _OrderCard extends ConsumerStatefulWidget {
  const _OrderCard({required this.vendorId, required this.order});

  final String vendorId;
  final OrderResponse order;

  @override
  ConsumerState<_OrderCard> createState() => _OrderCardState();
}

class _OrderCardState extends ConsumerState<_OrderCard> {
  bool _busy = false;

  Future<void> _act(String action) async {
    String? reason;
    if (action == 'reject') {
      reason = await _askReason();
      if (reason == null) return;
    }
    setState(() => _busy = true);
    try {
      await ref
          .read(vendorRepositoryProvider)
          .orderAction(widget.vendorId, widget.order.id, action, reason: reason);
      for (final s in ['confirmed', 'in_progress', 'completed', 'cancelled']) {
        ref.invalidate(vendorOrdersProvider((widget.vendorId, s)));
      }
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<String?> _askReason() {
    final c = TextEditingController();
    final l = context.l10n;
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.reject),
        content: TextField(
          controller: c,
          decoration: InputDecoration(labelText: l.rejectReason),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.cancel)),
          FilledButton(
            onPressed: () => c.text.trim().length >= 3 ? Navigator.pop(ctx, c.text.trim()) : null,
            child: Text(l.reject),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final o = widget.order;
    final created = DateTime.tryParse(o.createdAt);
    final items = o.items
        .map((i) => '${i.snapshot['name'] ?? i.snapshot['title'] ?? i.itemType} × ${i.quantity}')
        .join(', ');
    final youGet = o.totalPaise - o.feePaise;
    final accepted = o.subStatus == 'accepted';
    return PanelCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(o.code, style: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.4)),
              const SizedBox(width: 8),
              Pill(o.type, color: TnColors.navy),
              const Spacer(),
              if (created != null)
                Text(
                  '${formatIstDate(created, locale: context.lang)} · ${formatIstTime(created)}',
                  style: const TextStyle(fontSize: 12, color: TnColors.muted),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(items, maxLines: 3, overflow: TextOverflow.ellipsis),
          if (o.serviceStartsAt != null) ...[
            const SizedBox(height: 4),
            Text(
              '⏱ ${formatIstDate(DateTime.parse(o.serviceStartsAt!), locale: context.lang)} ${formatIstTime(DateTime.parse(o.serviceStartsAt!))}',
              style: const TextStyle(fontSize: 12.5, color: TnColors.muted),
            ),
          ],
          const Divider(height: 20),
          Row(
            children: [
              Text(
                l.youGet(formatRupees(youGet, locale: context.lang)),
                style: const TextStyle(fontWeight: FontWeight.w700, color: TnColors.success),
              ),
              const Spacer(),
              Text(
                formatRupees(o.totalPaise, locale: context.lang),
                style: const TextStyle(color: TnColors.muted),
              ),
            ],
          ),
          if (_busy)
            const Padding(padding: EdgeInsets.only(top: 10), child: LinearProgressIndicator()),
          if (!_busy && (o.status == 'confirmed' || o.status == 'in_progress')) ...[
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (o.status == 'confirmed' && !accepted) ...[
                  OutlinedButton(onPressed: () => _act('reject'), child: Text(l.reject)),
                  const SizedBox(width: 8),
                  FilledButton(onPressed: () => _act('accept'), child: Text(l.accept)),
                ],
                if (o.status == 'confirmed' && accepted)
                  FilledButton(onPressed: () => _act('start'), child: Text(l.start)),
                if (o.status == 'in_progress')
                  FilledButton(onPressed: () => _act('complete'), child: Text(l.complete)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
