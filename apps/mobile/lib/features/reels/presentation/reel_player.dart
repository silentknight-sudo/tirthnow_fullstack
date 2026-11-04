import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../../core/api/api_models.dart';

/// Filters offered in the editor. Keys match the API's `REEL_FILTERS`.
const reelFilters = ['none', 'warm', 'cool', 'vivid', 'mono', 'sepia', 'fade', 'saffron'];
const reelSpeeds = <num>[0.5, 1, 1.5, 2];

const noEdits = ReelEditsDto(filter: 'none', muted: false, overlays: [], speed: 1, trimStartMs: 0);

/// 4x5 colour matrix for a filter, or null for none.
List<double>? reelFilterMatrix(String filter) => switch (filter) {
  'warm' => const [1.12, 0, 0, 0, 8, 0, 1.02, 0, 0, 2, 0, 0, 0.88, 0, -6, 0, 0, 0, 1, 0],
  'cool' => const [0.9, 0, 0, 0, -4, 0, 1.0, 0, 0, 2, 0, 0, 1.15, 0, 10, 0, 0, 0, 1, 0],
  'vivid' => const [
    1.35, -0.18, -0.17, 0, 0, //
    -0.1, 1.3, -0.2, 0, 0,
    -0.12, -0.18, 1.3, 0, 0,
    0, 0, 0, 1, 0,
  ],
  'mono' => const [
    0.299, 0.587, 0.114, 0, 0, //
    0.299, 0.587, 0.114, 0, 0,
    0.299, 0.587, 0.114, 0, 0,
    0, 0, 0, 1, 0,
  ],
  'sepia' => const [
    0.393, 0.769, 0.189, 0, 0, //
    0.349, 0.686, 0.168, 0, 0,
    0.272, 0.534, 0.131, 0, 0,
    0, 0, 0, 1, 0,
  ],
  'fade' => const [0.85, 0, 0, 0, 30, 0, 0.85, 0, 0, 30, 0, 0, 0.85, 0, 30, 0, 0, 0, 1, 0],
  'saffron' => const [1.2, 0.1, 0, 0, 14, 0, 1.0, 0, 0, 4, 0, 0, 0.75, 0, -10, 0, 0, 0, 1, 0],
  _ => null,
};

/// Applies a filter to any widget (video frame or thumbnail).
Widget withReelFilter(String filter, Widget child) {
  final m = reelFilterMatrix(filter);
  return m == null ? child : ColorFiltered(colorFilter: ColorFilter.matrix(m), child: child);
}

Color overlayColor(String hex) =>
    Color(int.tryParse('FF${hex.replaceFirst('#', '')}', radix: 16) ?? 0xFFFFFFFF);

/// Text drawn on the video, in one of three styles.
class OverlayText extends StatelessWidget {
  const OverlayText(this.o, {super.key, this.scale = 1});

  final ReelOverlayDto o;

  /// Fonts are sized for a 390-wide frame; smaller previews scale down.
  final double scale;

  @override
  Widget build(BuildContext context) {
    final color = overlayColor(o.color);
    final size = o.size.toDouble() * scale;
    final base = TextStyle(
      fontSize: size,
      fontWeight: FontWeight.w800,
      height: 1.15,
      color: o.style == 'box'
          ? (color.computeLuminance() > 0.5 ? Colors.black : Colors.white)
          : color,
      shadows: o.style == 'plain' ? const [Shadow(blurRadius: 6)] : null,
    );
    final text = Text(o.text, textAlign: TextAlign.center, style: base);
    return switch (o.style) {
      'box' => DecoratedBox(
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(6 * scale)),
        child: Padding(
          padding: EdgeInsets.symmetric(horizontal: 8 * scale, vertical: 4 * scale),
          child: text,
        ),
      ),
      'outline' => Stack(
        children: [
          Text(
            o.text,
            textAlign: TextAlign.center,
            style: base.copyWith(
              color: null,
              foreground: Paint()
                ..style = PaintingStyle.stroke
                ..strokeWidth = 3 * scale
                ..color = Colors.black,
            ),
          ),
          text,
        ],
      ),
      _ => text,
    };
  }
}

/// Places overlays at their fractional positions inside the frame.
class ReelOverlays extends StatelessWidget {
  const ReelOverlays({super.key, required this.overlays});

  final List<ReelOverlayDto> overlays;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (_, box) => Stack(
      children: [
        for (final o in overlays)
          Align(
            alignment: Alignment(o.x * 2 - 1, o.y * 2 - 1),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: OverlayText(o, scale: box.maxWidth / 390),
            ),
          ),
      ],
    ),
  );
}

/// Keeps a controller inside the trim range and applies speed and mute.
/// Call [attach] after initialize, [detach] before dispose.
class ReelPlayback {
  ReelPlayback(this.controller, this.edits);

  final VideoPlayerController controller;
  ReelEditsDto edits;

  Duration get start => Duration(milliseconds: edits.trimStartMs.toInt());
  Duration get end {
    final e = edits.trimEndMs;
    return e == null ? controller.value.duration : Duration(milliseconds: e.toInt());
  }

  void _loop() {
    final v = controller.value;
    if (!v.isInitialized) return;
    if (v.position >= end || v.position < start - const Duration(milliseconds: 300)) {
      controller.seekTo(start);
    }
  }

  Future<void> attach() async {
    controller.addListener(_loop);
    await apply(edits);
  }

  Future<void> apply(ReelEditsDto e) async {
    edits = e;
    if (!controller.value.isInitialized) return;
    await controller.setPlaybackSpeed(e.speed.toDouble());
    await controller.setVolume(e.muted ? 0 : 1);
    final p = controller.value.position;
    if (p < start || p >= end) await controller.seekTo(start);
  }

  void detach() => controller.removeListener(_loop);

  /// 0–1 progress within the trimmed range.
  double get progress {
    final span = (end - start).inMilliseconds;
    if (span <= 0) return 0;
    return ((controller.value.position - start).inMilliseconds / span).clamp(0, 1).toDouble();
  }
}

/// A video frame with the reel's filter and text applied, filling its box.
class EditedVideo extends StatelessWidget {
  const EditedVideo({super.key, required this.controller, required this.edits});

  final VideoPlayerController controller;
  final ReelEditsDto edits;

  @override
  Widget build(BuildContext context) {
    final v = controller.value;
    return Stack(
      fit: StackFit.expand,
      children: [
        withReelFilter(
          edits.filter,
          FittedBox(
            fit: BoxFit.cover,
            clipBehavior: Clip.hardEdge,
            child: SizedBox(
              width: v.size.width == 0 ? 9 : v.size.width,
              height: v.size.height == 0 ? 16 : v.size.height,
              child: VideoPlayer(controller),
            ),
          ),
        ),
        ReelOverlays(overlays: edits.overlays),
      ],
    );
  }
}
