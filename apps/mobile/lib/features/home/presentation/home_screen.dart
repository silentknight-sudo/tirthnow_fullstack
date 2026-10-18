import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../auth/data/session_controller.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/presentation/aarti_widgets.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final user = ref.watch(sessionProvider).user;
    final name = user?.displayName;
    final upcoming = ref.watch(upcomingAartiProvider);
    final festivals = ref.watch(festivalsProvider);
    final weather = ref.watch(weatherProvider);

    Future<void> refresh() async {
      ref
        ..invalidate(upcomingAartiProvider)
        ..invalidate(festivalsProvider)
        ..invalidate(weatherProvider);
      await ref.read(upcomingAartiProvider.future);
    }

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset('assets/images/logo.png', height: 32),
            const SizedBox(width: 10),
            Text(l.appName),
          ],
        ),
        actions: [
          IconButton(
            tooltip: l.notifications,
            icon: const Icon(Icons.notifications_none),
            onPressed: () => context.push('/notifications'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: refresh,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 96),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Text(
                l.greeting(name == null || name.isEmpty ? '' : ', $name'),
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: AsyncView(
                value: upcoming,
                onRetry: () => ref.invalidate(upcomingAartiProvider),
                builder: (list) {
                  final next = list
                      .where((a) => DateTime.parse(a.startsAt).isAfter(DateTime.now()))
                      .firstOrNull;
                  if (next == null) {
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Text(l.noUpcomingAarti),
                      ),
                    );
                  }
                  return NextAartiCard(
                    aarti: next,
                    onTap: () => context.push('/temples/${next.templeId}'),
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
            const _QuickActions(),
            weather.whenOrNull(data: (w) => _WeatherCard(weather: w)) ?? const SizedBox.shrink(),
            SectionTitle(
              l.upcomingAartis,
              action: l.seeAll,
              onAction: () => context.go('/temples'),
            ),
            upcoming.whenOrNull(
                  data: (list) => Card(
                    margin: const EdgeInsets.symmetric(horizontal: 16),
                    child: Column(children: [for (final a in list.take(5)) AartiTile(aarti: a)]),
                  ),
                ) ??
                const SizedBox.shrink(),
            festivals.whenOrNull(
                  data: (list) => list.isEmpty
                      ? const SizedBox.shrink()
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            SectionTitle(l.festivals),
                            SizedBox(
                              height: 120,
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
          ],
        ),
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final items = <(IconData, String, String, Color)>[
      (Icons.temple_hindu_outlined, l.navTemples, '/temples', TnColors.navy),
      (Icons.bed_outlined, l.stays, '/book/hotels', TnColors.navy),
      (Icons.local_taxi_outlined, l.cabs, '/book/cabs', TnColors.navy),
      (Icons.restaurant_outlined, l.food, '/book/restaurants', TnColors.navy),
      (Icons.auto_awesome_outlined, l.guideTitle, '/guide', TnColors.navy),
      (Icons.map_outlined, l.planner, '/guide/planner', TnColors.navy),
      (Icons.play_circle_outline, l.reels, '/reels', TnColors.navy),
      (Icons.sos_outlined, l.sosTitle, '/sos', TnColors.sos),
    ];
    return GridView.count(
      crossAxisCount: 4,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      childAspectRatio: 0.9,
      children: [
        for (final (icon, label, path, color) in items)
          InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: () => path.startsWith('/temples') || path == '/guide'
                ? context.go(path)
                : context.push(path),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: color == TnColors.sos
                        ? const Color(0x1FB3261E)
                        : const Color(0xFFF6E6D2),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(icon, color: color),
                ),
                const SizedBox(height: 6),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _WeatherCard extends StatelessWidget {
  const _WeatherCard({required this.weather});

  final WeatherResponse weather;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final now = weather.now;
    final advisory = weather.advisories.firstOrNull;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Card(
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => context.push('/weather'),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const Icon(Icons.wb_sunny_outlined, color: TnColors.saffron, size: 36),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${now.tempC.round()}°C · ${now.description}',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(
                        l.feelsLike('${now.feelsLikeC.round()}°C'),
                        style: const TextStyle(color: TnColors.muted),
                      ),
                      if (advisory != null) ...[
                        const SizedBox(height: 6),
                        Pill(
                          advisory.message,
                          color: advisory.severity == 'warning'
                              ? TnColors.saffron
                              : TnColors.accent,
                        ),
                      ],
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: TnColors.muted),
              ],
            ),
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
    return SizedBox(
      width: 220,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Pill(formatIstDate(starts, locale: context.lang), icon: Icons.event),
              const SizedBox(height: 8),
              Text(
                festival.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontFamily: 'Cormorant',
                  fontFeatures: liningFigures,
                  fontWeight: FontWeight.w700,
                ),
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
        ),
      ),
    );
  }
}
