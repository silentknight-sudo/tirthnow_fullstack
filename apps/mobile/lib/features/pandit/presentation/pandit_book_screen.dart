import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../bookings/data/bookings_repository.dart';
import '../../bookings/presentation/checkout_flow.dart';
import '../../reviews/presentation/reviews_section.dart';
import 'pandit_screen.dart';

/// Book one Pandit Ji service in three steps: when, where, details — then a
/// summary with the full price before payment.
class PanditBookScreen extends ConsumerStatefulWidget {
  const PanditBookScreen({required this.id, super.key});
  final String id;

  @override
  ConsumerState<PanditBookScreen> createState() => _PanditBookScreenState();
}

class _PanditBookScreenState extends ConsumerState<PanditBookScreen> {
  final _form = GlobalKey<FormState>();
  final _address = TextEditingController();
  final _notes = TextEditingController();
  int _step = 0;
  String? _day;
  SlotResponse? _slot;
  String? _mode;

  @override
  void dispose() {
    _address.dispose();
    _notes.dispose();
    super.dispose();
  }

  /// Where the service can happen, from the kind and the pandit's profile.
  List<String> _modes(ExperienceResponse x) {
    final p = x.pandit;
    final consult = panditIsConsultation(x.kind);
    return [
      if (!consult && (p?.homeVisits ?? true)) 'at_home',
      if (consult && (p?.videoConsults ?? true)) 'online',
      'at_temple',
      if (!consult && x.kind == 'path' && (p?.videoConsults ?? false)) 'online',
    ];
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return AsyncView(
      value: ref.watch(experienceProvider(widget.id)),
      onRetry: () => ref.invalidate(experienceProvider(widget.id)),
      builder: (x) {
        final consult = panditIsConsultation(x.kind);
        final modes = _modes(x);
        final mode = (_mode != null && modes.contains(_mode)) ? _mode! : modes.first;
        final slots = (x.slots ?? const <SlotResponse>[]).where((s) => s.remaining > 0).toList();
        final byDay = <String, List<SlotResponse>>{};
        for (final s in slots) {
          (byDay[formatIstDate(DateTime.parse(s.startsAt), locale: context.lang)] ??= []).add(s);
        }
        final day = _day ?? (byDay.keys.isEmpty ? null : byDay.keys.first);
        final times = day == null ? const <SlotResponse>[] : byDay[day]!;
        final canNext = switch (_step) {
          0 => _slot != null,
          1 => true,
          _ => true,
        };
        return Scaffold(
          backgroundColor: const Color(0xFFFFFBF3),
          appBar: AppBar(title: Text(x.title, maxLines: 1, overflow: TextOverflow.ellipsis)),
          body: Form(
            key: _form,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 140),
              children: [
                _Header(x: x),
                const SizedBox(height: 14),
                _Stepper(
                  step: _step,
                  labels: [l.panditStepWhen, l.panditStepWhere, l.panditStepDetails],
                  onTap: (i) {
                    if (i < _step || (i == 1 && _slot != null) || (i == 2 && _slot != null)) {
                      setState(() => _step = i);
                    }
                  },
                ),
                const SizedBox(height: 10),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: KeyedSubtree(
                    key: ValueKey(_step),
                    child: switch (_step) {
                      0 => _whenStep(byDay, day, times),
                      1 => _whereStep(modes, mode),
                      _ => _detailsStep(x, consult, mode),
                    },
                  ),
                ),
                if (_step == 0) ...[
                  const SizedBox(height: 18),
                  ReviewsSection(targetType: 'experience', targetId: x.id),
                ],
              ],
            ),
          ),
          bottomNavigationBar: _BottomBar(
            totalPaise: x.displayPricePaise,
            step: _step,
            enabled: canNext,
            onBack: _step == 0 ? null : () => setState(() => _step--),
            onNext: () {
              // The address field only exists on the "where" step, so check it there.
              if (_step == 1 && !_form.currentState!.validate()) return;
              if (_step < 2) {
                setState(() => _step++);
                return;
              }
              if (!_form.currentState!.validate()) return;
              final notes = _notes.text.trim();
              placeOrder(
                context,
                ref,
                CreateOrderDto(
                  type: 'experience',
                  experience: ExperienceOrderDto(
                    slotId: _slot!.id,
                    seats: 1,
                    mode: mode,
                    address: mode == 'at_home' ? _address.text.trim() : null,
                    notes: notes.isEmpty ? null : notes,
                  ),
                ),
                description: x.title,
              );
            },
          ),
        );
      },
    );
  }

  Widget _whenStep(Map<String, List<SlotResponse>> byDay, String? day, List<SlotResponse> times) {
    final t = context.l10n;
    if (byDay.isEmpty) return EmptyState(message: t.panditNoSlots);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Label(t.panditChooseDate),
        SizedBox(
          height: 66,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              for (final d in byDay.keys)
                _DayChip(
                  label: d,
                  selected: d == day,
                  onTap: () => setState(() {
                    _day = d;
                    _slot = null;
                  }),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _Label(t.panditChooseTime),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final s in times)
              ChoiceChip(
                avatar: const Icon(Icons.schedule_rounded, size: 16),
                label: Text(formatIstTime(DateTime.parse(s.startsAt))),
                selected: _slot?.id == s.id,
                onSelected: (_) => setState(() => _slot = s),
              ),
          ],
        ),
      ],
    );
  }

  Widget _whereStep(List<String> modes, String mode) {
    final t = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Label(t.panditWhere),
        for (final m in modes)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _ModeTile(
              icon: switch (m) {
                'at_home' => Icons.home_rounded,
                'online' => Icons.videocam_rounded,
                _ => Icons.temple_hindu_rounded,
              },
              title: switch (m) {
                'at_home' => t.panditAtHome,
                'online' => t.panditOnline,
                _ => t.panditAtTemple,
              },
              sub: switch (m) {
                'at_home' => t.panditAtHomeSub,
                'online' => t.panditOnlineSub,
                _ => t.panditAtTempleSub,
              },
              selected: m == mode,
              onTap: () => setState(() => _mode = m),
            ),
          ),
        if (mode == 'at_home') ...[
          const SizedBox(height: 6),
          TextFormField(
            controller: _address,
            maxLength: 200,
            maxLines: 2,
            decoration: InputDecoration(
              labelText: t.panditAddress,
              prefixIcon: const Icon(Icons.location_on_outlined),
            ),
            validator: (v) => (v ?? '').trim().length < 5 ? t.panditAddressRequired : null,
          ),
        ],
      ],
    );
  }

  Widget _detailsStep(ExperienceResponse x, bool consult, String mode) {
    final t = context.l10n;
    final when = _slot == null
        ? '—'
        : '${formatIstDate(DateTime.parse(_slot!.startsAt), locale: context.lang)} · ${formatIstTime(DateTime.parse(_slot!.startsAt))}';
    final where = switch (mode) {
      'at_home' => t.panditAtHome,
      'online' => t.panditOnline,
      _ => t.panditAtTemple,
    };
    final tax = x.displayPricePaise - x.pricePaise;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextFormField(
          controller: _notes,
          maxLength: 500,
          maxLines: 3,
          decoration: InputDecoration(
            labelText: consult ? t.panditBirthDetails : t.panditSankalp,
            hintText: consult ? t.panditBirthHint : t.panditSankalpHint,
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: TnColors.line),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                t.panditSummary,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
              ),
              const SizedBox(height: 8),
              _Row(Icons.event_rounded, t.panditStepWhen, when),
              _Row(Icons.place_rounded, t.panditStepWhere, where),
              if (mode == 'at_home' && _address.text.trim().isNotEmpty)
                _Row(Icons.home_rounded, t.panditAddress, _address.text.trim()),
              const Divider(height: 20),
              _Price(t.panditDakshina, formatRupees(x.pricePaise, locale: context.lang)),
              _Price(t.panditTaxes, formatRupees(tax, locale: context.lang)),
              const SizedBox(height: 4),
              _Price(
                t.panditTotal,
                formatRupees(x.displayPricePaise, locale: context.lang),
                bold: true,
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFEAF7EE),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Row(
            children: [
              const Icon(Icons.verified_user_rounded, color: Color(0xFF2F9E44)),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  x.cancellationPolicy.freeUntilHoursBefore > 0
                      ? t.panditPromise('${x.cancellationPolicy.freeUntilHoursBefore}')
                      : t.panditPromiseNoFree,
                  style: const TextStyle(fontSize: 12.5, height: 1.35),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.x});
  final ExperienceResponse x;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = x.pandit;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [TnColors.navy, Color(0xFF2B4F86)]),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              PanditKindAvatar(x.kind, size: 66),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      panditKindLabel(l, x.kind).toUpperCase(),
                      style: const TextStyle(
                        color: TnColors.saffron,
                        fontWeight: FontWeight.w800,
                        fontSize: 11,
                        letterSpacing: 0.8,
                      ),
                    ),
                    Text(
                      x.title,
                      style: const TextStyle(
                        fontFamily: 'Cormorant',
                        color: Colors.white,
                        fontSize: 21,
                        fontWeight: FontWeight.w800,
                        height: 1.1,
                      ),
                    ),
                    if (x.vendorName != null)
                      Text(
                        x.vendorName!,
                        style: const TextStyle(color: Colors.white70, fontSize: 12.5),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              _Tag(Icons.schedule_rounded, l.panditMinutes('${x.durationMin}')),
              if (p != null)
                _Tag(Icons.workspace_premium_rounded, l.panditYears('${p.experienceYears}')),
              if (p != null)
                _Tag(Icons.translate_rounded, p.languages.map(panditLanguage).join(', ')),
              if (p?.sampradaya != null) _Tag(Icons.auto_awesome_rounded, p!.sampradaya!),
            ],
          ),
          if (x.description != null) ...[
            const SizedBox(height: 10),
            Text(x.description!, style: const TextStyle(color: Colors.white, height: 1.4)),
          ],
          if (p?.about != null) ...[
            const SizedBox(height: 6),
            Text(
              p!.about!,
              style: const TextStyle(color: Colors.white70, fontSize: 12.5, height: 1.35),
            ),
          ],
        ],
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag(this.icon, this.text);
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: TnColors.saffron),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(color: Colors.white, fontSize: 11.5)),
      ],
    ),
  );
}

class _Stepper extends StatelessWidget {
  const _Stepper({required this.step, required this.labels, required this.onTap});
  final int step;
  final List<String> labels;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      for (var i = 0; i < labels.length; i++) ...[
        Expanded(
          child: GestureDetector(
            onTap: () => onTap(i),
            child: Column(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 30,
                  height: 30,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: i <= step ? TnColors.saffron : Colors.white,
                    border: Border.all(
                      color: i <= step ? TnColors.saffron : TnColors.line,
                      width: 1.5,
                    ),
                  ),
                  child: i < step
                      ? const Icon(Icons.check_rounded, size: 17, color: Colors.white)
                      : Text(
                          '${i + 1}',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            color: i <= step ? Colors.white : TnColors.muted,
                          ),
                        ),
                ),
                const SizedBox(height: 4),
                Text(
                  labels[i],
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: i <= step ? TnColors.navy : TnColors.muted,
                  ),
                ),
              ],
            ),
          ),
        ),
        if (i < labels.length - 1)
          Expanded(
            child: Container(
              height: 2,
              margin: const EdgeInsets.only(bottom: 18),
              color: i < step ? TnColors.saffron : TnColors.line,
            ),
          ),
      ],
    ],
  );
}

class _Label extends StatelessWidget {
  const _Label(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8, top: 4),
    child: Text(text, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
  );
}

class _DayChip extends StatelessWidget {
  const _DayChip({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final parts = label.split(' ');
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        width: 64,
        margin: const EdgeInsets.only(right: 8),
        decoration: BoxDecoration(
          color: selected ? TnColors.navy : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: selected ? TnColors.navy : TnColors.line),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              parts.isNotEmpty ? parts.first : label,
              style: TextStyle(fontSize: 11.5, color: selected ? Colors.white70 : TnColors.muted),
            ),
            Text(
              parts.length > 1 ? parts.sublist(1).join(' ') : '',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                fontSize: 14,
                color: selected ? Colors.white : TnColors.navy,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ModeTile extends StatelessWidget {
  const _ModeTile({
    required this.icon,
    required this.title,
    required this.sub,
    required this.selected,
    required this.onTap,
  });
  final IconData icon;
  final String title;
  final String sub;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: selected ? const Color(0xFFFFF4E6) : Colors.white,
    borderRadius: BorderRadius.circular(16),
    child: InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? TnColors.saffron : TnColors.line,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: const Color(0xFFFFEDD5),
              child: Icon(icon, color: TnColors.saffron),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
                  Text(sub, style: const TextStyle(color: TnColors.muted, fontSize: 12)),
                ],
              ),
            ),
            Icon(
              selected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
              color: selected ? TnColors.saffron : TnColors.muted,
            ),
          ],
        ),
      ),
    ),
  );
}

class _Row extends StatelessWidget {
  const _Row(this.icon, this.label, this.value);
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: TnColors.saffron),
        const SizedBox(width: 8),
        SizedBox(
          width: 70,
          child: Text(label, style: const TextStyle(color: TnColors.muted, fontSize: 12.5)),
        ),
        Expanded(
          child: Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ),
      ],
    ),
  );
}

class _Price extends StatelessWidget {
  const _Price(this.label, this.value, {this.bold = false});
  final String label;
  final String value;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontWeight: bold ? FontWeight.w800 : FontWeight.w500,
      fontSize: bold ? 16 : 13.5,
      color: bold ? TnColors.navy : TnColors.ink,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(value, style: style),
        ],
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.totalPaise,
    required this.step,
    required this.enabled,
    required this.onNext,
    this.onBack,
  });
  final num totalPaise;
  final int step;
  final bool enabled;
  final VoidCallback onNext;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
        decoration: const BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(color: Color(0x1A000000), blurRadius: 12, offset: Offset(0, -2))],
        ),
        child: Row(
          children: [
            Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  formatRupees(totalPaise, locale: context.lang),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 18,
                    color: TnColors.navy,
                  ),
                ),
                Text(l.panditInclTax, style: const TextStyle(fontSize: 11, color: TnColors.muted)),
              ],
            ),
            const Spacer(),
            if (onBack != null)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: OutlinedButton(onPressed: onBack, child: Text(l.panditBack)),
              ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: TnColors.saffron,
                minimumSize: const Size(140, 48),
              ),
              onPressed: enabled ? onNext : null,
              child: Text(step < 2 ? l.panditContinue : l.panditPayBook),
            ),
          ],
        ),
      ),
    );
  }
}
