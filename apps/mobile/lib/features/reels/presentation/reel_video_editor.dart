import 'dart:async';

import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

import '../../../core/api/api_models.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../../l10n/app_localizations.dart';
import 'reel_player.dart';

/// Opens the full-screen editor; returns the new edits, or null on cancel.
/// The caller owns [controller] (it must already be initialised).
Future<ReelEditsDto?> openReelVideoEditor(
  BuildContext context,
  VideoPlayerController controller,
  ReelEditsDto edits,
) => Navigator.of(context, rootNavigator: true).push<ReelEditsDto>(
  MaterialPageRoute(
    fullscreenDialog: true,
    builder: (_) => ReelVideoEditor(controller: controller, initial: edits),
  ),
);

enum _Tool { trim, filters, speed, text, sound }

/// Instagram-style editor: trim, filters, speed, text and sound. Edits are
/// non-destructive; the player applies them when the reel is watched.
class ReelVideoEditor extends StatefulWidget {
  const ReelVideoEditor({super.key, required this.controller, required this.initial});

  final VideoPlayerController controller;
  final ReelEditsDto initial;

  @override
  State<ReelVideoEditor> createState() => _ReelVideoEditorState();
}

class _ReelVideoEditorState extends State<ReelVideoEditor> {
  late ReelEditsDto _e = widget.initial;
  late final ReelPlayback _playback = ReelPlayback(widget.controller, _e);
  _Tool _tool = _Tool.trim;
  int? _dragging;

  VideoPlayerController get _v => widget.controller;
  int get _durationMs => _v.value.duration.inMilliseconds;

  @override
  void initState() {
    super.initState();
    unawaited(_playback.attach());
    _v.addListener(_tick);
    unawaited(_v.play());
  }

  @override
  void dispose() {
    _v.removeListener(_tick);
    _playback.detach();
    super.dispose();
  }

  void _tick() {
    if (mounted) setState(() {});
  }

  void _set(ReelEditsDto e) {
    setState(() => _e = e);
    unawaited(_playback.apply(e));
  }

  ReelEditsDto _copy({
    int? trimStartMs,
    int? trimEndMs,
    bool clearEnd = false,
    String? filter,
    num? speed,
    bool? muted,
    List<ReelOverlayDto>? overlays,
  }) => ReelEditsDto(
    trimStartMs: trimStartMs ?? _e.trimStartMs,
    trimEndMs: clearEnd ? null : (trimEndMs ?? _e.trimEndMs),
    filter: filter ?? _e.filter,
    speed: speed ?? _e.speed,
    muted: muted ?? _e.muted,
    overlays: overlays ?? _e.overlays,
  );

  static ReelOverlayDto _moved(ReelOverlayDto o, double x, double y) => ReelOverlayDto(
    text: o.text,
    color: o.color,
    size: o.size,
    style: o.style,
    x: x.clamp(0.05, 0.95),
    y: y.clamp(0.05, 0.95),
  );

  Future<void> _editText([int? index]) async {
    final existing = index == null ? null : _e.overlays[index];
    final result = await showModalBottomSheet<_TextResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xF0101018),
      builder: (_) => _TextSheet(initial: existing),
    );
    if (result == null) return;
    final list = [..._e.overlays];
    if (result.delete) {
      if (index != null) list.removeAt(index);
    } else if (result.overlay != null) {
      final o = result.overlay!;
      if (index == null) {
        if (list.length >= 10) return;
        list.add(o);
      } else {
        list[index] = _moved(o, existing!.x.toDouble(), existing.y.toDouble());
      }
    }
    _set(_copy(overlays: list));
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(
          l.editVideo,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
        ),
        actions: [
          TextButton(
            onPressed: () => _set(noEdits),
            child: Text(l.reset, style: const TextStyle(color: Colors.white70)),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilledButton(
              onPressed: () => Navigator.pop(context, _e),
              style: FilledButton.styleFrom(minimumSize: const Size(0, 36)),
              child: Text(l.done),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(child: Center(child: _preview())),
          SizedBox(height: 132, child: _panel(l)),
          _toolbar(l),
        ],
      ),
    );
  }

  Widget _preview() => AspectRatio(
    aspectRatio: 9 / 16,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: LayoutBuilder(
        builder: (_, box) => Stack(
          fit: StackFit.expand,
          children: [
            GestureDetector(
              onTap: () => _v.value.isPlaying ? _v.pause() : _v.play(),
              child: EditedVideo(
                controller: _v,
                edits: _copy(overlays: const []),
              ),
            ),
            for (var i = 0; i < _e.overlays.length; i++)
              Align(
                alignment: Alignment(_e.overlays[i].x * 2 - 1, _e.overlays[i].y * 2 - 1),
                child: GestureDetector(
                  onTap: () => _editText(i),
                  onPanStart: (_) => setState(() => _dragging = i),
                  onPanEnd: (_) => setState(() => _dragging = null),
                  onPanUpdate: (d) {
                    final o = _e.overlays[i];
                    final list = [..._e.overlays];
                    list[i] = _moved(
                      o,
                      o.x + d.delta.dx / box.maxWidth,
                      o.y + d.delta.dy / box.maxHeight,
                    );
                    _set(_copy(overlays: list));
                  },
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      border: _dragging == i ? Border.all(color: Colors.white70) : null,
                    ),
                    child: OverlayText(_e.overlays[i], scale: box.maxWidth / 390),
                  ),
                ),
              ),
            if (!_v.value.isPlaying)
              const IgnorePointer(
                child: Center(
                  child: Icon(Icons.play_arrow_rounded, color: Colors.white70, size: 72),
                ),
              ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: LinearProgressIndicator(
                value: _playback.progress,
                minHeight: 3,
                backgroundColor: Colors.white24,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    ),
  );

  Widget _toolbar(AppLocalizations l) {
    Widget item(_Tool t, IconData icon, String label) {
      final on = _tool == t;
      return Expanded(
        child: InkWell(
          onTap: () {
            if (t == _Tool.text && _tool == _Tool.text) {
              _editText();
            }
            setState(() => _tool = t);
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, color: on ? TnColors.saffron : Colors.white, size: 24),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: TextStyle(color: on ? TnColors.saffron : Colors.white70, fontSize: 11),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return SafeArea(
      top: false,
      child: Row(
        children: [
          item(_Tool.trim, Icons.content_cut_rounded, l.trim),
          item(_Tool.filters, Icons.auto_awesome_rounded, l.filters),
          item(_Tool.speed, Icons.speed_rounded, l.speed),
          item(_Tool.text, Icons.text_fields_rounded, l.text),
          item(_Tool.sound, Icons.volume_up_rounded, l.sound),
        ],
      ),
    );
  }

  Widget _panel(AppLocalizations l) {
    const white = TextStyle(color: Colors.white);
    switch (_tool) {
      case _Tool.trim:
        final total = _durationMs <= 0 ? 1 : _durationMs;
        final s = _e.trimStartMs.toDouble().clamp(0, total).toDouble();
        final e = (_e.trimEndMs ?? total).toDouble().clamp(s, total).toDouble();
        String fmt(double ms) => (ms / 1000).toStringAsFixed(1);
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('${fmt(s)}s – ${fmt(e)}s  ·  ${fmt(e - s)}s', style: white),
              RangeSlider(
                values: RangeValues(s, e),
                max: total.toDouble(),
                activeColor: TnColors.saffron,
                onChanged: (r) {
                  if (r.end - r.start < 1000) return;
                  final end = r.end.round();
                  _set(
                    ReelEditsDto(
                      trimStartMs: r.start.round(),
                      trimEndMs: end >= total ? null : end,
                      filter: _e.filter,
                      speed: _e.speed,
                      muted: _e.muted,
                      overlays: _e.overlays,
                    ),
                  );
                  unawaited(_v.seekTo(Duration(milliseconds: r.start.round())));
                },
              ),
              Text(l.trimHint, style: const TextStyle(color: Colors.white54, fontSize: 12)),
            ],
          ),
        );
      case _Tool.filters:
        return ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          children: [
            for (final f in reelFilters)
              GestureDetector(
                onTap: () => _set(_copy(filter: f)),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 5),
                  child: Column(
                    children: [
                      Container(
                        width: 64,
                        height: 84,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: _e.filter == f ? TnColors.saffron : Colors.transparent,
                            width: 2,
                          ),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: withReelFilter(
                          f,
                          Image.asset('assets/images/canva/prem-mandir.jpg', fit: BoxFit.cover),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        filterLabel(l, f),
                        style: TextStyle(
                          color: _e.filter == f ? TnColors.saffron : Colors.white70,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        );
      case _Tool.speed:
        return Center(
          child: Wrap(
            spacing: 10,
            children: [
              for (final sp in reelSpeeds)
                ChoiceChip(
                  label: Text('${sp}x'),
                  selected: _e.speed == sp,
                  onSelected: (_) => _set(_copy(speed: sp)),
                ),
            ],
          ),
        );
      case _Tool.text:
        return Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              FilledButton.icon(
                onPressed: _e.overlays.length >= 10 ? null : _editText,
                icon: const Icon(Icons.add),
                label: Text(l.addText),
              ),
              const SizedBox(height: 8),
              Text(l.textHint, style: const TextStyle(color: Colors.white54, fontSize: 12)),
            ],
          ),
        );
      case _Tool.sound:
        return Center(
          child: SizedBox(
            width: 260,
            child: SwitchListTile(
              value: !_e.muted,
              onChanged: (on) => _set(_copy(muted: !on)),
              title: Text(l.originalSound, style: white),
              secondary: Icon(
                _e.muted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                color: Colors.white,
              ),
            ),
          ),
        );
    }
  }
}

String filterLabel(AppLocalizations l, String f) => switch (f) {
  'warm' => l.filter_warm,
  'cool' => l.filter_cool,
  'vivid' => l.filter_vivid,
  'mono' => l.filter_mono,
  'sepia' => l.filter_sepia,
  'fade' => l.filter_fade,
  'saffron' => l.filter_saffron,
  _ => l.filter_none,
};

class _TextResult {
  const _TextResult({this.overlay, this.delete = false});
  final ReelOverlayDto? overlay;
  final bool delete;
}

const _swatches = [
  '#FFFFFF',
  '#000000',
  '#FF9933',
  '#E53935',
  '#FDD835',
  '#43A047',
  '#1E88E5',
  '#8E24AA',
];

class _TextSheet extends StatefulWidget {
  const _TextSheet({this.initial});

  final ReelOverlayDto? initial;

  @override
  State<_TextSheet> createState() => _TextSheetState();
}

class _TextSheetState extends State<_TextSheet> {
  late final _text = TextEditingController(text: widget.initial?.text ?? '');
  late String _color = widget.initial?.color ?? '#FFFFFF';
  late String _style = widget.initial?.style ?? 'plain';
  late double _size = (widget.initial?.size ?? 28).toDouble();

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  ReelOverlayDto get _overlay => ReelOverlayDto(
    text: _text.text.trim().isEmpty ? ' ' : _text.text.trim(),
    color: _color,
    size: _size.round(),
    style: _style,
    x: widget.initial?.x ?? 0.5,
    y: widget.initial?.y ?? 0.4,
  );

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            height: 90,
            alignment: Alignment.center,
            child: _text.text.trim().isEmpty ? null : OverlayText(_overlay),
          ),
          TextField(
            controller: _text,
            autofocus: true,
            maxLength: 120,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              hintText: l.typeSomething,
              hintStyle: const TextStyle(color: Colors.white38),
              filled: true,
              fillColor: Colors.white10,
              counterStyle: const TextStyle(color: Colors.white38),
            ),
            onChanged: (_) => setState(() {}),
          ),
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                for (final c in _swatches)
                  GestureDetector(
                    onTap: () => setState(() => _color = c),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: overlayColor(c),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: _color == c ? TnColors.saffron : Colors.white38,
                          width: _color == c ? 3 : 1,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          SegmentedButton<String>(
            segments: [
              ButtonSegment(value: 'plain', label: Text(l.textPlain)),
              ButtonSegment(value: 'box', label: Text(l.textBox)),
              ButtonSegment(value: 'outline', label: Text(l.textOutline)),
            ],
            selected: {_style},
            onSelectionChanged: (s) => setState(() => _style = s.first),
            style: SegmentedButton.styleFrom(
              foregroundColor: Colors.white,
              selectedForegroundColor: Colors.black,
              selectedBackgroundColor: TnColors.saffron,
            ),
          ),
          Slider(
            value: _size,
            min: 12,
            max: 64,
            activeColor: TnColors.saffron,
            onChanged: (v) => setState(() => _size = v),
          ),
          Row(
            children: [
              if (widget.initial != null)
                TextButton.icon(
                  onPressed: () => Navigator.pop(context, const _TextResult(delete: true)),
                  icon: const Icon(Icons.delete_outline, color: TnColors.sos),
                  label: Text(l.delete, style: const TextStyle(color: TnColors.sos)),
                ),
              const Spacer(),
              FilledButton(
                onPressed: _text.text.trim().isEmpty
                    ? null
                    : () => Navigator.pop(context, _TextResult(overlay: _overlay)),
                child: Text(l.done),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
