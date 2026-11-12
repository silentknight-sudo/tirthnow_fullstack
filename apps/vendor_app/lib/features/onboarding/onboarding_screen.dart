import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_models.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../auth/data/session_controller.dart';
import '../shared/partner_ui.dart';
import '../vendor/data/vendor_repository.dart';

/// Step 1: choose the service. Step 2: business details → creates the vendor.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  Service? _service;
  final _form = GlobalKey<FormState>();
  final _display = TextEditingController();
  final _legal = TextEditingController();
  final _pan = TextEditingController();
  final _gstin = TextEditingController();
  String? _cityId;
  bool _busy = false;

  @override
  void dispose() {
    for (final c in [_display, _legal, _pan, _gstin]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _create() async {
    final s = _service;
    if (s == null || !_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(vendorRepositoryProvider)
          .create(
            CreateVendorDto(
              type: s.type,
              displayName: _display.text.trim(),
              legalName: _legal.text.trim(),
              cityId: _cityId,
              pan: _pan.text.trim().toUpperCase(),
              gstin: _gstin.text.trim().isEmpty ? null : _gstin.text.trim().toUpperCase(),
            ),
          );
      ref.invalidate(myVendorProvider);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final s = _service;
    return Scaffold(
      appBar: AppBar(
        leading: s == null
            ? null
            : IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _service = null),
              ),
        title: Text(s == null ? l.appName : l.obBusinessTitle),
        actions: [
          IconButton(
            tooltip: l.signOut,
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => ref.read(sessionProvider.notifier).signOut(),
          ),
        ],
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 250),
        child: s == null ? _chooser(context) : _details(context, s),
      ),
    );
  }

  Widget _chooser(BuildContext context) {
    final l = context.l10n;
    return ListView(
      key: const ValueKey('choose'),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      children: [
        const _Steps(step: 0),
        const SizedBox(height: 16),
        Text(l.obChooseTitle, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 4),
        Text(l.obChooseSub, style: const TextStyle(color: TnColors.muted)),
        const SizedBox(height: 16),
        for (final svc in services)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: PanelCard(
              padding: EdgeInsets.zero,
              onTap: () => setState(() => _service = svc),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.horizontal(left: Radius.circular(17)),
                    child: Image.asset(svc.image, width: 112, height: 92, fit: BoxFit.cover),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(svc.icon, size: 18, color: TnColors.accent),
                            const SizedBox(width: 6),
                            Text(
                              svc.title(l),
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          svc.subtitle(l),
                          style: const TextStyle(color: TnColors.muted, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right_rounded, color: TnColors.muted),
                  const SizedBox(width: 8),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _details(BuildContext context, Service svc) {
    final l = context.l10n;
    final cities = ref.watch(citiesProvider);
    return Form(
      key: _form,
      child: ListView(
        key: const ValueKey('details'),
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        children: [
          const _Steps(step: 1),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: Stack(
              children: [
                Image.asset(svc.image, height: 130, width: double.infinity, fit: BoxFit.cover),
                Positioned(
                  left: 12,
                  bottom: 12,
                  child: Pill(svc.title(l), color: TnColors.navy, icon: svc.icon),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          TextFormField(
            controller: _display,
            decoration: InputDecoration(labelText: l.displayName),
            validator: (v) => (v == null || v.trim().length < 2) ? l.required : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _legal,
            decoration: InputDecoration(labelText: l.legalName),
            validator: (v) => (v == null || v.trim().length < 2) ? l.required : null,
          ),
          const SizedBox(height: 12),
          cities.when(
            data: (list) => DropdownButtonFormField<String>(
              initialValue: _cityId,
              decoration: InputDecoration(labelText: l.city),
              items: [for (final c in list) DropdownMenuItem(value: c.id, child: Text(c.name))],
              onChanged: (v) => setState(() => _cityId = v),
              validator: (v) => v == null ? l.required : null,
            ),
            loading: () => const LinearProgressIndicator(),
            error: (e, _) => ErrorPanel(error: e, onRetry: () => ref.invalidate(citiesProvider)),
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _pan,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(labelText: l.pan, hintText: 'ABCDE1234F'),
            validator: (v) =>
                RegExp(r'^[A-Z]{5}[0-9]{4}[A-Z]$').hasMatch((v ?? '').trim().toUpperCase())
                ? null
                : l.invalidValue,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _gstin,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(labelText: l.gstin, hintText: '09ABCDE1234F1Z5'),
            validator: (v) {
              final t = (v ?? '').trim().toUpperCase();
              if (t.isEmpty) return null;
              return RegExp(r'^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$').hasMatch(t)
                  ? null
                  : l.invalidValue;
            },
          ),
          const SizedBox(height: 20),
          FilledButton(onPressed: _busy ? null : _create, child: Text(l.createAccount)),
          if (_busy)
            const Padding(padding: EdgeInsets.only(top: 10), child: LinearProgressIndicator()),
        ],
      ),
    );
  }
}

/// Service → details → documents → approval.
class _Steps extends StatelessWidget {
  const _Steps({required this.step, super.key});

  final int step;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      for (var i = 0; i < 4; i++)
        Expanded(
          child: Container(
            height: 5,
            margin: const EdgeInsets.symmetric(horizontal: 3),
            decoration: BoxDecoration(
              color: i <= step ? TnColors.accent : TnColors.paper2,
              borderRadius: BorderRadius.circular(3),
            ),
          ),
        ),
    ],
  );
}

/// Shared with the KYC and waiting screens.
class OnboardingSteps extends _Steps {
  const OnboardingSteps({required super.step, super.key});
}
