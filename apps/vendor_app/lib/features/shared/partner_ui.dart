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
    elevation: 3,
    shadowColor: const Color(0x22232C6B),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: Container(
        padding: padding,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0x14232C6B)),
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

/// Full-width gold gradient call-to-action.
class GoldButton extends StatelessWidget {
  const GoldButton({
    required this.label,
    required this.onPressed,
    this.icon,
    this.busy = false,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !busy;
    return Opacity(
      opacity: enabled ? 1 : 0.45,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: PColors.goldGradient,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [
            BoxShadow(color: Color(0x55E08A1E), blurRadius: 14, offset: Offset(0, 6)),
          ],
        ),
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: enabled ? onPressed : null,
            child: SizedBox(
              height: 54,
              child: Center(
                child: busy
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.4, color: PColors.night),
                      )
                    : Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            label,
                            style: const TextStyle(
                              color: PColors.night,
                              fontWeight: FontWeight.w800,
                              fontSize: 15.5,
                            ),
                          ),
                          if (icon != null) ...[
                            const SizedBox(width: 8),
                            Icon(icon, color: PColors.night, size: 20),
                          ],
                        ],
                      ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Night-blue gradient page background used by the sign-in and setup flow.
class NightBackground extends StatelessWidget {
  const NightBackground({required this.child, this.image, super.key});

  final Widget child;
  final String? image;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: const BoxDecoration(gradient: PColors.nightGradient),
    child: Stack(
      fit: StackFit.expand,
      children: [
        if (image != null) ...[
          Image.asset(image!, fit: BoxFit.cover),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Color(0x330E1433), Color(0xCC0E1433), PColors.night],
                stops: [0, 0.55, 0.85],
              ),
            ),
          ),
        ],
        // Soft glows.
        const Positioned(top: -80, right: -60, child: _Glow(color: Color(0x557B5CFF), size: 260)),
        const Positioned(
          bottom: -100,
          left: -80,
          child: _Glow(color: Color(0x44F2B544), size: 280),
        ),
        child,
      ],
    ),
  );
}

class _Glow extends StatelessWidget {
  const _Glow({required this.color, required this.size});

  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(colors: [color, color.withValues(alpha: 0)]),
      ),
    ),
  );
}

/// Frosted card for content on the night background.
class GlassCard extends StatelessWidget {
  const GlassCard({required this.child, this.padding = const EdgeInsets.all(18), super.key});

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) => Container(
    padding: padding,
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.08),
      borderRadius: BorderRadius.circular(22),
      border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
    ),
    child: child,
  );
}

/// Dark gradient header strip with a title, used at the top of tab pages.
class NightHeader extends StatelessWidget {
  const NightHeader({required this.title, this.subtitle, this.trailing, this.bottom, super.key});

  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Widget? bottom;

  @override
  Widget build(BuildContext context) => Container(
    decoration: const BoxDecoration(
      gradient: PColors.nightGradient,
      borderRadius: BorderRadius.vertical(bottom: Radius.circular(28)),
    ),
    padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 14, 20, 20),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 21,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      subtitle!,
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 13),
                    ),
                  ],
                ],
              ),
            ),
            ?trailing,
          ],
        ),
        if (bottom != null) ...[const SizedBox(height: 16), bottom!],
      ],
    ),
  );
}

/// KPI tile with an optional change vs the previous period.
class KpiTile extends StatelessWidget {
  const KpiTile({
    required this.label,
    required this.value,
    this.change,
    this.icon,
    this.onTap,
    super.key,
  });

  final String label;
  final String value;
  final double? change;
  final IconData? icon;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = change;
    final up = (c ?? 0) >= 0;
    return PanelCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              if (icon != null) ...[
                Icon(icon, size: 15, color: PColors.violet),
                const SizedBox(width: 6),
              ],
              Expanded(
                child: Text(
                  label,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: TnColors.muted, fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: PColors.night,
              fontFeatures: liningFigures,
            ),
          ),
          if (c != null) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(
                  up ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
                  size: 13,
                  color: up ? PColors.up : TnColors.sos,
                ),
                Text(
                  '${c.abs().toStringAsFixed(0)}%',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: up ? PColors.up : TnColors.sos,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// Percent change of [now] against [before]; null when there is no baseline.
double? percentChange(num now, num before) =>
    before == 0 ? (now == 0 ? null : 100) : (now - before) * 100 / before;

/// Smooth area line chart for a daily series.
class AreaChart extends StatelessWidget {
  const AreaChart({required this.values, this.height = 170, super.key});

  final List<double> values;
  final double height;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: height,
    width: double.infinity,
    child: CustomPaint(painter: _AreaPainter(values)),
  );
}

class _AreaPainter extends CustomPainter {
  _AreaPainter(this.values);

  final List<double> values;

  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()
      ..color = const Color(0x14232C6B)
      ..strokeWidth = 1;
    for (var i = 1; i <= 3; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }
    if (values.length < 2) return;
    final maxV = values.reduce((a, b) => a > b ? a : b);
    final top = maxV == 0 ? 1.0 : maxV * 1.15;
    final pts = [
      for (var i = 0; i < values.length; i++)
        Offset(size.width * i / (values.length - 1), size.height - size.height * values[i] / top),
    ];
    final line = Path()..moveTo(pts.first.dx, pts.first.dy);
    for (var i = 1; i < pts.length; i++) {
      final a = pts[i - 1];
      final b = pts[i];
      final mx = (a.dx + b.dx) / 2;
      line.cubicTo(mx, a.dy, mx, b.dy, b.dx, b.dy);
    }
    final area = Path.from(line)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(
      area,
      Paint()
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0x557B5CFF), Color(0x007B5CFF)],
        ).createShader(Offset.zero & size),
    );
    canvas.drawPath(
      line,
      Paint()
        ..color = PColors.violet
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..strokeCap = StrokeCap.round,
    );
    // Highlight the best day.
    var best = 0;
    for (var i = 1; i < values.length; i++) {
      if (values[i] > values[best]) best = i;
    }
    canvas
      ..drawCircle(pts[best], 7, Paint()..color = Colors.white)
      ..drawCircle(pts[best], 4.5, Paint()..color = PColors.violet);
  }

  @override
  bool shouldRepaint(_AreaPainter old) => old.values != values;
}

/// Round icon tile used for quick actions and feature grids.
class ActionTile extends StatelessWidget {
  const ActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.badge,
    super.key,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String? badge;

  @override
  Widget build(BuildContext context) => InkWell(
    borderRadius: BorderRadius.circular(16),
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: const [
                    BoxShadow(color: Color(0x1F232C6B), blurRadius: 10, offset: Offset(0, 4)),
                  ],
                ),
                child: Icon(icon, color: PColors.violet),
              ),
              if (badge != null)
                Positioned(
                  right: -6,
                  top: -6,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: TnColors.sos,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      badge!,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 2,
            style: const TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: PColors.night,
            ),
          ),
        ],
      ),
    ),
  );
}
