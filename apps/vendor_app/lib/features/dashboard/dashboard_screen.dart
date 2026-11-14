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
import '../orders/orders_screen.dart';
import '../profile/reviews_screen.dart';
import '../shared/partner_ui.dart';
import '../shared/signature.dart';
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

typedef Halves = ({double now, double before, int ordersNow, int ordersBefore});

/// Totals for the later and earlier half of the daily series, for "% vs before".
Halves splitHalves(List<DailySalesResponse> d) {
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

/// The "sandhya" dashboard: dusk gradient, mandala, arch avatar, bento tiles.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({required this.vendor, required this.onOpenTab, super.key});

  final VendorResponse vendor;
  final ValueChanged<int> onOpenTab;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(analyticsProvider(vendor.id));
    void open(Widget page) =>
        Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));
    return DecoratedBox(
      decoration: const BoxDecoration(gradient: Dusk.gradient),
      child: Stack(
        children: [
          const Positioned(top: -90, right: -110, child: Mandala(size: 330, opacity: 0.13)),
          const Positioned(bottom: 120, left: -140, child: Mandala(size: 300, opacity: 0.06)),
          RefreshIndicator(
            color: PColors.gold,
            onRefresh: () => ref.refresh(analyticsProvider(vendor.id).future),
            child: ListView(
              padding: EdgeInsets.fromLTRB(18, MediaQuery.of(context).padding.top + 14, 18, 120),
              children: [
                _Greeting(vendor: vendor),
                const SizedBox(height: 20),
                switch (data) {
                  AsyncData(:final value) => _Body(
                    a: value,
                    vendor: vendor,
                    onOpenTab: onOpenTab,
                    open: open,
                  ),
                  AsyncError(:final error) => DuskTile(
                    child: ErrorPanel(
                      error: error,
                      onRetry: () => ref.invalidate(analyticsProvider(vendor.id)),
                    ),
                  ),
                  _ => const Padding(
                    padding: EdgeInsets.only(top: 80),
                    child: Center(child: CircularProgressIndicator(color: PColors.gold)),
                  ),
                },
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Greeting extends StatelessWidget {
  const _Greeting({required this.vendor});

  final VendorResponse vendor;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final svc = serviceFor(vendor.type);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        ArchFrame(image: AssetImage(svc.image), width: 58, height: 72),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l.radheRadhe,
                style: const TextStyle(
                  color: PColors.gold,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.6,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                vendor.displayName,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontFamily: 'Cormorant',
                  color: Colors.white,
                  fontSize: 27,
                  height: 1.05,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(svc.icon, size: 14, color: Dusk.text2),
                  const SizedBox(width: 4),
                  Text(svc.title(l), style: const TextStyle(color: Dusk.text2, fontSize: 12)),
                  if (vendor.status == 'active') ...[
                    const SizedBox(width: 10),
                    Container(
                      width: 7,
                      height: 7,
                      decoration: const BoxDecoration(
                        color: Color(0xFF5BE39A),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(l.live, style: const TextStyle(color: Color(0xFF8CF0B8), fontSize: 12)),
                  ],
                ],
              ),
            ],
          ),
        ),
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: Dusk.card,
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: Dusk.stroke),
          ),
          child: const Icon(Icons.notifications_none_rounded, color: Colors.white),
        ),
      ],
    );
  }
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
    final change = percentChange(h.now, h.before);
    final waiting = ref.watch(vendorOrdersProvider((vendor.id, 'confirmed'))).value?.length ?? 0;
    final completed = ((a.statusCounts['completed'] as num?) ?? 0).toDouble();
    final active =
        completed +
        ((a.statusCounts['confirmed'] as num?) ?? 0) +
        ((a.statusCounts['in_progress'] as num?) ?? 0);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Earnings hero ──
        DuskTile(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 14),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0x33F2B544), Color(0x14FFFFFF), Color(0x0AFFFFFF)],
          ),
          onTap: () => open(AnalyticsScreen(vendor: vendor)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(l.earnings, style: const TextStyle(color: Dusk.text2, fontSize: 13)),
                  const Spacer(),
                  for (final d in const [7, 30, 90])
                    GestureDetector(
                      onTap: () => ref.read(analyticsDaysProvider.notifier).set(d),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        margin: const EdgeInsets.only(left: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: d == days ? PColors.gold : Colors.transparent,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: d == days ? PColors.gold : Dusk.stroke),
                        ),
                        child: Text(
                          '${d}D',
                          style: TextStyle(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: d == days ? Dusk.top : Dusk.text2,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  CountUp(
                    value: a.earningsPaise.toDouble(),
                    format: (v) => formatRupees(v.round(), locale: lang),
                    style: const TextStyle(
                      fontFamily: 'Cormorant',
                      color: Colors.white,
                      fontSize: 46,
                      height: 1,
                      fontWeight: FontWeight.w700,
                      fontFeatures: liningFigures,
                    ),
                  ),
                  const SizedBox(width: 10),
                  if (change != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: _ChangePill(change: change),
                    ),
                ],
              ),
              const SizedBox(height: 4),
              Text(l.earningsNote, style: const TextStyle(color: Color(0x80FFFFFF), fontSize: 11)),
              const SizedBox(height: 10),
              AreaChart(
                values: [for (final d in a.daily) d.earningsPaise.toDouble()],
                height: 92,
                color: PColors.gold,
                onDark: true,
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // ── Needs attention ──
        if (waiting > 0) ...[
          DuskTile(
            onTap: () => onOpenTab(1),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            gradient: const LinearGradient(colors: [Color(0xFFF2B544), Color(0xFFE08A1E)]),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Dusk.top.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '$waiting',
                      style: const TextStyle(
                        color: Dusk.top,
                        fontWeight: FontWeight.w900,
                        fontSize: 17,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    l.needsAction('$waiting'),
                    style: const TextStyle(color: Dusk.top, fontWeight: FontWeight.w800),
                  ),
                ),
                const Icon(Icons.arrow_forward_rounded, color: Dusk.top),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // ── Bento ──
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: DuskTile(
                  onTap: () => onOpenTab(1),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l.statOrders, style: const TextStyle(color: Dusk.text2, fontSize: 12.5)),
                      const SizedBox(height: 12),
                      Center(
                        child: RingGauge(
                          value: active == 0 ? 0 : completed / active,
                          size: 96,
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CountUp(
                                value: a.ordersCount.toDouble(),
                                format: (v) => '${v.round()}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 26,
                                  fontWeight: FontWeight.w800,
                                  fontFeatures: liningFigures,
                                ),
                              ),
                              Text(
                                l.total,
                                style: const TextStyle(color: Dusk.text2, fontSize: 10.5),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '${completed.round()} ${l.ordersDone.toLowerCase()}',
                        style: const TextStyle(
                          color: PColors.gold,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  children: [
                    Expanded(
                      child: _MiniStat(
                        icon: Icons.star_rounded,
                        label: l.rating,
                        value: a.ratingCount == 0 ? '—' : a.ratingAverage.toStringAsFixed(1),
                        sub: l.ratingCount('${a.ratingCount}'),
                        onTap: () => open(ReviewsScreen(vendorId: vendor.id)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Expanded(
                      child: _MiniStat(
                        icon: Icons.shopping_bag_rounded,
                        label: l.aov,
                        value: formatRupees(a.avgOrderPaise, locale: lang),
                        sub: '${l.statGross} ${formatRupees(a.grossPaise, locale: lang)}',
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 22),

        // ── Quick actions ──
        Text(l.quickActions, style: _section),
        const SizedBox(height: 12),
        Row(
          children: [
            for (final (icon, label, color, onTap) in [
              (Icons.add_box_rounded, l.addListing, PColors.gold, () => onOpenTab(2)),
              (
                Icons.local_offer_rounded,
                l.coupons,
                const Color(0xFFFF8FB1),
                () => open(CouponsScreen(vendorId: vendor.id)),
              ),
              (
                Icons.insights_rounded,
                l.analytics,
                const Color(0xFF8FB4FF),
                () => open(AnalyticsScreen(vendor: vendor)),
              ),
              (
                Icons.campaign_rounded,
                l.marketing.split(' ').first,
                const Color(0xFF7BE0A5),
                () => open(MarketingScreen(vendor: vendor)),
              ),
            ])
              Expanded(
                child: InkWell(
                  borderRadius: BorderRadius.circular(18),
                  onTap: onTap,
                  child: Column(
                    children: [
                      Container(
                        width: 58,
                        height: 58,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.13),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: color.withValues(alpha: 0.35)),
                        ),
                        child: Icon(icon, color: color, size: 26),
                      ),
                      const SizedBox(height: 7),
                      Text(
                        label,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 24),

        // ── AI tips carousel ──
        Row(
          children: [
            const Icon(Icons.auto_awesome_rounded, color: PColors.gold, size: 18),
            const SizedBox(width: 6),
            Text(l.aiTips, style: _section),
          ],
        ),
        const SizedBox(height: 12),
        _TipsCarousel(tips: businessTips(l, a, h)),
        if (a.topItems.isNotEmpty) ...[
          const SizedBox(height: 24),
          Text(l.topItems, style: _section),
          const SizedBox(height: 12),
          DuskTile(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: Column(
              children: [
                for (final (i, t) in a.topItems.take(4).indexed) ...[
                  if (i > 0) const DotRule(),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Row(
                      children: [
                        Text(
                          '${i + 1}',
                          style: const TextStyle(
                            fontFamily: 'Cormorant',
                            fontSize: 26,
                            color: PColors.gold,
                            fontWeight: FontWeight.w700,
                            fontFeatures: liningFigures,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                t.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              Text(
                                '× ${t.quantity}',
                                style: const TextStyle(color: Dusk.text2, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          formatRupees(t.salesPaise, locale: lang),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

const _section = TextStyle(
  color: Colors.white,
  fontSize: 16,
  fontWeight: FontWeight.w800,
  letterSpacing: 0.2,
);

class _ChangePill extends StatelessWidget {
  const _ChangePill({required this.change});

  final double change;

  @override
  Widget build(BuildContext context) {
    final up = change >= 0;
    final color = up ? const Color(0xFF5BE39A) : const Color(0xFFFF7A7A);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            up ? Icons.trending_up_rounded : Icons.trending_down_rounded,
            size: 15,
            color: color,
          ),
          const SizedBox(width: 3),
          Text(
            '${change.abs().toStringAsFixed(0)}%',
            style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 12.5),
          ),
        ],
      ),
    );
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({
    required this.icon,
    required this.label,
    required this.value,
    required this.sub,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final String sub;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => DuskTile(
    onTap: onTap,
    padding: const EdgeInsets.all(14),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Row(
          children: [
            Icon(icon, size: 15, color: PColors.gold),
            const SizedBox(width: 5),
            Text(label, style: const TextStyle(color: Dusk.text2, fontSize: 12)),
          ],
        ),
        const SizedBox(height: 6),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: Alignment.centerLeft,
          child: Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w800,
              fontFeatures: liningFigures,
            ),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          sub,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Color(0x80FFFFFF), fontSize: 11),
        ),
      ],
    ),
  );
}

class _TipsCarousel extends StatefulWidget {
  const _TipsCarousel({required this.tips});

  final List<String> tips;

  @override
  State<_TipsCarousel> createState() => _TipsCarouselState();
}

class _TipsCarouselState extends State<_TipsCarousel> {
  final _pc = PageController(viewportFraction: 0.88);
  int _page = 0;

  static const _grads = [
    [Color(0xFF6A4FD8), Color(0xFF3B2F8F)],
    [Color(0xFFD9467A), Color(0xFF7A2A6E)],
    [Color(0xFF1F9E8F), Color(0xFF1B4F72)],
  ];

  @override
  void dispose() {
    _pc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tips = widget.tips.take(3).toList();
    return Column(
      children: [
        SizedBox(
          height: 128,
          child: PageView.builder(
            controller: _pc,
            padEnds: false,
            itemCount: tips.length,
            onPageChanged: (i) => setState(() => _page = i),
            itemBuilder: (_, i) => Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: _grads[i % _grads.length]),
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Stack(
                  children: [
                    const Positioned(
                      right: -30,
                      bottom: -40,
                      child: Mandala(size: 130, opacity: 0.18, color: Colors.white),
                    ),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '0${i + 1}',
                          style: const TextStyle(
                            fontFamily: 'Cormorant',
                            fontSize: 34,
                            color: Color(0x99FFFFFF),
                            fontWeight: FontWeight.w700,
                            height: 1,
                            fontFeatures: liningFigures,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            tips[i],
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13.5,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < tips.length; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: i == _page ? 20 : 6,
                height: 6,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                decoration: BoxDecoration(
                  color: i == _page ? PColors.gold : Dusk.stroke,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

/// Simple rules turned into actionable tips (no external AI needed).
List<String> businessTips(AppLocalizations l, VendorAnalyticsResponse a, Halves h) {
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
