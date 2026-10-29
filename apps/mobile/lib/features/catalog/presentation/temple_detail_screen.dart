import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
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
          expandedHeight: 230,
          backgroundColor: TnColors.paper,
          flexibleSpace: FlexibleSpaceBar(
            background: CoverImage(temple.coverUrl, height: 270, radius: 0),
          ),
        ),
        SliverList(
          delegate: SliverChildListDelegate([
            _Header(temple: temple),
            if (next != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                child: NextAartiCard(aarti: next),
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
            ReviewsSection(targetType: 'temple', targetId: temple.id),
            const SizedBox(height: 96),
          ]),
        ),
      ],
    );
  }
}

/// Name, crowd and tags, plus round quick actions (directions, share).
class _Header extends StatelessWidget {
  const _Header({required this.temple});

  final TempleDetailResponse temple;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final mapsUrl =
        'https://www.google.com/maps/dir/?api=1&destination=${temple.lat},${temple.lng}';
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 14, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: TnColors.line),
        boxShadow: const [
          BoxShadow(color: Color(0x141C3C6B), blurRadius: 14, offset: Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            temple.name,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: TnColors.navy),
          ),
          if (temple.address != null) ...[
            const SizedBox(height: 4),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.place_outlined, size: 16, color: TnColors.muted),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    temple.address!,
                    style: const TextStyle(color: TnColors.muted, fontSize: 13),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: crowdColor(temple.crowdLevel),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  '${l.crowd}: ${crowdLabel(context, temple.crowdLevel)}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              for (final tag in temple.tags) Pill(tag, color: TnColors.accent),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _Action(
                icon: Icons.directions_rounded,
                label: l.directions,
                color: const Color(0xFF15803D),
                tint: const Color(0xFFEAF7EE),
                onTap: () => launchUrl(Uri.parse(mapsUrl), mode: LaunchMode.externalApplication),
              ),
              _Action(
                icon: Icons.ios_share_rounded,
                label: l.sharePlan,
                color: const Color(0xFF4338CA),
                tint: const Color(0xFFEEF0FF),
                onTap: () =>
                    SharePlus.instance.share(ShareParams(text: '${temple.name}\n$mapsUrl')),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({
    required this.icon,
    required this.label,
    required this.color,
    required this.tint,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final Color tint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkResponse(
    onTap: onTap,
    radius: 40,
    child: SizedBox(
      width: 92,
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(color: tint, shape: BoxShape.circle),
            child: Icon(icon, color: color),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    ),
  );
}
