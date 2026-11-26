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

/// Book one Pandit Ji service: pick a date and time, where it happens
/// (home, temple or video call) and the sankalp or birth details.
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
  String? _day;
  String? _slotId;
  String? _mode;

  @override
  void dispose() {
    _address.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return AsyncView(
      value: ref.watch(experienceProvider(widget.id)),
      onRetry: () => ref.invalidate(experienceProvider(widget.id)),
      builder: (x) {
        final consult = panditIsConsultation(x.kind);
        final modes = consult ? const ['online', 'at_temple'] : const ['at_home', 'at_temple'];
        final mode = _mode ?? modes.first;
        final slots = (x.slots ?? const <SlotResponse>[]).where((s) => s.remaining > 0).toList();
        final byDay = <String, List<SlotResponse>>{};
        for (final s in slots) {
          final d = formatIstDate(DateTime.parse(s.startsAt), locale: context.lang);
          (byDay[d] ??= []).add(s);
        }
        final day = _day ?? (byDay.keys.isEmpty ? null : byDay.keys.first);
        final times = day == null ? const <SlotResponse>[] : byDay[day]!;
        return Scaffold(
          backgroundColor: const Color(0xFFFFFBF3),
          appBar: AppBar(title: Text(l.panditJi)),
          body: Form(
            key: _form,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 120),
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: TnColors.navy,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      PanditKindAvatar(x.kind, size: 72),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              panditKindLabel(l, x.kind).toUpperCase(),
                              style: const TextStyle(
                                color: TnColors.saffron,
                                fontWeight: FontWeight.w800,
                                fontSize: 11.5,
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
                ),
                if (x.description != null) ...[
                  const SizedBox(height: 12),
                  Text(x.description!, style: const TextStyle(height: 1.45)),
                ],
                SectionTitle(l.panditChooseDate),
                if (byDay.isEmpty) EmptyState(message: l.panditNoSlots),
                SizedBox(
                  height: 44,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      for (final d in byDay.keys)
                        Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: ChoiceChip(
                            label: Text(d),
                            selected: d == day,
                            onSelected: (_) => setState(() {
                              _day = d;
                              _slotId = null;
                            }),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final s in times)
                      ChoiceChip(
                        avatar: const Icon(Icons.schedule_rounded, size: 16),
                        label: Text(formatIstTime(DateTime.parse(s.startsAt))),
                        selected: _slotId == s.id,
                        onSelected: (_) => setState(() => _slotId = s.id),
                      ),
                  ],
                ),
                SectionTitle(l.panditWhere),
                Wrap(
                  spacing: 8,
                  children: [
                    for (final m in modes)
                      ChoiceChip(
                        avatar: Icon(switch (m) {
                          'at_home' => Icons.home_rounded,
                          'online' => Icons.videocam_rounded,
                          _ => Icons.temple_hindu_rounded,
                        }, size: 18),
                        label: Text(switch (m) {
                          'at_home' => l.panditAtHome,
                          'online' => l.panditOnline,
                          _ => l.panditAtTemple,
                        }),
                        selected: mode == m,
                        onSelected: (_) => setState(() => _mode = m),
                      ),
                  ],
                ),
                if (mode == 'at_home') ...[
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _address,
                    maxLength: 200,
                    decoration: InputDecoration(
                      labelText: l.panditAddress,
                      prefixIcon: const Icon(Icons.location_on_outlined),
                    ),
                    validator: (v) => (v ?? '').trim().length < 5 ? l.panditAddressRequired : null,
                  ),
                ],
                const SizedBox(height: 12),
                TextFormField(
                  controller: _notes,
                  maxLength: 500,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: consult ? l.panditBirthDetails : l.panditSankalp,
                    hintText: consult ? l.panditBirthHint : l.panditSankalpHint,
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  l.panditSamagriNote,
                  style: const TextStyle(fontSize: 12, color: TnColors.muted),
                ),
                ReviewsSection(targetType: 'experience', targetId: x.id),
              ],
            ),
          ),
          bottomNavigationBar: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: TnColors.saffron,
                  minimumSize: const Size.fromHeight(50),
                ),
                onPressed: _slotId == null
                    ? null
                    : () {
                        if (!_form.currentState!.validate()) return;
                        final notes = _notes.text.trim();
                        placeOrder(
                          context,
                          ref,
                          CreateOrderDto(
                            type: 'experience',
                            experience: ExperienceOrderDto(
                              slotId: _slotId!,
                              seats: 1,
                              mode: mode,
                              address: mode == 'at_home' ? _address.text.trim() : null,
                              notes: notes.isEmpty ? null : notes,
                            ),
                          ),
                          description: x.title,
                        );
                      },
                child: Text(l.panditBook(formatRupees(x.pricePaise, locale: context.lang))),
              ),
            ),
          ),
        );
      },
    );
  }
}
