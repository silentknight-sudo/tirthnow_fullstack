import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Signature visual language of the partner app: temple arches, a soft
/// mandala, gold on deep dusk ("sandhya") blues.

/// Deep dusk background colours.
abstract final class Dusk {
  static const top = Color(0xFF0B0F2B);
  static const mid = Color(0xFF1A1550);
  static const low = Color(0xFF2D1B5E);
  static const card = Color(0x1AFFFFFF);
  static const stroke = Color(0x26FFFFFF);
  static const text2 = Color(0xB3FFFFFF);
  static const gradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [top, mid, low],
    stops: [0, 0.55, 1],
  );
}

/// A mandala of petals and rings, painted in faint gold.
class MandalaPainter extends CustomPainter {
  MandalaPainter({this.color = PColors.gold, this.opacity = 0.12});

  final Color color;
  final double opacity;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final r = size.shortestSide / 2;
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.1
      ..color = color.withValues(alpha: opacity);
    for (final f in [0.22, 0.48, 0.74, 0.98]) {
      canvas.drawCircle(c, r * f, p);
    }
    void petals(int n, double inner, double outer, double width) {
      for (var i = 0; i < n; i++) {
        final a = 2 * math.pi * i / n;
        final dir = Offset(math.cos(a), math.sin(a));
        final normal = Offset(-dir.dy, dir.dx);
        final s = c + dir * (r * inner);
        final e = c + dir * (r * outer);
        final m = c + dir * (r * (inner + outer) / 2);
        final path = Path()
          ..moveTo(s.dx, s.dy)
          ..quadraticBezierTo(
            (m + normal * (r * width)).dx,
            (m + normal * (r * width)).dy,
            e.dx,
            e.dy,
          )
          ..quadraticBezierTo(
            (m - normal * (r * width)).dx,
            (m - normal * (r * width)).dy,
            s.dx,
            s.dy,
          );
        canvas.drawPath(path, p);
      }
    }

    petals(8, 0.22, 0.48, 0.09);
    petals(16, 0.48, 0.74, 0.07);
    petals(24, 0.74, 0.98, 0.05);
    for (var i = 0; i < 24; i++) {
      final a = 2 * math.pi * (i + 0.5) / 24;
      canvas.drawCircle(c + Offset(math.cos(a), math.sin(a)) * (r * 0.86), 2, p);
    }
  }

  @override
  bool shouldRepaint(MandalaPainter old) => old.color != color || old.opacity != opacity;
}

/// Mandala decoration that slowly rotates.
class Mandala extends StatefulWidget {
  const Mandala({required this.size, this.opacity = 0.12, this.color = PColors.gold, super.key});

  final double size;
  final double opacity;
  final Color color;

  @override
  State<Mandala> createState() => _MandalaState();
}

class _MandalaState extends State<Mandala> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 90),
  )..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: RotationTransition(
      turns: _c,
      child: CustomPaint(
        size: Size.square(widget.size),
        painter: MandalaPainter(color: widget.color, opacity: widget.opacity),
      ),
    ),
  );
}

/// Temple-arch outline: straight sides, pointed ogee top.
class ArchClipper extends CustomClipper<Path> {
  const ArchClipper();

  @override
  Path getClip(Size s) {
    final w = s.width;
    final h = s.height;
    final shoulder = h * 0.34;
    return Path()
      ..moveTo(0, h)
      ..lineTo(0, shoulder)
      ..cubicTo(0, shoulder * 0.35, w * 0.32, shoulder * 0.28, w * 0.5, 0)
      ..cubicTo(w * 0.68, shoulder * 0.28, w, shoulder * 0.35, w, shoulder)
      ..lineTo(w, h)
      ..close();
  }

  @override
  bool shouldReclip(ArchClipper oldClipper) => false;
}

/// An image framed in a gold temple arch.
class ArchFrame extends StatelessWidget {
  const ArchFrame({required this.image, this.width = 64, this.height = 78, super.key});

  final ImageProvider image;
  final double width;
  final double height;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: width,
    height: height,
    child: Stack(
      fit: StackFit.expand,
      children: [
        const ClipPath(
          clipper: ArchClipper(),
          child: DecoratedBox(decoration: BoxDecoration(gradient: PColors.goldGradient)),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(2.5, 3, 2.5, 0),
          child: ClipPath(
            clipper: const ArchClipper(),
            child: Image(image: image, fit: BoxFit.cover),
          ),
        ),
      ],
    ),
  );
}

/// A number that counts up when it first appears.
class CountUp extends StatelessWidget {
  const CountUp({required this.value, required this.format, this.style, super.key});

  final double value;
  final String Function(double) format;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween(begin: 0, end: value),
    duration: const Duration(milliseconds: 1200),
    curve: Curves.easeOutCubic,
    builder: (_, v, _) => Text(format(v), style: style),
  );
}

/// Circular progress ring with a gold sweep.
class RingGauge extends StatelessWidget {
  const RingGauge({
    required this.value,
    required this.child,
    this.size = 84,
    this.stroke = 9,
    super.key,
  });

  final double value;
  final Widget child;
  final double size;
  final double stroke;

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween(begin: 0, end: value.clamp(0, 1)),
    duration: const Duration(milliseconds: 1200),
    curve: Curves.easeOutCubic,
    builder: (_, v, _) => SizedBox.square(
      dimension: size,
      child: CustomPaint(
        painter: _RingPainter(v, stroke),
        child: Center(child: child),
      ),
    ),
  );
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.v, this.stroke);

  final double v;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final r = rect.deflate(stroke / 2);
    canvas.drawArc(
      r,
      0,
      2 * math.pi,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..color = const Color(0x22FFFFFF),
    );
    canvas.drawArc(
      r,
      -math.pi / 2,
      2 * math.pi * v,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..shader = const SweepGradient(
          startAngle: -math.pi / 2,
          endAngle: 3 * math.pi / 2,
          colors: [Color(0xFFFFD98A), PColors.gold, PColors.goldDeep],
          transform: GradientRotation(-math.pi / 2),
        ).createShader(rect),
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.v != v;
}

/// Frosted tile for the dusk dashboard.
class DuskTile extends StatelessWidget {
  const DuskTile({
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.gradient,
    super.key,
  });

  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final Gradient? gradient;

  @override
  Widget build(BuildContext context) => Material(
    color: Colors.transparent,
    child: InkWell(
      borderRadius: BorderRadius.circular(24),
      onTap: onTap,
      child: Ink(
        padding: padding,
        decoration: BoxDecoration(
          color: gradient == null ? Dusk.card : null,
          gradient: gradient,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Dusk.stroke),
        ),
        child: child,
      ),
    ),
  );
}

/// Dashed divider line ("rangoli" dots).
class DotRule extends StatelessWidget {
  const DotRule({this.color = const Color(0x33FFFFFF), super.key});

  final Color color;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (_, c) => Row(
      children: [
        for (var i = 0; i < (c.maxWidth / 9).floor(); i++)
          Container(
            width: 3,
            height: 3,
            margin: const EdgeInsets.only(right: 6),
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
      ],
    ),
  );
}

/// Floating glass navigation bar with a centre gold action.
class FloatingNav extends StatelessWidget {
  const FloatingNav({
    required this.index,
    required this.onTap,
    required this.items,
    required this.onCenter,
    super.key,
  });

  final int index;
  final ValueChanged<int> onTap;
  final List<(IconData, IconData, String)> items;
  final VoidCallback onCenter;

  @override
  Widget build(BuildContext context) {
    Widget item(int i) {
      final (icon, active, label) = items[i];
      final on = i == index;
      return Expanded(
        child: InkResponse(
          onTap: () => onTap(i),
          radius: 32,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                decoration: BoxDecoration(
                  color: on ? PColors.gold.withValues(alpha: 0.18) : Colors.transparent,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(on ? active : icon, color: on ? PColors.gold : Dusk.text2, size: 23),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10.5,
                  fontWeight: on ? FontWeight.w800 : FontWeight.w500,
                  color: on ? PColors.gold : Dusk.text2,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
        child: SizedBox(
          height: 74,
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              Positioned.fill(
                top: 8,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: const Color(0xF20E1233),
                    borderRadius: BorderRadius.circular(26),
                    border: Border.all(color: Dusk.stroke),
                    boxShadow: const [
                      BoxShadow(color: Color(0x66000000), blurRadius: 24, offset: Offset(0, 10)),
                    ],
                  ),
                  child: Row(
                    children: [item(0), item(1), const SizedBox(width: 66), item(2), item(3)],
                  ),
                ),
              ),
              Positioned(
                top: -10,
                child: GestureDetector(
                  onTap: onCenter,
                  child: Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: PColors.goldGradient,
                      border: Border.all(color: Dusk.top, width: 4),
                      boxShadow: [
                        BoxShadow(color: PColors.gold.withValues(alpha: 0.55), blurRadius: 20),
                      ],
                    ),
                    child: const Icon(Icons.add_rounded, color: Dusk.top, size: 30),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Dusk page header with a mandala, a big serif title and an optional row below.
class DuskHeader extends StatelessWidget {
  const DuskHeader({
    required this.title,
    this.subtitle,
    this.trailing,
    this.bottom,
    this.leading,
    super.key,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Widget? bottom;
  final Widget? leading;

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: const BorderRadius.vertical(bottom: Radius.circular(30)),
    child: DecoratedBox(
      decoration: const BoxDecoration(gradient: Dusk.gradient),
      child: Stack(
        children: [
          const Positioned(top: -70, right: -70, child: Mandala(size: 220, opacity: 0.14)),
          Padding(
            padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 12, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    if (leading != null) ...[leading!, const SizedBox(width: 6)],
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              fontFamily: 'Cormorant',
                              color: Colors.white,
                              fontSize: 32,
                              height: 1.05,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          if (subtitle != null)
                            Text(
                              subtitle!,
                              style: const TextStyle(color: Dusk.text2, fontSize: 12.5),
                            ),
                        ],
                      ),
                    ),
                    ?trailing,
                  ],
                ),
                if (bottom != null) ...[const SizedBox(height: 16), bottom!],
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
