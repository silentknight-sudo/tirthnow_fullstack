import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_models.dart';
import '../../core/format/formatters.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../shared/signature.dart';
import '../vendor/data/vendor_repository.dart';

final vendorOrdersProvider = FutureProvider.family<List<OrderResponse>, (String, String)>(
  (ref, k) => ref.watch(vendorRepositoryProvider).orders(k.$1, status: k.$2),
);

const _statuses = ['confirmed', 'in_progress', 'completed', 'cancelled'];

Color statusColor(String s) => switch (s) {
  'confirmed' => PColors.goldDeep,
  'in_progress' => const Color(0xFF4F7BF5),
  'completed' => PColors.up,
  _ => const Color(0xFF9AA0B4),
};

class OrdersScreen extends ConsumerStatefulWidget {
  const OrdersScreen({required this.vendor, super.key});

  final VendorResponse vendor;

  @override
  ConsumerState<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends ConsumerState<OrdersScreen> {
  String _status = 'confirmed';

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final vid = widget.vendor.id;
    final labels = {
      'confirmed': l.ordersPending,
      'in_progress': l.ordersActive,
      'completed': l.ordersDone,
      'cancelled': l.ordersCancelled,
    };
    final key = (vid, _status);
    return Scaffold(
      body: Column(
        children: [
          DuskHeader(
            title: l.tabOrders,
            bottom: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final s in _statuses)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: _StatusChip(
                        label: labels[s]!,
                        count: ref.watch(vendorOrdersProvider((vid, s))).value?.length,
                        color: statusColor(s),
                        selected: _status == s,
                        onTap: () => setState(() => _status = s),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(vendorOrdersProvider(key).future),
              child: AsyncView(
                value: ref.watch(vendorOrdersProvider(key)),
                onRetry: () => ref.invalidate(vendorOrdersProvider(key)),
                builder: (list) => list.isEmpty
                    ? ListView(
                        children: [
                          const SizedBox(height: 80),
                          EmptyState(icon: Icons.inbox_outlined, message: l.emptyList),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                        itemCount: list.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 14),
                        itemBuilder: (_, i) => _OrderCard(vendorId: vid, order: list[i]),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({
    required this.label,
    required this.count,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final int? count;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.fromLTRB(14, 8, 8, 8),
      decoration: BoxDecoration(
        color: selected ? Colors.white : Dusk.card,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: selected ? Colors.white : Dusk.stroke),
      ),
      child: Row(
        children: [
          Text(
            label,
            style: TextStyle(
              color: selected ? Dusk.top : Colors.white,
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
          const SizedBox(width: 6),
          Container(
            constraints: const BoxConstraints(minWidth: 22),
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: selected ? color : Dusk.stroke,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              count == null ? '·' : '$count',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    ),
  );
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
      for (final s in _statuses) {
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
    final accepted = o.subStatus == 'accepted';
    final color = statusColor(o.status);
    final step = switch (o.status) {
      'confirmed' => accepted ? 1 : 0,
      'in_progress' => 2,
      'completed' => 3,
      _ => -1,
    };
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(color: Color(0x1A232C6B), blurRadius: 18, offset: Offset(0, 8)),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(width: 6, color: color),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          o.code,
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                            color: PColors.night,
                          ),
                        ),
                        const Spacer(),
                        if (created != null)
                          Text(
                            '${formatIstDate(created, locale: context.lang)} · ${formatIstTime(created)}',
                            style: const TextStyle(fontSize: 11.5, color: TnColors.muted),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    for (final it in o.items.take(3))
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          children: [
                            Container(
                              width: 26,
                              height: 26,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: const Color(0xFFF4F2FB),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                '${it.quantity}×',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: PColors.violet,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                '${it.snapshot['name'] ?? it.snapshot['title'] ?? it.itemType}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13.5),
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (step >= 0) ...[
                      const SizedBox(height: 10),
                      _Progress(step: step, color: color),
                    ],
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF7F5FD),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                l.youGet(''),
                                style: const TextStyle(fontSize: 11, color: TnColors.muted),
                              ),
                              Text(
                                formatRupees(o.totalPaise - o.feePaise, locale: context.lang),
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  color: PColors.up,
                                  fontFeatures: liningFigures,
                                ),
                              ),
                            ],
                          ),
                          const Spacer(),
                          if (_busy)
                            const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          else if (o.status == 'confirmed' && !accepted) ...[
                            TextButton(
                              onPressed: () => _act('reject'),
                              style: TextButton.styleFrom(foregroundColor: TnColors.sos),
                              child: Text(l.reject),
                            ),
                            const SizedBox(width: 4),
                            _ActionButton(label: l.accept, onTap: () => _act('accept')),
                          ] else if (o.status == 'confirmed')
                            _ActionButton(label: l.start, onTap: () => _act('start'))
                          else if (o.status == 'in_progress')
                            _ActionButton(label: l.complete, onTap: () => _act('complete'))
                          else
                            Text(
                              formatRupees(o.totalPaise, locale: context.lang),
                              style: const TextStyle(color: TnColors.muted),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
      decoration: BoxDecoration(
        gradient: PColors.goldGradient,
        borderRadius: BorderRadius.circular(14),
        boxShadow: const [
          BoxShadow(color: Color(0x40E08A1E), blurRadius: 10, offset: Offset(0, 4)),
        ],
      ),
      child: Text(
        label,
        style: const TextStyle(color: PColors.night, fontWeight: FontWeight.w800),
      ),
    ),
  );
}

/// Placed → Accepted → Started → Done.
class _Progress extends StatelessWidget {
  const _Progress({required this.step, required this.color});

  final int step;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final labels = [l.orderPlaced, l.orderAccepted, l.orderStarted, l.orderDone];
    return Row(
      children: [
        for (var i = 0; i < 4; i++) ...[
          Column(
            children: [
              Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: i <= step ? color : Colors.white,
                  border: Border.all(color: i <= step ? color : TnColors.line, width: 2),
                ),
              ),
              const SizedBox(height: 3),
              Text(
                labels[i],
                style: TextStyle(
                  fontSize: 9.5,
                  fontWeight: i == step ? FontWeight.w800 : FontWeight.w500,
                  color: i <= step ? PColors.night : TnColors.muted,
                ),
              ),
            ],
          ),
          if (i < 3)
            Expanded(
              child: Container(
                height: 2,
                margin: const EdgeInsets.only(bottom: 14),
                color: i < step ? color : TnColors.line,
              ),
            ),
        ],
      ],
    );
  }
}
