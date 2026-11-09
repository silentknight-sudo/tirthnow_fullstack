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
import '../../content/presentation/people_screen.dart' show DemoBadge;
import '../../reels/data/reels_repository.dart';
import '../../trips/data/trips_repository.dart';

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
              const _JourneyCard(),
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

/// Live crowd (sample pilgrims, labelled demo), aarti with lyrics and audio,
/// and the traveller's trip status.
class _GlanceCards extends ConsumerWidget {
  const _GlanceCards();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final temples = ref.watch(templesProvider).value ?? const <TempleSummaryResponse>[];
    final busiest = temples.isEmpty
        ? null
        : temples.reduce((a, b) => b.crowdLevel > a.crowdLevel ? b : a);
    final trip = ref.watch(activeTripProvider).value;
    // Sample count for the demo build, derived from the temple's crowd level.
    final demoCount = 40 + ((busiest?.crowdLevel ?? 2) * 22).round();
    return SizedBox(
      height: 172,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
        children: [
          SizedBox(
            width: 162,
            child: _GlanceCard(
              border: const Color(0xFFF2D9A8),
              onTap: () => context.push('/people'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.groups_rounded, color: Color(0xFFE8590C), size: 22),
                      const SizedBox(width: 5),
                      Expanded(child: _CardTitle(l.liveCrowd)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 34,
                    child: Stack(
                      children: [
                        for (var k = 0; k < 3; k++)
                          Positioned(
                            left: k * 20.0,
                            child: Container(
                              padding: const EdgeInsets.all(1.5),
                              decoration: const BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                              ),
                              child: CircleAvatar(
                                radius: 15,
                                backgroundImage: AssetImage(
                                  'assets/images/demo-people/p${k + 1}.jpg',
                                ),
                              ),
                            ),
                          ),
                        Positioned(
                          left: 60,
                          child: Container(
                            height: 33,
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(17),
                              boxShadow: const [BoxShadow(color: Color(0x1A000000), blurRadius: 4)],
                            ),
                            child: Text(
                              '+$demoCount',
                              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11.5),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Color(0xFF2F9E44),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          l.atPlace(busiest?.name ?? 'Banke Bihari Ji'),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        busiest == null ? '' : crowdLabel(context, busiest.crowdLevel),
                        style: const TextStyle(fontSize: 10, color: TnColors.muted),
                      ),
                      const Spacer(),
                      const DemoBadge(),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 162,
            child: _GlanceCard(
              border: const Color(0xFFF5C9B0),
              tint: const Color(0xFFFFF6F1),
              onTap: () => context.push('/aarti'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('🪔', style: TextStyle(fontSize: 18)),
                      const SizedBox(width: 4),
                      Expanded(child: _CardTitle(l.aartiTitle)),
                    ],
                  ),
                  Text(
                    l.liveLyricsAudio,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 10.5, color: TnColors.muted),
                  ),
                  const SizedBox(height: 8),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          Image.asset('assets/images/canva/banke-bihari.jpg', fit: BoxFit.cover),
                          const ColoredBox(color: Color(0x33000000)),
                          Center(
                            child: Container(
                              width: 34,
                              height: 34,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                                color: const Color(0x55000000),
                              ),
                              child: const Icon(Icons.play_arrow_rounded, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            width: 162,
            child: _GlanceCard(
              border: const Color(0xFFD7E3D2),
              onTap: () => context.push('/trips'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.route_rounded, color: Color(0xFF2F9E44), size: 22),
                      const SizedBox(width: 5),
                      Expanded(child: _CardTitle(l.myTrip)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (trip != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2F9E44),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        l.tripInProgress,
                        maxLines: 1,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      l.startedAt(formatIstTime(DateTime.parse(trip.startedAt))),
                      style: const TextStyle(fontSize: 11.5),
                    ),
                    if (trip.fromPlace != null)
                      Text(
                        l.fromPlace(trip.fromPlace!),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700),
                      ),
                  ] else ...[
                    Text(
                      l.noActiveTrip,
                      style: const TextStyle(fontSize: 11.5, color: TnColors.muted),
                    ),
                    const Spacer(),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: TnColors.navy,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        l.startTrip,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CardTitle extends StatelessWidget {
  const _CardTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    maxLines: 1,
    overflow: TextOverflow.ellipsis,
    style: const TextStyle(
      fontFamily: 'Cormorant',
      fontSize: 18,
      fontWeight: FontWeight.w700,
      color: TnColors.ink,
      height: 1.1,
    ),
  );
}

class _GlanceCard extends StatelessWidget {
  const _GlanceCard({
    required this.child,
    required this.border,
    this.tint = Colors.white,
    this.onTap,
  });

  final Widget child;
  final Color border;
  final Color tint;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: tint,
    borderRadius: BorderRadius.circular(18),
    elevation: 0,
    child: InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: border, width: 1.2),
          boxShadow: const [
            BoxShadow(color: Color(0x0F1C3C6B), blurRadius: 10, offset: Offset(0, 4)),
          ],
        ),
        child: child,
      ),
    ),
  );
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
            style: const TextStyle(
              fontFamily: 'Cormorant',
              fontSize: 23,
              fontWeight: FontWeight.w700,
              color: TnColors.ink,
            ),
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
    // (icon, label, route, icon colour, soft disc)
    final items = <(IconData, String, String, Color, Color)>[
      (
        Icons.temple_hindu_rounded,
        l.navTemples,
        '/temples',
        const Color(0xFFE8590C),
        const Color(0xFFFFEEDD),
      ),
      (
        Icons.local_florist_rounded,
        l.poojaItems,
        '/pooja',
        const Color(0xFFD9480F),
        const Color(0xFFFFF0E0),
      ),
      (
        Icons.king_bed_rounded,
        l.stays,
        '/book/hotels',
        const Color(0xFF3B5BDB),
        const Color(0xFFE7EDFF),
      ),
      (
        Icons.restaurant_rounded,
        l.food,
        '/book/restaurants',
        const Color(0xFFE67700),
        const Color(0xFFFFF4D6),
      ),
      (Icons.train_rounded, l.trains, '/weather', const Color(0xFF4C3BCF), const Color(0xFFEDEBFF)),
      (
        Icons.local_taxi_rounded,
        l.cabs,
        '/book/cabs',
        const Color(0xFF2B8A3E),
        const Color(0xFFE3F5E6),
      ),
      (
        Icons.event_available_rounded,
        l.myBookings,
        '/book/orders',
        const Color(0xFF1C3C6B),
        const Color(0xFFE6EEF8),
      ),
      (
        Icons.movie_filter_rounded,
        l.reels,
        '/reels',
        const Color(0xFFE03131),
        const Color(0xFFFFE8E8),
      ),
      (
        Icons.person_add_alt_1_rounded,
        l.createProfile,
        '/account/edit',
        const Color(0xFF7048E8),
        const Color(0xFFF0EBFF),
      ),
      (
        Icons.groups_2_rounded,
        l.people,
        '/people',
        const Color(0xFF9C36B5),
        const Color(0xFFF8E9FB),
      ),
    ];
    return GridView.count(
      crossAxisCount: 5,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      mainAxisSpacing: 8,
      crossAxisSpacing: 7,
      childAspectRatio: 0.82,
      children: [
        for (final (icon, label, path, color, tint) in items)
          Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () => path == '/temples' ? context.go(path) : context.push(path),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFEDE7DC)),
                  boxShadow: const [
                    BoxShadow(color: Color(0x0D1C3C6B), blurRadius: 8, offset: Offset(0, 3)),
                  ],
                ),
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [Colors.white, tint],
                          stops: const [0.15, 1],
                        ),
                      ),
                      child: Icon(icon, color: color, size: 25),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      label,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontFamily: 'Cormorant',
                        fontSize: 13.5,
                        height: 1.05,
                        fontWeight: FontWeight.w700,
                        color: TnColors.ink,
                      ),
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
          // Photo banner (Canva) with a dark fade so the text stays readable.
          image: const DecorationImage(
            image: AssetImage('assets/images/canva/planner.jpg'),
            fit: BoxFit.cover,
            alignment: Alignment.centerRight,
            colorFilter: ColorFilter.mode(Color(0x8C0C1A30), BlendMode.srcATop),
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

/// Entry to the Yatra Journey: ride a yatra stop by stop with a voice guide.
class _JourneyCard extends StatelessWidget {
  const _JourneyCard();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return GestureDetector(
      onTap: () => context.push('/journey'),
      child: Container(
        margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
        height: 112,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          boxShadow: const [
            BoxShadow(color: Color(0x261C3C6B), blurRadius: 14, offset: Offset(0, 6)),
          ],
        ),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.asset(
              'assets/images/canva/krishna-planner.jpg',
              fit: BoxFit.cover,
              alignment: Alignment.centerRight,
            ),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xF20C1A30), Color(0x990C1A30), Color(0x000C1A30)],
                  stops: [0, 0.45, 0.7],
                ),
              ),
            ),
            Positioned(
              left: 16,
              top: 14,
              right: 140,
              bottom: 12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l.yatraJourney,
                    style: const TextStyle(
                      fontFamily: 'Cormorant',
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    l.yatraJourneySub,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.white70, fontSize: 11.5, height: 1.25),
                  ),
                  const Spacer(),
                  Row(
                    children: [
                      const Text('🛺 🛕 🪔', style: TextStyle(fontSize: 13)),
                      const SizedBox(width: 8),
                      Text(
                        '${l.journeyStart} →',
                        style: const TextStyle(
                          color: TnColors.accentSoft,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
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
  }
}
