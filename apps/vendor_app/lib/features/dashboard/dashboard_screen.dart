import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_models.dart';
import '../../core/format/formatters.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../l10n/app_localizations.dart';
import '../coupons/coupons_screen.dart';
import '../growth/analytics_screen.dart';
import '../growth/marketing_screen.dart';
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

/// Totals for the later and earlier half of the daily series, for "% vs before".
({double now, double before, int ordersNow, int ordersBefore}) splitHalves(
  List<DailySalesResponse> d,
) {
  final mid = d.length ~/ 2;
  double sum(Iterable<DailySalesResponse> x) => x.fold(0, (a, b) => a + b.earningsPaise);
  int cnt(Iterable<DailySalesResponse> x) => x.fold(0, (a, b) => a + b.orders.toInt());
  return (
    now: sum(d.skip(mid)),
    before: sum(d.take(mid)),
    ordersNow: cnt(d.skip(mid)),
    ordersBefore: cnt(d.take(mid)),
  );
}

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({required this.vendor, required this.onOpenTab, super.key});

  final VendorResponse vendor;
  final ValueChanged<int> onOpenTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(analyticsProvider(vendor.id));
    final svc = serviceFor(vendor.type);
    void open(Widget page) =>
        Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));
    return RefreshIndicator(
      onRefresh: () => ref.refresh(analyticsProvider(vendor.id).future),
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          _Header(vendor: vendor, service: svc),
          Transform.translate(
            offset: const Offset(0, -34),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: AsyncView(
                value: data,
                onRetry: () => ref.invalidate(analyticsProvider(vendor.id)),
                builder: (a) => _Body(a: a, vendor: vendor, onOpenTab: onOpenTab, open: open),
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
      decoration: const BoxDecoration(gradient: PColors.nightGradient),
      padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 16, 20, 56),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(2),
            decoration: const BoxDecoration(shape: BoxShape.circle, gradient: PColors.goldGradient),
            child: CircleAvatar(radius: 26, backgroundImage: AssetImage(service.image)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l.hello(vendor.displayName),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: [
                    _chip(service.icon, service.title(l), Colors.white),
                    if (vendor.status == 'active')
                      _chip(Icons.verified_rounded, l.live, const Color(0xFF7BE0A5)),
                  ],
                ),
              ],
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: const Padding(
              padding: EdgeInsets.all(10),
              child: Icon(Icons.notifications_none_rounded, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _chip(IconData icon, String text, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: color),
        const SizedBox(width: 4),
        Text(
          text,
          style: TextStyle(color: color, fontSize: 11.5, fontWeight: FontWeight.w600),
        ),
      ],
    ),
  );
}

class _Body extends ConsumerWidget {
  const _Body({required this.a, required this.vendor, required this.onOpenTab, required this.open});

  final VendorAnalyticsResponse a;
  final VendorResponse vendor;
  final ValueChanged<int> onOpenTab;
  final void Function(Widget) open;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final lang = context.lang;
    final days = ref.watch(analyticsDaysProvider);
    final h = splitHalves(a.daily);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Overview card floating over the header.
        PanelCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    l.overview,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                      color: PColors.night,
                    ),
                  ),
                  const Spacer(),
                  PopupMenuButton<int>(
                    initialValue: days,
                    onSelected: (d) => ref.read(analyticsDaysProvider.notifier).set(d),
                    itemBuilder: (_) => [
                      for (final d in const [7, 30, 90])
                        PopupMenuItem(value: d, child: Text(l.lastDays('$d'))),
                    ],
                    child: Row(
                      children: [
                        Text(
                          l.lastDays('$days'),
                          style: const TextStyle(color: TnColors.muted, fontSize: 12.5),
                        ),
                        const Icon(Icons.expand_more_rounded, size: 18, color: TnColors.muted),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
                childAspectRatio: 1.55,
                children: [
                  KpiTile(
                    icon: Icons.receipt_long_rounded,
                    label: l.statOrders,
                    value: '${a.ordersCount}',
                    change: percentChange(h.ordersNow, h.ordersBefore),
                    onTap: () => onOpenTab(1),
                  ),
                  KpiTile(
                    icon: Icons.currency_rupee_rounded,
                    label: l.revenue,
                    value: formatRupees(a.earningsPaise, locale: lang),
                    change: percentChange(h.now, h.before),
                  ),
                  KpiTile(
                    icon: Icons.shopping_bag_outlined,
                    label: l.aov,
                    value: formatRupees(a.avgOrderPaise, locale: lang),
                  ),
                  KpiTile(
                    icon: Icons.star_rounded,
                    label: l.rating,
                    value: a.ratingCount == 0 ? '—' : a.ratingAverage.toStringAsFixed(1),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // Quick actions.
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            Expanded(
              child: ActionTile(
                icon: Icons.add_box_rounded,
                label: l.addListing,
                onTap: () => onOpenTab(2),
              ),
            ),
            Expanded(
              child: ActionTile(
                icon: Icons.receipt_long_rounded,
                label: l.tabOrders,
                onTap: () => onOpenTab(1),
              ),
            ),
            Expanded(
              child: ActionTile(
                icon: Icons.local_offer_rounded,
                label: l.coupons,
                onTap: () => open(CouponsScreen(vendorId: vendor.id)),
              ),
            ),
            Expanded(
              child: ActionTile(
                icon: Icons.insights_rounded,
                label: l.analytics,
                onTap: () => open(AnalyticsScreen(vendor: vendor)),
              ),
            ),
            Expanded(
              child: ActionTile(
                icon: Icons.campaign_rounded,
                label: l.marketing.split(' ').first,
                onTap: () => open(MarketingScreen(vendor: vendor)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _AiTips(
          a: a,
          h: h,
          onCoupons: () => open(CouponsScreen(vendorId: vendor.id)),
        ),
        const SizedBox(height: 16),
        PanelCard(
          onTap: () => open(AnalyticsScreen(vendor: vendor)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    l.salesTrend,
                    style: const TextStyle(fontWeight: FontWeight.w800, color: PColors.night),
                  ),
                  const Spacer(),
                  const Icon(Icons.chevron_right_rounded, color: TnColors.muted),
                ],
              ),
              const SizedBox(height: 10),
              AreaChart(values: [for (final d in a.daily) d.earningsPaise.toDouble()], height: 130),
            ],
          ),
        ),
        const SizedBox(height: 16),
        _RatingCard(a: a),
        if (a.topItems.isNotEmpty) ...[
          const SizedBox(height: 16),
          PanelCard(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l.topItems,
                  style: const TextStyle(fontWeight: FontWeight.w800, color: PColors.night),
                ),
                for (final (i, t) in a.topItems.take(5).indexed)
                  ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      radius: 14,
                      backgroundColor: const Color(0xFFFFF1DA),
                      child: Text(
                        '${i + 1}',
                        style: const TextStyle(
                          color: PColors.goldDeep,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    title: Text(t.name),
                    subtitle: Text('× ${t.quantity}'),
                    trailing: Text(
                      formatRupees(t.salesPaise, locale: lang),
                      style: const TextStyle(fontWeight: FontWeight.w700),
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

/// Simple rules turned into actionable tips (no external AI needed).
List<String> businessTips(
  AppLocalizations l,
  VendorAnalyticsResponse a,
  ({double now, double before, int ordersNow, int ordersBefore}) h,
) {
  final tips = <String>[];
  final ch = percentChange(h.now, h.before);
  if (a.ordersCount == 0) {
    tips
      ..add(l.tipNoListings)
      ..add(l.tipCoupon);
  } else if (ch != null && ch >= 5) {
    tips.add(l.tipGrowth(ch.toStringAsFixed(0)));
  } else if (ch != null && ch <= -5) {
    tips.add(l.tipDown(ch.abs().toStringAsFixed(0)));
  }
  if (a.discountsPaise == 0 && !tips.contains(l.tipCoupon)) tips.add(l.tipCoupon);
  tips.add(l.tipRating);
  return tips;
}

class _AiTips extends StatelessWidget {
  const _AiTips({required this.a, required this.h, required this.onCoupons});

  final VendorAnalyticsResponse a;
  final ({double now, double before, int ordersNow, int ordersBefore}) h;
  final VoidCallback onCoupons;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final tips = businessTips(l, a, h);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF3B2F8F), Color(0xFF6A4FD8)]),
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(color: Color(0x406A4FD8), blurRadius: 18, offset: Offset(0, 8)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.16),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.auto_awesome_rounded, color: PColors.gold, size: 20),
              ),
              const SizedBox(width: 10),
              Text(
                l.aiTips,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: 15,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          for (final t in tips.take(3))
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 5),
                    child: Icon(Icons.circle, size: 6, color: PColors.gold),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      t,
                      style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.35),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: onCoupons,
              style: TextButton.styleFrom(foregroundColor: PColors.gold),
              icon: const Icon(Icons.local_offer_rounded, size: 16),
              label: Text(l.addCoupon),
            ),
          ),
        ],
      ),
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
                  color: PColors.night,
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
                      color: PColors.gold,
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
                              color: PColors.gold,
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
