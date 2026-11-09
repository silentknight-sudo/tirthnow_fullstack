import 'dart:async';
import 'dart:convert';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';

/// One aarti with its lyrics and a recitation track, bundled with the app.
class Aarti {
  const Aarti({
    required this.id,
    required this.title,
    required this.temple,
    required this.templeSlug,
    required this.image,
    required this.audio,
    required this.verses,
  });

  factory Aarti.fromJson(Map<String, dynamic> j) {
    Map<String, String> tr(Object? v) =>
        (v! as Map<String, dynamic>).map((k, v) => MapEntry(k, v as String));
    return Aarti(
      id: j['id'] as String,
      title: tr(j['title']),
      temple: tr(j['temple']),
      templeSlug: j['templeSlug'] as String,
      image: j['image'] as String,
      audio: j['audio'] as String,
      verses: (j['verses'] as List<dynamic>).cast<String>(),
    );
  }

  final String id;
  final Map<String, String> title;
  final Map<String, String> temple;
  final String templeSlug;
  final String image;
  final String audio;
  final List<String> verses;
}

final aartisProvider = FutureProvider<List<Aarti>>((ref) async {
  final raw = await rootBundle.loadString('assets/aarti/aartis.json');
  return (jsonDecode(raw) as List<dynamic>)
      .map((e) => Aarti.fromJson(e as Map<String, dynamic>))
      .toList();
});

/// Aarti by temple: lyrics and audio.
class AartiListScreen extends ConsumerWidget {
  const AartiListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.aartiTitle)),
      body: AsyncView(
        value: ref.watch(aartisProvider),
        builder: (list) => ListView(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
          children: [
            Text(l.aartiIntro, style: const TextStyle(color: TnColors.muted)),
            const SizedBox(height: 12),
            for (final a in list)
              GestureDetector(
                onTap: () => context.push('/aarti/${a.id}'),
                child: Container(
                  height: 132,
                  margin: const EdgeInsets.only(bottom: 14),
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: const [
                      BoxShadow(color: Color(0x221C3C6B), blurRadius: 12, offset: Offset(0, 6)),
                    ],
                  ),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.asset(a.image, fit: BoxFit.cover),
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Color(0xE60C1A30), Color(0x330C1A30)],
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                          ),
                        ),
                      ),
                      Positioned(
                        left: 16,
                        top: 16,
                        right: 80,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              a.title[context.lang] ?? a.title['en']!,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 19,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              a.temple[context.lang] ?? a.temple['en']!,
                              style: const TextStyle(color: Colors.white70, fontSize: 12.5),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              l.lyricsAudio,
                              style: const TextStyle(
                                color: TnColors.accentSoft,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Positioned(
                        right: 16,
                        top: 0,
                        bottom: 0,
                        child: Center(
                          child: CircleAvatar(
                            radius: 26,
                            backgroundColor: Colors.white,
                            child: Icon(
                              Icons.play_arrow_rounded,
                              color: TnColors.saffron,
                              size: 34,
                            ),
                          ),
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

/// Lyrics with an audio player: play, pause, replay and repeat.
class AartiDetailScreen extends ConsumerStatefulWidget {
  const AartiDetailScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<AartiDetailScreen> createState() => _AartiDetailScreenState();
}

class _AartiDetailScreenState extends ConsumerState<AartiDetailScreen> {
  final _player = AudioPlayer();
  final _subs = <StreamSubscription<Object?>>[];
  PlayerState _state = PlayerState.stopped;
  Duration _pos = Duration.zero;
  Duration _dur = Duration.zero;
  bool _repeat = false;
  double _fontSize = 19;

  @override
  void initState() {
    super.initState();
    _subs
      ..add(_player.onPlayerStateChanged.listen((s) => setState(() => _state = s)))
      ..add(_player.onPositionChanged.listen((p) => setState(() => _pos = p)))
      ..add(_player.onDurationChanged.listen((d) => setState(() => _dur = d)));
  }

  @override
  void dispose() {
    for (final s in _subs) {
      unawaited(s.cancel());
    }
    unawaited(_player.dispose());
    super.dispose();
  }

  Future<void> _toggle(Aarti a) async {
    if (_state == PlayerState.playing) {
      await _player.pause();
    } else if (_state == PlayerState.paused) {
      await _player.resume();
    } else {
      await _player.play(AssetSource(a.audio));
    }
  }

  Future<void> _replay(Aarti a) async {
    await _player.stop();
    await _player.play(AssetSource(a.audio));
  }

  Future<void> _setRepeat() async {
    setState(() => _repeat = !_repeat);
    await _player.setReleaseMode(_repeat ? ReleaseMode.loop : ReleaseMode.release);
  }

  String _fmt(Duration d) =>
      '${d.inMinutes.toString().padLeft(2, '0')}:${(d.inSeconds % 60).toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final list = ref.watch(aartisProvider).value;
    final a = list?.where((x) => x.id == widget.id).firstOrNull;
    if (a == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    final playing = _state == PlayerState.playing;
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 220,
            foregroundColor: Colors.white,
            backgroundColor: TnColors.navy,
            actions: [
              IconButton(
                tooltip: l.textSize,
                icon: const Icon(Icons.text_increase_rounded),
                onPressed: () => setState(() => _fontSize = _fontSize >= 25 ? 17 : _fontSize + 2),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                a.title[context.lang] ?? a.title['en']!,
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
              ),
              background: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(a.image, fit: BoxFit.cover),
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Color(0x330C1A30), Color(0xE60C1A30)],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
              child: Row(
                children: [
                  const Icon(Icons.temple_hindu_rounded, color: TnColors.saffron, size: 18),
                  const SizedBox(width: 6),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => context.push('/temples/${a.templeSlug}'),
                      child: Text(
                        a.temple[context.lang] ?? a.temple['en']!,
                        style: const TextStyle(color: TnColors.navy, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 180),
            sliver: SliverList.separated(
              itemCount: a.verses.length,
              separatorBuilder: (_, _) => const Padding(
                padding: EdgeInsets.symmetric(vertical: 10),
                child: Center(
                  child: Text('❀', style: TextStyle(color: TnColors.accentSoft)),
                ),
              ),
              itemBuilder: (_, i) => Text(
                a.verses[i],
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'TiroDevanagari',
                  fontSize: _fontSize,
                  height: 1.7,
                  color: TnColors.ink,
                ),
              ),
            ),
          ),
        ],
      ),
      bottomSheet: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 18),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
          boxShadow: [BoxShadow(color: Color(0x261C3C6B), blurRadius: 18, offset: Offset(0, -4))],
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Slider(
                value: _dur.inMilliseconds == 0
                    ? 0
                    : (_pos.inMilliseconds / _dur.inMilliseconds).clamp(0, 1).toDouble(),
                activeColor: TnColors.saffron,
                onChanged: _dur.inMilliseconds == 0
                    ? null
                    : (v) =>
                          _player.seek(Duration(milliseconds: (v * _dur.inMilliseconds).round())),
              ),
              Row(
                children: [
                  Text(_fmt(_pos), style: const TextStyle(color: TnColors.muted, fontSize: 12)),
                  const Spacer(),
                  IconButton(
                    tooltip: l.replay,
                    icon: const Icon(Icons.replay_rounded, color: TnColors.navy),
                    onPressed: () => _replay(a),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _toggle(a),
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(colors: [TnColors.saffron, Color(0xFFE8590C)]),
                        boxShadow: [
                          BoxShadow(color: Color(0x55E07A2E), blurRadius: 12, offset: Offset(0, 4)),
                        ],
                      ),
                      child: Icon(
                        playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                        color: Colors.white,
                        size: 38,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    tooltip: l.repeat,
                    icon: Icon(
                      _repeat ? Icons.repeat_one_rounded : Icons.repeat_rounded,
                      color: _repeat ? TnColors.saffron : TnColors.navy,
                    ),
                    onPressed: _setRepeat,
                  ),
                  const Spacer(),
                  Text(_fmt(_dur), style: const TextStyle(color: TnColors.muted, fontSize: 12)),
                ],
              ),
              Text(l.aartiAudioNote, style: const TextStyle(color: TnColors.muted, fontSize: 11)),
            ],
          ),
        ),
      ),
    );
  }
}
