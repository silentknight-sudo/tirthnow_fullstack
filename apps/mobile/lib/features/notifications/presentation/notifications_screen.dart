import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../auth/data/session_controller.dart';
import '../../catalog/data/catalog_repository.dart';

final notificationsProvider = FutureProvider<NotificationPageResponse>((ref) async {
  if (!ref.watch(sessionProvider).signedIn) {
    return const NotificationPageResponse(data: [], unreadCount: 0);
  }
  return NotificationPageResponse.fromJson(
    await ref.watch(apiClientProvider).getJson('/notifications', query: {'limit': 50}),
  );
});

final notificationPrefsProvider = FutureProvider<NotificationPreferencesDto>((ref) async {
  return NotificationPreferencesDto.fromJson(
    await ref.watch(apiClientProvider).getJson('/notifications/preferences'),
  );
});

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final api = ref.read(apiClientProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.notifications),
        actions: [
          IconButton(
            tooltip: l.notificationPrefs,
            icon: const Icon(Icons.tune),
            onPressed: () => context.push('/notifications/settings'),
          ),
        ],
      ),
      body: AsyncView(
        value: ref.watch(notificationsProvider),
        onRetry: () => ref.invalidate(notificationsProvider),
        builder: (page) => page.data.isEmpty
            ? const EmptyState(icon: Icons.notifications_none)
            : RefreshIndicator(
                onRefresh: () async => ref.invalidate(notificationsProvider),
                child: ListView(
                  children: [
                    if (page.unreadCount > 0)
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () async {
                            await api.post('/notifications/read-all');
                            ref.invalidate(notificationsProvider);
                          },
                          child: Text(l.markAllRead),
                        ),
                      ),
                    for (final n in page.data)
                      ListTile(
                        leading: Icon(
                          n.readAt == null ? Icons.circle : Icons.circle_outlined,
                          size: 10,
                          color: n.readAt == null ? TnColors.saffron : TnColors.line,
                        ),
                        title: Text(
                          n.title ?? n.body,
                          style: TextStyle(
                            fontWeight: n.readAt == null ? FontWeight.w700 : FontWeight.normal,
                          ),
                        ),
                        subtitle: Text(
                          '${n.title != null ? '${n.body}\n' : ''}${formatIstDate(DateTime.parse(n.createdAt), locale: context.lang)} ${formatIstTime(DateTime.parse(n.createdAt))}',
                        ),
                        isThreeLine: n.title != null,
                        onTap: () async {
                          if (n.readAt == null) {
                            await api.post('/notifications/${n.id}/read');
                            ref.invalidate(notificationsProvider);
                          }
                          final orderId = n.data['orderId'];
                          if (orderId is String && context.mounted) {
                            await context.push('/book/orders/$orderId');
                          }
                        },
                      ),
                  ],
                ),
              ),
      ),
    );
  }
}

class NotificationSettingsScreen extends ConsumerWidget {
  const NotificationSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    Future<void> save(NotificationPreferencesDto p) async {
      try {
        await ref.read(apiClientProvider).put('/notifications/preferences', body: p.toJson());
        ref.invalidate(notificationPrefsProvider);
      } on Object catch (e) {
        if (context.mounted) showSnack(context, errorText(context, e));
      }
    }

    return Scaffold(
      appBar: AppBar(title: Text(l.notificationPrefs)),
      body: AsyncView(
        value: ref.watch(notificationPrefsProvider),
        onRetry: () => ref.invalidate(notificationPrefsProvider),
        builder: (p) => ListView(
          children: [
            SwitchListTile(
              title: Text(l.aartiReminders),
              value: p.aartiReminders ?? true,
              onChanged: (v) => save(_copy(p, aarti: v)),
            ),
            SwitchListTile(
              title: Text(l.myBookings),
              value: p.bookingUpdates ?? true,
              onChanged: (v) => save(_copy(p, bookings: v)),
            ),
            ListTile(
              title: Text(l.remindMe),
              trailing: DropdownButton<int>(
                value: (p.defaultReminderMinutes ?? 30).round(),
                items: [
                  for (final m in const [10, 15, 30, 45, 60])
                    DropdownMenuItem(value: m, child: Text(l.minutesBefore('$m'))),
                ],
                onChanged: (v) => v == null ? null : save(_copy(p, minutes: v)),
              ),
            ),
            SectionTitle(l.aartiReminders),
            ref
                .watch(remindersProvider)
                .when(
                  loading: () => const LinearProgressIndicator(),
                  error: (e, _) => ErrorPanel(error: e),
                  data: (list) => Column(
                    children: [
                      if (list.isEmpty) const EmptyState(icon: Icons.notifications_none),
                      for (final r in list)
                        ListTile(
                          leading: const Icon(Icons.notifications_active, color: TnColors.accent),
                          title: Text(r.aartiName),
                          subtitle: Text(
                            '${r.templeName} · ${l.minutesBefore('${r.minutesBefore}')}',
                          ),
                          trailing: IconButton(
                            tooltip: l.delete,
                            icon: const Icon(Icons.delete_outline),
                            onPressed: () async {
                              await ref.read(catalogRepositoryProvider).removeReminder(r.id);
                              ref.invalidate(remindersProvider);
                            },
                          ),
                        ),
                    ],
                  ),
                ),
          ],
        ),
      ),
    );
  }

  static NotificationPreferencesDto _copy(
    NotificationPreferencesDto p, {
    bool? aarti,
    bool? bookings,
    int? minutes,
  }) => NotificationPreferencesDto(
    aartiReminders: aarti ?? p.aartiReminders,
    bookingUpdates: bookings ?? p.bookingUpdates,
    defaultReminderMinutes: minutes ?? p.defaultReminderMinutes,
    marketing: p.marketing,
  );
}
