import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/place_images.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../catalog/presentation/temples_screen.dart' show crowdLabel;

/// Every temple (no city filter), for matching names in chat answers.
final guideTemplesProvider = FutureProvider<List<TempleSummaryResponse>>(
  (ref) => ref.watch(catalogRepositoryProvider).temples(),
);

/// A place the conversation is about. Built only from catalog data, never
/// from model text, so photos, names and coordinates are always real.
@immutable
class GuidePlace {
  const GuidePlace.temple(this.temple) : city = null, cityTemples = const [];
  const GuidePlace.city(CityResponse this.city, this.cityTemples) : temple = null;

  final TempleSummaryResponse? temple;
  final CityResponse? city;
  final List<TempleSummaryResponse> cityTemples;

  double get lat => (temple?.lat ?? city!.lat).toDouble();
  double get lng => (temple?.lng ?? city!.lng).toDouble();
}

const _generic = {'shri', 'sri', 'temple', 'mandir', 'ji', 'the', 'of', 'dham', 'ka', 'ki'};

String _key(String name) => name
    .toLowerCase()
    .replaceAll(RegExp(r'[^a-z0-9 ]'), ' ')
    .split(RegExp(r'\s+'))
    .where((w) => w.isNotEmpty && !_generic.contains(w))
    .join(' ');

/// Finds the place a question (first) or its answer is about.
GuidePlace? detectPlace(
  String question,
  String answer,
  List<TempleSummaryResponse> temples,
  List<CityResponse> cities,
) {
  String norm(String s) => ' ${_key(s)} ';
  TempleSummaryResponse? templeIn(String text) {
    TempleSummaryResponse? best;
    var bestLen = 0;
    for (final t in temples) {
      final k = _key(t.name);
      if (k.length < 4) continue;
      if (text.contains(' $k ') && k.length > bestLen) {
        best = t;
        bestLen = k.length;
      }
    }
    return best;
  }

  CityResponse? cityIn(String text) {
    for (final c in cities) {
      final k = _key(c.name);
      if (k.length >= 4 && text.contains(' $k ')) return c;
    }
    return null;
  }

  GuidePlace? cityPlace(CityResponse c) => GuidePlace.city(c, [
    for (final t in temples)
      if (t.cityId == c.id) t,
  ]);

  final q = norm(question);
  final a = norm(answer);
  final tq = templeIn(q);
  if (tq != null) return GuidePlace.temple(tq);
  final cq = cityIn(q);
  if (cq != null) return cityPlace(cq);
  final ta = templeIn(a);
  if (ta != null) return GuidePlace.temple(ta);
  final ca = cityIn(a);
  return ca == null ? null : cityPlace(ca);
}

Future<void> openInMaps(double lat, double lng) => launchUrl(
  Uri.parse('https://www.google.com/maps/search/?api=1&query=$lat,$lng'),
  mode: LaunchMode.externalApplication,
);

/// Rich answer card: title, the guide's answer, photo carousel, highlights
/// and actions (View on Map, Plan Your Trip / Temple details).
class PlaceAnswerCard extends ConsumerWidget {
  const PlaceAnswerCard({required this.place, required this.answer, super.key});

  final GuidePlace place;
  final String answer;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final temple = place.temple;
    final detail = temple == null ? null : ref.watch(templeProvider(temple.id)).value;
    final images = temple != null
        ? <String>{temple.coverUrl ?? templeImage(temple.slug), ...?detail?.galleryUrls}.toList()
        : <String>{for (final t in place.cityTemples.take(4)) t.coverUrl ?? templeImage(t.slug)}
              .toList();
    final highlights = temple != null
        ? <String>[
            if (detail?.nextAarti != null)
              l.gNextAarti(detail!.nextAarti!.name, detail.nextAarti!.localTime),
            if (detail?.dressCode != null) detail!.dressCode!,
            if (temple.tags.isNotEmpty) temple.tags.take(3).join(' · '),
            crowdLabel(context, temple.crowdLevel),
          ]
        : [for (final t in place.cityTemples.take(4)) t.name];
    final title = temple?.name ?? l.gDham(place.city!.name);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontFamily: 'Cormorant',
            fontSize: 21,
            fontWeight: FontWeight.w800,
            color: TnColors.navy,
            height: 1.1,
          ),
        ),
        const SizedBox(height: 6),
        Text(answer, style: const TextStyle(color: TnColors.ink, height: 1.45, fontSize: 14.5)),
        if (images.isNotEmpty) ...[const SizedBox(height: 10), _Carousel(images: images)],
        if (highlights.isNotEmpty) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: TnColors.saffron, size: 18),
              const SizedBox(width: 6),
              Text(
                l.gHighlights,
                style: const TextStyle(
                  fontFamily: 'Cormorant',
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: TnColors.ink,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          for (final h in highlights)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.check_circle_rounded, color: Color(0xFFF2A73B), size: 18),
                  const SizedBox(width: 8),
                  Expanded(child: Text(h, style: const TextStyle(fontSize: 14))),
                ],
              ),
            ),
        ],
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFFF6F7FB),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: TnColors.line),
          ),
          child: IntrinsicHeight(
            child: Row(
              children: [
                _CardAction(
                  icon: Icons.location_on_rounded,
                  label: l.gViewOnMap,
                  onTap: () => unawaited(openInMaps(place.lat, place.lng)),
                ),
                const VerticalDivider(width: 1, indent: 10, endIndent: 10),
                temple != null
                    ? _CardAction(
                        icon: Icons.temple_hindu_rounded,
                        label: l.gTempleDetails,
                        onTap: () => context.push('/temples/${temple.slug}'),
                      )
                    : _CardAction(
                        icon: Icons.directions_car_rounded,
                        label: l.heroPlanTrip,
                        onTap: () => context.push('/guide/planner'),
                      ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _CardAction extends StatelessWidget {
  const _CardAction({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Expanded(
    child: InkWell(
      borderRadius: BorderRadius.circular(24),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 11, horizontal: 6),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: TnColors.navy, size: 20),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w600, color: TnColors.ink),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _Carousel extends StatefulWidget {
  const _Carousel({required this.images});
  final List<String> images;

  @override
  State<_Carousel> createState() => _CarouselState();
}

class _CarouselState extends State<_Carousel> {
  final _pages = PageController();
  int _i = 0;

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  void _go(int d) => unawaited(
    _pages.animateToPage(
      (_i + d).clamp(0, widget.images.length - 1),
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeOut,
    ),
  );

  @override
  Widget build(BuildContext context) {
    final n = widget.images.length;
    Widget arrow(IconData icon, int d) => Material(
      color: Colors.white,
      shape: const CircleBorder(),
      elevation: 2,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: () => _go(d),
        child: Padding(padding: const EdgeInsets.all(6), child: Icon(icon, size: 20)),
      ),
    );
    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: SizedBox(
        height: 150,
        child: Stack(
          children: [
            PageView.builder(
              controller: _pages,
              itemCount: n,
              onPageChanged: (i) => setState(() => _i = i),
              itemBuilder: (_, i) => guideImage(widget.images[i]),
            ),
            if (n > 1) ...[
              Positioned(
                top: 8,
                right: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0x99000000),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_i + 1} / $n',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              if (_i > 0)
                Positioned(
                  left: 8,
                  top: 0,
                  bottom: 0,
                  child: Center(child: arrow(Icons.chevron_left_rounded, -1)),
                ),
              if (_i < n - 1)
                Positioned(
                  right: 8,
                  top: 0,
                  bottom: 0,
                  child: Center(child: arrow(Icons.chevron_right_rounded, 1)),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

/// "Temples near you" card for the Location attachment (distances from the
/// phone's position to catalog temples).
class NearbyCard extends StatelessWidget {
  const NearbyCard({required this.items, super.key});

  final List<(TempleSummaryResponse, double)> items;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l.gNearby,
          style: const TextStyle(
            fontFamily: 'Cormorant',
            fontSize: 19,
            fontWeight: FontWeight.w800,
            color: TnColors.navy,
          ),
        ),
        const SizedBox(height: 6),
        for (final (t, km) in items)
          ListTile(
            contentPadding: EdgeInsets.zero,
            dense: true,
            leading: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: SizedBox(
                width: 48,
                height: 48,
                child: guideImage(t.coverUrl ?? templeImage(t.slug)),
              ),
            ),
            title: Text(t.name, style: const TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text(l.gKmAway(km.toStringAsFixed(1))),
            trailing: IconButton(
              icon: const Icon(Icons.location_on_rounded, color: TnColors.navy),
              onPressed: () => unawaited(openInMaps(t.lat.toDouble(), t.lng.toDouble())),
            ),
            onTap: () => context.push('/temples/${t.slug}'),
          ),
      ],
    );
  }
}

String formatChatTime(DateTime t) => formatIstTime(t);

/// Network photo or a bundled asset (catalog photos fall back to assets).
Widget guideImage(String src) => src.startsWith('assets/')
    ? Image.asset(src, fit: BoxFit.cover, width: double.infinity)
    : Image.network(
        src,
        fit: BoxFit.cover,
        width: double.infinity,
        errorBuilder: (_, _, _) => const ColoredBox(color: TnColors.paper2),
      );
