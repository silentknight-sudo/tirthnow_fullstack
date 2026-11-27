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

String panditLanguage(String code) => switch (code) {
  'hi' => 'हिंदी',
  'en' => 'English',
  'sa' => 'संस्कृत',
  'braj' => 'ब्रज',
  'bn' => 'বাংলা',
  'gu' => 'ગુજરાતી',
  'mr' => 'मराठी',
  'pa' => 'ਪੰਜਾਬੀ',
  'ta' => 'தமிழ்',
  'te' => 'తెలుగు',
  _ => code,
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
class PanditScreen extends ConsumerStatefulWidget {
  const PanditScreen({super.key});

  @override
  ConsumerState<PanditScreen> createState() => _PanditScreenState();
}

class _PanditScreenState extends ConsumerState<PanditScreen> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final services = ref.watch(panditServicesProvider);
    final kind = ref.watch(panditKindProvider);
    final all = services.value ?? const <ExperienceResponse>[];
    // One card per pandit, built from their services.
    final pandits = <String, ExperienceResponse>{};
    for (final s in all) {
      pandits.putIfAbsent(s.vendorId, () => s);
    }
    return Scaffold(
      backgroundColor: const Color(0xFFFFFBF3),
      body: RefreshIndicator(
        onRefresh: () async => ref.refresh(panditServicesProvider.future),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              expandedHeight: 270,
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
                          colors: [Color(0x990C1A30), Color(0x000C1A30), Color(0xF20C1A30)],
                          stops: [0, 0.4, 1],
                        ),
                      ),
                    ),
                    Positioned(
                      left: 16,
                      right: 16,
                      bottom: 14,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            l.panditHeroTitle,
                            style: const TextStyle(
                              fontFamily: 'Cormorant',
                              color: Colors.white,
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              height: 1.05,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            l.panditHeroSub,
                            style: const TextStyle(color: Colors.white70, fontSize: 12.5),
                          ),
                          const SizedBox(height: 10),
                          TextField(
                            onChanged: (v) => setState(() => _q = v.trim().toLowerCase()),
                            style: const TextStyle(fontSize: 14),
                            decoration: InputDecoration(
                              hintText: l.panditSearch,
                              prefixIcon: const Icon(Icons.search_rounded),
                              filled: true,
                              fillColor: Colors.white,
                              isDense: true,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(28),
                                borderSide: BorderSide.none,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(child: _Steps(l: l)),
            SliverToBoxAdapter(
              child: SizedBox(
                height: 120,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(12, 6, 12, 4),
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
            if (pandits.isNotEmpty && kind == null && _q.isEmpty) ...[
              SliverToBoxAdapter(child: SectionTitle(l.panditOurPandits)),
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 150,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    children: [
                      for (final s in pandits.values)
                        _PanditCard(
                          service: s,
                          count: all.where((x) => x.vendorId == s.vendorId).length,
                        ),
                    ],
                  ),
                ),
              ),
            ],
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        kind == null ? l.panditAllServices : panditKindLabel(l, kind),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
                      ),
                    ),
                    const Icon(Icons.verified_rounded, size: 16, color: Color(0xFF2F9E44)),
                    const SizedBox(width: 4),
                    Text(
                      l.panditVerified,
                      style: const TextStyle(fontSize: 12, color: TnColors.muted),
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
                final shown = list.where((s) {
                  if (kind != null && s.kind != kind) return false;
                  if (_q.isEmpty) return true;
                  return s.title.toLowerCase().contains(_q) ||
                      (s.vendorName ?? '').toLowerCase().contains(_q);
                }).toList();
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

/// "How it works": three short steps.
class _Steps extends StatelessWidget {
  const _Steps({required this.l});
  final AppLocalizations l;

  @override
  Widget build(BuildContext context) {
    Widget step(int n, IconData icon, String text) => Expanded(
      child: Column(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: const Color(0xFFFFEDD5),
                child: Icon(icon, color: TnColors.saffron, size: 20),
              ),
              Positioned(
                right: -4,
                top: -4,
                child: CircleAvatar(
                  radius: 9,
                  backgroundColor: TnColors.navy,
                  child: Text(
                    '$n',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 11.5, height: 1.2, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 14, 16, 4),
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: TnColors.line),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          step(1, Icons.touch_app_rounded, l.panditStep1),
          step(2, Icons.event_available_rounded, l.panditStep2),
          step(3, Icons.phone_in_talk_rounded, l.panditStep3),
        ],
      ),
    );
  }
}

/// A pandit with experience, languages and how many services they offer.
class _PanditCard extends StatelessWidget {
  const _PanditCard({required this.service, required this.count});
  final ExperienceResponse service;
  final int count;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = service.pandit;
    final name = (service.vendorName ?? '').split(' (').first;
    return Container(
      width: 230,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [TnColors.navy, Color(0xFF2B4F86)]),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: TnColors.saffron,
                child: Text(
                  name.replaceAll(RegExp(r'^(Pt\.|Acharya)\s*'), '').characters.first,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  name,
                  maxLines: 2,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 13.5,
                    height: 1.15,
                  ),
                ),
              ),
            ],
          ),
          const Spacer(),
          if (p != null) ...[
            Text(
              l.panditYears('${p.experienceYears}'),
              style: const TextStyle(
                color: TnColors.saffron,
                fontWeight: FontWeight.w800,
                fontSize: 12.5,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              p.languages.map(panditLanguage).join(' · '),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
          ],
          const SizedBox(height: 4),
          Text(
            l.panditServicesCount('$count'),
            style: const TextStyle(color: Colors.white70, fontSize: 11.5),
          ),
        ],
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
                        s.pandit == null
                            ? s.vendorName!
                            : '${s.vendorName!} · ${l.panditYears('${s.pandit!.experienceYears}')}',
                        style: const TextStyle(color: TnColors.muted, fontSize: 12.5),
                      ),
                    if (s.pandit != null) ...[
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 4,
                        runSpacing: 4,
                        children: [
                          if (s.pandit!.homeVisits && !panditIsConsultation(s.kind))
                            _Badge(Icons.home_rounded, l.panditAtHome),
                          if (s.pandit!.videoConsults)
                            _Badge(Icons.videocam_rounded, l.panditOnline),
                          _Badge(
                            Icons.translate_rounded,
                            s.pandit!.languages.take(2).map(panditLanguage).join(', '),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.schedule_rounded, size: 15, color: TnColors.muted),
                        const SizedBox(width: 3),
                        Text(hours, style: const TextStyle(fontSize: 12, color: TnColors.muted)),
                        const Spacer(),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              formatRupees(s.displayPricePaise, locale: context.lang),
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 16,
                                color: TnColors.saffron,
                              ),
                            ),
                            Text(
                              l.panditInclTax,
                              style: const TextStyle(fontSize: 10, color: TnColors.muted),
                            ),
                          ],
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

class _Badge extends StatelessWidget {
  const _Badge(this.icon, this.text);
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
    decoration: BoxDecoration(
      color: const Color(0xFFF1F4FB),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: TnColors.navy),
        const SizedBox(width: 3),
        Text(text, style: const TextStyle(fontSize: 10.5, color: TnColors.navy)),
      ],
    ),
  );
}
