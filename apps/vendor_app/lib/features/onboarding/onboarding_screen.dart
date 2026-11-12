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
  Service? _picked;
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
    return Column(
      key: const ValueKey('choose'),
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
            children: [
              const _Steps(step: 0),
              const SizedBox(height: 18),
              Text(
                l.obChooseTitle,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: PColors.night,
                ),
              ),
              const SizedBox(height: 4),
              Text(l.obChooseSub, style: const TextStyle(color: TnColors.muted)),
              const SizedBox(height: 16),
              for (final svc in services)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _ServiceOption(
                    service: svc,
                    selected: _picked == svc,
                    onTap: () => setState(() => _picked = svc),
                  ),
                ),
            ],
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: GoldButton(
              label: l.next,
              icon: Icons.arrow_forward_rounded,
              onPressed: _picked == null ? null : () => setState(() => _service = _picked),
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
                Image.asset(svc.image, height: 140, width: double.infinity, fit: BoxFit.cover),
                const Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Color(0x000E1433), Color(0xCC0E1433)],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: 12,
                  bottom: 12,
                  child: Pill(svc.title(l), color: Colors.white, icon: svc.icon),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          InputDecorator(
            decoration: InputDecoration(labelText: l.businessType, prefixIcon: Icon(svc.icon)),
            child: Text(svc.title(l), style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          const SizedBox(height: 12),
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
          GoldButton(label: l.createAccount, busy: _busy, onPressed: _create),
        ],
      ),
    );
  }
}

class _ServiceOption extends StatelessWidget {
  const _ServiceOption({required this.service, required this.selected, required this.onTap});

  final Service service;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: selected ? PColors.violet : const Color(0x14232C6B),
          width: selected ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: selected ? const Color(0x337B5CFF) : const Color(0x14232C6B),
            blurRadius: selected ? 18 : 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Row(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.horizontal(left: Radius.circular(17)),
                child: Image.asset(service.image, width: 104, height: 84, fit: BoxFit.cover),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      service.title(l),
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 16,
                        color: PColors.night,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      service.subtitle(l),
                      style: const TextStyle(color: TnColors.muted, fontSize: 12.5),
                    ),
                  ],
                ),
              ),
              AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: 26,
                height: 26,
                margin: const EdgeInsets.only(right: 14),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selected ? PColors.violet : Colors.transparent,
                  border: Border.all(color: selected ? PColors.violet : TnColors.line, width: 2),
                ),
                child: selected
                    ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
                    : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Service → details → documents → approval, with labelled dots.
class _Steps extends StatelessWidget {
  const _Steps({required this.step, super.key});

  final int step;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final labels = [l.businessType, l.stepDetails, l.stepKyc, l.stepVerify];
    return Row(
      children: [
        for (var i = 0; i < 4; i++) ...[
          Column(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: i <= step ? PColors.goldGradient : null,
                  color: i <= step ? null : Colors.white,
                  border: Border.all(color: i <= step ? PColors.gold : TnColors.line, width: 2),
                ),
                child: Center(
                  child: i < step
                      ? const Icon(Icons.check_rounded, size: 16, color: PColors.night)
                      : Text(
                          '${i + 1}',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 12,
                            color: i <= step ? PColors.night : TnColors.muted,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                labels[i],
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: i == step ? FontWeight.w800 : FontWeight.w500,
                  color: i <= step ? PColors.night : TnColors.muted,
                ),
              ),
            ],
          ),
          if (i < 3)
            Expanded(
              child: Container(
                height: 2,
                margin: const EdgeInsets.only(bottom: 18, left: 4, right: 4),
                color: i < step ? PColors.gold : TnColors.line,
              ),
            ),
        ],
      ],
    );
  }
}

/// Shared with the KYC and waiting screens.
class OnboardingSteps extends _Steps {
  const OnboardingSteps({required super.step, super.key});
}
