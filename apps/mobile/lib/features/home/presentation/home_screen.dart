import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../auth/data/session_controller.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/presentation/temples_screen.dart' show TempleCard, crowdLabel;
import '../../reels/data/reels_repository.dart';

/// Home: guide search, at-a-glance cards (weather, crowd, next aarti, darshan),
/// quick access grid, trip planner banner, popular temples and festivals.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final festivals = ref.watch(festivalsProvider);

    Future<void> refresh() async {
      ref
        ..invalidate(upcomingAartiProvider)
        ..invalidate(festivalsProvider)
        ..invalidate(weatherProvider)
        ..invalidate(templesProvider)
        ..invalidate(reelsFeedProvider(forYouFeed));
      await ref.read(upcomingAartiProvider.future);
    }

    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: refresh,
          child: ListView(
            padding: const EdgeInsets.only(bottom: 110),
            children: [
              const _Header(),
              const _Greeting(),
              const _GuideSearch(),
              const _HeroCarousel(),
              const _GlanceCards(),
              _SectionHeader(l.quickAccess),
              const _QuickAccess(),
              const SizedBox(height: 8),
              const _GroupYatraCard(),
              _SectionHeader(
                l.reelsFromBraj,
                action: l.viewAll,
                onAction: () => context.push('/reels'),
              ),
              const _ReelsStrip(),
              _SectionHeader(
                l.popularTemples,
                action: l.viewAll,
                onAction: () => context.go('/temples'),
              ),
              const _PopularTemples(),
              festivals.whenOrNull(
                    data: (list) => list.isEmpty
                        ? const SizedBox.shrink()
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              _SectionHeader(l.festivals),
                              SizedBox(
                                height: 116,
                                child: ListView.separated(
                                  scrollDirection: Axis.horizontal,
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  itemCount: list.length,
                                  separatorBuilder: (_, _) => const SizedBox(width: 12),
                                  itemBuilder: (_, i) => _FestivalCard(festival: list[i]),
                                ),
                              ),
                            ],
                          ),
                  ) ??
                  const SizedBox.shrink(),
              const SizedBox(height: 20),
              const _TrustStrip(),
            ],
          ),
        ),
      ),
    );
  }
}

/// Soft card used across the home screen: white, rounded, hairline border.
BoxDecoration _softCard({Color color = Colors.white}) => BoxDecoration(
  color: color,
  borderRadius: BorderRadius.circular(18),
  border: Border.all(color: TnColors.line),
  boxShadow: const [BoxShadow(color: Color(0x0F1C3C6B), blurRadius: 12, offset: Offset(0, 4))],
);

class _Header extends StatelessWidget {
  const _Header();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 8, 4),
      child: Row(
        children: [
          Image.asset('assets/images/logo.png', height: 36),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: 'Tirth',
                        style: TextStyle(color: TnColors.navy),
                      ),
                      TextSpan(
                        text: 'Now',
                        style: TextStyle(color: TnColors.saffron),
                      ),
                    ],
                  ),
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, height: 1.1),
                ),
                Text(l.tagline, style: const TextStyle(color: TnColors.muted, fontSize: 13)),
              ],
            ),
          ),
          IconButton(
            tooltip: l.notifications,
            icon: const Icon(Icons.notifications_none_rounded, color: TnColors.navy, size: 28),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
    );
  }
}

class _GuideSearch extends StatelessWidget {
  const _GuideSearch();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Row(
        children: [
          Expanded(
            child: Material(
              color: Colors.white,
              shape: const StadiumBorder(side: BorderSide(color: TnColors.line)),
              elevation: 2,
              shadowColor: const Color(0x331C3C6B),
              child: InkWell(
                customBorder: const StadiumBorder(),
                onTap: () => context.go('/guide'),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      const Icon(Icons.auto_awesome, color: TnColors.saffron, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          l.askGuide,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: TnColors.muted),
                        ),
                      ),
                      const Icon(Icons.mic_none_rounded, color: TnColors.navy),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Material(
            shape: const StadiumBorder(),
            clipBehavior: Clip.antiAlias,
            child: Ink(
              decoration: const BoxDecoration(
                gradient: LinearGradient(colors: [TnColors.navy, Color(0xFF27508A)]),
              ),
              child: InkWell(
                onTap: () => context.go('/guide'),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(8, 8, 16, 8),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(7),
                        decoration: const BoxDecoration(
                          color: TnColors.saffron,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.mic, color: Colors.white, size: 20),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        l.aiVoice,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Four small cards: weather, busiest temple, next aarti, temples to visit.
class _GlanceCards extends ConsumerWidget {
  const _GlanceCards();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final weather = ref.watch(weatherProvider).value;
    final temples = ref.watch(templesProvider).value ?? const <TempleSummaryResponse>[];
    final upcoming = ref.watch(upcomingAartiProvider).value ?? const <AartiInstanceResponse>[];
    final next = upcoming
        .where((a) => DateTime.parse(a.startsAt).isAfter(DateTime.now()))
        .firstOrNull;
    final busiest = temples.isEmpty
        ? null
        : temples.reduce((a, b) => b.crowdLevel > a.crowdLevel ? b : a);

    return SizedBox(
      height: 132,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
        children: [
          _GlanceCard(
            tint: const Color(0xFFEFF3FA),
            onTap: () => context.push('/weather'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.wb_sunny_rounded, color: TnColors.saffron, size: 24),
                    const SizedBox(width: 8),
                    Text(
                      weather == null ? '—' : '${weather.now.tempC.round()}°C',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  weather?.now.description ?? l.weather,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: TnColors.muted, fontSize: 12),
                ),
                const Spacer(),
                const Row(
                  children: [
                    Icon(Icons.place_outlined, size: 14, color: TnColors.navy),
                    SizedBox(width: 4),
                    Text('Vrindavan, UP', style: TextStyle(fontSize: 12)),
                  ],
                ),
              ],
            ),
          ),
          _GlanceCard(
            tint: const Color(0xFFFFF1EC),
            onTap: busiest == null ? null : () => context.push('/temples/${busiest.id}'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _CardLabel(Icons.groups_rounded, l.liveCrowd, const Color(0xFFC2410C)),
                const SizedBox(height: 8),
                Text(
                  busiest == null ? '—' : crowdLabel(context, busiest.crowdLevel),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                ),
                Text(
                  busiest?.name ?? '',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: TnColors.muted, fontSize: 11),
                ),
                const Spacer(),
                _CrowdBar(level: busiest?.crowdLevel ?? 0),
              ],
            ),
          ),
          _GlanceCard(
            tint: const Color(0xFFFFF7E8),
            onTap: () => context.go('/temples'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _CardLabel(Icons.local_fire_department_rounded, l.nextAarti, TnColors.accent),
                const SizedBox(height: 8),
                Text(
                  next == null ? '—' : '${next.localTime} IST',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    fontFeatures: liningFigures,
                  ),
                ),
                Text(
                  next?.templeName ?? l.noUpcomingAarti,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: TnColors.muted, fontSize: 11),
                ),
                const Spacer(),
                _CardButton(l.viewAll),
              ],
            ),
          ),
          _GlanceCard(
            tint: const Color(0xFFEFF7F0),
            onTap: () => context.push('/guide/planner'),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _CardLabel(Icons.temple_hindu_rounded, l.brajDarshan, const Color(0xFF2F6B3A)),
                const SizedBox(height: 8),
                Text(
                  l.templeCount(temples.length),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                ),
                Text(l.planner, style: const TextStyle(color: TnColors.muted, fontSize: 11)),
                const Spacer(),
                _CardButton(l.viewPlan),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _GlanceCard extends StatelessWidget {
  const _GlanceCard({required this.tint, required this.child, this.onTap});

  final Color tint;
  final Widget child;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(right: 10, bottom: 6),
    child: Material(
      color: tint,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          width: 108,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: TnColors.line),
          ),
          child: child,
        ),
      ),
    ),
  );
}

class _CardLabel extends StatelessWidget {
  const _CardLabel(this.icon, this.text, this.color);

  final IconData icon;
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Icon(icon, size: 16, color: color),
      const SizedBox(width: 4),
      Flexible(
        child: Text(
          text,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ),
    ],
  );
}

class _CardButton extends StatelessWidget {
  const _CardButton(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.symmetric(vertical: 5),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: TnColors.line),
    ),
    alignment: Alignment.center,
    child: Text(
      text,
      style: const TextStyle(color: TnColors.navy, fontSize: 12, fontWeight: FontWeight.w600),
    ),
  );
}

class _CrowdBar extends StatelessWidget {
  const _CrowdBar({required this.level});

  final num level;

  @override
  Widget build(BuildContext context) {
    const colors = [
      Color(0xFF3F7A3F),
      Color(0xFF8BAA3A),
      Color(0xFFE0A42E),
      Color(0xFFE07A2E),
      Color(0xFFB3261E),
    ];
    return Row(
      children: [
        for (var i = 0; i < 5; i++)
          Expanded(
            child: Container(
              height: 5,
              margin: const EdgeInsets.only(right: 3),
              decoration: BoxDecoration(
                color: i <= level ? colors[i] : const Color(0xFFE6E2D8),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),
      ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title, {this.action, this.onAction});

  final String title;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 18, 8, 8),
    child: Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: TnColors.ink),
          ),
        ),
        if (action != null)
          TextButton(
            onPressed: onAction,
            child: Text(action!, style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
      ],
    ),
  );
}

class _QuickAccess extends StatelessWidget {
  const _QuickAccess();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    // (icon, label, route, icon colour, tile tint)
    final items = <(IconData, String, String, Color, Color)>[
      (
        Icons.temple_hindu_rounded,
        l.navTemples,
        '/temples',
        const Color(0xFFE07A2E),
        const Color(0xFFFFF1E4),
      ),
      (
        Icons.apartment_rounded,
        l.stays,
        '/book/hotels',
        const Color(0xFF4338CA),
        const Color(0xFFEEF0FF),
      ),
      (
        Icons.restaurant_rounded,
        l.food,
        '/book/restaurants',
        const Color(0xFFD97706),
        const Color(0xFFFFF6E0),
      ),
      (Icons.train_rounded, l.trains, '/weather', const Color(0xFF1D4ED8), const Color(0xFFEAF2FF)),
      (
        Icons.local_taxi_rounded,
        l.cabs,
        '/book/cabs',
        const Color(0xFF15803D),
        const Color(0xFFEAF7EE),
      ),
      (
        Icons.receipt_long_rounded,
        l.myBookings,
        '/book/orders',
        TnColors.navy,
        const Color(0xFFEFF3FA),
      ),
      (
        Icons.play_circle_fill_rounded,
        l.reels,
        '/reels',
        const Color(0xFF7C3AED),
        const Color(0xFFF3EEFF),
      ),
      (Icons.sos_rounded, l.sosTitle, '/sos', TnColors.sos, const Color(0xFFFDECEA)),
    ];
    return GridView.count(
      crossAxisCount: 4,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      mainAxisSpacing: 8,
      crossAxisSpacing: 8,
      childAspectRatio: 1.05,
      children: [
        for (final (icon, label, path, color, tint) in items)
          Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => path == '/temples' ? context.go(path) : context.push(path),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: TnColors.line),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(color: tint, shape: BoxShape.circle),
                      child: Icon(icon, color: color, size: 19),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _PopularTemples extends ConsumerWidget {
  const _PopularTemples();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final temples = ref.watch(templesProvider);
    final cities = {
      for (final c in ref.watch(citiesProvider).value ?? const <CityResponse>[]) c.id: c.name,
    };
    return SizedBox(
      height: 190,
      child: temples.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, _) => const SizedBox.shrink(),
        data: (list) => ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          itemCount: list.length.clamp(0, 10),
          separatorBuilder: (_, _) => const SizedBox(width: 12),
          itemBuilder: (_, i) => SizedBox(
            width: 132,
            child: TempleCard(temple: list[i], city: cities[list[i].cityId], imageHeight: 88),
          ),
        ),
      ),
    );
  }
}

class _FestivalCard extends StatelessWidget {
  const _FestivalCard({required this.festival});

  final FestivalResponse festival;

  @override
  Widget build(BuildContext context) {
    final starts = DateTime.parse(festival.startsOn);
    return Container(
      width: 220,
      padding: const EdgeInsets.all(14),
      decoration: _softCard(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Pill(formatIstDate(starts, locale: context.lang), icon: Icons.event),
          const SizedBox(height: 8),
          Text(
            festival.name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
          if (festival.crowdAdvisory != null)
            Text(
              festival.crowdAdvisory!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: TnColors.muted, fontSize: 12),
            ),
        ],
      ),
    );
  }
}

class _TrustStrip extends StatelessWidget {
  const _TrustStrip();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final items = [
      (Icons.schedule_rounded, l.trustAartiTitle, l.trustAartiBody, TnColors.accent),
      (Icons.verified_user_rounded, l.trustPayTitle, l.trustPayBody, const Color(0xFF3F7A3F)),
      (Icons.support_agent_rounded, l.trustSosTitle, l.trustSosBody, TnColors.navy),
    ];
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
      decoration: _softCard(color: const Color(0xFFFFFAF0)),
      child: Row(
        children: [
          for (final (icon, title, body, color) in items)
            Expanded(
              child: Column(
                children: [
                  Icon(icon, color: color, size: 24),
                  const SizedBox(height: 4),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                  ),
                  Text(
                    body,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 10, color: TnColors.muted),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// "Radhe Radhe, Ramesh 🙏" with a time-of-day line.
class _Greeting extends ConsumerWidget {
  const _Greeting();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final name = ref.watch(sessionProvider).user?.displayName;
    final h = toIst(DateTime.now().toUtc()).hour;
    final part = h < 12 ? l.goodMorning : (h < 17 ? l.goodAfternoon : l.goodEvening);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            name == null || name.isEmpty
                ? l.radheRadhe
                : '${l.radheRadhe}, ${name.split(' ').first}',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: TnColors.ink),
          ),
          Text(part, style: const TextStyle(color: TnColors.muted, fontSize: 13)),
        ],
      ),
    );
  }
}

class _Slide {
  const _Slide(this.image, this.title, this.subtitle, this.route);
  final String image;
  final String title;
  final String subtitle;
  final String route;
}

/// Auto-advancing photo carousel with soft gradient, title and a CTA.
class _HeroCarousel extends StatefulWidget {
  const _HeroCarousel();

  @override
  State<_HeroCarousel> createState() => _HeroCarouselState();
}

class _HeroCarouselState extends State<_HeroCarousel> {
  final _pages = PageController(viewportFraction: 0.92);
  Timer? _timer;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!_pages.hasClients) return;
      unawaited(
        _pages.animateToPage(
          (_index + 1) % 3,
          duration: const Duration(milliseconds: 600),
          curve: Curves.easeInOutCubic,
        ),
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final slides = [
      _Slide('assets/images/canva/prem-mandir.jpg', l.slide1Title, l.slide1Sub, '/temples'),
      _Slide('assets/images/canva/planner.jpg', l.slide2Title, l.slide2Sub, '/guide/planner'),
      _Slide('assets/images/canva/radha-kund.jpg', l.slide3Title, l.slide3Sub, '/reels'),
    ];
    return Column(
      children: [
        SizedBox(
          height: 168,
          child: PageView.builder(
            controller: _pages,
            itemCount: slides.length,
            onPageChanged: (i) => setState(() => _index = i),
            itemBuilder: (_, i) {
              final s = slides[i];
              return GestureDetector(
                onTap: () => context.push(s.route),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 5, vertical: 4),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: const [
                      BoxShadow(color: Color(0x261C3C6B), blurRadius: 14, offset: Offset(0, 6)),
                    ],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.asset(s.image, fit: BoxFit.cover),
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                            colors: [Color(0xD90C1A30), Color(0x330C1A30)],
                          ),
                        ),
                      ),
                      Positioned(
                        left: 16,
                        top: 16,
                        right: 110,
                        bottom: 14,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              s.title,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 19,
                                fontWeight: FontWeight.w800,
                                height: 1.15,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              s.subtitle,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: Colors.white70, fontSize: 12.5),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: TnColors.saffron,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    l.explore,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 12.5,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  const Icon(
                                    Icons.arrow_forward_rounded,
                                    color: Colors.white,
                                    size: 15,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            for (var i = 0; i < slides.length; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: i == _index ? 18 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: i == _index ? TnColors.saffron : TnColors.line,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

/// Planner entry point that shows what the planner can do for a group.
class _GroupYatraCard extends StatelessWidget {
  const _GroupYatraCard();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    Widget feat(IconData icon, String label) => Column(
      children: [
        Container(
          padding: const EdgeInsets.all(9),
          decoration: const BoxDecoration(color: Color(0x26FFFFFF), shape: BoxShape.circle),
          child: Icon(icon, color: Colors.white, size: 19),
        ),
        const SizedBox(height: 5),
        Text(label, style: const TextStyle(color: Colors.white, fontSize: 11)),
      ],
    );
    return GestureDetector(
      onTap: () => context.push('/guide/planner'),
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 8, 16, 4),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          gradient: const LinearGradient(
            colors: [TnColors.navy, Color(0xFF6A3FA0), TnColors.saffron],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: const [
            BoxShadow(color: Color(0x401C3C6B), blurRadius: 16, offset: Offset(0, 8)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.auto_awesome, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    l.planGroupYatra,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const Icon(Icons.arrow_forward_rounded, color: Colors.white),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              l.planGroupYatraSub,
              style: const TextStyle(color: Colors.white70, fontSize: 12.5),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                feat(Icons.groups_rounded, l.featMembers),
                feat(Icons.hotel_rounded, l.stay),
                feat(Icons.train_rounded, l.travelDetails),
                feat(Icons.picture_as_pdf_rounded, 'PDF'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Horizontal strip of reel covers; tap opens the reels feed.
class _ReelsStrip extends ConsumerWidget {
  const _ReelsStrip();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reels = ref.watch(reelsFeedProvider(forYouFeed)).value?.data ?? const <ReelResponse>[];
    if (reels.isEmpty) return const SizedBox.shrink();
    return SizedBox(
      height: 196,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: reels.length.clamp(0, 10),
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (_, i) {
          final r = reels[i];
          return GestureDetector(
            onTap: () => context.push('/reels'),
            child: Container(
              width: 112,
              decoration: BoxDecoration(
                color: TnColors.night,
                borderRadius: BorderRadius.circular(16),
              ),
              clipBehavior: Clip.antiAlias,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (r.posterUrl != null)
                    Image.network(
                      r.posterUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => const SizedBox.shrink(),
                    ),
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment(0, 0.2),
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Color(0xCC000000)],
                      ),
                    ),
                  ),
                  const Positioned(
                    top: 8,
                    right: 8,
                    child: Icon(Icons.play_circle_fill_rounded, color: Colors.white, size: 22),
                  ),
                  Positioned(
                    left: 8,
                    right: 8,
                    bottom: 8,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '@${r.creator.displayName}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                          ),
                        ),
                        Row(
                          children: [
                            const Icon(Icons.favorite_rounded, color: Colors.white70, size: 12),
                            const SizedBox(width: 3),
                            Text(
                              '${r.likeCount >= 1000 ? '${(r.likeCount / 1000).toStringAsFixed(1)}K' : r.likeCount}',
                              style: const TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
