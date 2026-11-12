import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_models.dart';
import '../../core/format/formatters.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../shared/partner_ui.dart';
import '../vendor/data/vendor_repository.dart';

final _productsProvider = FutureProvider.family<List<ProductResponse>, String>(
  (ref, id) => ref.watch(vendorRepositoryProvider).products(id),
);
final _vehiclesProvider = FutureProvider.family<List<VehicleResponse>, String>(
  (ref, id) => ref.watch(vendorRepositoryProvider).vehicles(id),
);
final _faresProvider = FutureProvider.family<List<CabFareResponse>, String>(
  (ref, id) => ref.watch(vendorRepositoryProvider).fares(id),
);
final _hotelsProvider = FutureProvider.family<List<HotelResponse>, String>(
  (ref, id) => ref.watch(vendorRepositoryProvider).hotels(id),
);
final _restaurantsProvider = FutureProvider.family<List<RestaurantResponse>, String>(
  (ref, id) => ref.watch(vendorRepositoryProvider).restaurants(id),
);

/// What a partner sells, by service type.
class ListingsScreen extends StatelessWidget {
  const ListingsScreen({required this.vendor, super.key});

  final VendorResponse vendor;

  @override
  Widget build(BuildContext context) => switch (vendor.type) {
    'cab' => _CabListings(vendor: vendor),
    'hotel' || 'dharamshala' => _StayListings(vendor: vendor),
    'restaurant' => _FoodListings(vendor: vendor),
    _ => _StoreListings(vendor: vendor),
  };
}

Future<void> _guard(BuildContext context, Future<void> Function() fn) async {
  try {
    await fn();
    if (context.mounted) {
      Navigator.of(context).pop();
      showSnack(context, context.l10n.saved);
    }
  } on Object catch (e) {
    if (context.mounted) showSnack(context, errorText(context, e));
  }
}

// ───────────────────────── Temple Store ─────────────────────────

class _StoreListings extends ConsumerWidget {
  const _StoreListings({required this.vendor});

  final VendorResponse vendor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final list = ref.watch(_productsProvider(vendor.id));
    return Scaffold(
      appBar: AppBar(title: Text(l.products)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _productForm(context, ref, vendor.id, null),
        icon: const Icon(Icons.add),
        label: Text(l.addProduct),
      ),
      body: AsyncView(
        value: list,
        onRetry: () => ref.invalidate(_productsProvider(vendor.id)),
        builder: (items) => items.isEmpty
            ? EmptyState(icon: Icons.storefront_outlined, message: l.emptyList)
            : GridView.builder(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.66,
                ),
                itemCount: items.length,
                itemBuilder: (_, i) => _ProductCard(
                  p: items[i],
                  onTap: () => _productForm(context, ref, vendor.id, items[i]),
                ),
              ),
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.p, required this.onTap});

  final ProductResponse p;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return PanelCard(
      padding: EdgeInsets.zero,
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (p.imageUrls.isNotEmpty)
                  Image.network(
                    p.imageUrls.first,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const _NoImage(),
                  )
                else
                  const _NoImage(),
                if (!p.isPublished)
                  Positioned(top: 8, left: 8, child: Pill(l.hidden, color: TnColors.muted)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  p.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 4),
                Text(
                  formatRupees(p.pricePaise),
                  style: const TextStyle(fontWeight: FontWeight.w700, color: TnColors.navy),
                ),
                Text(
                  l.customerPays(formatRupees(p.displayPricePaise)),
                  style: const TextStyle(fontSize: 11, color: TnColors.muted),
                ),
                const SizedBox(height: 4),
                Text(
                  '${l.inStock('${p.stock}')} · ${l.sold('${p.soldCount}')}',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: p.stock == 0 ? TnColors.sos : TnColors.success,
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

class _NoImage extends StatelessWidget {
  const _NoImage();

  @override
  Widget build(BuildContext context) => Container(
    color: const Color(0xFFFFF1E4),
    child: const Icon(Icons.image_outlined, color: TnColors.accentSoft, size: 36),
  );
}

Future<void> _productForm(BuildContext context, WidgetRef ref, String vid, ProductResponse? p) {
  final l = context.l10n;
  final form = GlobalKey<FormState>();
  final name = TextEditingController(text: p?.name);
  final desc = TextEditingController(text: p?.description);
  final price = TextEditingController(text: p == null ? '' : rupeesText(p.pricePaise));
  final mrp = TextEditingController(text: p?.mrpPaise == null ? '' : rupeesText(p!.mrpPaise!));
  final stock = TextEditingController(text: p == null ? '' : '${p.stock}');
  final unit = TextEditingController(text: p?.unit ?? 'piece');
  var category = p?.category ?? 'pooja_thali';
  var published = p?.isPublished ?? true;
  String? mediaId;
  var uploading = false;
  return showFormSheet<void>(
    context,
    p == null ? l.addProduct : l.edit,
    StatefulBuilder(
      builder: (context, setState) => Form(
        key: form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            OutlinedButton.icon(
              onPressed: uploading
                  ? null
                  : () async {
                      final x = await ImagePicker().pickImage(
                        source: ImageSource.gallery,
                        maxWidth: 1600,
                        imageQuality: 85,
                      );
                      if (x == null) return;
                      setState(() => uploading = true);
                      try {
                        mediaId = await ref
                            .read(vendorRepositoryProvider)
                            .upload(
                              'listing_image',
                              await x.readAsBytes(),
                              x.mimeType ?? 'image/jpeg',
                            );
                      } on Object catch (e) {
                        if (context.mounted) showSnack(context, errorText(context, e));
                      } finally {
                        setState(() => uploading = false);
                      }
                    },
              icon: Icon(mediaId == null ? Icons.add_a_photo_outlined : Icons.check_circle_rounded),
              label: Text(uploading ? '…' : l.addPhoto),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: name,
              decoration: InputDecoration(labelText: l.productName),
              validator: (v) => requiredText(l, v),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              initialValue: category,
              decoration: InputDecoration(labelText: l.category),
              items: [
                for (final c in productCategories)
                  DropdownMenuItem(value: c, child: Text(categoryLabel(l, c))),
              ],
              onChanged: (v) => category = v ?? category,
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: desc,
              maxLines: 2,
              decoration: InputDecoration(labelText: l.description),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: price,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: l.basePrice),
                    validator: (v) => rupeesField(l, v),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: mrp,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: InputDecoration(labelText: l.mrp),
                    validator: (v) => rupeesField(l, v, optional: true),
                  ),
                ),
              ],
            ),
            PricePreview(controller: price),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: stock,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(labelText: l.stock),
                    validator: (v) => intField(l, v),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: TextFormField(
                    controller: unit,
                    decoration: InputDecoration(labelText: l.unit),
                  ),
                ),
              ],
            ),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: published,
              title: Text(l.published),
              onChanged: (v) => setState(() => published = v),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () {
                if (!form.currentState!.validate()) return;
                final body = <String, dynamic>{
                  'name': name.text.trim(),
                  'description': desc.text.trim().isEmpty ? null : desc.text.trim(),
                  'category': category,
                  'unit': unit.text.trim().toLowerCase(),
                  'pricePaise': toPaise(price.text),
                  'mrpPaise': toPaise(mrp.text),
                  'stock': int.parse(stock.text.trim()),
                  'isPublished': published,
                  'mediaIds': ?(mediaId == null ? null : [mediaId]),
                }..removeWhere((_, v) => v == null);
                _guard(context, () async {
                  await ref.read(vendorRepositoryProvider).saveProduct(vid, body, productId: p?.id);
                  ref.invalidate(_productsProvider(vid));
                });
              },
              child: Text(l.save),
            ),
            if (p != null)
              TextButton(
                onPressed: () => _guard(context, () async {
                  await ref.read(vendorRepositoryProvider).deleteProduct(vid, p.id);
                  ref.invalidate(_productsProvider(vid));
                }),
                style: TextButton.styleFrom(foregroundColor: TnColors.sos),
                child: Text(l.delete),
              ),
          ],
        ),
      ),
    ),
  );
}

// ───────────────────────── Cabs ─────────────────────────

class _CabListings extends ConsumerWidget {
  const _CabListings({required this.vendor});

  final VendorResponse vendor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(l.tabListings),
          bottom: TabBar(
            tabs: [
              Tab(text: l.vehicles),
              Tab(text: l.fares),
            ],
          ),
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _vehicleForm(context, ref, vendor.id),
          icon: const Icon(Icons.add),
          label: Text(l.addVehicle),
        ),
        body: TabBarView(
          children: [
            AsyncView(
              value: ref.watch(_vehiclesProvider(vendor.id)),
              onRetry: () => ref.invalidate(_vehiclesProvider(vendor.id)),
              builder: (list) => list.isEmpty
                  ? EmptyState(icon: Icons.local_taxi_outlined, message: l.emptyList)
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                      children: [
                        for (final v in list)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: PanelCard(
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    backgroundColor: const Color(0xFFFFF1E4),
                                    child: Icon(cabIcon(v.class_), color: TnColors.accent),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          v.registrationNo,
                                          style: const TextStyle(fontWeight: FontWeight.w700),
                                        ),
                                        Text(
                                          '${cabLabel(l, v.class_)} · ${v.model ?? ''} · ${l.seats}: ${v.seats}',
                                          style: const TextStyle(
                                            color: TnColors.muted,
                                            fontSize: 13,
                                          ),
                                        ),
                                        if (v.driverName != null)
                                          Text(
                                            '👤 ${v.driverName}',
                                            style: const TextStyle(fontSize: 13),
                                          ),
                                      ],
                                    ),
                                  ),
                                  Switch(
                                    value: v.isActive,
                                    onChanged: (on) async {
                                      try {
                                        await ref.read(vendorRepositoryProvider).saveVehicle(
                                          vendor.id,
                                          {'isActive': on},
                                          vehicleId: v.id,
                                        );
                                        ref.invalidate(_vehiclesProvider(vendor.id));
                                      } on Object catch (e) {
                                        if (context.mounted) {
                                          showSnack(context, errorText(context, e));
                                        }
                                      }
                                    },
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
            ),
            AsyncView(
              value: ref.watch(_faresProvider(vendor.id)),
              onRetry: () => ref.invalidate(_faresProvider(vendor.id)),
              builder: (fares) => ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                children: [
                  Text(l.priceNote, style: const TextStyle(color: TnColors.muted, fontSize: 13)),
                  const SizedBox(height: 10),
                  for (final cls in cabClasses)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _FareTile(
                        cls: cls,
                        fare: fares.where((f) => f.class_ == cls).firstOrNull,
                        onTap: () => _fareForm(
                          context,
                          ref,
                          vendor.id,
                          cls,
                          fares.where((f) => f.class_ == cls).firstOrNull,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FareTile extends StatelessWidget {
  const _FareTile({required this.cls, required this.fare, required this.onTap});

  final String cls;
  final CabFareResponse? fare;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final f = fare;
    return PanelCard(
      onTap: onTap,
      child: Row(
        children: [
          Icon(cabIcon(cls), color: TnColors.navy),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(cabLabel(l, cls), style: const TextStyle(fontWeight: FontWeight.w600)),
                Text(
                  f == null
                      ? l.setFare
                      : '${formatRupees(f.baseFarePaise)} + ${formatRupees(f.perKmPaise)}/km · min ${formatRupees(f.minFarePaise)}',
                  style: const TextStyle(color: TnColors.muted, fontSize: 13),
                ),
              ],
            ),
          ),
          Icon(f == null ? Icons.add_circle_outline : Icons.edit_outlined, color: TnColors.accent),
        ],
      ),
    );
  }
}

Future<void> _vehicleForm(BuildContext context, WidgetRef ref, String vid) {
  final l = context.l10n;
  final form = GlobalKey<FormState>();
  final reg = TextEditingController();
  final model = TextEditingController();
  final seats = TextEditingController(text: '4');
  final driver = TextEditingController();
  var cls = 'sedan';
  return showFormSheet<void>(
    context,
    l.addVehicle,
    StatefulBuilder(
      builder: (context, setState) => Form(
        key: form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final c in cabClasses)
                  ChoiceChip(
                    avatar: Icon(cabIcon(c), size: 18),
                    label: Text(cabLabel(l, c)),
                    selected: cls == c,
                    onSelected: (_) => setState(() {
                      cls = c;
                      seats.text = switch (c) {
                        'bike' => '1',
                        'auto' || 'e_rickshaw' => '3',
                        'suv' => '6',
                        'tempo_traveller' => '12',
                        _ => '4',
                      };
                    }),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: reg,
              textCapitalization: TextCapitalization.characters,
              decoration: InputDecoration(labelText: l.regNo, hintText: 'UP85AB1234'),
              validator: (v) => requiredText(l, v),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: model,
              decoration: InputDecoration(labelText: l.model),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: seats,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(labelText: l.seats),
              validator: (v) => intField(l, v, min: 1, max: 20),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: driver,
              decoration: InputDecoration(labelText: l.driverName),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () {
                if (!form.currentState!.validate()) return;
                _guard(context, () async {
                  await ref.read(vendorRepositoryProvider).saveVehicle(vid, {
                    'class': cls,
                    'registrationNo': reg.text.trim().toUpperCase().replaceAll(' ', ''),
                    'model': ?(model.text.trim().isEmpty ? null : model.text.trim()),
                    'seats': int.parse(seats.text.trim()),
                    'driverName': ?(driver.text.trim().isEmpty ? null : driver.text.trim()),
                  });
                  ref.invalidate(_vehiclesProvider(vid));
                });
              },
              child: Text(l.save),
            ),
          ],
        ),
      ),
    ),
  );
}

Future<void> _fareForm(
  BuildContext context,
  WidgetRef ref,
  String vid,
  String cls,
  CabFareResponse? f,
) {
  final l = context.l10n;
  final form = GlobalKey<FormState>();
  final base = TextEditingController(text: f == null ? '' : rupeesText(f.baseFarePaise));
  final km = TextEditingController(text: f == null ? '' : rupeesText(f.perKmPaise));
  final min = TextEditingController(text: f == null ? '0' : rupeesText(f.perMinPaise));
  final minFare = TextEditingController(text: f == null ? '' : rupeesText(f.minFarePaise));
  final night = TextEditingController(text: '${f?.nightSurchargePct ?? 0}');
  Widget field(TextEditingController c, String label, {bool pct = false}) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: TextFormField(
      controller: c,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      decoration: InputDecoration(labelText: label),
      validator: (v) =>
          pct ? intField(l, v, max: 100) : (toPaise(v ?? '') == null ? l.invalidValue : null),
    ),
  );
  return showFormSheet<void>(
    context,
    '${l.setFare} · ${cabLabel(l, cls)}',
    Form(
      key: form,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          field(base, l.baseFare),
          field(km, l.perKm),
          field(min, l.perMin),
          field(minFare, l.minFare),
          field(night, l.nightPct, pct: true),
          PricePreview(controller: minFare),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () {
              if (!form.currentState!.validate()) return;
              _guard(context, () async {
                await ref
                    .read(vendorRepositoryProvider)
                    .saveFare(
                      vid,
                      cls,
                      UpsertCabFareDto(
                        baseFarePaise: toPaise(base.text)!,
                        perKmPaise: toPaise(km.text)!,
                        perMinPaise: toPaise(min.text)!,
                        minFarePaise: toPaise(minFare.text)!,
                        nightSurchargePct: int.parse(night.text.trim()),
                      ),
                    );
                ref.invalidate(_faresProvider(vid));
              });
            },
            child: Text(l.save),
          ),
        ],
      ),
    ),
  );
}

// ───────────────────────── Hotels & dharamshalas ─────────────────────────

class _StayListings extends ConsumerWidget {
  const _StayListings({required this.vendor});

  final VendorResponse vendor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.properties)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _propertyForm(context, ref, vendor),
        icon: const Icon(Icons.add),
        label: Text(l.addProperty),
      ),
      body: AsyncView(
        value: ref.watch(_hotelsProvider(vendor.id)),
        onRetry: () => ref.invalidate(_hotelsProvider(vendor.id)),
        builder: (list) => list.isEmpty
            ? EmptyState(icon: Icons.hotel_outlined, message: l.emptyList)
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                children: [
                  for (final h in list)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: PanelCard(
                        padding: EdgeInsets.zero,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            SizedBox(
                              height: 120,
                              child: h.coverUrl != null
                                  ? Image.network(
                                      h.coverUrl!,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, _, _) => Image.asset(
                                        serviceFor(vendor.type).image,
                                        fit: BoxFit.cover,
                                      ),
                                    )
                                  : Image.asset(serviceFor(vendor.type).image, fit: BoxFit.cover),
                            ),
                            Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          h.name,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                            fontSize: 16,
                                          ),
                                        ),
                                      ),
                                      Pill(
                                        h.isPublished ? l.published : l.hidden,
                                        color: h.isPublished ? TnColors.success : TnColors.muted,
                                      ),
                                    ],
                                  ),
                                  Text(
                                    h.address,
                                    style: const TextStyle(color: TnColors.muted, fontSize: 13),
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    l.roomTypes,
                                    style: const TextStyle(fontWeight: FontWeight.w600),
                                  ),
                                  for (final r in h.roomTypes ?? const <RoomTypeResponse>[])
                                    ListTile(
                                      dense: true,
                                      contentPadding: EdgeInsets.zero,
                                      leading: const Icon(
                                        Icons.bed_rounded,
                                        color: TnColors.accent,
                                      ),
                                      title: Text(r.name),
                                      subtitle: Text(
                                        '${l.maxGuests}: ${r.maxGuests} · ${l.totalRooms}: ${r.totalRooms}',
                                      ),
                                      trailing: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            formatRupees(r.basePricePaise),
                                            style: const TextStyle(fontWeight: FontWeight.w700),
                                          ),
                                          Text(
                                            l.customerPays(formatRupees(r.displayPricePaise)),
                                            style: const TextStyle(
                                              fontSize: 10.5,
                                              color: TnColors.muted,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  TextButton.icon(
                                    onPressed: () => _roomForm(context, ref, vendor.id, h.id),
                                    icon: const Icon(Icons.add),
                                    label: Text(l.addRoomType),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
      ),
    );
  }
}

Future<void> _propertyForm(BuildContext context, WidgetRef ref, VendorResponse vendor) {
  final l = context.l10n;
  final form = GlobalKey<FormState>();
  final name = TextEditingController();
  final address = TextEditingController();
  String? cityId = vendor.cityId;
  return showFormSheet<void>(
    context,
    l.addProperty,
    Consumer(
      builder: (context, ref, _) {
        final cities = ref.watch(citiesProvider).value ?? const <CityResponse>[];
        return Form(
          key: form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: name,
                decoration: InputDecoration(labelText: l.propertyName),
                validator: (v) => requiredText(l, v),
              ),
              const SizedBox(height: 10),
              TextFormField(
                controller: address,
                decoration: InputDecoration(labelText: l.address),
                validator: (v) => requiredText(l, v),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: cityId,
                decoration: InputDecoration(labelText: l.city),
                items: [for (final c in cities) DropdownMenuItem(value: c.id, child: Text(c.name))],
                onChanged: (v) => cityId = v,
                validator: (v) => v == null ? l.required : null,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  if (!form.currentState!.validate()) return;
                  final city = cities.firstWhere((c) => c.id == cityId);
                  _guard(context, () async {
                    await ref
                        .read(vendorRepositoryProvider)
                        .saveHotel(
                          vendor.id,
                          CreateHotelDto(
                            name: I18nTextDto(en: name.text.trim()),
                            address: address.text.trim(),
                            cityId: city.id,
                            lat: city.lat,
                            lng: city.lng,
                            kind: vendor.type == 'dharamshala' ? 'dharamshala' : 'hotel',
                            isPublished: true,
                          ).toJson(),
                        );
                    ref.invalidate(_hotelsProvider(vendor.id));
                  });
                },
                child: Text(l.save),
              ),
            ],
          ),
        );
      },
    ),
  );
}

Future<void> _roomForm(BuildContext context, WidgetRef ref, String vid, String hotelId) {
  final l = context.l10n;
  final form = GlobalKey<FormState>();
  final name = TextEditingController();
  final price = TextEditingController();
  final guests = TextEditingController(text: '2');
  final rooms = TextEditingController(text: '5');
  return showFormSheet<void>(
    context,
    l.addRoomType,
    Form(
      key: form,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            controller: name,
            decoration: InputDecoration(labelText: l.roomName),
            validator: (v) => requiredText(l, v),
          ),
          const SizedBox(height: 10),
          TextFormField(
            controller: price,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(labelText: '${l.basePrice} · ${l.perNight}'),
            validator: (v) => rupeesField(l, v),
          ),
          PricePreview(controller: price),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: guests,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: l.maxGuests),
                  validator: (v) => intField(l, v, min: 1, max: 20),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextFormField(
                  controller: rooms,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: l.totalRooms),
                  validator: (v) => intField(l, v, min: 1, max: 500),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () {
              if (!form.currentState!.validate()) return;
              _guard(context, () async {
                await ref
                    .read(vendorRepositoryProvider)
                    .addRoomType(
                      vid,
                      hotelId,
                      CreateRoomTypeDto(
                        name: I18nTextDto(en: name.text.trim()),
                        basePricePaise: toPaise(price.text)!,
                        maxGuests: int.parse(guests.text.trim()),
                        totalRooms: int.parse(rooms.text.trim()),
                      ),
                    );
                ref.invalidate(_hotelsProvider(vid));
              });
            },
            child: Text(l.save),
          ),
        ],
      ),
    ),
  );
}

// ───────────────────────── Restaurants ─────────────────────────

class _FoodListings extends ConsumerWidget {
  const _FoodListings({required this.vendor});

  final VendorResponse vendor;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final data = ref.watch(_restaurantsProvider(vendor.id));
    return Scaffold(
      appBar: AppBar(title: Text(l.restaurants)),
      floatingActionButton: data.value?.isEmpty ?? false
          ? FloatingActionButton.extended(
              onPressed: () => _restaurantForm(context, ref, vendor),
              icon: const Icon(Icons.add),
              label: Text(l.addRestaurant),
            )
          : null,
      body: AsyncView(
        value: data,
        onRetry: () => ref.invalidate(_restaurantsProvider(vendor.id)),
        builder: (list) => list.isEmpty
            ? EmptyState(icon: Icons.restaurant_outlined, message: l.emptyList)
            : ListView(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
                children: [
                  for (final r in list) ...[
                    PanelCard(
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.asset(
                              serviceFor('restaurant').image,
                              width: 64,
                              height: 50,
                              fit: BoxFit.cover,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  r.name,
                                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                                ),
                                Wrap(
                                  spacing: 6,
                                  children: [
                                    if (r.isPureVeg) Pill(l.pureVeg, color: TnColors.success),
                                    if (r.isSatvik) Pill(l.satvik, color: TnColors.accent),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    SectionTitle(
                      l.menu,
                      action: l.addMenuItem,
                      onAction: () => _menuForm(context, ref, vendor.id, r.id),
                    ),
                    for (final m in r.menu ?? const <MenuItemResponse>[])
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: PanelCard(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.crop_square_rounded,
                                color: TnColors.success,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      m.name,
                                      style: const TextStyle(fontWeight: FontWeight.w600),
                                    ),
                                    Text(
                                      '${m.category}${m.isJain ? ' · ${l.jain}' : ''} · ${l.customerPays(formatRupees(m.displayPricePaise))}',
                                      style: const TextStyle(fontSize: 12, color: TnColors.muted),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                formatRupees(m.pricePaise),
                                style: const TextStyle(fontWeight: FontWeight.w700),
                              ),
                              Switch(
                                value: m.isAvailable,
                                onChanged: (on) async {
                                  try {
                                    await ref.read(vendorRepositoryProvider).updateMenuItem(
                                      vendor.id,
                                      m.id,
                                      {'isAvailable': on},
                                    );
                                    ref.invalidate(_restaurantsProvider(vendor.id));
                                  } on Object catch (e) {
                                    if (context.mounted) showSnack(context, errorText(context, e));
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ],
              ),
      ),
    );
  }
}

Future<void> _restaurantForm(BuildContext context, WidgetRef ref, VendorResponse vendor) {
  final l = context.l10n;
  final form = GlobalKey<FormState>();
  final name = TextEditingController();
  final address = TextEditingController();
  var veg = true;
  var satvik = false;
  return showFormSheet<void>(
    context,
    l.addRestaurant,
    Consumer(
      builder: (context, ref, _) {
        final cities = ref.watch(citiesProvider).value ?? const <CityResponse>[];
        return StatefulBuilder(
          builder: (context, setState) => Form(
            key: form,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: name,
                  decoration: InputDecoration(labelText: l.restaurantName),
                  validator: (v) => requiredText(l, v),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: address,
                  decoration: InputDecoration(labelText: l.address),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: veg,
                  title: Text(l.pureVeg),
                  onChanged: (v) => setState(() => veg = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: satvik,
                  title: Text(l.satvik),
                  onChanged: (v) => setState(() => satvik = v),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: () {
                    if (!form.currentState!.validate() || cities.isEmpty) return;
                    final city = cities.firstWhere(
                      (c) => c.id == vendor.cityId,
                      orElse: () => cities.first,
                    );
                    _guard(context, () async {
                      await ref
                          .read(vendorRepositoryProvider)
                          .saveRestaurant(
                            vendor.id,
                            CreateRestaurantDto(
                              name: I18nTextDto(en: name.text.trim()),
                              address: address.text.trim().isEmpty ? null : address.text.trim(),
                              cityId: city.id,
                              lat: city.lat,
                              lng: city.lng,
                              isPureVeg: veg,
                              isSatvik: satvik,
                              acceptsOrders: true,
                              isPublished: true,
                            ).toJson(),
                          );
                      ref.invalidate(_restaurantsProvider(vendor.id));
                    });
                  },
                  child: Text(l.save),
                ),
              ],
            ),
          ),
        );
      },
    ),
  );
}

Future<void> _menuForm(BuildContext context, WidgetRef ref, String vid, String restaurantId) {
  final l = context.l10n;
  final form = GlobalKey<FormState>();
  final name = TextEditingController();
  final category = TextEditingController(text: 'Thali');
  final price = TextEditingController();
  var jain = false;
  return showFormSheet<void>(
    context,
    l.addMenuItem,
    StatefulBuilder(
      builder: (context, setState) => Form(
        key: form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextFormField(
              controller: name,
              decoration: InputDecoration(labelText: l.dishName),
              validator: (v) => requiredText(l, v),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: category,
              decoration: InputDecoration(labelText: l.category),
              validator: (v) => requiredText(l, v),
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: price,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(labelText: l.basePrice),
              validator: (v) => rupeesField(l, v),
            ),
            PricePreview(controller: price),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              value: jain,
              title: Text(l.jain),
              onChanged: (v) => setState(() => jain = v),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () {
                if (!form.currentState!.validate()) return;
                _guard(context, () async {
                  await ref
                      .read(vendorRepositoryProvider)
                      .addMenuItem(
                        vid,
                        restaurantId,
                        CreateMenuItemDto(
                          name: I18nTextDto(en: name.text.trim()),
                          category: category.text.trim(),
                          pricePaise: toPaise(price.text)!,
                          isJain: jain,
                        ),
                      );
                  ref.invalidate(_restaurantsProvider(vid));
                });
              },
              child: Text(l.save),
            ),
          ],
        ),
      ),
    ),
  );
}
