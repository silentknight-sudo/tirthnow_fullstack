import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/place_images.dart';
import '../../auth/data/session_controller.dart';
import '../../bookings/presentation/checkout_flow.dart';
import '../../reviews/presentation/reviews_section.dart';
import '../data/catalog_repository.dart';
import 'aarti_widgets.dart';
import 'temples_screen.dart';

/// Temples whose "aarti has started" push the signed-in user follows.
final aartiAlertsProvider = FutureProvider.autoDispose<Set<String>>((ref) async {
  final s = ref.watch(sessionProvider);
  if (!s.signedIn || s.isGuest) return <String>{};
  final res = AartiAlertsResponse.fromJson(
    asJson(await ref.watch(apiClientProvider).get('/aarti-alerts')),
  );
  return res.templeIds.toSet();
});

class TempleDetailScreen extends ConsumerWidget {
  const TempleDetailScreen({super.key, required this.idOrSlug});

  final String idOrSlug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final temple = ref.watch(templeProvider(idOrSlug));
    return Scaffold(
      backgroundColor: const Color(0xFFFFFBF3),
      body: AsyncView(
        value: temple,
        onRetry: () => ref.invalidate(templeProvider(idOrSlug)),
        builder: (t) => _Body(temple: t),
      ),
    );
  }
}

/// Live-first temple page: only the next aarti (no multi-day schedule — the
/// concept is live), a start-of-aarti push toggle, About facts and Prohibited.
class _Body extends ConsumerWidget {
  const _Body({required this.temple});

  final TempleDetailResponse temple;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final theme = Theme.of(context);
    final next = temple.nextAarti;
    final facts = temple.facts;
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          expandedHeight: 300,
          backgroundColor: TnColors.navy,
          foregroundColor: Colors.white,
          flexibleSpace: FlexibleSpaceBar(
            background: Stack(
              fit: StackFit.expand,
              children: [
                CoverImage(
                  temple.coverUrl,
                  height: 300,
                  radius: 0,
                  fallbackAsset: templeImage(temple.slug),
                ),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0x880C1A30), Color(0x000C1A30), Color(0xEE0C1A30)],
                      stops: [0, 0.4, 1],
                    ),
                  ),
                ),
                Positioned(
                  left: 16,
                  right: 16,
                  bottom: 18,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        temple.name,
                        style: const TextStyle(
                          fontFamily: 'Cormorant',
                          color: Colors.white,
                          fontSize: 30,
                          height: 1.05,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      if (facts?.famousFor != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          facts!.famousFor!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.3),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        SliverList(
          delegate: SliverChildListDelegate([
            _Header(temple: temple),
            if (next != null) ...[
              SectionTitle(l.nextAarti),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: NextAartiCard(aarti: next),
              ),
            ],
            _AlertToggle(templeId: temple.id),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 6, 20, 0),
              child: Text(
                l.timesFromTemple,
                style: theme.textTheme.bodySmall?.copyWith(color: TnColors.muted),
              ),
            ),
            if (facts != null || temple.description != null) ...[
              SectionTitle(l.about),
              _About(temple: temple),
            ],
            if (facts != null && facts.prohibited.isNotEmpty) ...[
              SectionTitle(l.prohibited),
              _Prohibited(items: facts.prohibited),
            ],
            ReviewsSection(targetType: 'temple', targetId: temple.id),
            const SizedBox(height: 96),
          ]),
        ),
      ],
    );
  }
}

/// "Notify me when aarti starts" — a push even when the app is closed.
class _AlertToggle extends ConsumerStatefulWidget {
  const _AlertToggle({required this.templeId});
  final String templeId;

  @override
  ConsumerState<_AlertToggle> createState() => _AlertToggleState();
}

class _AlertToggleState extends ConsumerState<_AlertToggle> {
  bool _busy = false;

  Future<void> _toggle(bool on) async {
    if (!requireSignedIn(context, ref)) return;
    setState(() => _busy = true);
    try {
      final api = ref.read(apiClientProvider);
      if (on) {
        await api.put('/aarti-alerts/${widget.templeId}');
      } else {
        await api.delete('/aarti-alerts/${widget.templeId}');
      }
      ref.invalidate(aartiAlertsProvider);
      if (mounted) showSnack(context, on ? context.l10n.aartiAlertOn : context.l10n.aartiAlertOff);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final on = ref.watch(aartiAlertsProvider).value?.contains(widget.templeId) ?? false;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.fromLTRB(14, 10, 8, 10),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFFFFF3E0), Color(0xFFFFFBF3)]),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF6D9B0)),
      ),
      child: Row(
        children: [
          const Icon(Icons.notifications_active_rounded, color: TnColors.saffron),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l.aartiAlertTitle, style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(l.aartiAlertSub, style: const TextStyle(color: TnColors.muted, fontSize: 12)),
              ],
            ),
          ),
          Switch(value: on, activeThumbColor: TnColors.saffron, onChanged: _busy ? null : _toggle),
        ],
      ),
    );
  }
}

class _About extends StatelessWidget {
  const _About({required this.temple});
  final TempleDetailResponse temple;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = temple.facts;
    Widget fact(IconData icon, String label, String value, Color color) => Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: TnColors.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 6),
            Text(
              label.toUpperCase(),
              style: const TextStyle(
                fontSize: 10.5,
                letterSpacing: 0.6,
                color: TnColors.muted,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(fontSize: 13, height: 1.35)),
          ],
        ),
      ),
    );
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (f?.famousFor != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: TnColors.navy,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l.whyFamous,
                    style: const TextStyle(
                      color: TnColors.saffron,
                      fontWeight: FontWeight.w800,
                      fontSize: 12.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    f!.famousFor!,
                    style: const TextStyle(
                      fontFamily: 'Cormorant',
                      color: Colors.white,
                      fontSize: 18,
                      height: 1.25,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          if (f?.built != null || f?.visitorsPerYear != null) ...[
            const SizedBox(height: 10),
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (f?.built != null)
                    fact(Icons.account_balance_rounded, l.builtWhen, f!.built!, TnColors.navy),
                  if (f?.built != null && f?.visitorsPerYear != null) const SizedBox(width: 10),
                  if (f?.visitorsPerYear != null)
                    fact(
                      Icons.groups_rounded,
                      l.visitorsYear,
                      f!.visitorsPerYear!,
                      TnColors.saffron,
                    ),
                ],
              ),
            ),
          ],
          if (f != null && f.highlights.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(
              l.specialities,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 15,
                color: TnColors.navy,
              ),
            ),
            const SizedBox(height: 6),
            for (final h in f.highlights)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 2),
                      child: Icon(Icons.auto_awesome_rounded, size: 16, color: TnColors.saffron),
                    ),
                    const SizedBox(width: 8),
                    Expanded(child: Text(h, style: const TextStyle(height: 1.4))),
                  ],
                ),
              ),
          ],
          if (temple.description != null) ...[
            const SizedBox(height: 10),
            Text(
              [temple.description, temple.history].whereType<String>().join('\n\n'),
              style: const TextStyle(height: 1.5, color: TnColors.ink),
            ),
          ],
        ],
      ),
    );
  }
}

class _Prohibited extends StatelessWidget {
  const _Prohibited({required this.items});
  final List<String> items;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.symmetric(horizontal: 16),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF1F1),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: const Color(0xFFF5C2C2)),
    ),
    child: Column(
      children: [
        for (final p in items)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: Row(
              children: [
                const Icon(Icons.block_rounded, color: TnColors.sos, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(p, style: const TextStyle(fontWeight: FontWeight.w600)),
                ),
              ],
            ),
          ),
      ],
    ),
  );
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
          if (temple.address != null) ...[
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
