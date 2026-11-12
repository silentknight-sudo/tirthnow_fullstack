import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_models.dart';
import '../../core/format/formatters.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../shared/partner_ui.dart';
import '../vendor/data/vendor_repository.dart';

final analyticsDaysProvider = NotifierProvider<_Days, int>(_Days.new);

class _Days extends Notifier<int> {
  @override
  int build() => 30;

  void set(int d) => state = d;
}

final analyticsProvider = FutureProvider.family<VendorAnalyticsResponse, String>((ref, id) {
  final days = ref.watch(analyticsDaysProvider);
  return ref.watch(vendorRepositoryProvider).analytics(id, days);
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({required this.vendor, required this.onOpenTab, super.key});

  final VendorResponse vendor;
  final ValueChanged<int> onOpenTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final days = ref.watch(analyticsDaysProvider);
    final data = ref.watch(analyticsProvider(vendor.id));
    final svc = serviceFor(vendor.type);
    return RefreshIndicator(
      onRefresh: () => ref.refresh(analyticsProvider(vendor.id).future),
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: _Header(vendor: vendor, service: svc),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
              child: SegmentedButton<int>(
                segments: [
                  ButtonSegment(value: 7, label: Text(l.days7)),
                  ButtonSegment(value: 30, label: Text(l.days30)),
                  ButtonSegment(value: 90, label: Text(l.days90)),
                ],
                selected: {days},
                showSelectedIcon: false,
                onSelectionChanged: (s) => ref.read(analyticsDaysProvider.notifier).set(s.first),
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            sliver: SliverToBoxAdapter(
              child: AsyncView(
                value: data,
                onRetry: () => ref.invalidate(analyticsProvider(vendor.id)),
                builder: (a) => _Body(a: a, onOpenTab: onOpenTab),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.vendor, required this.service});

  final VendorResponse vendor;
  final Service service;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [TnColors.night, TnColors.navy],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
      ),
      padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 16, 20, 22),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l.hello(vendor.displayName),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(service.icon, size: 16, color: TnColors.accentSoft),
                    const SizedBox(width: 6),
                    Text(service.title(l), style: const TextStyle(color: TnColors.accentSoft)),
                    const SizedBox(width: 10),
                    const Icon(Icons.circle, size: 8, color: Color(0xFF6BD36B)),
                    const SizedBox(width: 4),
                    Text(
                      l.live,
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 12.5),
                    ),
                  ],
                ),
              ],
            ),
          ),
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.asset(service.image, width: 72, height: 56, fit: BoxFit.cover),
          ),
        ],
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.a, required this.onOpenTab});

  final VendorAnalyticsResponse a;
  final ValueChanged<int> onOpenTab;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final lang = context.lang;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Earnings hero.
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFFE07A2E), Color(0xFFC9692A)]),
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(l.earnings, style: const TextStyle(color: Colors.white70)),
              const SizedBox(height: 4),
              Text(
                formatRupees(a.earningsPaise, locale: lang),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 34,
                  fontWeight: FontWeight.w800,
                  fontFeatures: liningFigures,
                ),
              ),
              const SizedBox(height: 6),
              Text(l.earningsNote, style: const TextStyle(color: Colors.white70, fontSize: 11.5)),
            ],
          ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.9,
          children: [
            _Stat(
              icon: Icons.receipt_long_rounded,
              label: l.statOrders,
              value: '${a.ordersCount}',
              onTap: () => onOpenTab(1),
            ),
            _Stat(
              icon: Icons.trending_up_rounded,
              label: l.statGross,
              value: formatRupees(a.grossPaise, locale: lang),
            ),
            _Stat(
              icon: Icons.shopping_bag_outlined,
              label: l.statAvg,
              value: formatRupees(a.avgOrderPaise, locale: lang),
            ),
            _Stat(
              icon: Icons.local_offer_outlined,
              label: l.statDiscounts,
              value: formatRupees(a.discountsPaise, locale: lang),
            ),
          ],
        ),
        const SizedBox(height: 18),
        SectionTitle(l.salesTrend),
        PanelCard(
          child: SizedBox(height: 150, child: _Bars(days: a.daily)),
        ),
        const SizedBox(height: 18),
        SectionTitle(l.ratings),
        _RatingCard(a: a),
        if (a.topItems.isNotEmpty) ...[
          const SizedBox(height: 18),
          SectionTitle(l.topItems),
          PanelCard(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: [
                for (final (i, t) in a.topItems.take(5).indexed)
                  ListTile(
                    dense: true,
                    leading: CircleAvatar(
                      radius: 14,
                      backgroundColor: const Color(0xFFFFF1E4),
                      child: Text(
                        '${i + 1}',
                        style: const TextStyle(color: TnColors.accent, fontWeight: FontWeight.w700),
                      ),
                    ),
                    title: Text(t.name),
                    subtitle: Text('× ${t.quantity}'),
                    trailing: Text(
                      formatRupees(t.salesPaise, locale: lang),
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.icon, required this.label, required this.value, this.onTap});

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => PanelCard(
    onTap: onTap,
    padding: const EdgeInsets.all(12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Row(
          children: [
            Icon(icon, size: 16, color: TnColors.accent),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                label,
                style: const TextStyle(color: TnColors.muted, fontSize: 12),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            fontFeatures: liningFigures,
          ),
        ),
      ],
    ),
  );
}

/// Simple daily earnings bars (last 30 points at most).
class _Bars extends StatelessWidget {
  const _Bars({required this.days});

  final List<DailySalesResponse> days;

  @override
  Widget build(BuildContext context) {
    final pts = days.length > 30 ? days.sublist(days.length - 30) : days;
    if (pts.isEmpty) {
      return EmptyState(icon: Icons.bar_chart_rounded, message: context.l10n.emptyList);
    }
    final maxV = pts.map((d) => d.earningsPaise).fold<num>(0, math.max);
    return Column(
      children: [
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              for (final d in pts)
                Expanded(
                  child: Tooltip(
                    message: '${d.date}: ${formatRupees(d.earningsPaise)} · ${d.orders}',
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 1.5),
                      height: maxV == 0 ? 3 : math.max(3, 120 * d.earningsPaise / maxV).toDouble(),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [TnColors.accentSoft, TnColors.saffron],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              pts.first.date.substring(5),
              style: const TextStyle(fontSize: 11, color: TnColors.muted),
            ),
            Text(
              pts.last.date.substring(5),
              style: const TextStyle(fontSize: 11, color: TnColors.muted),
            ),
          ],
        ),
      ],
    );
  }
}

class _RatingCard extends StatelessWidget {
  const _RatingCard({required this.a});

  final VendorAnalyticsResponse a;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final total = a.ratingCount == 0 ? 1 : a.ratingCount;
    return PanelCard(
      child: Row(
        children: [
          Column(
            children: [
              Text(
                a.ratingAverage.toStringAsFixed(1),
                style: const TextStyle(
                  fontSize: 38,
                  fontWeight: FontWeight.w800,
                  color: TnColors.navy,
                  fontFeatures: liningFigures,
                ),
              ),
              Row(
                children: [
                  for (var i = 1; i <= 5; i++)
                    Icon(
                      i <= a.ratingAverage.round()
                          ? Icons.star_rounded
                          : Icons.star_outline_rounded,
                      size: 16,
                      color: const Color(0xFFF2A93B),
                    ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                l.ratingCount('${a.ratingCount}'),
                style: const TextStyle(fontSize: 12, color: TnColors.muted),
              ),
            ],
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(
              children: [
                for (var s = 5; s >= 1; s--)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Row(
                      children: [
                        Text('$s', style: const TextStyle(fontSize: 12)),
                        const SizedBox(width: 6),
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: ((a.ratingDistribution['$s'] as num?) ?? 0) / total,
                              minHeight: 7,
                              backgroundColor: TnColors.paper2,
                              color: const Color(0xFFF2A93B),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
