import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_models.dart';
import '../../core/format/formatters.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../dashboard/dashboard_screen.dart';
import '../shared/partner_ui.dart';

/// Revenue, orders and conversion over 7 / 30 / 90 days.
class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({required this.vendor, super.key});

  final VendorResponse vendor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final days = ref.watch(analyticsDaysProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.businessAnalytics)),
      body: AsyncView(
        value: ref.watch(analyticsProvider(vendor.id)),
        onRetry: () => ref.invalidate(analyticsProvider(vendor.id)),
        builder: (a) {
          final h = splitHalves(a.daily);
          var best = a.daily.isEmpty ? null : a.daily.first;
          for (final d in a.daily) {
            if (best == null || d.earningsPaise > best.earningsPaise) best = d;
          }
          final completed = (a.statusCounts['completed'] as num?) ?? 0;
          final conversion = a.ordersCount == 0 ? 0 : completed * 100 / a.ordersCount;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            children: [
              SegmentedButton<int>(
                segments: [
                  ButtonSegment(value: 7, label: Text(l.days7)),
                  ButtonSegment(value: 30, label: Text(l.days30)),
                  ButtonSegment(value: 90, label: Text(l.days90)),
                ],
                selected: {days},
                showSelectedIcon: false,
                onSelectionChanged: (s) => ref.read(analyticsDaysProvider.notifier).set(s.first),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: KpiTile(
                      label: l.revenue,
                      value: formatRupees(a.earningsPaise, locale: context.lang),
                      change: percentChange(h.now, h.before),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: KpiTile(
                      label: l.statOrders,
                      value: '${a.ordersCount}',
                      change: percentChange(h.ordersNow, h.ordersBefore),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              PanelCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l.salesTrend,
                      style: const TextStyle(fontWeight: FontWeight.w800, color: PColors.night),
                    ),
                    if (best != null && best.earningsPaise > 0)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          '${l.bestDay}: ${best.date} · ${formatRupees(best.earningsPaise)}',
                          style: const TextStyle(fontSize: 12, color: TnColors.muted),
                        ),
                      ),
                    const SizedBox(height: 12),
                    AreaChart(
                      values: [for (final d in a.daily) d.earningsPaise.toDouble()],
                      height: 200,
                    ),
                    if (a.daily.isNotEmpty)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            a.daily.first.date.substring(5),
                            style: const TextStyle(fontSize: 11, color: TnColors.muted),
                          ),
                          Text(
                            a.daily.last.date.substring(5),
                            style: const TextStyle(fontSize: 11, color: TnColors.muted),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: KpiTile(
                      label: l.statGross,
                      value: formatRupees(a.grossPaise, locale: context.lang),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: KpiTile(label: l.ordersDone, value: '${conversion.toStringAsFixed(1)}%'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: KpiTile(
                      label: l.aov,
                      value: formatRupees(a.avgOrderPaise, locale: context.lang),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: KpiTile(
                      label: l.statDiscounts,
                      value: formatRupees(a.discountsPaise, locale: context.lang),
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }
}
