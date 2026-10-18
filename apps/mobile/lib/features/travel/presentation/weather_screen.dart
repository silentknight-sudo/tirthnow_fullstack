import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../catalog/data/catalog_repository.dart';

typedef TrainQuery = ({String from, String to, String date});

final trainsProvider = FutureProvider.family<TrainSearchResponse, TrainQuery>((ref, q) async {
  return TrainSearchResponse.fromJson(
    await ref
        .watch(apiClientProvider)
        .getJson('/transit/search', query: {'from': q.from, 'to': q.to, 'date': q.date}),
  );
});

/// Five-day forecast with heat/fog/rain advisories, plus trains into Braj
/// (discovery only — booking happens on IRCTC, ADR-0012).
class WeatherScreen extends ConsumerStatefulWidget {
  const WeatherScreen({super.key});

  @override
  ConsumerState<WeatherScreen> createState() => _WeatherScreenState();
}

class _WeatherScreenState extends ConsumerState<WeatherScreen> {
  final _from = TextEditingController(text: 'NDLS');
  final _to = TextEditingController(text: 'MTJ');
  TrainQuery? _query;

  @override
  void dispose() {
    _from.dispose();
    _to.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final weather = ref.watch(weatherProvider);
    final q = _query;
    return Scaffold(
      appBar: AppBar(title: Text(l.weatherAndTrains)),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 40),
        children: [
          AsyncView(
            value: weather,
            onRetry: () => ref.invalidate(weatherProvider),
            builder: (w) => Column(
              children: [
                for (final a in w.advisories)
                  Card(
                    margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                    child: ListTile(
                      leading: Icon(
                        a.severity == 'warning' ? Icons.warning_amber : Icons.info_outline,
                        color: a.severity == 'warning' ? TnColors.saffron : TnColors.gold,
                      ),
                      title: Text(a.message),
                      subtitle: Text(a.date),
                    ),
                  ),
                for (final d in w.daily)
                  ListTile(
                    title: Text(
                      DateFormat('EEE d MMM', context.lang).format(DateTime.parse(d.date)),
                    ),
                    subtitle: Text(d.condition),
                    trailing: Text(
                      '${d.minC.round()}° / ${d.maxC.round()}°  ☂ ${d.rainChancePct.round()}%',
                    ),
                  ),
              ],
            ),
          ),
          SectionTitle(l.trainsTo),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _from,
                    decoration: InputDecoration(labelText: l.fromStation),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _to,
                    decoration: InputDecoration(labelText: l.toStation),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  tooltip: l.search,
                  icon: const Icon(Icons.search),
                  onPressed: () => setState(
                    () => _query = (
                      from: _from.text.trim().toUpperCase(),
                      to: _to.text.trim().toUpperCase(),
                      date: istDateString(),
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (q != null)
            ref
                .watch(trainsProvider(q))
                .when(
                  loading: () =>
                      const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator()),
                  error: (e, _) => ErrorPanel(error: e),
                  data: (r) => Column(
                    children: [
                      if (r.trains.isEmpty) const EmptyState(icon: Icons.train_outlined),
                      for (final t in r.trains)
                        ListTile(
                          leading: const Icon(Icons.train_outlined, color: TnColors.brown),
                          title: Text('${t.number} ${t.name}'),
                          subtitle: Text(
                            '${t.departs} → ${t.arrives} · ${(t.durationMin / 60).toStringAsFixed(1)} h',
                          ),
                          trailing: const Icon(Icons.open_in_new),
                          onTap: () => launchUrl(
                            Uri.parse(t.bookingUrl),
                            mode: LaunchMode.externalApplication,
                          ),
                        ),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Text(
                          r.disclaimer,
                          style: const TextStyle(color: TnColors.muted, fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
        ],
      ),
    );
  }
}
