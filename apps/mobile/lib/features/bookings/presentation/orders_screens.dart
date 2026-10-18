import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../data/bookings_repository.dart';
import 'checkout_flow.dart';

String orderStatusLabel(BuildContext context, String status) {
  final l = context.l10n;
  return switch (status) {
    'pending' => l.orderStatus_pending,
    'confirmed' => l.orderStatus_confirmed,
    'in_progress' => l.orderStatus_in_progress,
    'completed' => l.orderStatus_completed,
    'cancelled' => l.orderStatus_cancelled,
    'refunded' => l.orderStatus_refunded,
    _ => status,
  };
}

Color orderStatusColor(String status) => switch (status) {
  'confirmed' || 'completed' => TnColors.success,
  'pending' || 'in_progress' => TnColors.saffron,
  _ => TnColors.muted,
};

IconData orderIcon(String type) => switch (type) {
  'hotel' => Icons.bed_outlined,
  'cab' => Icons.local_taxi_outlined,
  'food' => Icons.restaurant_outlined,
  'experience' => Icons.sailing_outlined,
  _ => Icons.train_outlined,
};

String orderTitle(OrderResponse o) {
  final snap = o.items.isEmpty ? null : o.items.first.snapshot;
  final name = snap?['name'] ?? snap?['title'] ?? snap?['hotelName'] ?? snap?['restaurantName'];
  return name is String ? name : o.code;
}

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.myBookings)),
      body: AsyncView(
        value: ref.watch(ordersProvider),
        onRetry: () => ref.invalidate(ordersProvider),
        builder: (list) => list.isEmpty
            ? const EmptyState(icon: Icons.receipt_long_outlined)
            : RefreshIndicator(
                onRefresh: () async => ref.invalidate(ordersProvider),
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (_, i) {
                    final o = list[i];
                    return Card(
                      child: ListTile(
                        leading: Icon(orderIcon(o.type), color: TnColors.navy),
                        title: Text(orderTitle(o)),
                        subtitle: Text(
                          '${o.code} · ${formatRupees(o.totalPaise, locale: context.lang)}',
                        ),
                        trailing: Pill(
                          orderStatusLabel(context, o.status),
                          color: orderStatusColor(o.status),
                        ),
                        onTap: () => context.push('/book/orders/${o.id}'),
                      ),
                    );
                  },
                ),
              ),
      ),
    );
  }
}

class OrderDetailScreen extends ConsumerWidget {
  const OrderDetailScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final order = ref.watch(orderProvider(id));
    return Scaffold(
      appBar: AppBar(title: Text(order.value?.code ?? l.myBookings)),
      body: AsyncView(
        value: order,
        onRetry: () => ref.invalidate(orderProvider(id)),
        builder: (o) {
          final money = context.lang;
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(orderProvider(id)),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  children: [
                    Icon(orderIcon(o.type), color: TnColors.navy, size: 32),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(orderTitle(o), style: Theme.of(context).textTheme.titleLarge),
                    ),
                    Pill(orderStatusLabel(context, o.status), color: orderStatusColor(o.status)),
                  ],
                ),
                if (o.serviceStartsAt != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    '${formatIstDate(DateTime.parse(o.serviceStartsAt!), locale: money)} · ${formatIstTime(DateTime.parse(o.serviceStartsAt!))} IST',
                  ),
                ],
                const SizedBox(height: 16),
                Card(
                  child: Column(
                    children: [
                      for (final it in o.items)
                        ListTile(
                          dense: true,
                          title: Text(
                            '${it.itemType}${it.stayDate != null ? ' · ${it.stayDate}' : ''}',
                          ),
                          trailing: Text(
                            '${it.quantity} × ${formatRupees(it.unitPricePaise, locale: money)}',
                          ),
                        ),
                      const Divider(height: 1),
                      _Line(l.taxes, formatRupees(o.taxPaise, locale: money)),
                      if (o.feePaise > 0) _Line(l.fees, formatRupees(o.feePaise, locale: money)),
                      _Line(l.total, formatRupees(o.totalPaise, locale: money), bold: true),
                      if ((o.refundedPaise ?? 0) > 0)
                        _Line(l.refundAmount(formatRupees(o.refundedPaise!, locale: money)), ''),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                if (o.status == 'pending')
                  FilledButton(
                    onPressed: () async {
                      try {
                        final intent = await ref.read(bookingsRepositoryProvider).pay(o.id);
                        if (context.mounted) {
                          await payForOrder(context, ref, o.id, intent, description: orderTitle(o));
                        }
                      } on Object catch (e) {
                        if (context.mounted) showSnack(context, errorText(context, e));
                      }
                    },
                    child: Text(l.payNow(formatRupees(o.totalPaise, locale: money))),
                  ),
                if (o.type == 'cab' && (o.status == 'confirmed' || o.status == 'in_progress'))
                  OutlinedButton.icon(
                    icon: const Icon(Icons.my_location),
                    label: Text(l.trackRide),
                    onPressed: () => _showTracking(context, ref, o.id),
                  ),
                if (o.status == 'pending' || o.status == 'confirmed') ...[
                  const SizedBox(height: 8),
                  TextButton(
                    style: TextButton.styleFrom(foregroundColor: TnColors.sos),
                    onPressed: () => _cancel(context, ref, o),
                    child: Text(l.cancelBooking),
                  ),
                ],
                if (o.history != null && o.history!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  for (final h in o.history!)
                    ListTile(
                      dense: true,
                      leading: const Icon(Icons.circle, size: 10, color: TnColors.accent),
                      title: Text(orderStatusLabel(context, h.to)),
                      subtitle: Text(
                        '${formatIstDate(DateTime.parse(h.at), locale: money)} ${formatIstTime(DateTime.parse(h.at))}',
                      ),
                    ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _cancel(BuildContext context, WidgetRef ref, OrderResponse o) async {
    final l = context.l10n;
    final repo = ref.read(bookingsRepositoryProvider);
    try {
      final preview = await repo.cancellationPreview(o.id);
      if (!context.mounted) return;
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(l.cancelBooking),
          content: Text(
            preview.allowed
                ? l.refundAmount(formatRupees(preview.refundPaise, locale: context.lang))
                : preview.reason,
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.cancel)),
            if (preview.allowed)
              FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l.cancelBooking)),
          ],
        ),
      );
      if (ok != true) return;
      await repo.cancel(o.id, idempotencyKey: ApiClient.newIdempotencyKey());
      ref
        ..invalidate(orderProvider(o.id))
        ..invalidate(ordersProvider);
    } on Object catch (e) {
      if (context.mounted) showSnack(context, errorText(context, e));
    }
  }

  Future<void> _showTracking(BuildContext context, WidgetRef ref, String orderId) async {
    try {
      final t = await ref.read(bookingsRepositoryProvider).tracking(orderId);
      if (!context.mounted) return;
      final hasFix = t.lat != null && t.lng != null;
      await showModalBottomSheet<void>(
        useRootNavigator: true,
        context: context,
        showDragHandle: true,
        builder: (_) => Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(context.l10n.driverLocation, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              if (hasFix)
                FilledButton.icon(
                  icon: const Icon(Icons.map_outlined),
                  label: Text(context.l10n.trackRide),
                  onPressed: () => launchUrl(
                    Uri.parse('https://www.google.com/maps/search/?api=1&query=${t.lat},${t.lng}'),
                    mode: LaunchMode.externalApplication,
                  ),
                )
              else
                Text(context.l10n.loading),
            ],
          ),
        ),
      );
    } on Object catch (e) {
      if (context.mounted) showSnack(context, errorText(context, e));
    }
  }
}

class _Line extends StatelessWidget {
  const _Line(this.label, this.value, {this.bold = false});

  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(fontWeight: bold ? FontWeight.w700 : FontWeight.normal);
    return ListTile(
      dense: true,
      title: Text(label, style: style),
      trailing: Text(value, style: style),
    );
  }
}
