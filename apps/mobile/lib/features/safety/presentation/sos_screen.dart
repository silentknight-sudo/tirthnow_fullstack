import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../auth/data/session_controller.dart';
import '../../catalog/data/catalog_repository.dart';
import '../data/location_service.dart';

/// Active SOS for this app session (survives leaving the screen).
class ActiveSos extends Notifier<SosResponse?> {
  @override
  SosResponse? build() => null;

  void set(SosResponse? s) => state = s;
}

final activeSosProvider = NotifierProvider<ActiveSos, SosResponse?>(ActiveSos.new);

final emergencyContactsProvider = FutureProvider<List<EmergencyContactResponse>>((ref) async {
  final s = ref.watch(sessionProvider);
  if (!s.signedIn) return const [];
  final api = ref.watch(apiClientProvider);
  return (await api.getList('/me/emergency-contacts'))
      .map(EmergencyContactResponse.fromJson)
      .toList();
});

/// Press-and-hold SOS: a 5-second hold prevents pocket alerts. Works for
/// guests too (the API accepts guest users for SOS).
class SosScreen extends ConsumerStatefulWidget {
  const SosScreen({super.key});

  @override
  ConsumerState<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends ConsumerState<SosScreen> with SingleTickerProviderStateMixin {
  static const holdSeconds = 5;
  late final AnimationController _hold = AnimationController(
    vsync: this,
    duration: const Duration(seconds: holdSeconds),
  )..addStatusListener(_onHoldStatus);
  bool _sending = false;
  bool _approximate = false;
  Timer? _locationTimer;

  @override
  void dispose() {
    _hold.dispose();
    _locationTimer?.cancel();
    super.dispose();
  }

  void _onHoldStatus(AnimationStatus status) {
    if (status == AnimationStatus.completed) unawaited(_trigger());
  }

  Future<void> _trigger() async {
    if (_sending) return;
    setState(() => _sending = true);
    unawaited(HapticFeedback.heavyImpact());
    final api = ref.read(apiClientProvider);
    try {
      if (!ref.read(sessionProvider).signedIn) {
        await ref.read(sessionProvider.notifier).continueAsGuest();
      }
      final fix = await ref.read(locationServiceProvider).current();
      _approximate = fix.approximate;
      final sos = SosResponse.fromJson(
        asJson(
          await api.post(
            '/safety/sos',
            body: TriggerSosDto(lat: fix.lat, lng: fix.lng, accuracyM: fix.accuracyM).toJson(),
            idempotencyKey: ApiClient.newIdempotencyKey(),
          ),
        ),
      );
      ref.read(activeSosProvider.notifier).set(sos);
      _startLocationUpdates(sos.id);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      _hold.reset();
      if (mounted) setState(() => _sending = false);
    }
  }

  /// Keeps family's live-location link fresh every 30 s while the alert is open.
  void _startLocationUpdates(String id) {
    _locationTimer?.cancel();
    _locationTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
      final active = ref.read(activeSosProvider);
      if (active == null || active.id != id) {
        _locationTimer?.cancel();
        return;
      }
      try {
        final fix = await ref.read(locationServiceProvider).current();
        if (fix.approximate) return;
        await ref
            .read(apiClientProvider)
            .post(
              '/safety/sos/$id/location',
              body: SosLocationDto(lat: fix.lat, lng: fix.lng, accuracyM: fix.accuracyM).toJson(),
            );
      } on Object {
        // Next tick retries.
      }
    });
  }

  Future<void> _close({required bool cancel}) async {
    final sos = ref.read(activeSosProvider);
    if (sos == null) return;
    try {
      final api = ref.read(apiClientProvider);
      cancel
          ? await api.post('/safety/sos/${sos.id}/cancel')
          : await api.post('/safety/sos/${sos.id}/resolve', body: const ResolveSosDto().toJson());
      _locationTimer?.cancel();
      ref.read(activeSosProvider.notifier).set(null);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final sos = ref.watch(activeSosProvider);
    final directory = ref.watch(safetyDirectoryProvider);
    final contacts = ref.watch(emergencyContactsProvider).value ?? const [];
    return Scaffold(
      backgroundColor: TnColors.night,
      appBar: AppBar(
        backgroundColor: TnColors.night,
        foregroundColor: const Color(0xFFF7E7C5),
        title: Text(l.sosTitle, style: const TextStyle(color: Color(0xFFF7E7C5))),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
        children: [
          if (sos == null) ...[
            const SizedBox(height: 16),
            Center(
              child: _SosButton(controller: _hold, sending: _sending),
            ),
            const SizedBox(height: 16),
            AnimatedBuilder(
              animation: _hold,
              builder: (_, _) => Text(
                _hold.isAnimating
                    ? l.sosCountdown('${(holdSeconds * (1 - _hold.value)).ceil()}')
                    : l.sosHold,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFFF7E7C5), fontSize: 16),
              ),
            ),
            if (contacts.isEmpty) ...[
              const SizedBox(height: 16),
              Card(
                color: const Color(0x14FFFFFF),
                child: ListTile(
                  leading: const Icon(Icons.contact_phone_outlined, color: TnColors.goldSoft),
                  title: Text(l.sosNoContacts, style: const TextStyle(color: Color(0xFFE9D6B4))),
                  trailing: const Icon(Icons.chevron_right, color: TnColors.goldSoft),
                  onTap: () => context.push('/profile/contacts'),
                ),
              ),
            ],
          ] else
            _ActiveSosPanel(
              sos: sos,
              approximate: _approximate,
              onCancel: () => _close(cancel: true),
              onSafe: () => _close(cancel: false),
            ),
          const SizedBox(height: 24),
          FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: TnColors.sos),
            icon: const Icon(Icons.call),
            label: Text(l.callEmergency),
            onPressed: () => launchUrl(Uri.parse('tel:112')),
          ),
          const SizedBox(height: 16),
          Text(
            l.nearbyHelp,
            style: const TextStyle(color: TnColors.goldSoft, fontWeight: FontWeight.w700),
          ),
          directory.when(
            loading: () =>
                const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator()),
            error: (e, _) =>
                Text(errorText(context, e), style: const TextStyle(color: Color(0xFFE9D6B4))),
            data: (d) => Column(
              children: [
                for (final h in d.helplines) _HelpTile(title: h.name, phone: h.phone),
                for (final p in d.pois.take(6))
                  _HelpTile(title: p.name, subtitle: p.category, phone: p.phoneE164),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SosButton extends StatelessWidget {
  const _SosButton({required this.controller, required this.sending});

  final AnimationController controller;
  final bool sending;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Semantics(
      button: true,
      label: '${l.sosTitle}. ${l.sosHold}',
      child: GestureDetector(
        onTapDown: (_) => sending ? null : controller.forward(),
        onTapUp: (_) => controller.isCompleted ? null : controller.reverse(),
        onTapCancel: () => controller.isCompleted ? null : controller.reverse(),
        child: AnimatedBuilder(
          animation: controller,
          builder: (_, _) => SizedBox(
            width: 220,
            height: 220,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 220,
                  height: 220,
                  child: CircularProgressIndicator(
                    value: controller.value,
                    strokeWidth: 6,
                    color: const Color(0xFFFFD78A),
                    backgroundColor: const Color(0x33FFFFFF),
                  ),
                ),
                Container(
                  width: 190,
                  height: 190,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [Color(0xFFEF5A4C), TnColors.sos],
                      center: Alignment(-0.3, -0.4),
                    ),
                    boxShadow: [
                      BoxShadow(color: Color(0x99B3261E), blurRadius: 40, spreadRadius: 4),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: sending
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          l.sosTitle,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 48,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 4,
                          ),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ActiveSosPanel extends StatelessWidget {
  const _ActiveSosPanel({
    required this.sos,
    required this.approximate,
    required this.onCancel,
    required this.onSafe,
  });

  final SosResponse sos;
  final bool approximate;
  final VoidCallback onCancel;
  final VoidCallback onSafe;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final cancellable = DateTime.parse(sos.createdAt)
        .add(Duration(seconds: sos.cancellableForS.round()))
        .isAfter(DateTime.now());
    return Card(
      color: const Color(0x1AFFFFFF),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.health_and_safety, color: Color(0xFFFFD78A), size: 48),
            const SizedBox(height: 8),
            Text(
              l.sosActive,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Color(0xFFF7E7C5),
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (approximate) ...[
              const SizedBox(height: 8),
              Text(
                l.locationDenied,
                textAlign: TextAlign.center,
                style: const TextStyle(color: TnColors.goldSoft),
              ),
            ],
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: const Icon(Icons.share_location),
              label: Text(l.sosShareLink),
              onPressed: () => SharePlus.instance.share(ShareParams(text: sos.shareUrl)),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFF7E7C5)),
              onPressed: onSafe,
              child: Text(l.sosSafe),
            ),
            if (cancellable)
              TextButton(
                style: TextButton.styleFrom(foregroundColor: TnColors.goldSoft),
                onPressed: onCancel,
                child: Text(l.sosCancel),
              ),
          ],
        ),
      ),
    );
  }
}

class _HelpTile extends StatelessWidget {
  const _HelpTile({required this.title, this.subtitle, this.phone});

  final String title;
  final String? subtitle;
  final String? phone;

  @override
  Widget build(BuildContext context) {
    final p = phone;
    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(title, style: const TextStyle(color: Color(0xFFF7E7C5))),
      subtitle: subtitle == null
          ? null
          : Text(subtitle!, style: const TextStyle(color: Color(0xFFB9A17E))),
      trailing: p == null
          ? null
          : IconButton(
              tooltip: p,
              icon: const Icon(Icons.call, color: TnColors.goldSoft),
              onPressed: () => launchUrl(Uri.parse('tel:$p')),
            ),
    );
  }
}
