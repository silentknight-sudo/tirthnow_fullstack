import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/phone.dart';
import '../../../core/providers.dart';
import '../../../core/widgets/common.dart';
import '../../bookings/presentation/checkout_flow.dart';
import '../../safety/presentation/sos_screen.dart';

class ContactsScreen extends ConsumerWidget {
  const ContactsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.emergencyContacts)),
      floatingActionButton: FloatingActionButton.extended(
        icon: const Icon(Icons.person_add_alt),
        label: Text(l.addContact),
        onPressed: () => _add(context, ref),
      ),
      body: AsyncView(
        value: ref.watch(emergencyContactsProvider),
        onRetry: () => ref.invalidate(emergencyContactsProvider),
        builder: (list) => list.isEmpty
            ? EmptyState(message: l.sosNoContacts, icon: Icons.contact_phone_outlined)
            : ListView(
                padding: const EdgeInsets.only(bottom: 96),
                children: [
                  for (final c in list)
                    ListTile(
                      leading: const Icon(Icons.person_outline),
                      title: Text(c.name),
                      subtitle: Text(
                        [c.phoneE164, if (c.relation != null) c.relation!].join(' · '),
                      ),
                      trailing: IconButton(
                        tooltip: l.delete,
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () async {
                          try {
                            await ref
                                .read(apiClientProvider)
                                .delete('/me/emergency-contacts/${c.id}');
                            ref.invalidate(emergencyContactsProvider);
                          } on Object catch (e) {
                            if (context.mounted) showSnack(context, errorText(context, e));
                          }
                        },
                      ),
                    ),
                ],
              ),
      ),
    );
  }

  Future<void> _add(BuildContext context, WidgetRef ref) async {
    if (!requireSignedIn(context, ref)) return;
    final l = context.l10n;
    final name = TextEditingController();
    final phone = TextEditingController();
    final relation = TextEditingController();
    final form = GlobalKey<FormState>();
    final ok = await showModalBottomSheet<bool>(
      useRootNavigator: true,
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.fromLTRB(24, 0, 24, 24 + MediaQuery.of(ctx).viewInsets.bottom),
        child: Form(
          key: form,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: name,
                decoration: InputDecoration(labelText: l.name),
                validator: (v) => (v ?? '').trim().isEmpty ? l.name : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: phone,
                keyboardType: TextInputType.phone,
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9+ ]'))],
                decoration: InputDecoration(labelText: l.phoneLabel, prefixText: '+91 '),
                validator: (v) => toIndianE164(v ?? '') == null ? l.phoneInvalid : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: relation,
                decoration: InputDecoration(labelText: l.relation),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  if (form.currentState?.validate() ?? false) Navigator.pop(ctx, true);
                },
                child: Text(l.save),
              ),
            ],
          ),
        ),
      ),
    );
    final dto = EmergencyContactDto(
      name: name.text.trim(),
      phoneE164: toIndianE164(phone.text) ?? '',
      relation: relation.text.trim().isEmpty ? null : relation.text.trim(),
      notifyWhatsapp: true,
    );
    name.dispose();
    phone.dispose();
    relation.dispose();
    if (ok != true) return;
    try {
      await ref.read(apiClientProvider).post('/me/emergency-contacts', body: dto.toJson());
      ref.invalidate(emergencyContactsProvider);
    } on Object catch (e) {
      if (context.mounted) showSnack(context, errorText(context, e));
    }
  }
}
