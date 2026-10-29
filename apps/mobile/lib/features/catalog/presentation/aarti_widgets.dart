import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/countdown.dart';
import '../../auth/data/session_controller.dart';
import '../data/catalog_repository.dart';

/// Dark "next aarti" card with a live countdown. Times come from the API,
/// which expands each temple's published schedule — never estimated here.
class NextAartiCard extends StatelessWidget {
  const NextAartiCard({super.key, required this.aarti, this.onTap});

  final AartiInstanceResponse aarti;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final starts = DateTime.parse(aarti.startsAt);
    return Material(
      color: TnColors.night,
      borderRadius: BorderRadius.circular(24),
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              const _Diya(),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l.nextAarti.toUpperCase(),
                      style: const TextStyle(
                        color: TnColors.accentSoft,
                        fontSize: 12,
                        letterSpacing: 1.6,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      aarti.name,
                      style: const TextStyle(
                        color: Color(0xFFF3EFE6),
                        fontFamily: 'Cormorant',
                        fontFeatures: liningFigures,
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      [aarti.templeName, '${aarti.localTime} IST'].whereType<String>().join(' · '),
                      style: const TextStyle(color: Color(0xFFB8C3D6)),
                    ),
                    const SizedBox(height: 10),
                    if (!starts.isAfter(DateTime.now()))
                      Pill(l.happeningNow, color: const Color(0xFFFFC58A), icon: Icons.circle)
                    else
                      Row(
                        children: [
                          Text(
                            '${l.startsIn}  ',
                            style: const TextStyle(color: Color(0xFFB8C3D6), fontSize: 12),
                          ),
                          Countdown(
                            target: starts,
                            style: const TextStyle(
                              color: Color(0xFFFFC58A),
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                              fontFeatures: [FontFeature.tabularFigures()],
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

class _Diya extends StatefulWidget {
  const _Diya();

  @override
  State<_Diya> createState() => _DiyaState();
}

class _DiyaState extends State<_Diya> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))
    ..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reduce = MediaQuery.of(context).disableAnimations;
    return SizedBox(
      width: 48,
      height: 56,
      child: Stack(
        alignment: Alignment.bottomCenter,
        children: [
          AnimatedBuilder(
            animation: _c,
            builder: (_, _) => Positioned(
              top: 0,
              child: Transform.scale(
                scale: reduce ? 1 : 0.92 + _c.value * 0.12,
                child: Container(
                  width: 18,
                  height: 30,
                  decoration: const BoxDecoration(
                    gradient: RadialGradient(
                      colors: [Color(0xFFFFF3C4), Color(0xFFFFB347), TnColors.saffron],
                    ),
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(12),
                      bottom: Radius.circular(9),
                    ),
                    boxShadow: [
                      BoxShadow(color: Color(0x73FFB347), blurRadius: 24, spreadRadius: 4),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Container(
            width: 48,
            height: 16,
            decoration: const BoxDecoration(
              color: TnColors.accent,
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
            ),
          ),
        ],
      ),
    );
  }
}

/// One aarti row with an optional reminder bell.
class AartiTile extends ConsumerWidget {
  const AartiTile({super.key, required this.aarti, this.showTemple = true});

  final AartiInstanceResponse aarti;
  final bool showTemple;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final starts = DateTime.parse(aarti.startsAt);
    final past = starts.isBefore(DateTime.now());
    final session = ref.watch(sessionProvider);
    final reminders = session.signedIn && !session.isGuest
        ? ref.watch(remindersProvider).value
        : null;
    final reminder = reminders?.where((r) => r.aartiScheduleId == aarti.scheduleId).firstOrNull;
    return ListTile(
      leading: Text(
        aarti.localTime,
        style: TextStyle(
          fontFamily: 'Cormorant',
          fontFeatures: liningFigures,
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: past ? TnColors.muted : TnColors.navy,
        ),
      ),
      title: Text(aarti.name),
      subtitle: Text(
        [
          if (showTemple) aarti.templeName ?? '',
          if (aarti.date != istDateString()) formatIstDate(starts, locale: context.lang),
        ].where((s) => s.isNotEmpty).join(' · '),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (aarti.isLiveStreamed) Pill(l.live, color: TnColors.sos, icon: Icons.circle),
          IconButton(
            tooltip: reminder == null ? l.remindMe : l.reminderSet,
            icon: Icon(
              reminder == null ? Icons.notifications_none : Icons.notifications_active,
              color: reminder == null ? TnColors.muted : TnColors.accent,
            ),
            onPressed: () => _toggle(context, ref, reminder),
          ),
        ],
      ),
    );
  }

  Future<void> _toggle(BuildContext context, WidgetRef ref, AartiReminderResponse? existing) async {
    final l = context.l10n;
    final session = ref.read(sessionProvider);
    if (!session.signedIn || session.isGuest) {
      showSnack(context, l.signInToContinue);
      return;
    }
    final repo = ref.read(catalogRepositoryProvider);
    try {
      if (existing == null) {
        await repo.addReminder(aarti.scheduleId);
        if (context.mounted) showSnack(context, l.reminderSet);
      } else {
        await repo.removeReminder(existing.id);
        if (context.mounted) showSnack(context, l.reminderRemoved);
      }
      ref.invalidate(remindersProvider);
    } on Object catch (e) {
      if (context.mounted) showSnack(context, errorText(context, e));
    }
  }
}
