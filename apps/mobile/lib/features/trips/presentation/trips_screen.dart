import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../bookings/presentation/checkout_flow.dart';
import '../data/trips_repository.dart';

/// Opens WhatsApp with [text]; falls back to the system share sheet.
Future<void> shareOnWhatsApp(String text) async {
  final uri = Uri.parse('https://wa.me/?text=${Uri.encodeComponent(text)}');
  if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
    await SharePlus.instance.share(ShareParams(text: text));
  }
}

String _when(BuildContext context, String iso) =>
    DateFormat('d MMM, HH:mm', context.lang).format(toIst(DateTime.parse(iso)));

/// My Trips: start or end a pilgrimage, share it, family tracking, history.
class TripsScreen extends ConsumerWidget {
  const TripsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final active = ref.watch(activeTripProvider);
    final history = ref.watch(tripHistoryProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.myTrips)),
      body: RefreshIndicator(
        onRefresh: () async {
          ref
            ..invalidate(activeTripProvider)
            ..invalidate(tripHistoryProvider);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
          children: [
            active.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) =>
                  Text(errorText(context, e), style: const TextStyle(color: TnColors.sos)),
              data: (t) => t == null ? const _StartTrip() : _ActiveTrip(trip: t),
            ),
            const SizedBox(height: 14),
            _LinkTile(
              icon: Icons.family_restroom_rounded,
              color: const Color(0xFF7048E8),
              title: l.familyTracking,
              subtitle: l.familyTrackingSub,
              onTap: () => context.push('/trips/family'),
            ),
            _LinkTile(
              icon: Icons.event_available_rounded,
              color: TnColors.navy,
              title: l.myBookings,
              subtitle: l.myBookingsSub,
              onTap: () => context.go('/book/orders'),
            ),
            _LinkTile(
              icon: Icons.auto_awesome,
              color: TnColors.saffron,
              title: l.planGroupYatra,
              subtitle: l.planGroupYatraSub,
              onTap: () => context.push('/guide/planner'),
            ),
            const SizedBox(height: 10),
            Text(l.tripHistory, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            history.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) =>
                  Text(errorText(context, e), style: const TextStyle(color: TnColors.sos)),
              data: (list) {
                final past = list.where((t) => t.status == 'ended').toList();
                if (past.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(l.noPastTrips, style: const TextStyle(color: TnColors.muted)),
                  );
                }
                return Column(
                  children: [
                    for (final t in past)
                      Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: const CircleAvatar(
                            backgroundColor: Color(0x1A2F9E44),
                            child: Icon(Icons.check_rounded, color: Color(0xFF2F9E44)),
                          ),
                          title: Text(t.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text(
                            [
                              _when(context, t.startedAt),
                              if (t.endedAt != null) _when(context, t.endedAt!),
                              if (t.fromPlace != null) l.fromPlace(t.fromPlace!),
                            ].join(' → '),
                          ),
                        ),
                      ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _StartTrip extends ConsumerStatefulWidget {
  const _StartTrip();

  @override
  ConsumerState<_StartTrip> createState() => _StartTripState();
}

class _StartTripState extends ConsumerState<_StartTrip> {
  final _title = TextEditingController();
  final _from = TextEditingController();
  bool _share = false;
  bool _busy = false;

  @override
  void dispose() {
    _title.dispose();
    _from.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    if (!requireSignedIn(context, ref)) return;
    final l = context.l10n;
    setState(() => _busy = true);
    try {
      await ref
          .read(activeTripProvider.notifier)
          .start(
            title: _title.text.trim().isEmpty ? null : _title.text.trim(),
            from: _from.text.trim().isEmpty ? null : _from.text.trim(),
            share: _share,
          );
      if (mounted) showSnack(context, l.tripStartedMsg);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: const LinearGradient(
          colors: [TnColors.navy, Color(0xFF2B4F86)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(Icons.route_rounded, color: TnColors.accentSoft),
              const SizedBox(width: 8),
              Text(
                l.startPilgrimage,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(l.startPilgrimageSub, style: const TextStyle(color: Colors.white70, fontSize: 12.5)),
          const SizedBox(height: 12),
          TextField(
            controller: _title,
            maxLength: 80,
            decoration: InputDecoration(hintText: l.tripTitleHint, counterText: ''),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _from,
            maxLength: 80,
            decoration: InputDecoration(
              hintText: l.travellingFrom,
              prefixIcon: const Icon(Icons.my_location_rounded),
              counterText: '',
            ),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: _share,
            onChanged: (v) => setState(() => _share = v),
            title: Text(l.shareLiveLocation, style: const TextStyle(color: Colors.white)),
            subtitle: Text(
              l.shareConsent,
              style: const TextStyle(color: Colors.white60, fontSize: 12),
            ),
          ),
          FilledButton.icon(
            style: FilledButton.styleFrom(
              backgroundColor: TnColors.saffron,
              minimumSize: const Size.fromHeight(48),
            ),
            onPressed: _busy ? null : _start,
            icon: const Icon(Icons.play_arrow_rounded),
            label: Text(l.startTrip),
          ),
        ],
      ),
    );
  }
}

class _ActiveTrip extends ConsumerStatefulWidget {
  const _ActiveTrip({required this.trip});

  final TripResponse trip;

  @override
  ConsumerState<_ActiveTrip> createState() => _ActiveTripState();
}

class _ActiveTripState extends ConsumerState<_ActiveTrip> {
  bool _busy = false;

  Future<void> _run(Future<void> Function() f) async {
    setState(() => _busy = true);
    try {
      await f();
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _end() async {
    final l = context.l10n;
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(l.endTrip),
        content: Text(l.endTripConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: Text(l.cancel)),
          FilledButton(onPressed: () => Navigator.pop(c, true), child: Text(l.endTrip)),
        ],
      ),
    );
    if (ok != true) return;
    await _run(() async {
      await ref.read(activeTripProvider.notifier).end();
      if (mounted) showSnack(context, l.tripEndedMsg);
    });
  }

  Future<void> _whatsapp() => _run(() async {
    final s = await ref.read(tripsRepositoryProvider).share(widget.trip.id);
    await shareOnWhatsApp(s.message);
  });

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final t = widget.trip;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: TnColors.line),
        boxShadow: const [
          BoxShadow(color: Color(0x141C3C6B), blurRadius: 14, offset: Offset(0, 6)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF2F9E44),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  l.tripInProgress,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 12,
                  ),
                ),
              ),
              const Spacer(),
              if (t.sharingLocation)
                const Row(
                  children: [
                    Icon(Icons.sensors_rounded, color: Color(0xFF2F9E44), size: 18),
                    SizedBox(width: 4),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(t.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(
            [
              l.startedAt(_when(context, t.startedAt)),
              if (t.fromPlace != null) l.fromPlace(t.fromPlace!),
            ].join(' · '),
            style: const TextStyle(color: TnColors.muted),
          ),
          const Divider(height: 24),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            secondary: Icon(
              t.sharingLocation ? Icons.location_on_rounded : Icons.location_off_rounded,
              color: t.sharingLocation ? const Color(0xFF2F9E44) : TnColors.muted,
            ),
            title: Text(t.sharingLocation ? l.sharingOn : l.sharingPaused),
            subtitle: Text(
              t.lastLocationAt != null && t.sharingLocation
                  ? l.lastUpdated(_when(context, t.lastLocationAt!))
                  : l.shareConsent,
              style: const TextStyle(fontSize: 12),
            ),
            value: t.sharingLocation,
            onChanged: _busy
                ? null
                : (v) => _run(() => ref.read(activeTripProvider.notifier).setSharing(v)),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF25D366),
                    minimumSize: const Size.fromHeight(46),
                  ),
                  onPressed: _busy ? null : _whatsapp,
                  icon: const Icon(Icons.chat_rounded),
                  label: Text(l.shareWhatsApp),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(46),
                    foregroundColor: TnColors.sos,
                  ),
                  onPressed: _busy ? null : _end,
                  icon: const Icon(Icons.flag_rounded),
                  label: Text(l.endTrip),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _LinkTile extends StatelessWidget {
  const _LinkTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 10),
    child: ListTile(
      onTap: onTap,
      leading: CircleAvatar(
        backgroundColor: color.withValues(alpha: 0.12),
        child: Icon(icon, color: color),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis),
      trailing: const Icon(Icons.chevron_right_rounded),
    ),
  );
}
