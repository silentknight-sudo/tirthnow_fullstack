import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../bookings/presentation/checkout_flow.dart';
import '../data/ai_repository.dart';

/// Day-by-day plan built around real aarti times (from the temple schedule),
/// afternoon rest and travel time between stops.
class PlannerScreen extends ConsumerStatefulWidget {
  const PlannerScreen({super.key});

  @override
  ConsumerState<PlannerScreen> createState() => _PlannerScreenState();
}

class _PlannerScreenState extends ConsumerState<PlannerScreen> {
  int _days = 2;
  String _pace = 'normal';
  DateTime _start = DateTime.parse(istDateString()).add(const Duration(days: 1));
  bool _elderly = false;
  bool _wheelchair = false;
  bool _busy = false;
  Json? _plan;

  Future<void> _generate() async {
    // Saved itineraries belong to a phone-verified account (the API refuses guests).
    if (!requireSignedIn(context, ref)) return;
    setState(() => _busy = true);
    try {
      final plan = await ref
          .read(aiRepositoryProvider)
          .createItinerary(
            CreateItineraryDto(
              days: _days,
              startDate: DateFormat('yyyy-MM-dd').format(_start),
              pace: _pace,
              lang: ref.read(localeProvider).languageCode,
              accessibility: AccessibilityDto(elderly: _elderly, wheelchair: _wheelchair),
            ),
          );
      setState(() => _plan = plan);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final plan = _plan;
    return Scaffold(
      appBar: AppBar(title: Text(l.planner)),
      body: plan != null
          ? ItineraryView(plan: plan, onReset: () => setState(() => _plan = null))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                ListTile(
                  title: Text(l.startDate),
                  trailing: Text(DateFormat('EEE d MMM', context.lang).format(_start)),
                  onTap: () async {
                    final now = DateTime.parse(istDateString());
                    final d = await showDatePicker(
                      context: context,
                      firstDate: now,
                      lastDate: now.add(const Duration(days: 180)),
                      initialDate: _start,
                    );
                    if (d != null) setState(() => _start = d);
                  },
                ),
                ListTile(
                  title: Text(l.days),
                  trailing: SegmentedButton<int>(
                    segments: [
                      for (final d in const [1, 2, 3, 5])
                        ButtonSegment(value: d, label: Text('$d')),
                    ],
                    selected: {_days},
                    showSelectedIcon: false,
                    onSelectionChanged: (s) => setState(() => _days = s.first),
                  ),
                ),
                Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: Text(l.pace)),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: SegmentedButton<String>(
                    segments: [
                      ButtonSegment(value: 'relaxed', label: Text(l.paceRelaxed)),
                      ButtonSegment(value: 'normal', label: Text(l.paceModerate)),
                      ButtonSegment(value: 'packed', label: Text(l.paceIntense)),
                    ],
                    selected: {_pace},
                    showSelectedIcon: false,
                    onSelectionChanged: (s) => setState(() => _pace = s.first),
                  ),
                ),
                SwitchListTile(
                  title: Text(l.eldersInGroup),
                  value: _elderly,
                  onChanged: (v) => setState(() => _elderly = v),
                ),
                SwitchListTile(
                  title: Text(l.wheelchairAccess),
                  value: _wheelchair,
                  onChanged: (v) => setState(() => _wheelchair = v),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  icon: const Icon(Icons.auto_awesome),
                  label: Text(l.planTrip),
                  onPressed: _busy ? null : _generate,
                ),
                if (_busy)
                  const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator()),
              ],
            ),
    );
  }
}

class ItineraryView extends ConsumerWidget {
  const ItineraryView({super.key, required this.plan, this.onReset});

  final Json plan;
  final VoidCallback? onReset;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final days = (plan['dayList'] as List<dynamic>? ?? const []).map(asJson).toList();
    final cost = plan['estimatedCostPaise'] as num?;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
      children: [
        Text(
          (plan['title'] as String?) ?? l.planner,
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        if (cost != null)
          Text(
            '≈ ${formatRupees(cost, locale: context.lang)}',
            style: const TextStyle(color: TnColors.muted),
          ),
        const SizedBox(height: 8),
        Row(
          children: [
            OutlinedButton.icon(
              icon: const Icon(Icons.share_outlined),
              label: Text(l.sharePlan),
              onPressed: () async {
                try {
                  final url = await ref.read(aiRepositoryProvider).share(plan['id'] as String);
                  await SharePlus.instance.share(ShareParams(text: url));
                } on Object catch (e) {
                  if (context.mounted) showSnack(context, errorText(context, e));
                }
              },
            ),
            const SizedBox(width: 8),
            OutlinedButton.icon(
              icon: const Icon(Icons.picture_as_pdf_outlined),
              label: Text(l.downloadPdf),
              onPressed: () async {
                try {
                  final bytes = await ref
                      .read(apiClientProvider)
                      .getBytes('/ai/itineraries/${plan['id']}/pdf');
                  await SharePlus.instance.share(
                    ShareParams(
                      files: [
                        XFile.fromData(
                          Uint8List.fromList(bytes),
                          mimeType: 'application/pdf',
                          name: 'tirth-now-yatra.pdf',
                        ),
                      ],
                    ),
                  );
                } on Object catch (e) {
                  if (context.mounted) showSnack(context, errorText(context, e));
                }
              },
            ),
          ],
        ),
        for (final d in days) ...[
          SectionTitle('${l.dayN('${((d['dayIndex'] as num?) ?? 0).toInt() + 1}')} · ${d['date']}'),
          if (d['note'] is String)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Text(d['note'] as String, style: const TextStyle(color: TnColors.muted)),
            ),
          for (final it in (d['items'] as List<dynamic>? ?? const []).map(asJson))
            _PlanItem(item: it),
        ],
        if (onReset != null) TextButton(onPressed: onReset, child: Text(l.planTrip)),
      ],
    );
  }
}

class _PlanItem extends StatelessWidget {
  const _PlanItem({required this.item});

  final Json item;

  @override
  Widget build(BuildContext context) {
    final kind = item['kind'] as String? ?? '';
    final starts = item['startsAt'] is String ? DateTime.parse(item['startsAt'] as String) : null;
    final travel = item['travelDurationMin'] as num?;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Text(
          starts == null ? '' : formatIstTime(starts),
          style: const TextStyle(
            fontFamily: 'Cormorant',
            fontFeatures: liningFigures,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: TnColors.brown,
          ),
        ),
        title: Text(item['title'] as String? ?? ''),
        subtitle: Text(
          [
            kind.toUpperCase(),
            if (travel != null) context.l10n.minTravel('${travel.round()}'),
            if (item['note'] is String) item['note'] as String,
          ].join(' · '),
        ),
        trailing: kind == 'aarti'
            ? const Icon(Icons.local_fire_department_outlined, color: TnColors.saffron)
            : null,
      ),
    );
  }
}
