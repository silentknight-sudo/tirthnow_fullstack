import 'package:flutter/material.dart';

import '../../core/format/formatters.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../../l10n/app_localizations.dart';

/// The five partner services. `type` is the API's vendor type.
class Service {
  const Service(this.type, this.image, this.icon);

  final String type;
  final String image;
  final IconData icon;

  String title(AppLocalizations l) => switch (type) {
    'cab' => l.svcCab,
    'hotel' => l.svcHotel,
    'dharamshala' => l.svcDharamshala,
    'restaurant' => l.svcRestaurant,
    _ => l.svcStore,
  };

  String subtitle(AppLocalizations l) => switch (type) {
    'cab' => l.svcCabSub,
    'hotel' => l.svcHotelSub,
    'dharamshala' => l.svcDharamshalaSub,
    'restaurant' => l.svcRestaurantSub,
    _ => l.svcStoreSub,
  };
}

const services = [
  Service('cab', 'assets/images/services/cab.jpg', Icons.local_taxi_rounded),
  Service('hotel', 'assets/images/services/hotel.jpg', Icons.hotel_rounded),
  Service('dharamshala', 'assets/images/services/dharamshala.jpg', Icons.temple_hindu_rounded),
  Service('restaurant', 'assets/images/services/restaurant.jpg', Icons.restaurant_rounded),
  Service('store', 'assets/images/services/store.jpg', Icons.storefront_rounded),
];

Service serviceFor(String type) =>
    services.firstWhere((s) => s.type == type, orElse: () => services.last);

String docLabel(AppLocalizations l, String t) => switch (t) {
  'pan' => l.docPan,
  'aadhaar' => l.docAadhaar,
  'gst' => l.docGst,
  'fssai' => l.docFssai,
  'trade_license' => l.docTradeLicense,
  'rc' => l.docRc,
  'driving_licence' => l.docDrivingLicence,
  'permit' => l.docPermit,
  _ => l.docOther,
};

IconData docIcon(String t) => switch (t) {
  'pan' => Icons.credit_card_rounded,
  'aadhaar' => Icons.fingerprint_rounded,
  'gst' => Icons.receipt_long_rounded,
  'fssai' => Icons.restaurant_menu_rounded,
  'rc' => Icons.directions_car_rounded,
  'driving_licence' => Icons.badge_rounded,
  _ => Icons.description_rounded,
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

IconData cabIcon(String cls) => switch (cls) {
  'bike' => Icons.two_wheeler_rounded,
  'auto' || 'e_rickshaw' => Icons.electric_rickshaw_rounded,
  _ => Icons.local_taxi_rounded,
};

const cabClasses = ['bike', 'auto', 'e_rickshaw', 'hatchback', 'sedan', 'suv', 'tempo_traveller'];

String categoryLabel(AppLocalizations l, String c) => switch (c) {
  'pooja_thali' => l.catPoojaThali,
  'diya_dhoop' => l.catDiyaDhoop,
  'garland' => l.catGarland,
  'prasad' => l.catPrasad,
  'poshak' => l.catPoshak,
  'tilak_mala' => l.catTilakMala,
  'idols' => l.catIdols,
  'books' => l.catBooks,
  _ => l.catOther,
};

const productCategories = [
  'pooja_thali',
  'diya_dhoop',
  'garland',
  'prasad',
  'poshak',
  'tilak_mala',
  'idols',
  'books',
  'other',
];

/// What the pilgrim pays for a base price: + 18 % GST + 5 % platform fee
/// (ADR-0021). The API computes the real total at checkout.
int customerPrice(int basePaise) =>
    basePaise + (basePaise * 1800 / 10000).round() + (basePaise * 500 / 10000).round();

/// Rupees typed by the partner → paise. Null when empty or invalid.
int? toPaise(String text) {
  final v = double.tryParse(text.trim());
  if (v == null || v < 0) return null;
  return (v * 100).round();
}

String rupeesText(num paise) => (paise / 100).toStringAsFixed(paise % 100 == 0 ? 0 : 2);

/// "Pilgrim pays ₹X" live preview under a price field.
class PricePreview extends StatelessWidget {
  const PricePreview({required this.controller, super.key});

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return ValueListenableBuilder(
      valueListenable: controller,
      builder: (context, v, _) {
        final base = toPaise(v.text);
        return Container(
          margin: const EdgeInsets.only(top: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF4E8),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              const Icon(Icons.info_outline_rounded, size: 18, color: TnColors.accent),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  base == null
                      ? l.priceNote
                      : '${l.customerPays(formatRupees(customerPrice(base)))} · ${l.priceNote}',
                  style: const TextStyle(fontSize: 12.5, color: TnColors.ink),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Bottom sheet scaffold for add/edit forms.
Future<T?> showFormSheet<T>(BuildContext context, String title, Widget child) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: TnColors.paper,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (context) => Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: TnColors.line,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            child,
          ],
        ),
      ),
    ),
  );
}

/// Rounded white card used across the partner screens.
class PanelCard extends StatelessWidget {
  const PanelCard({
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    super.key,
  });

  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: TnColors.card,
    borderRadius: BorderRadius.circular(18),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: Container(
        padding: padding,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: TnColors.line),
        ),
        child: child,
      ),
    ),
  );
}

String? requiredText(AppLocalizations l, String? v) =>
    (v == null || v.trim().isEmpty) ? l.required : null;

String? rupeesField(AppLocalizations l, String? v, {bool optional = false}) {
  if (v == null || v.trim().isEmpty) return optional ? null : l.required;
  final p = toPaise(v);
  return p == null || p < 100 ? l.invalidValue : null;
}

String? intField(
  AppLocalizations l,
  String? v, {
  int min = 0,
  int max = 100000,
  bool optional = false,
}) {
  if (v == null || v.trim().isEmpty) return optional ? null : l.required;
  final n = int.tryParse(v.trim());
  return n == null || n < min || n > max ? l.invalidValue : null;
}
