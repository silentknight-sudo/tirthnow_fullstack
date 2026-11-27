import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_models.dart';
import '../../core/format/formatters.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../shared/partner_ui.dart';
import '../shared/signature.dart';
import '../vendor/data/vendor_repository.dart';
import 'pandit_profile.dart';

final _servicesProvider = FutureProvider.family<List<ExperienceResponse>, String>(
  (ref, id) => ref.watch(vendorRepositoryProvider).experiences(id),
);

/// Ready-made starting points; the pandit can change every field.
class _Template {
  const _Template(this.kind, this.title, this.minutes, this.rupees, this.description);
  final String kind;
  final String title;
  final int minutes;
  final int rupees;
  final String description;
}

const _templates = [
  _Template(
    'puja',
    'Satyanarayan Katha & Puja',
    150,
    2100,
    'Full katha with havan and prasad vidhi. Samagri list shared after booking.',
  ),
  _Template(
    'puja',
    'Griha Pravesh Puja',
    180,
    5100,
    'Vastu shanti, Ganesh puja and havan for a new home.',
  ),
  _Template('puja', 'Rudrabhishek', 120, 3100, 'Abhishek of the Shivling with Rudri path.'),
  _Template(
    'puja',
    'Navgrah Shanti Puja',
    150,
    3500,
    'Puja and havan for the nine planets with sankalp in the family name.',
  ),
  _Template(
    'puja',
    'Mundan / Naamkaran Sanskar',
    90,
    2100,
    'Sanskar vidhi with havan for the child.',
  ),
  _Template(
    'path',
    'Sundarkand Path',
    180,
    2500,
    'Sung path with harmonium and dholak, then Hanuman aarti.',
  ),
  _Template('path', 'Shrimad Bhagwat Path (1 day)', 360, 7100, 'One-day moolpath of the Bhagwat.'),
  _Template(
    'path',
    'Gita Path (18 chapters)',
    120,
    1500,
    'Complete Bhagavad Gita recitation with Hindi meaning.',
  ),
  _Template(
    'jyotish',
    'Kundli Reading',
    45,
    1100,
    'Birth chart reading with remedies. Needs birth date, time and place.',
  ),
  _Template(
    'jyotish',
    'Kundli Milan (marriage)',
    60,
    1500,
    'Guna milan, manglik check and muhurat.',
  ),
  _Template(
    'palmistry',
    'Hast Rekha (Palmistry) Reading',
    30,
    700,
    'Life, heart and fate lines with guidance. In person or by video.',
  ),
  _Template(
    'astrology',
    'Astrology & Numerology',
    30,
    900,
    'Rashi, gochar and numerology with gemstone and mantra remedies.',
  ),
];

/// Pandit Ji: services (puja, path, jyotish…) with dakshina and open dates/times.
class PanditListings extends ConsumerStatefulWidget {
  const PanditListings({required this.vendor, super.key});
  final VendorResponse vendor;

  @override
  ConsumerState<PanditListings> createState() => _PanditListingsState();
}

class _PanditListingsState extends ConsumerState<PanditListings> {
  String? _kind;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final vid = widget.vendor.id;
    final list = ref.watch(_servicesProvider(vid));
    final items = list.value ?? const <ExperienceResponse>[];
    final offered = widget.vendor.panditProfile?.specialities ?? panditKinds;
    return Scaffold(
      body: Column(
        children: [
          DuskHeader(
            title: l.pandServicesTitle,
            subtitle: l.pandServicesSub('${items.length}'),
            bottom: SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(l.all),
                      selected: _kind == null,
                      showCheckmark: false,
                      onSelected: (_) => setState(() => _kind = null),
                    ),
                  ),
                  for (final k in panditKinds.where(offered.contains))
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        avatar: Icon(panditKindIcon(k), size: 16),
                        label: Text(panditKindName(l, k)),
                        selected: _kind == k,
                        showCheckmark: false,
                        onSelected: (_) => setState(() => _kind = k),
                      ),
                    ),
                ],
              ),
            ),
          ),
          Expanded(
            child: AsyncView(
              value: list,
              onRetry: () => ref.invalidate(_servicesProvider(vid)),
              builder: (all) {
                final shown = all.where((x) => _kind == null || x.kind == _kind).toList();
                if (shown.isEmpty) {
                  return ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      EmptyState(icon: Icons.self_improvement_rounded, message: l.pandEmpty),
                      const SizedBox(height: 8),
                      GoldButton(
                        label: l.pandAddFirst,
                        icon: Icons.add_rounded,
                        onPressed: () => _serviceForm(context, ref, widget.vendor, null),
                      ),
                    ],
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
                  itemCount: shown.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (_, i) => _ServiceCard(vendor: widget.vendor, x: shown[i]),
                );
              },
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              child: GoldButton(
                label: l.pandAddService,
                icon: Icons.add_rounded,
                onPressed: () => _serviceForm(context, ref, widget.vendor, null),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ServiceCard extends ConsumerWidget {
  const _ServiceCard({required this.vendor, required this.x});
  final VendorResponse vendor;
  final ExperienceResponse x;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final slots = x.slots ?? const <SlotResponse>[];
    final open = slots.where((s) => s.remaining > 0).length;
    final booked = slots.where((s) => s.booked > 0).length;
    return PanelCard(
      onTap: () => _serviceForm(context, ref, vendor, x),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: const Color(0xFFFFF4E0),
                child: Icon(panditKindIcon(x.kind), color: PColors.gold),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      x.title,
                      style: const TextStyle(fontWeight: FontWeight.w800, color: PColors.night),
                    ),
                    Text(
                      '${panditKindName(l, x.kind)} · ${l.pandMinutes('${x.durationMin}')}',
                      style: const TextStyle(fontSize: 12, color: TnColors.muted),
                    ),
                  ],
                ),
              ),
              Switch(
                value: x.isPublished,
                onChanged: (on) async {
                  try {
                    await ref.read(vendorRepositoryProvider).saveExperience(vendor.id, {
                      'isPublished': on,
                    }, experienceId: x.id);
                    ref.invalidate(_servicesProvider(vendor.id));
                  } on Object catch (e) {
                    if (context.mounted) showSnack(context, errorText(context, e));
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: _Fact(l.pandDakshina, formatRupees(x.pricePaise))),
              Expanded(child: _Fact(l.pandPilgrimPays, formatRupees(x.displayPricePaise))),
              Expanded(child: _Fact(l.pandOpenTimes, '$open')),
              Expanded(child: _Fact(l.pandBooked, '$booked')),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _slotsSheet(context, ref, vendor, x),
                  icon: const Icon(Icons.event_available_rounded, size: 18),
                  label: Text(l.pandOpenDates),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _serviceForm(context, ref, vendor, x),
                  icon: const Icon(Icons.edit_rounded, size: 18),
                  label: Text(l.edit),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: const TextStyle(fontSize: 10.5, color: TnColors.muted)),
      Text(
        value,
        style: const TextStyle(fontWeight: FontWeight.w800, color: PColors.night),
      ),
    ],
  );
}

Future<void> _serviceForm(
  BuildContext context,
  WidgetRef ref,
  VendorResponse vendor,
  ExperienceResponse? x,
) {
  final l = context.l10n;
  final form = GlobalKey<FormState>();
  final title = TextEditingController(text: x?.title);
  final minutes = TextEditingController(text: '${x?.durationMin ?? 120}');
  final price = TextEditingController(text: x == null ? '' : rupeesText(x.pricePaise));
  final desc = TextEditingController(text: x?.description);
  final offered = vendor.panditProfile?.specialities ?? panditKinds;
  var kind = x?.kind ?? offered.first;
  var published = x?.isPublished ?? true;
  return showFormSheet<void>(
    context,
    x == null ? l.pandAddService : l.edit,
    StatefulBuilder(
      builder: (context, setState) => Form(
        key: form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (x == null) ...[
              Text(l.pandTemplates, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  for (final t in _templates.where((t) => offered.contains(t.kind)))
                    ActionChip(
                      avatar: Icon(panditKindIcon(t.kind), size: 16, color: PColors.gold),
                      label: Text(t.title, style: const TextStyle(fontSize: 12)),
                      onPressed: () => setState(() {
                        kind = t.kind;
                        title.text = t.title;
                        minutes.text = '${t.minutes}';
                        price.text = '${t.rupees}';
                        desc.text = t.description;
                      }),
                    ),
                ],
              ),
              const SizedBox(height: 12),
            ],
            TextFormField(
              controller: title,
              maxLength: 120,
              decoration: InputDecoration(labelText: l.pandServiceName, counterText: ''),
              validator: (v) => (v ?? '').trim().length < 3 ? l.required : null,
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              key: ValueKey(kind),
              initialValue: kind,
              decoration: InputDecoration(labelText: l.category),
              items: [
                for (final k in panditKinds)
                  DropdownMenuItem(value: k, child: Text(panditKindName(l, k))),
              ],
              onChanged: (v) => setState(() => kind = v ?? kind),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: minutes,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: l.pandDuration),
                    validator: (v) {
                      final n = int.tryParse((v ?? '').trim());
                      return n == null || n < 15 || n > 1440 ? l.invalidValue : null;
                    },
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: price,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: l.pandDakshinaRs),
                    validator: (v) => rupeesField(l, v),
                  ),
                ),
              ],
            ),
            PricePreview(controller: price),
            const SizedBox(height: 10),
            TextFormField(
              controller: desc,
              maxLines: 3,
              maxLength: 2000,
              decoration: InputDecoration(
                labelText: l.pandIncluded,
                hintText: l.pandIncludedHint,
                alignLabelWithHint: true,
              ),
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: published,
              title: Text(l.published),
              onChanged: (v) => setState(() => published = v),
            ),
            const SizedBox(height: 6),
            GoldButton(
              label: x == null ? l.pandAddService : l.save,
              onPressed: () async {
                if (!form.currentState!.validate()) return;
                final body = <String, dynamic>{
                  'title': {'en': title.text.trim()},
                  'kind': kind,
                  'durationMin': int.parse(minutes.text.trim()),
                  'pricePaise': toPaise(price.text),
                  'isPublished': published,
                  if (desc.text.trim().isNotEmpty) 'description': {'en': desc.text.trim()},
                  if (x == null) ...{
                    'cityId': vendor.cityId,
                    'maxGroupSize': 50,
                    'cancellationPolicy': {'freeUntilHoursBefore': 24, 'penaltyPctAfter': 50},
                  },
                };
                try {
                  await ref
                      .read(vendorRepositoryProvider)
                      .saveExperience(vendor.id, body, experienceId: x?.id);
                  ref.invalidate(_servicesProvider(vendor.id));
                  if (context.mounted) {
                    Navigator.of(context).pop();
                    showSnack(context, l.saved);
                  }
                } on Object catch (e) {
                  if (context.mounted) showSnack(context, errorText(context, e));
                }
              },
            ),
          ],
        ),
      ),
    ),
  );
}

/// Open dates and times: pick a start date, how many days and the times.
Future<void> _slotsSheet(
  BuildContext context,
  WidgetRef ref,
  VendorResponse vendor,
  ExperienceResponse x,
) {
  final l = context.l10n;
  var from = DateTime.now().add(const Duration(days: 1));
  var days = 14;
  final times = <String>{'08:00', '16:00'};
  const presets = [
    '06:00',
    '07:00',
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
  ];
  var families = 1;
  final slots = [...?x.slots]..sort((a, b) => a.startsAt.compareTo(b.startsAt));
  return showFormSheet<void>(
    context,
    l.pandOpenDates,
    StatefulBuilder(
      builder: (context, setState) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.calendar_month_rounded, color: PColors.gold),
            title: Text(l.pandFrom),
            subtitle: Text(formatIstDate(from)),
            trailing: const Icon(Icons.edit_calendar_rounded),
            onTap: () async {
              final d = await showDatePicker(
                context: context,
                initialDate: from,
                firstDate: DateTime.now(),
                lastDate: DateTime.now().add(const Duration(days: 365)),
              );
              if (d != null) setState(() => from = d);
            },
          ),
          Text(l.pandForDays, style: const TextStyle(fontWeight: FontWeight.w700)),
          Wrap(
            spacing: 6,
            children: [
              for (final n in const [7, 14, 30, 60])
                ChoiceChip(
                  label: Text(l.pandDays('$n')),
                  selected: days == n,
                  onSelected: (_) => setState(() => days = n),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(l.pandTimes, style: const TextStyle(fontWeight: FontWeight.w700)),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final t in presets)
                FilterChip(
                  label: Text(t),
                  selected: times.contains(t),
                  onSelected: (on) => setState(() => on ? times.add(t) : times.remove(t)),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: Text(l.pandFamilies)),
              IconButton(
                onPressed: families > 1 ? () => setState(() => families--) : null,
                icon: const Icon(Icons.remove_circle_outline),
              ),
              Text('$families', style: const TextStyle(fontWeight: FontWeight.w800)),
              IconButton(
                onPressed: families < 10 ? () => setState(() => families++) : null,
                icon: const Icon(Icons.add_circle_outline),
              ),
            ],
          ),
          GoldButton(
            label: l.pandOpenN('${days * times.length}'),
            onPressed: times.isEmpty
                ? null
                : () async {
                    final dates = [
                      for (var i = 0; i < days; i++)
                        from.add(Duration(days: i)).toIso8601String().substring(0, 10),
                    ];
                    try {
                      await ref
                          .read(vendorRepositoryProvider)
                          .addSlots(
                            vendor.id,
                            x.id,
                            CreateSlotsDto(
                              capacity: families,
                              dates: dates,
                              times: (times.toList()..sort()),
                            ),
                          );
                      ref.invalidate(_servicesProvider(vendor.id));
                      if (context.mounted) {
                        Navigator.of(context).pop();
                        showSnack(context, l.saved);
                      }
                    } on Object catch (e) {
                      if (context.mounted) showSnack(context, errorText(context, e));
                    }
                  },
          ),
          if (slots.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(l.pandUpcoming, style: const TextStyle(fontWeight: FontWeight.w700)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final s in slots.take(40))
                  InputChip(
                    label: Text(
                      '${formatIstDate(DateTime.parse(s.startsAt))} ${formatIstTime(DateTime.parse(s.startsAt))}',
                      style: TextStyle(
                        fontSize: 11.5,
                        color: s.booked > 0 ? PColors.up : PColors.night,
                      ),
                    ),
                    onDeleted: s.booked > 0
                        ? null
                        : () async {
                            try {
                              await ref.read(vendorRepositoryProvider).deleteSlot(vendor.id, s.id);
                              ref.invalidate(_servicesProvider(vendor.id));
                              setState(() => slots.remove(s));
                            } on Object catch (e) {
                              if (context.mounted) showSnack(context, errorText(context, e));
                            }
                          },
                  ),
              ],
            ),
          ],
        ],
      ),
    ),
  );
}
