import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../auth/data/session_controller.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final session = ref.watch(sessionProvider);
    final user = session.user;
    final locale = ref.watch(localeProvider).languageCode;
    return Scaffold(
      appBar: AppBar(title: Text(l.profile)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 110),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [TnColors.navy, Color(0xFF27508A)]),
              borderRadius: BorderRadius.circular(22),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundColor: TnColors.saffron,
                      child: Text(
                        (user?.displayName?.isNotEmpty ?? false) ? user!.displayName![0] : '🙏',
                        style: const TextStyle(
                          fontSize: 24,
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            session.isGuest
                                ? l.guestUser
                                : (user?.displayName ?? user?.phoneE164 ?? ''),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          Text(
                            session.isGuest ? l.guestNote : (user?.phoneE164 ?? ''),
                            style: const TextStyle(color: Color(0xFFDFE5EF), fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    if (!session.isGuest)
                      IconButton(
                        tooltip: l.displayName,
                        icon: const Icon(Icons.edit_rounded, color: Colors.white),
                        onPressed: () => _editName(context, ref),
                      ),
                  ],
                ),
                if (session.isGuest) ...[
                  const SizedBox(height: 14),
                  FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: TnColors.saffron,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () => ref.read(sessionProvider.notifier).signOut(),
                    child: Text(l.signIn),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          _Group(
            children: [
              _Row(
                icon: Icons.translate_rounded,
                label: l.language,
                color: const Color(0xFF4338CA),
                tint: const Color(0xFFEEF0FF),
                trailing: SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'en', label: Text('EN')),
                    ButtonSegment(value: 'hi', label: Text('हि')),
                  ],
                  selected: {locale},
                  showSelectedIcon: false,
                  onSelectionChanged: (s) async {
                    ref.read(localeProvider.notifier).set(s.first);
                    if (!session.isGuest) {
                      try {
                        await ref
                            .read(apiClientProvider)
                            .patch(
                              '/me/profile',
                              body: UpdateProfileDto(preferredLang: s.first).toJson(),
                            );
                      } on Object {
                        // Language is still switched locally.
                      }
                    }
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _Group(
            children: [
              _Row.nav(
                context,
                Icons.receipt_long_rounded,
                l.myBookings,
                '/book/orders',
                TnColors.navy,
                const Color(0xFFEFF3FA),
              ),
              _Row.nav(
                context,
                Icons.bookmark_rounded,
                l.saved,
                '/reels/saved',
                const Color(0xFF7C3AED),
                const Color(0xFFF3EEFF),
              ),
              _Row.nav(
                context,
                Icons.notifications_rounded,
                l.notificationPrefs,
                '/notifications/settings',
                TnColors.accent,
                const Color(0xFFFFF1E4),
              ),
              _Row.nav(
                context,
                Icons.wb_sunny_rounded,
                l.weatherAndTrains,
                '/weather',
                const Color(0xFF0E7490),
                const Color(0xFFE7F6F8),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _Group(
            children: [
              _Row.nav(
                context,
                Icons.contact_phone_rounded,
                l.emergencyContacts,
                '/profile/contacts',
                const Color(0xFF15803D),
                const Color(0xFFEAF7EE),
              ),
              _Row.nav(
                context,
                Icons.sos_rounded,
                l.sosTitle,
                '/sos',
                TnColors.sos,
                const Color(0xFFFDECEA),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _Group(
            children: [
              _Row(
                icon: Icons.logout_rounded,
                label: l.signOut,
                color: TnColors.muted,
                tint: const Color(0xFFF1F0EC),
                onTap: () => ref.read(sessionProvider.notifier).signOut(),
              ),
              if (!session.isGuest)
                _Row(
                  icon: Icons.delete_forever_rounded,
                  label: l.deleteAccount,
                  color: TnColors.sos,
                  tint: const Color(0xFFFDECEA),
                  labelColor: TnColors.sos,
                  onTap: () => _delete(context, ref),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _editName(BuildContext context, WidgetRef ref) async {
    final l = context.l10n;
    final c = TextEditingController(text: ref.read(sessionProvider).user?.displayName ?? '');
    final name = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.displayName),
        content: TextField(controller: c, autofocus: true, maxLength: 60),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, c.text.trim()), child: Text(l.save)),
        ],
      ),
    );
    c.dispose();
    if (name == null || name.isEmpty) return;
    try {
      await ref
          .read(apiClientProvider)
          .patch('/me/profile', body: UpdateProfileDto(displayName: name).toJson());
      await ref.read(sessionProvider.notifier).refreshUser();
    } on Object catch (e) {
      if (context.mounted) showSnack(context, errorText(context, e));
    }
  }

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final l = context.l10n;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.deleteAccount),
        content: Text(l.deleteAccountConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.cancel)),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: TnColors.sos),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l.delete),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(sessionProvider.notifier).deleteAccount();
    } on Object catch (e) {
      if (context.mounted) showSnack(context, errorText(context, e));
    }
  }
}

/// White rounded card holding a group of rows, separated by hairlines.
class _Group extends StatelessWidget {
  const _Group({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    child: Column(
      children: [
        for (var i = 0; i < children.length; i++) ...[
          if (i > 0) const Divider(height: 1, indent: 64),
          children[i],
        ],
      ],
    ),
  );
}

class _Row extends StatelessWidget {
  const _Row({
    required this.icon,
    required this.label,
    required this.color,
    required this.tint,
    this.trailing,
    this.onTap,
    this.labelColor,
  });

  _Row.nav(BuildContext context, IconData icon, String label, String path, Color color, Color tint)
    : this(
        icon: icon,
        label: label,
        color: color,
        tint: tint,
        trailing: const Icon(Icons.chevron_right_rounded, color: TnColors.muted),
        onTap: () => context.push(path),
      );

  final IconData icon;
  final String label;
  final Color color;
  final Color tint;
  final Widget? trailing;
  final VoidCallback? onTap;
  final Color? labelColor;

  @override
  Widget build(BuildContext context) => ListTile(
    onTap: onTap,
    leading: Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(color: tint, shape: BoxShape.circle),
      child: Icon(icon, color: color, size: 20),
    ),
    title: Text(
      label,
      style: TextStyle(fontWeight: FontWeight.w600, color: labelColor ?? TnColors.ink),
    ),
    trailing: trailing,
  );
}
