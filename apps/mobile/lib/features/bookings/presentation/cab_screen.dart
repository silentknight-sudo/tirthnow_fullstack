import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../../l10n/app_localizations.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../safety/data/location_service.dart';
import '../data/bookings_repository.dart';
import 'checkout_flow.dart';

/// A pickup/drop point: GPS, a temple, or a common Braj destination.
class _Place {
  const _Place(this.name, this.lat, this.lng, {this.icon = Icons.place_rounded, this.sub});

  final String name;
  final num lat;
  final num lng;
  final IconData icon;
  final String? sub;
}

/// Stations, bus stands and town centres pilgrims ride to most. Free-text
/// address search needs a maps key (docs/CLIENT_SETUP_TODO.md).
const _popular = <_Place>[
  _Place('Mathura Junction (railway station)', 27.4806, 77.6736, icon: Icons.train_rounded),
  _Place('Vrindavan railway station', 27.5714, 77.6735, icon: Icons.train_rounded),
  _Place('Mathura Cantt station', 27.4934, 77.6667, icon: Icons.train_rounded),
  _Place('Mathura new bus stand', 27.4833, 77.6800, icon: Icons.directions_bus_rounded),
  _Place('Vrindavan bus stand', 27.5795, 77.6884, icon: Icons.directions_bus_rounded),
  _Place('Govardhan bus stand', 27.4972, 77.4651, icon: Icons.directions_bus_rounded),
  _Place('Barsana bus stand', 27.6487, 77.3779, icon: Icons.directions_bus_rounded),
  _Place('Vishram Ghat, Mathura', 27.5110, 77.6853, icon: Icons.water_rounded),
  _Place('Keshi Ghat, Vrindavan', 27.5843, 77.7012, icon: Icons.water_rounded),
  _Place('Nidhivan, Vrindavan', 27.5823, 77.6987, icon: Icons.park_rounded),
  _Place('Chhatikara (Vrindavan turn)', 27.5386, 77.6372, icon: Icons.alt_route_rounded),
  _Place('Agra airport (Kheria)', 27.1558, 77.9609, icon: Icons.flight_rounded),
];

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
  bool _locating = false;
  String _group = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _useCurrentLocation());
  }

  Future<void> _useCurrentLocation() async {
    setState(() => _locating = true);
    final fix = await ref.read(locationServiceProvider).current();
    if (!mounted) return;
    final l = context.l10n;
    setState(() {
      _locating = false;
      _quotes = null;
      _pickup = _Place(
        l.currentLocation,
        fix.lat,
        fix.lng,
        icon: Icons.my_location_rounded,
        sub: fix.approximate ? l.locationApprox : null,
      );
    });
  }

  Future<void> _choose({required bool pickup}) async {
    final temples = ref.read(templesProvider).value ?? const [];
    final picked = await showModalBottomSheet<_Place>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _PlaceSheet(
        title: pickup ? context.l10n.pickup : context.l10n.whereTo,
        temples: [
          for (final t in temples) _Place(t.name, t.lat, t.lng, icon: Icons.temple_hindu_rounded),
        ],
        offerGps: pickup,
      ),
    );
    if (picked == null) return;
    if (picked.name == '__gps__') return _useCurrentLocation();
    setState(() {
      _quotes = null;
      if (pickup) {
        _pickup = picked;
      } else {
        _drop = picked;
      }
    });
    if (_pickup != null && _drop != null) await _estimate();
  }

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
    ref.watch(templesProvider);
    final same = _pickup != null && _drop != null && _pickup!.name == _drop!.name;
    return Scaffold(
      appBar: AppBar(title: Text(l.cabs)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          Container(
            padding: const EdgeInsets.symmetric(vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: TnColors.line),
              boxShadow: const [
                BoxShadow(color: Color(0x141C3C6B), blurRadius: 12, offset: Offset(0, 4)),
              ],
            ),
            child: Column(
              children: [
                _PointRow(
                  dot: const Color(0xFF2F9E44),
                  label: l.pickup,
                  value: _locating ? l.locating : _pickup?.name,
                  sub: _pickup?.sub,
                  hint: l.currentLocation,
                  onTap: () => _choose(pickup: true),
                  trailing: IconButton(
                    tooltip: l.currentLocation,
                    onPressed: _locating ? null : _useCurrentLocation,
                    icon: const Icon(Icons.my_location_rounded, color: TnColors.saffron),
                  ),
                ),
                const Divider(height: 1, indent: 48),
                _PointRow(
                  dot: TnColors.sos,
                  label: l.drop,
                  value: _drop?.name,
                  hint: l.whereTo,
                  onTap: () => _choose(pickup: false),
                  trailing: const Padding(
                    padding: EdgeInsets.all(12),
                    child: Icon(Icons.search_rounded, color: TnColors.muted),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _pickup != null && _drop != null && !same && !_loading ? _estimate : null,
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
                  ('all', Icons.apps_rounded, l.cabAll),
                  ('bike', Icons.two_wheeler_rounded, l.cabBike),
                  ('auto', Icons.electric_rickshaw_rounded, l.cabAuto),
                  ('car', Icons.local_taxi_rounded, l.cabCar),
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
            for (final q in _quotes!.where((q) => _group == 'all' || cabGroup(q.class_) == _group))
              _QuoteTile(quote: q, pickup: _pickup!, drop: _drop!),
          ],
        ],
      ),
    );
  }
}

class _PointRow extends StatelessWidget {
  const _PointRow({
    required this.dot,
    required this.label,
    required this.value,
    required this.hint,
    required this.onTap,
    required this.trailing,
    this.sub,
  });

  final Color dot;
  final String label;
  final String? value;
  final String hint;
  final String? sub;
  final VoidCallback onTap;
  final Widget trailing;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.only(left: 16),
      child: Row(
        children: [
          Container(
            width: 12,
            height: 12,
            decoration: BoxDecoration(color: dot, shape: BoxShape.circle),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(fontSize: 11.5, color: TnColors.muted)),
                  Text(
                    value ?? hint,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: value == null ? TnColors.muted : TnColors.ink,
                    ),
                  ),
                  if (sub != null)
                    Text(sub!, style: const TextStyle(fontSize: 11, color: TnColors.accent)),
                ],
              ),
            ),
          ),
          trailing,
        ],
      ),
    ),
  );
}

/// Search temples and popular destinations (stations, bus stands, ghats).
class _PlaceSheet extends StatefulWidget {
  const _PlaceSheet({required this.title, required this.temples, required this.offerGps});

  final String title;
  final List<_Place> temples;
  final bool offerGps;

  @override
  State<_PlaceSheet> createState() => _PlaceSheetState();
}

class _PlaceSheetState extends State<_PlaceSheet> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    bool hit(_Place p) => _q.isEmpty || p.name.toLowerCase().contains(_q);
    final popular = _popular.where(hit).toList();
    final temples = widget.temples.where(hit).toList();
    Widget tile(_Place p) => ListTile(
      leading: CircleAvatar(
        backgroundColor: const Color(0xFFFFF1E4),
        child: Icon(p.icon, color: TnColors.saffron, size: 20),
      ),
      title: Text(p.name),
      onTap: () => Navigator.pop(context, p),
    );
    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      maxChildSize: 0.95,
      builder: (_, controller) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: TextField(
              autofocus: true,
              onChanged: (v) => setState(() => _q = v.trim().toLowerCase()),
              decoration: InputDecoration(
                hintText: l.searchPlaces,
                labelText: widget.title,
                prefixIcon: const Icon(Icons.search_rounded),
              ),
            ),
          ),
          Expanded(
            child: ListView(
              controller: controller,
              children: [
                if (widget.offerGps)
                  ListTile(
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFFEAF7EE),
                      child: Icon(Icons.my_location_rounded, color: Color(0xFF2F9E44)),
                    ),
                    title: Text(l.currentLocation),
                    onTap: () => Navigator.pop(context, const _Place('__gps__', 0, 0)),
                  ),
                if (popular.isNotEmpty) SectionTitle(l.popularPlaces),
                for (final p in popular) tile(p),
                if (temples.isNotEmpty) SectionTitle(l.temples),
                for (final p in temples) tile(p),
              ],
            ),
          ),
        ],
      ),
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
