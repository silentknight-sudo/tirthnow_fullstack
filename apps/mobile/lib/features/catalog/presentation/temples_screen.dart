import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_models.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../data/catalog_repository.dart';

String crowdLabel(BuildContext context, num level) {
  final l = context.l10n;
  return switch (level.round()) {
    0 => l.crowdLevel0,
    1 => l.crowdLevel1,
    2 => l.crowdLevel2,
    3 => l.crowdLevel3,
    _ => l.crowdLevel4,
  };
}

Color crowdColor(num level) =>
    level >= 3 ? TnColors.sos : (level >= 2 ? TnColors.saffron : TnColors.success);

class TemplesScreen extends ConsumerStatefulWidget {
  const TemplesScreen({super.key});

  @override
  ConsumerState<TemplesScreen> createState() => _TemplesScreenState();
}

class _TemplesScreenState extends ConsumerState<TemplesScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final temples = ref.watch(templesProvider);
    final cities = ref.watch(citiesProvider).value ?? const <CityResponse>[];
    final city = ref.watch(cityFilterProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.navTemples)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: TextField(
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search),
                hintText: l.searchTemples,
              ),
              onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
            ),
          ),
          if (cities.isNotEmpty)
            SizedBox(
              height: 44,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  for (final c in [null, ...cities])
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: ChoiceChip(
                        label: Text(c?.name ?? l.allBraj),
                        selected: city == c?.id,
                        labelStyle: TextStyle(
                          color: city == c?.id ? TnColors.paper : TnColors.brown,
                        ),
                        onSelected: (_) => ref.read(cityFilterProvider.notifier).set(c?.id),
                      ),
                    ),
                ],
              ),
            ),
          Expanded(
            child: AsyncView(
              value: temples,
              onRetry: () => ref.invalidate(templesProvider),
              builder: (list) {
                final shown = _query.isEmpty
                    ? list
                    : list
                          .where(
                            (t) =>
                                t.name.toLowerCase().contains(_query) ||
                                t.tags.any((g) => g.contains(_query)),
                          )
                          .toList();
                if (shown.isEmpty) return const EmptyState(icon: Icons.temple_hindu_outlined);
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(templesProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                    itemCount: shown.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (_, i) => TempleCard(temple: shown[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class TempleCard extends StatelessWidget {
  const TempleCard({super.key, required this.temple});

  final TempleSummaryResponse temple;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/temples/${temple.slug}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CoverImage(temple.coverUrl, height: 140, radius: 0),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    temple.name,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 20),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      Pill(
                        '${l.crowd}: ${crowdLabel(context, temple.crowdLevel)}',
                        color: crowdColor(temple.crowdLevel),
                      ),
                      if (temple.distanceKm != null)
                        Pill('${temple.distanceKm!.toStringAsFixed(1)} km', icon: Icons.near_me),
                      for (final t in temple.tags.take(2)) Pill(t, color: TnColors.muted),
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
