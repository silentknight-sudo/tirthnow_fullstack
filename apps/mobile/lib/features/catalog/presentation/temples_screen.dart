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
    final cityNames = {for (final c in cities) c.id: c.name};
    return Scaffold(
      appBar: AppBar(title: Text(l.navTemples)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: TextField(
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search, color: TnColors.navy),
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
                          color: city == c?.id ? TnColors.paper : TnColors.navy,
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
                  child: GridView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: 14,
                      crossAxisSpacing: 12,
                      mainAxisExtent: 222,
                    ),
                    itemCount: shown.length,
                    itemBuilder: (_, i) =>
                        TempleCard(temple: shown[i], city: cityNames[shown[i].cityId]),
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

/// Photo card with a crowd badge, used in the temples grid and on home.
class TempleCard extends StatelessWidget {
  const TempleCard({super.key, required this.temple, this.city, this.imageHeight = 120});

  final TempleSummaryResponse temple;
  final String? city;
  final double imageHeight;

  @override
  Widget build(BuildContext context) {
    final level = temple.crowdLevel;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/temples/${temple.slug}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                CoverImage(temple.coverUrl, height: imageHeight, radius: 0),
                Positioned(
                  left: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: crowdColor(level),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      crowdLabel(context, level),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
                if (temple.distanceKm != null)
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Pill('${temple.distanceKm!.toStringAsFixed(1)} km', icon: Icons.near_me),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 0),
              child: Text(
                temple.name,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, height: 1.2),
              ),
            ),
            if (city != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 2, 10, 0),
                child: Row(
                  children: [
                    const Icon(Icons.place_outlined, size: 13, color: TnColors.muted),
                    const SizedBox(width: 2),
                    Text(city!, style: const TextStyle(color: TnColors.muted, fontSize: 12)),
                  ],
                ),
              ),
            if (temple.tags.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(10, 6, 10, 0),
                child: Text(
                  temple.tags.take(2).join(' · '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: TnColors.accent, fontSize: 11),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
