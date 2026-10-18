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
        padding: const EdgeInsets.only(bottom: 96),
        children: [
          ListTile(
            contentPadding: const EdgeInsets.all(16),
            leading: CircleAvatar(
              radius: 28,
              backgroundColor: TnColors.paper2,
              child: Text(
                (user?.displayName?.isNotEmpty ?? false) ? user!.displayName![0] : '🙏',
                style: const TextStyle(fontSize: 22),
              ),
            ),
            title: Text(
              session.isGuest ? l.guestUser : (user?.displayName ?? user?.phoneE164 ?? ''),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            subtitle: Text(session.isGuest ? l.guestNote : (user?.phoneE164 ?? '')),
            trailing: session.isGuest
                ? null
                : IconButton(
                    tooltip: l.displayName,
                    icon: const Icon(Icons.edit_outlined),
                    onPressed: () => _editName(context, ref),
                  ),
          ),
          if (session.isGuest)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: FilledButton(
                onPressed: () => ref.read(sessionProvider.notifier).signOut(),
                child: Text(l.signIn),
              ),
            ),
          ListTile(
            leading: const Icon(Icons.translate),
            title: Text(l.language),
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
          _Nav(Icons.receipt_long_outlined, l.myBookings, '/book/orders'),
          _Nav(Icons.contact_phone_outlined, l.emergencyContacts, '/profile/contacts'),
          _Nav(Icons.notifications_none, l.notificationPrefs, '/notifications/settings'),
          _Nav(Icons.bookmark_border, l.saved, '/reels/saved'),
          _Nav(Icons.wb_sunny_outlined, l.weatherAndTrains, '/weather'),
          _Nav(Icons.sos_outlined, l.sosTitle, '/sos'),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout),
            title: Text(l.signOut),
            onTap: () => ref.read(sessionProvider.notifier).signOut(),
          ),
          if (!session.isGuest)
            ListTile(
              leading: const Icon(Icons.delete_forever_outlined, color: TnColors.sos),
              title: Text(l.deleteAccount, style: const TextStyle(color: TnColors.sos)),
              onTap: () => _delete(context, ref),
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

class _Nav extends StatelessWidget {
  const _Nav(this.icon, this.label, this.path);

  final IconData icon;
  final String label;
  final String path;

  @override
  Widget build(BuildContext context) => ListTile(
    leading: Icon(icon),
    title: Text(label),
    trailing: const Icon(Icons.chevron_right),
    onTap: () => context.push(path),
  );
}
