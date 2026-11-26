import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../../l10n/app_localizations.dart';
import '../data/pandit_repository.dart';

String panditKindLabel(AppLocalizations l, String kind) => switch (kind) {
  'puja' => l.panditPuja,
  'path' => l.panditPath,
  'jyotish' => l.panditJyotish,
  'palmistry' => l.panditPalmistry,
  _ => l.panditAstrology,
};

String panditKindSub(AppLocalizations l, String kind) => switch (kind) {
  'puja' => l.panditPujaSub,
  'path' => l.panditPathSub,
  'jyotish' => l.panditJyotishSub,
  'palmistry' => l.panditPalmistrySub,
  _ => l.panditAstrologySub,
};

String panditKindArt(String kind) => 'assets/images/pandit/$kind.jpg';

IconData panditKindIcon(String kind) => switch (kind) {
  'puja' => Icons.local_fire_department_rounded,
  'path' => Icons.menu_book_rounded,
  'jyotish' => Icons.auto_awesome_rounded,
  'palmistry' => Icons.back_hand_rounded,
  _ => Icons.brightness_4_rounded,
};

/// Consultations can also happen by video call; pujas and paths happen in person.
bool panditIsConsultation(String kind) =>
    kind == 'jyotish' || kind == 'palmistry' || kind == 'astrology';

/// Round category photo, with an icon if the bundled image is missing.
class PanditKindAvatar extends StatelessWidget {
  const PanditKindAvatar(this.kind, {this.size = 56, super.key});
  final String kind;
  final double size;

  @override
  Widget build(BuildContext context) => ClipOval(
    child: Image.asset(
      panditKindArt(kind),
      width: size,
      height: size,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => Container(
        width: size,
        height: size,
        color: const Color(0xFFFFF1E0),
        child: Icon(panditKindIcon(kind), color: TnColors.saffron, size: size * 0.5),
      ),
    ),
  );
}

/// Pandit Ji: book a pandit for puja and path, or a jyotish, palmistry or
/// astrology consultation.
class PanditScreen extends ConsumerWidget {
  const PanditScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final services = ref.watch(panditServicesProvider);
    final kind = ref.watch(panditKindProvider);
    return Scaffold(
      backgroundColor: const Color(0xFFFFFBF3),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(panditServicesProvider.future),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              expandedHeight: 250,
              backgroundColor: TnColors.navy,
              foregroundColor: Colors.white,
              flexibleSpace: FlexibleSpaceBar(
                background: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.asset('assets/images/pandit/hero.jpg', fit: BoxFit.cover),
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Color(0x880C1A30), Color(0x000C1A30), Color(0xEE0C1A30)],
                          stops: [0, 0.45, 1],
                        ),
                      ),
                    ),
                    Positioned(
                      left: 16,
                      right: 16,
                      bottom: 16,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l.panditJi,
                            style: const TextStyle(
                              fontFamily: 'Cormorant',
                              color: Colors.white,
                              fontSize: 32,
                              fontWeight: FontWeight.w800,
                              height: 1.0,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            l.panditHeroSub,
                            style: const TextStyle(color: Colors.white70, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 124,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(12, 14, 12, 4),
                  children: [
                    for (final k in panditKinds)
                      _KindTile(
                        kind: k,
                        selected: kind == k,
                        onTap: () =>
                            ref.read(panditKindProvider.notifier).set(kind == k ? null : k),
                      ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
                child: Row(
                  children: [
                    const Icon(Icons.verified_rounded, size: 16, color: Color(0xFF2F9E44)),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        l.panditTrust,
                        style: const TextStyle(fontSize: 12, color: TnColors.muted),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            services.when(
              loading: () =>
                  const SliverFillRemaining(child: Center(child: CircularProgressIndicator())),
              error: (e, _) => SliverFillRemaining(
                child: ErrorPanel(error: e, onRetry: () => ref.invalidate(panditServicesProvider)),
              ),
              data: (list) {
                final shown = kind == null ? list : list.where((s) => s.kind == kind).toList();
                if (shown.isEmpty) {
                  return SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(icon: Icons.self_improvement_rounded, message: l.panditEmpty),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
                  sliver: SliverList.separated(
                    itemCount: shown.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (_, i) => _ServiceCard(service: shown[i]),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _KindTile extends StatelessWidget {
  const _KindTile({required this.kind, required this.selected, required this.onTap});
  final String kind;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 84,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: selected ? TnColors.saffron : TnColors.line,
                width: selected ? 3 : 1.5,
              ),
            ),
            child: PanditKindAvatar(kind, size: 62),
          ),
          const SizedBox(height: 6),
          Text(
            panditKindLabel(context.l10n, kind),
            maxLines: 2,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              height: 1.1,
              fontWeight: FontWeight.w700,
              color: selected ? TnColors.saffron : TnColors.navy,
            ),
          ),
        ],
      ),
    ),
  );
}

class _ServiceCard extends StatelessWidget {
  const _ServiceCard({required this.service});
  final ExperienceResponse service;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final s = service;
    final hours = s.durationMin >= 60
        ? l.panditHours((s.durationMin / 60).toStringAsFixed(s.durationMin % 60 == 0 ? 0 : 1))
        : l.panditMinutes('${s.durationMin}');
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => context.push('/pandit/${s.id}'),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: TnColors.line),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Image.asset(
                  panditKindArt(s.kind),
                  width: 84,
                  height: 84,
                  fit: BoxFit.cover,
                  errorBuilder: (_, _, _) => PanditKindAvatar(s.kind, size: 84),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Pill(panditKindLabel(l, s.kind), color: TnColors.saffron),
                    const SizedBox(height: 4),
                    Text(
                      s.title,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        color: TnColors.navy,
                      ),
                    ),
                    if (s.vendorName != null)
                      Text(
                        s.vendorName!,
                        style: const TextStyle(color: TnColors.muted, fontSize: 12.5),
                      ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.schedule_rounded, size: 15, color: TnColors.muted),
                        const SizedBox(width: 3),
                        Text(hours, style: const TextStyle(fontSize: 12, color: TnColors.muted)),
                        const Spacer(),
                        Text(
                          formatRupees(s.pricePaise, locale: context.lang),
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                            color: TnColors.saffron,
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
      ),
    );
  }
}
