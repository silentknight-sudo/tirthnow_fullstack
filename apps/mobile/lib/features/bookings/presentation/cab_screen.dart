import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
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
                if (_quotes!.isEmpty) const EmptyState(icon: Icons.local_taxi_outlined),
                for (final q in _quotes!) _QuoteTile(quote: q, pickup: _pickup!, drop: _drop!),
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
        leading: Icon(
          quote.class_ == 'e_rickshaw' || quote.class_ == 'auto'
              ? Icons.electric_rickshaw
              : Icons.local_taxi,
          color: TnColors.brown,
        ),
        title: Text('${quote.class_.replaceAll('_', ' ')} · ${quote.vendorName}'),
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
          child: Text(formatRupees(quote.farePaise, locale: context.lang)),
        ),
      ),
    );
  }
}
