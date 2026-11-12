import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../../l10n/app_localizations.dart';
import '../../catalog/data/catalog_repository.dart';
import '../data/bookings_repository.dart';
import 'checkout_flow.dart';

/// A pickup/drop choice. Pilgrims mostly ride between temples, so temples
/// are offered as places; free-text addresses come with maps in Phase 6.
class _Place {
  const _Place(this.name, this.lat, this.lng);

  final String name;
  final num lat;
  final num lng;
}

class CabScreen extends ConsumerStatefulWidget {
  const CabScreen({super.key});

  @override
  ConsumerState<CabScreen> createState() => _CabScreenState();
}

class _CabScreenState extends ConsumerState<CabScreen> {
  _Place? _pickup;
  _Place? _drop;
  List<CabQuoteResponse>? _quotes;
  bool _loading = false;
  String _group = 'all';

  Future<void> _estimate() async {
    final p = _pickup;
    final d = _drop;
    if (p == null || d == null) return;
    setState(() => _loading = true);
    try {
      final q = await ref
          .read(bookingsRepositoryProvider)
          .cabQuotes(PointDto(lat: p.lat, lng: p.lng), PointDto(lat: d.lat, lng: d.lng));
      setState(() => _quotes = q);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final temples = ref.watch(templesProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l.cabs)),
      body: AsyncView(
        value: temples,
        onRetry: () => ref.invalidate(templesProvider),
        builder: (list) {
          final places = [for (final t in list) _Place(t.name, t.lat, t.lng)];
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            children: [
              _PlaceField(
                label: l.pickup,
                icon: Icons.trip_origin,
                places: places,
                value: _pickup,
                onChanged: (v) => setState(() {
                  _pickup = v;
                  _quotes = null;
                }),
              ),
              const SizedBox(height: 12),
              _PlaceField(
                label: l.drop,
                icon: Icons.place,
                places: places,
                value: _drop,
                onChanged: (v) => setState(() {
                  _drop = v;
                  _quotes = null;
                }),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _pickup != null && _drop != null && _pickup != _drop && !_loading
                    ? _estimate
                    : null,
                child: Text(l.getQuotes),
              ),
              if (_loading)
                const Padding(padding: EdgeInsets.all(16), child: LinearProgressIndicator()),
              if (_quotes != null) ...[
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  children: [
                    for (final (g, icon, label) in [
                      ('all', Icons.apps_rounded, context.l10n.cabAll),
                      ('bike', Icons.two_wheeler_rounded, context.l10n.cabBike),
                      ('auto', Icons.electric_rickshaw_rounded, context.l10n.cabAuto),
                      ('car', Icons.local_taxi_rounded, context.l10n.cabCar),
                    ])
                      ChoiceChip(
                        avatar: Icon(icon, size: 18),
                        label: Text(label),
                        selected: _group == g,
                        onSelected: (_) => setState(() => _group = g),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                if (_quotes!.where((q) => _group == 'all' || cabGroup(q.class_) == _group).isEmpty)
                  const EmptyState(icon: Icons.local_taxi_outlined),
                for (final q in _quotes!.where(
                  (q) => _group == 'all' || cabGroup(q.class_) == _group,
                ))
                  _QuoteTile(quote: q, pickup: _pickup!, drop: _drop!),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _PlaceField extends StatelessWidget {
  const _PlaceField({
    required this.label,
    required this.icon,
    required this.places,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final IconData icon;
  final List<_Place> places;
  final _Place? value;
  final ValueChanged<_Place?> onChanged;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonFormField<_Place>(
      initialValue: value,
      isExpanded: true,
      decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon)),
      items: [
        for (final p in places)
          DropdownMenuItem(
            value: p,
            child: Text(p.name, overflow: TextOverflow.ellipsis),
          ),
      ],
      onChanged: onChanged,
    );
  }
}

class _QuoteTile extends ConsumerWidget {
  const _QuoteTile({required this.quote, required this.pickup, required this.drop});

  final CabQuoteResponse quote;
  final _Place pickup;
  final _Place drop;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final mins = (quote.durationS / 60).round();
    final km = (quote.distanceM / 1000).toStringAsFixed(1);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFFFFF1E4),
          child: Icon(cabIcon(quote.class_), color: TnColors.saffron),
        ),
        title: Text('${cabLabel(l, quote.class_)} · ${quote.vendorName}'),
        subtitle: Text(
          '$km km · $mins min · ${l.seats}: ${quote.seats}${quote.nightSurchargeApplied ? ' · ${l.nightFare}' : ''}',
        ),
        trailing: FilledButton(
          onPressed: () => placeOrder(
            context,
            ref,
            CreateOrderDto(
              type: 'cab',
              cab: CabOrderDto(
                vendorId: quote.vendorId,
                vehicleClass: quote.class_,
                pickup: PlaceDto(lat: pickup.lat, lng: pickup.lng, address: pickup.name),
                drop: PlaceDto(lat: drop.lat, lng: drop.lng, address: drop.name),
                pickupAt: DateTime.now().toUtc().add(const Duration(minutes: 15)).toIso8601String(),
              ),
            ),
            description: '${pickup.name} → ${drop.name}',
          ),
          child: Text(formatRupees(quote.displayFarePaise, locale: context.lang)),
        ),
      ),
    );
  }
}

/// Bike, auto (incl. e-rickshaw) or car (hatchback, sedan, SUV, tempo traveller).
String cabGroup(String cls) => switch (cls) {
  'bike' => 'bike',
  'auto' || 'e_rickshaw' => 'auto',
  _ => 'car',
};

IconData cabIcon(String cls) => switch (cabGroup(cls)) {
  'bike' => Icons.two_wheeler_rounded,
  'auto' => Icons.electric_rickshaw_rounded,
  _ => Icons.local_taxi_rounded,
};

String cabLabel(AppLocalizations l, String cls) => switch (cls) {
  'bike' => l.cabBike,
  'auto' => l.cabAuto,
  'e_rickshaw' => l.cabERickshaw,
  'hatchback' => l.cabHatchback,
  'sedan' => l.cabSedan,
  'suv' => l.cabSuv,
  _ => l.cabTempo,
};
