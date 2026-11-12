import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../auth/data/session_controller.dart';
import '../shared/partner_ui.dart';
import '../vendor/data/vendor_repository.dart';
import 'onboarding_screen.dart';

final _bankProvider = FutureProvider.family<List<BankAccountResponse>, String>(
  (ref, id) => ref.watch(vendorRepositoryProvider).bankAccounts(id),
);

/// Upload the documents this service needs, add a payout account, submit.
class KycScreen extends ConsumerStatefulWidget {
  const KycScreen({super.key});

  @override
  ConsumerState<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends ConsumerState<KycScreen> {
  String? _uploading;
  bool _submitting = false;

  Future<void> _upload(VendorResponse v, String docType) async {
    final picked = await ImagePicker().pickImage(
      source: ImageSource.gallery,
      maxWidth: 2000,
      imageQuality: 85,
    );
    if (picked == null) return;
    setState(() => _uploading = docType);
    try {
      final repo = ref.read(vendorRepositoryProvider);
      final bytes = await picked.readAsBytes();
      final mime =
          picked.mimeType ??
          (picked.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
      final mediaId = await repo.upload('kyc_document', bytes, mime);
      // Replace an earlier upload of the same document.
      for (final d in v.kycDocuments.where((d) => d.docType == docType)) {
        await repo.removeKyc(v.id, d.id);
      }
      await repo.addKyc(v.id, docType, mediaId);
      ref.invalidate(myVendorProvider);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _uploading = null);
    }
  }

  Future<void> _submit(VendorResponse v) async {
    setState(() => _submitting = true);
    try {
      await ref.read(vendorRepositoryProvider).submit(v.id);
      ref.invalidate(myVendorProvider);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final vendor = ref.watch(myVendorProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.kycTitle),
        actions: [
          IconButton(
            tooltip: l.signOut,
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => ref.read(sessionProvider.notifier).signOut(),
          ),
        ],
      ),
      body: AsyncView(
        value: vendor,
        onRetry: () => ref.invalidate(myVendorProvider),
        builder: (v) {
          if (v == null) return const SizedBox.shrink();
          final svc = serviceFor(v.type);
          final docTypes = <String>{
            for (final d in v.kycDocuments) d.docType,
            ...v.missingDocuments,
          }.toList();
          final banks = ref.watch(_bankProvider(v.id));
          final hasBank = banks.value?.isNotEmpty ?? false;
          final ready = v.missingDocuments.isEmpty && hasBank;
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
            children: [
              const OnboardingSteps(step: 2),
              const SizedBox(height: 16),
              Row(
                children: [
                  CircleAvatar(backgroundImage: AssetImage(svc.image), radius: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          v.displayName,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
                        ),
                        Text(svc.title(l), style: const TextStyle(color: TnColors.muted)),
                      ],
                    ),
                  ),
                ],
              ),
              if (v.status == 'kyc_rejected') ...[
                const SizedBox(height: 12),
                _Banner(text: l.rejectedTitle, color: TnColors.sos),
              ],
              const SizedBox(height: 16),
              Text(l.kycSub, style: const TextStyle(color: TnColors.muted)),
              const SizedBox(height: 8),
              _HowItWorks(),
              const SizedBox(height: 12),
              for (final t in docTypes)
                _DocTile(
                  docType: t,
                  doc: v.kycDocuments.where((d) => d.docType == t).firstOrNull,
                  busy: _uploading == t,
                  onUpload: _uploading == null ? () => _upload(v, t) : null,
                ),
              const SizedBox(height: 20),
              SectionTitle(l.bankTitle),
              banks.when(
                data: (list) => list.isEmpty
                    ? _BankForm(vendorId: v.id, onSaved: () => ref.invalidate(_bankProvider(v.id)))
                    : Column(
                        children: [
                          for (final b in list)
                            PanelCard(
                              child: Row(
                                children: [
                                  const Icon(Icons.account_balance_rounded, color: TnColors.navy),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      '${b.accountHolder}\n•••• ${b.accountLast4} · ${b.ifsc}',
                                    ),
                                  ),
                                  const Icon(Icons.check_circle_rounded, color: TnColors.success),
                                ],
                              ),
                            ),
                        ],
                      ),
                loading: () => const LinearProgressIndicator(),
                error: (e, _) =>
                    ErrorPanel(error: e, onRetry: () => ref.invalidate(_bankProvider(v.id))),
              ),
              const SizedBox(height: 24),
              if (v.missingDocuments.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    l.missingDocs(v.missingDocuments.map((d) => docLabel(l, d)).join(', ')),
                    style: const TextStyle(color: TnColors.muted, fontSize: 13),
                  ),
                ),
              FilledButton.icon(
                onPressed: ready && !_submitting ? () => _submit(v) : null,
                icon: const Icon(Icons.verified_user_rounded),
                label: Text(l.submitKyc),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _DocTile extends StatelessWidget {
  const _DocTile({
    required this.docType,
    required this.doc,
    required this.busy,
    required this.onUpload,
  });

  final String docType;
  final KycDocumentResponse? doc;
  final bool busy;
  final VoidCallback? onUpload;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final d = doc;
    final (statusText, color) = switch (d?.status) {
      null => ('', TnColors.muted),
      'approved' => (l.docApproved, TnColors.success),
      'rejected' => (l.docRejected, TnColors.sos),
      _ => (l.uploaded, TnColors.navy),
    };
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: PanelCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: const Color(0xFFFFF1E4),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(docIcon(docType), color: TnColors.accent),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(docLabel(l, docType), style: const TextStyle(fontWeight: FontWeight.w600)),
                  if (d != null) ...[
                    const SizedBox(height: 2),
                    Text(statusText, style: TextStyle(color: color, fontSize: 12.5)),
                    if (d.reviewerNote != null)
                      Text(
                        d.reviewerNote!,
                        style: const TextStyle(fontSize: 12, color: TnColors.sos),
                      ),
                  ],
                ],
              ),
            ),
            if (busy)
              const SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            else if (d != null && d.status != 'rejected')
              IconButton(
                onPressed: onUpload,
                icon: const Icon(Icons.check_circle_rounded, color: TnColors.success),
              )
            else
              OutlinedButton.icon(
                onPressed: onUpload,
                icon: const Icon(Icons.upload_rounded, size: 18),
                label: Text(l.upload),
              ),
          ],
        ),
      ),
    );
  }
}

class _HowItWorks extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Card(
      color: const Color(0xFFEFF3FA),
      elevation: 0,
      child: ExpansionTile(
        leading: const Icon(Icons.shield_moon_outlined, color: TnColors.navy),
        title: Text(l.kycHow, style: const TextStyle(fontWeight: FontWeight.w600)),
        shape: const Border(),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
        children: [Text(l.kycHowBody, style: const TextStyle(height: 1.5, fontSize: 13))],
      ),
    );
  }
}

class _Banner extends StatelessWidget {
  const _Banner({required this.text, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(
      children: [
        Icon(Icons.error_outline_rounded, color: color),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(color: color, fontWeight: FontWeight.w600),
          ),
        ),
      ],
    ),
  );
}

class _BankForm extends ConsumerStatefulWidget {
  const _BankForm({required this.vendorId, required this.onSaved});

  final String vendorId;
  final VoidCallback onSaved;

  @override
  ConsumerState<_BankForm> createState() => _BankFormState();
}

class _BankFormState extends ConsumerState<_BankForm> {
  final _form = GlobalKey<FormState>();
  final _holder = TextEditingController();
  final _number = TextEditingController();
  final _ifsc = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _holder.dispose();
    _number.dispose();
    _ifsc.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(vendorRepositoryProvider)
          .addBank(
            widget.vendorId,
            _holder.text.trim(),
            _number.text.trim(),
            _ifsc.text.trim().toUpperCase(),
          );
      widget.onSaved();
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return PanelCard(
      child: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: _holder,
              decoration: InputDecoration(labelText: l.accountHolder),
              validator: (v) => requiredText(l, v),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _number,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(labelText: l.accountNumber),
              validator: (v) =>
                  RegExp(r'^\d{9,18}$').hasMatch((v ?? '').trim()) ? null : l.invalidValue,
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: _ifsc,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(labelText: l.ifsc, hintText: 'SBIN0001234'),
              validator: (v) =>
                  RegExp(r'^[A-Z]{4}0[A-Z0-9]{6}$').hasMatch((v ?? '').trim().toUpperCase())
                  ? null
                  : l.invalidValue,
            ),
            const SizedBox(height: 14),
            FilledButton.tonal(onPressed: _busy ? null : _save, child: Text(l.addBank)),
          ],
        ),
      ),
    );
  }
}
