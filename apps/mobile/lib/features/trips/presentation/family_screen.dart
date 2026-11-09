import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../bookings/presentation/checkout_flow.dart';
import '../data/trips_repository.dart';
import 'trips_screen.dart' show shareOnWhatsApp;

/// Family tracking: create or join a group with a code, choose whether the
/// group may see your trip location, and see members who share with you.
class FamilyScreen extends ConsumerWidget {
  const FamilyScreen({super.key});

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final l = context.l10n;
    final name = await _ask(context, l.createFamilyGroup, l.groupName, l.familyNameHint);
    if (name == null || !context.mounted) return;
    try {
      await ref.read(tripsRepositoryProvider).createGroup(name);
      ref.invalidate(familyGroupsProvider);
    } on Object catch (e) {
      if (context.mounted) showSnack(context, errorText(context, e));
    }
  }

  Future<void> _join(BuildContext context, WidgetRef ref) async {
    final l = context.l10n;
    final code = await _ask(context, l.joinFamilyGroup, l.joinCode, 'K7P2QX', code: true);
    if (code == null || !context.mounted) return;
    try {
      await ref.read(tripsRepositoryProvider).joinGroup(code);
      ref.invalidate(familyGroupsProvider);
      if (context.mounted) showSnack(context, l.joinedGroup);
    } on Object catch (e) {
      if (context.mounted) showSnack(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final groups = ref.watch(familyGroupsProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.familyTracking)),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(familyGroupsProvider),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F0FF),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Icon(Icons.verified_user_rounded, color: Color(0xFF7048E8)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      l.familyPrivacy,
                      style: const TextStyle(fontSize: 12.5, height: 1.35),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () {
                      if (requireSignedIn(context, ref)) _create(context, ref);
                    },
                    icon: const Icon(Icons.group_add_rounded),
                    label: Text(l.createGroup),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      if (requireSignedIn(context, ref)) _join(context, ref);
                    },
                    icon: const Icon(Icons.login_rounded),
                    label: Text(l.joinWithCode),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            groups.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) =>
                  Text(errorText(context, e), style: const TextStyle(color: TnColors.sos)),
              data: (list) => list.isEmpty
                  ? EmptyState(icon: Icons.family_restroom_rounded, message: l.noFamilyGroups)
                  : Column(children: [for (final g in list) _GroupCard(group: g)]),
            ),
          ],
        ),
      ),
    );
  }
}

Future<String?> _ask(
  BuildContext context,
  String title,
  String label,
  String hint, {
  bool code = false,
}) {
  final c = TextEditingController();
  return showDialog<String>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: TextField(
        controller: c,
        autofocus: true,
        maxLength: code ? 6 : 60,
        textCapitalization: code ? TextCapitalization.characters : TextCapitalization.words,
        inputFormatters: code ? [FilteringTextInputFormatter.allow(RegExp('[A-Za-z0-9]'))] : null,
        decoration: InputDecoration(labelText: label, hintText: hint),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: Text(ctx.l10n.cancel)),
        FilledButton(
          onPressed: () {
            final v = c.text.trim();
            if (v.isEmpty || (code && v.length != 6)) return;
            Navigator.pop(ctx, v);
          },
          child: Text(ctx.l10n.ok),
        ),
      ],
    ),
  );
}

class _GroupCard extends ConsumerStatefulWidget {
  const _GroupCard({required this.group});

  final FamilyGroupResponse group;

  @override
  ConsumerState<_GroupCard> createState() => _GroupCardState();
}

class _GroupCardState extends ConsumerState<_GroupCard> {
  bool _busy = false;

  Future<void> _setSharing(bool on) async {
    setState(() => _busy = true);
    try {
      await ref.read(tripsRepositoryProvider).setGroupSharing(widget.group.id, on);
      ref.invalidate(familyGroupsProvider);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _leave() async {
    final l = context.l10n;
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(widget.group.isOwner ? l.deleteGroup : l.leaveGroup),
        content: Text(widget.group.isOwner ? l.deleteGroupConfirm : l.leaveGroupConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: Text(l.cancel)),
          FilledButton(onPressed: () => Navigator.pop(c, true), child: Text(l.ok)),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(tripsRepositoryProvider).leaveGroup(widget.group.id);
      ref.invalidate(familyGroupsProvider);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final g = widget.group;
    final me = g.members.where((m) => m.isMe).firstOrNull;
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: TnColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 8, 4),
            child: Row(
              children: [
                const Icon(Icons.family_restroom_rounded, color: Color(0xFF7048E8)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    g.name,
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: (v) => v == 'leave' ? _leave() : null,
                  itemBuilder: (_) => [
                    PopupMenuItem(
                      value: 'leave',
                      child: Text(g.isOwner ? l.deleteGroup : l.leaveGroup),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Text('${l.joinCode}: ', style: const TextStyle(color: TnColors.muted)),
                SelectableText(
                  g.joinCode,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    letterSpacing: 3,
                    fontSize: 16,
                  ),
                ),
                const Spacer(),
                TextButton.icon(
                  onPressed: () => shareOnWhatsApp(l.familyInvite(g.name, g.joinCode)),
                  icon: const Icon(Icons.chat_rounded, color: Color(0xFF25D366), size: 18),
                  label: Text(l.invite),
                ),
              ],
            ),
          ),
          if (me != null)
            SwitchListTile(
              value: me.sharing,
              onChanged: _busy ? null : _setSharing,
              secondary: const Icon(Icons.share_location_rounded, color: TnColors.navy),
              title: Text(l.shareWithGroup),
              subtitle: Text(l.shareWithGroupSub, style: const TextStyle(fontSize: 12)),
            ),
          const Divider(height: 1),
          for (final m in g.members.where((m) => !m.isMe)) _MemberRow(member: m),
          if (g.members.length == 1)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(l.inviteFamilyHint, style: const TextStyle(color: TnColors.muted)),
            ),
        ],
      ),
    );
  }
}

class _MemberRow extends StatelessWidget {
  const _MemberRow({required this.member});

  final FamilyMemberResponse member;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final m = member;
    final hasLoc = m.lat != null && m.lng != null;
    final status = m.trip == null
        ? l.notOnTrip
        : hasLoc
        ? l.lastUpdated(
            DateFormat('d MMM, HH:mm', context.lang).format(toIst(DateTime.parse(m.locationAt!))),
          )
        : l.onTripNotSharing;
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: TnColors.saffron,
        backgroundImage: m.avatarUrl == null ? null : NetworkImage(m.avatarUrl!),
        child: m.avatarUrl == null
            ? Text(
                m.name.characters.first.toUpperCase(),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
              )
            : null,
      ),
      title: Row(
        children: [
          Flexible(
            child: Text(m.name, style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
          if (m.trip != null) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0x1A2F9E44),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                l.onTrip,
                style: const TextStyle(
                  color: Color(0xFF2F9E44),
                  fontSize: 10.5,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ],
      ),
      subtitle: Text(
        [if (m.trip != null) m.trip!.title, status].join(' · '),
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: hasLoc
          ? IconButton.filledTonal(
              tooltip: l.openInMaps,
              icon: const Icon(Icons.map_rounded),
              onPressed: () => launchUrl(
                Uri.parse('https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}'),
                mode: LaunchMode.externalApplication,
              ),
            )
          : null,
    );
  }
}
