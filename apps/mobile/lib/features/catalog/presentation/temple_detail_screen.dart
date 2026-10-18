import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../reviews/presentation/reviews_section.dart';
import '../data/catalog_repository.dart';
import 'aarti_widgets.dart';
import 'temples_screen.dart';

/// Next 3 days of aarti for one temple (IST calendar dates).
final templeWeekAartiProvider = FutureProvider.family<List<AartiInstanceResponse>, String>((
  ref,
  id,
) {
  final now = DateTime.now().toUtc();
  return ref
      .watch(catalogRepositoryProvider)
      .templeAarti(
        id,
        from: istDateString(now),
        to: istDateString(now.add(const Duration(days: 2))),
      );
});

class TempleDetailScreen extends ConsumerWidget {
  const TempleDetailScreen({super.key, required this.idOrSlug});

  final String idOrSlug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final temple = ref.watch(templeProvider(idOrSlug));
    return Scaffold(
      body: AsyncView(
        value: temple,
        onRetry: () => ref.invalidate(templeProvider(idOrSlug)),
        builder: (t) => _Body(temple: t),
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.temple});

  final TempleDetailResponse temple;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final theme = Theme.of(context);
    final week = ref.watch(templeWeekAartiProvider(temple.id));
    final next = temple.nextAarti;
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          expandedHeight: 220,
          flexibleSpace: FlexibleSpaceBar(
            title: Text(
              temple.name,
              style: const TextStyle(
                fontFamily: 'Cormorant',
                fontFeatures: liningFigures,
                color: TnColors.brown,
              ),
            ),
            background: CoverImage(temple.coverUrl, height: 260, radius: 0),
          ),
        ),
        SliverList(
          delegate: SliverChildListDelegate([
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  Pill(
                    '${l.crowd}: ${crowdLabel(context, temple.crowdLevel)}',
                    color: crowdColor(temple.crowdLevel),
                  ),
                  for (final tag in temple.tags) Pill(tag, color: TnColors.muted),
                ],
              ),
            ),
            if (next != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: NextAartiCard(aarti: next),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.directions_outlined),
                      label: Text(l.directions),
                      onPressed: () => launchUrl(
                        Uri.parse(
                          'https://www.google.com/maps/dir/?api=1&destination=${temple.lat},${temple.lng}',
                        ),
                        mode: LaunchMode.externalApplication,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            SectionTitle(l.aartiSchedule),
            Card(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              child: AsyncView(
                value: week,
                onRetry: () => ref.invalidate(templeWeekAartiProvider(temple.id)),
                builder: (list) => list.isEmpty
                    ? const EmptyState()
                    : Column(
                        children: [for (final a in list) AartiTile(aarti: a, showTemple: false)],
                      ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Text(
                l.timesFromTemple,
                style: theme.textTheme.bodySmall?.copyWith(color: TnColors.muted),
              ),
            ),
            if (temple.dressCode != null) ...[
              SectionTitle(l.dressCode),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(temple.dressCode!),
              ),
            ],
            if (temple.description != null || temple.history != null) ...[
              SectionTitle(l.about),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  [temple.description, temple.history].whereType<String>().join('\n\n'),
                  style: theme.textTheme.bodyLarge?.copyWith(height: 1.5),
                ),
              ),
            ],
            if (temple.address != null)
              ListTile(leading: const Icon(Icons.place_outlined), title: Text(temple.address!)),
            ReviewsSection(targetType: 'temple', targetId: temple.id),
            const SizedBox(height: 96),
          ]),
        ),
      ],
    );
  }
}
