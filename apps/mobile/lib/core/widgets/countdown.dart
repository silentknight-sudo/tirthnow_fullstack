import 'dart:async';

import 'package:flutter/material.dart';

import '../format/formatters.dart';

/// Ticks every second until [target]; shows `HH:MM:SS`.
class Countdown extends StatefulWidget {
  const Countdown({super.key, required this.target, this.style, this.now});

  final DateTime target;
  final TextStyle? style;

  /// Clock override for tests.
  final DateTime Function()? now;

  @override
  State<Countdown> createState() => _CountdownState();
}

class _CountdownState extends State<Countdown> {
  Timer? _timer;

  DateTime _now() => (widget.now ?? DateTime.now)();

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final left = widget.target.difference(_now());
    return Text(
      formatCountdown(left),
      style: widget.style,
      semanticsLabel: '${left.inHours} h ${left.inMinutes % 60} min',
    );
  }
}
