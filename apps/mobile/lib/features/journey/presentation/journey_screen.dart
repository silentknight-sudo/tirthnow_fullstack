import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';

import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';

// ───────────────────────────── data ─────────────────────────────
// Same routes and stop details as the website's Yatra Journey
// (assets/journey/journey.json, exported by tool/export_journey.ts).

class JStop {
  JStop.fromJson(Map<String, dynamic> j)
    : id = j['id'] as String,
      name = j['name'] as String,
      hiName = j['hiName'] as String,
      kind = j['kind'] as String,
      x = (j['x'] as num).toDouble(),
      y = (j['y'] as num).toDouble(),
      visitMins = (j['visitMins'] as num).toInt(),
      hours = j['hours'] as String,
      difficulty = j['difficulty'] as String,
      about = j['about'] as String,
      highlights = (j['highlights'] as List<dynamic>).cast<String>(),
      tips = (j['tips'] as List<dynamic>).cast<String>(),
      kmFromPrev = (j['kmFromPrev'] as num).toDouble();

  final String id;
  final String name;
  final String hiName;
  final String kind;
  final double x;
  final double y;
  final int visitMins;
  final String hours;
  final String difficulty;
  final String about;
  final List<String> highlights;
  final List<String> tips;
  final double kmFromPrev;
}

class JStopHi {
  JStopHi.fromJson(Map<String, dynamic> j)
    : about = j['about'] as String,
      highlights = (j['highlights'] as List<dynamic>).cast<String>(),
      tips = (j['tips'] as List<dynamic>).cast<String>(),
      hours = j['hours'] as String?;

  final String about;
  final List<String> highlights;
  final List<String> tips;
  final String? hours;
}

class JYatra {
  JYatra.fromJson(Map<String, dynamic> j)
    : id = j['id'] as String,
      name = j['name'] as String,
      hiName = j['hiName'] as String,
      area = j['area'] as String,
      stops = (j['stops'] as List<dynamic>)
          .map((s) => JStop.fromJson(s as Map<String, dynamic>))
          .toList();

  final String id;
  final String name;
  final String hiName;
  final String area;
  final List<JStop> stops;

  double get totalKm => stops.fold(0, (s, x) => s + x.kmFromPrev);
}

class JVehicle {
  JVehicle.fromJson(Map<String, dynamic> j)
    : id = j['id'] as String,
      name = j['name'] as String,
      icon = j['icon'] as String,
      kmh = (j['kmh'] as num).toDouble(),
      seatPaise = (j['seatPaise'] as num).toInt(),
      perKmPaise = (j['perKmPaise'] as num).toInt();

  final String id;
  final String name;
  final String icon;
  final double kmh;
  final int seatPaise;
  final int perKmPaise;

  int fareFor(JStop next) => seatPaise > 0 ? seatPaise : (next.kmFromPrev * perKmPaise).round();
}

class JourneyData {
  JourneyData(this.yatras, this.vehicles, this.hi);
  final List<JYatra> yatras;
  final List<JVehicle> vehicles;
  final Map<String, JStopHi> hi;
}

final journeyDataProvider = FutureProvider<JourneyData>((ref) async {
  final j = jsonDecode(
    await rootBundle.loadString('assets/journey/journey.json'),
  ) as Map<String, dynamic>;
  return JourneyData(
    (j['yatras'] as List<dynamic>).map((y) => JYatra.fromJson(y as Map<String, dynamic>)).toList(),
    (j['vehicles'] as List<dynamic>)
        .map((v) => JVehicle.fromJson(v as Map<String, dynamic>))
        .toList(),
    (j['stopHi'] as Map<String, dynamic>).map(
      (k, v) => MapEntry(k, JStopHi.fromJson(v as Map<String, dynamic>)),
    ),
  );
});

// ───────────────────────────── narration ─────────────────────────────
// Every line is built only from the journey data: the guide never adds
// facts or times of its own (same rules as the website).

String _km(double n) => n % 1 == 0 ? n.toStringAsFixed(0) : n.toStringAsFixed(1);
int _mins(JStop s, JVehicle v) => math.max(2, (s.kmFromPrev / v.kmh * 60).round());
String _list(List<String> xs, String and) =>
    xs.length <= 1 ? xs.join() : '${xs.sublist(0, xs.length - 1).join(', ')} $and ${xs.last}';

const _vehicleHi = {'erickshaw': 'ई-रिक्शा से', 'auto': 'ऑटो से', 'cab': 'कैब से', 'walk': 'पैदल'};
const _kindHi = {
  'Station': 'स्टेशन',
  'Temple': 'मंदिर',
  'Ghat': 'घाट',
  'Kund': 'कुंड',
  'Garden': 'वन',
};
const _kindIcon = {'Station': '🚉', 'Temple': '🛕', 'Ghat': '🪔', 'Kund': '💧', 'Garden': '🌿'};

String welcomeLine(JYatra y, JVehicle v, bool hi) => hi
    ? 'राधे राधे! ${y.hiName} में आपका स्वागत है। हम ${y.stops.length} पड़ावों पर जाएँगे, कुल लगभग ${_km(y.totalKm)} किलोमीटर। यात्रा ${y.stops.first.hiName} से शुरू होती है।'
    : 'Radhe Radhe! Welcome to the ${y.name}. We will visit ${y.stops.length} stops, about ${_km(y.totalKm)} kilometres in all, travelling by ${v.name.toLowerCase()}. We begin at ${y.stops.first.name}.';

String departLine(JStop next, JVehicle v, bool hi) {
  final m = _mins(next, v);
  if (hi) {
    return 'अब हम ${next.hiName} की ओर चलते हैं — लगभग ${_km(next.kmFromPrev)} किलोमीटर, ${_vehicleHi[v.id] ?? ''} करीब $m मिनट।';
  }
  final how = v.id == 'walk' ? 'on foot' : 'by ${v.name.toLowerCase()}';
  return 'Next, we head to ${next.name}, about ${_km(next.kmFromPrev)} kilometres away — roughly $m minutes $how.';
}

String arriveLine(JStop s, bool isLast, bool hi, JStopHi? h) {
  final seasonal = s.hours.toLowerCase().contains('live timings');
  if (hi) {
    final hl = h?.highlights.take(3).toList() ?? const <String>[];
    return [
      'हम ${s.hiName} पहुँच गए हैं।',
      h?.about ?? 'यह एक ${_kindHi[s.kind]} है।',
      if (hl.isNotEmpty) 'यहाँ की विशेषताएँ: ${_list(hl, 'और')}।',
      'यहाँ लगभग ${s.visitMins} मिनट रुकें।',
      if (seasonal) 'दर्शन का समय मौसम के अनुसार बदलता है, आज का समय ऐप में देखें।',
      if (h != null && h.tips.isNotEmpty) 'यात्री सुझाव: ${h.tips.first}।',
      if (isLast) 'आपकी यात्रा पूरी हुई। तीर्थ नाउ के साथ यात्रा करने के लिए धन्यवाद। राधे राधे!',
    ].join(' ');
  }
  return [
    'We have arrived at ${s.name}.',
    s.about,
    if (s.highlights.isNotEmpty) 'Highlights here: ${_list(s.highlights.take(3).toList(), 'and')}.',
    'Plan about ${s.visitMins} minutes here.',
    if (seasonal) 'Darshan timings change with the season, so check today’s timings in the app.',
    if (s.tips.isNotEmpty) 'Pilgrim tip: ${s.tips.first}.',
    if (isLast) 'That completes our yatra. Thank you for travelling with Tirth Now. Radhe Radhe!',
  ].join(' ').replaceAll('..', '.');
}

// ───────────────────────────── geometry ─────────────────────────────

/// Curved leg between two stops, bending alternately left and right (as on the website).
(Offset, Offset, Offset) _legCurve(JStop a, JStop b, int i) {
  final dx = b.x - a.x;
  final dy = b.y - a.y;
  final len = math.max(1.0, math.sqrt(dx * dx + dy * dy));
  final bend = (i.isEven ? 0.22 : -0.22) * len;
  final c = Offset((a.x + b.x) / 2 + (-dy / len) * bend, (a.y + b.y) / 2 + (dx / len) * bend);
  return (Offset(a.x, a.y), c, Offset(b.x, b.y));
}

Offset _quad((Offset, Offset, Offset) l, double t) {
  final (p0, c, p1) = l;
  final u = 1 - t;
  return p0 * (u * u) + c * (2 * u * t) + p1 * (t * t);
}

// ───────────────────────────── screen ─────────────────────────────

/// Ride a Vrindavan, Mathura or Govardhan yatra stop by stop: route, travel
/// mode, fares, darshan details, pilgrim tips and a spoken guide.
class JourneyScreen extends ConsumerStatefulWidget {
  const JourneyScreen({super.key});

  @override
  ConsumerState<JourneyScreen> createState() => _JourneyScreenState();
}

class _JourneyScreenState extends ConsumerState<JourneyScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _leg = AnimationController(vsync: this);
  final _tts = FlutterTts();
  int _yatra = 0;
  int _vehicle = 0;
  int _idx = 0;
  double _kmDone = 0;
  int _fare = 0;
  bool _auto = false;
  bool _moving = false;
  double _mult = 1;
  bool _voiceOn = true;
  bool? _hiVoice;
  String _caption = '';
  bool _narrating = false;
  bool _tips = false;
  int _token = 0;

  @override
  void initState() {
    super.initState();
    unawaited(_tts.awaitSpeakCompletion(true));
    _leg.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _token++;
    unawaited(_tts.stop());
    _leg.dispose();
    super.dispose();
  }

  bool get _hi => _hiVoice ?? context.lang == 'hi';

  Future<void> _say(String text) async {
    setState(() => _caption = text);
    if (!_voiceOn) {
      // Give the reader time with the caption instead of rushing on.
      await Future<void>.delayed(
        Duration(milliseconds: (text.length * 45 / _mult).round().clamp(1500, 9000)),
      );
      return;
    }
    setState(() => _narrating = true);
    try {
      await _tts.setLanguage(_hi ? 'hi-IN' : 'en-IN');
      await _tts.setSpeechRate((0.48 + (_mult - 1) * 0.08).clamp(0.3, 0.7));
      await _tts.speak(text);
    } on Object {
      await Future<void>.delayed(Duration(milliseconds: (text.length * 45).clamp(1500, 9000)));
    } finally {
      if (mounted) setState(() => _narrating = false);
    }
  }

  void _reset() {
    _token++;
    unawaited(_tts.stop());
    _leg.stop();
    setState(() {
      _idx = 0;
      _kmDone = 0;
      _fare = 0;
      _auto = false;
      _moving = false;
      _caption = '';
      _tips = false;
    });
  }

  Future<void> _next(JourneyData d) async {
    final y = d.yatras[_yatra];
    final v = d.vehicles[_vehicle];
    if (_moving || _idx >= y.stops.length - 1) return;
    final token = _token;
    final next = y.stops[_idx + 1];
    unawaited(_say(departLine(next, v, _hi)));
    final minutes = next.kmFromPrev / v.kmh * 60;
    _leg.duration = Duration(
      milliseconds: (math.max(1600, math.min(9000, minutes * 120)) / _mult).round(),
    );
    setState(() => _moving = true);
    await _leg.forward(from: 0);
    if (!mounted || token != _token) return;
    setState(() {
      _moving = false;
      _idx++;
      _kmDone += next.kmFromPrev;
      _fare += v.fareFor(next);
      _tips = false;
    });
    await _say(arriveLine(next, _idx == y.stops.length - 1, _hi, d.hi[next.id]));
    if (!mounted || token != _token) return;
    if (_auto) {
      if (_idx >= y.stops.length - 1) {
        setState(() => _auto = false);
      } else {
        await Future<void>.delayed(Duration(milliseconds: (1200 / _mult).round()));
        if (mounted && token == _token && _auto) unawaited(_next(d));
      }
    }
  }

  void _prev() {
    if (_moving || _idx == 0) return;
    final y = ref.read(journeyDataProvider).value!.yatras[_yatra];
    setState(() {
      _kmDone = math.max(0, _kmDone - y.stops[_idx].kmFromPrev);
      _idx--;
    });
  }

  Future<void> _toggleAuto(JourneyData d) async {
    final y = d.yatras[_yatra];
    if (_auto) {
      _token++;
      unawaited(_tts.stop());
      setState(() => _auto = false);
      return;
    }
    if (_idx >= y.stops.length - 1) _reset();
    setState(() => _auto = true);
    final token = _token;
    if (_idx == 0) await _say(welcomeLine(y, d.vehicles[_vehicle], _hi));
    if (mounted && token == _token && _auto) unawaited(_next(d));
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.yatraJourney)),
      body: AsyncView(
        value: ref.watch(journeyDataProvider),
        builder: (d) {
          final y = d.yatras[_yatra];
          final v = d.vehicles[_vehicle];
          final cur = y.stops[_idx];
          final h = _hi ? d.hi[cur.id] : null;
          final pos = _moving
              ? _quad(_leg3(y, _idx), Curves.easeInOutCubic.transform(_leg.value))
              : Offset(cur.x, cur.y);
          final done = _idx >= y.stops.length - 1 && !_moving;
          return ListView(
            padding: const EdgeInsets.only(bottom: 32),
            children: [
              SizedBox(
                height: 44,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  children: [
                    for (final (i, yy) in d.yatras.indexed)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(_hi ? yy.hiName : yy.name),
                          selected: _yatra == i,
                          onSelected: (_) {
                            _reset();
                            setState(() => _yatra = i);
                          },
                        ),
                      ),
                  ],
                ),
              ),
              // Map
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: AspectRatio(
                    aspectRatio: 1000 / 700,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        CustomPaint(
                          painter: _MapPainter(
                            yatra: y,
                            idx: _idx,
                            moving: _moving,
                            t: Curves.easeInOutCubic.transform(_leg.value),
                          ),
                        ),
                        LayoutBuilder(
                          builder: (_, box) {
                            final s = box.maxWidth / 1000;
                            return Stack(
                              children: [
                                for (final (i, st) in y.stops.indexed)
                                  Positioned(
                                    left: st.x * s - 15,
                                    top: st.y * s - 15,
                                    child: _StopPin(
                                      icon: _kindIcon[st.kind] ?? '📍',
                                      state: i < _idx ? 1 : (i == _idx ? 2 : 0),
                                    ),
                                  ),
                                Positioned(
                                  left: pos.dx * s - 18,
                                  top: pos.dy * s - 40,
                                  child: _VehicleBadge(icon: v.icon, moving: _moving),
                                ),
                              ],
                            );
                          },
                        ),
                        Positioned(
                          left: 10,
                          top: 10,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: const Color(0xE61C3C6B),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              '✦ ${_hi ? y.hiName : y.name}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              // Stats
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
                child: Row(
                  children: [
                    _Stat(label: l.journeyStop, value: '${_idx + 1}/${y.stops.length}'),
                    _Stat(label: l.journeyKm, value: '${_km(_kmDone)}/${_km(y.totalKm)}'),
                    _Stat(
                      label: l.journeyFare,
                      value: formatRupees(_fare, locale: context.lang),
                    ),
                    _Stat(label: l.journeySpeed, value: _moving ? '${v.kmh.round()} km/h' : '—'),
                  ],
                ),
              ),
              // Vehicles
              SizedBox(
                height: 48,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                  children: [
                    for (final (i, vv) in d.vehicles.indexed)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          avatar: Text(vv.icon),
                          label: Text(vv.name),
                          selected: _vehicle == i,
                          onSelected: _moving ? null : (_) => setState(() => _vehicle = i),
                        ),
                      ),
                  ],
                ),
              ),
              // Controls
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 6, 12, 0),
                child: Row(
                  children: [
                    IconButton.filledTonal(
                      tooltip: l.journeyPrev,
                      onPressed: _moving || _idx == 0 || _auto ? null : _prev,
                      icon: const Icon(Icons.skip_previous_rounded),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: TnColors.saffron,
                          minimumSize: const Size.fromHeight(46),
                        ),
                        onPressed: () => _toggleAuto(d),
                        icon: Icon(
                          _auto
                              ? Icons.pause_rounded
                              : (done ? Icons.replay_rounded : Icons.play_arrow_rounded),
                        ),
                        label: Text(
                          _auto
                              ? l.pause
                              : (done
                                    ? l.journeyRestart
                                    : (_idx == 0 ? l.journeyStart : l.journeyContinue)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    IconButton.filledTonal(
                      tooltip: l.journeyNext,
                      onPressed: _moving || done || _auto ? null : () => _next(d),
                      icon: const Icon(Icons.skip_next_rounded),
                    ),
                    const SizedBox(width: 6),
                    PopupMenuButton<double>(
                      tooltip: l.journeySpeed,
                      initialValue: _mult,
                      onSelected: (m) => setState(() => _mult = m),
                      itemBuilder: (_) => [
                        for (final m in [1.0, 2.0, 3.0])
                          PopupMenuItem(value: m, child: Text('${m.round()}×')),
                      ],
                      child: Chip(label: Text('${_mult.round()}×')),
                    ),
                  ],
                ),
              ),
              // Voice
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 0),
                child: Row(
                  children: [
                    Icon(
                      _narrating ? Icons.graphic_eq_rounded : Icons.record_voice_over_rounded,
                      color: _narrating ? TnColors.saffron : TnColors.navy,
                      size: 20,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        l.voiceGuide,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    SegmentedButton<bool>(
                      showSelectedIcon: false,
                      style: const ButtonStyle(visualDensity: VisualDensity.compact),
                      segments: const [
                        ButtonSegment(value: false, label: Text('EN')),
                        ButtonSegment(value: true, label: Text('हि')),
                      ],
                      selected: {_hi},
                      onSelectionChanged: (s) => setState(() => _hiVoice = s.first),
                    ),
                    Switch(
                      value: _voiceOn,
                      onChanged: (on) {
                        if (!on) unawaited(_tts.stop());
                        setState(() => _voiceOn = on);
                      },
                    ),
                  ],
                ),
              ),
              if (_caption.isNotEmpty)
                Container(
                  margin: const EdgeInsets.fromLTRB(12, 6, 12, 0),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF6EC),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFF2D9A8)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('🙏', style: TextStyle(fontSize: 18)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(_caption, style: const TextStyle(height: 1.4, fontSize: 13.5)),
                      ),
                    ],
                  ),
                ),
              // Stop panel
              Container(
                margin: const EdgeInsets.fromLTRB(12, 12, 12, 0),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: TnColors.line),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(_kindIcon[cur.kind] ?? '📍', style: const TextStyle(fontSize: 26)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _hi ? cur.hiName : cur.name,
                                style: const TextStyle(
                                  fontFamily: 'Cormorant',
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                _hi ? cur.name : cur.hiName,
                                style: const TextStyle(color: TnColors.muted, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        _Tag(Icons.schedule_rounded, h?.hours ?? cur.hours),
                        _Tag(Icons.timer_outlined, l.visitMins(cur.visitMins)),
                        _Tag(Icons.terrain_rounded, cur.difficulty),
                        if (_idx < y.stops.length - 1)
                          _Tag(
                            Icons.near_me_rounded,
                            l.nextStopIn(_km(y.stops[_idx + 1].kmFromPrev)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(h?.about ?? cur.about, style: const TextStyle(height: 1.45)),
                    const SizedBox(height: 10),
                    for (final hl in h?.highlights ?? cur.highlights)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('✦ ', style: TextStyle(color: TnColors.saffron)),
                            Expanded(child: Text(hl, style: const TextStyle(fontSize: 13))),
                          ],
                        ),
                      ),
                    TextButton.icon(
                      onPressed: () => setState(() => _tips = !_tips),
                      icon: Icon(
                        _tips ? Icons.expand_less_rounded : Icons.lightbulb_outline_rounded,
                      ),
                      label: Text(l.pilgrimTips),
                    ),
                    if (_tips)
                      for (final tip in h?.tips ?? cur.tips)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text(
                            '• $tip',
                            style: const TextStyle(fontSize: 13, color: TnColors.muted),
                          ),
                        ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                child: Text(
                  l.journeyNote,
                  style: const TextStyle(color: TnColors.muted, fontSize: 11.5),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  (Offset, Offset, Offset) _leg3(JYatra y, int i) => _legCurve(y.stops[i], y.stops[i + 1], i);
}

class _MapPainter extends CustomPainter {
  _MapPainter({required this.yatra, required this.idx, required this.moving, required this.t});

  final JYatra yatra;
  final int idx;
  final bool moving;
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 1000;
    canvas.drawRect(
      Offset.zero & size,
      Paint()
        ..shader = const LinearGradient(
          colors: [Color(0xFFFFF8EC), Color(0xFFF4EBDC)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ).createShader(Offset.zero & size),
    );
    final grid = Paint()
      ..color = const Color(0x0F1C3C6B)
      ..strokeWidth = 1;
    for (var x = 0.0; x < size.width; x += 40 * s) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), grid);
    }
    for (var y = 0.0; y < size.height; y += 40 * s) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }
    // Yamuna: a soft river band across the map.
    final river = Path()
      ..moveTo(0, size.height * 0.18)
      ..cubicTo(
        size.width * 0.3,
        size.height * 0.05,
        size.width * 0.55,
        size.height * 0.35,
        size.width,
        size.height * 0.12,
      );
    canvas.drawPath(
      river,
      Paint()
        ..color = const Color(0x332E86C1)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 18 * s
        ..strokeCap = StrokeCap.round,
    );
    for (var i = 0; i < yatra.stops.length - 1; i++) {
      final (p0, c, p1) = _legCurve(yatra.stops[i], yatra.stops[i + 1], i);
      final path = Path()
        ..moveTo(p0.dx * s, p0.dy * s)
        ..quadraticBezierTo(c.dx * s, c.dy * s, p1.dx * s, p1.dy * s);
      final done = i < idx;
      final paint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeWidth = (done ? 5 : 3) * s * 1.6
        ..color = done ? TnColors.saffron : const Color(0x551C3C6B);
      if (done) {
        canvas.drawPath(path, paint);
      } else {
        _dashed(canvas, path, paint, 10 * s, 8 * s);
      }
      if (moving && i == idx) {
        final m = path.computeMetrics().first;
        canvas.drawPath(
          m.extractPath(0, m.length * t),
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeCap = StrokeCap.round
            ..strokeWidth = 5 * s * 1.6
            ..color = TnColors.saffron,
        );
      }
    }
  }

  void _dashed(Canvas canvas, Path p, Paint paint, double dash, double gap) {
    for (final m in p.computeMetrics()) {
      var d = 0.0;
      while (d < m.length) {
        canvas.drawPath(m.extractPath(d, math.min(m.length, d + dash)), paint);
        d += dash + gap;
      }
    }
  }

  @override
  bool shouldRepaint(_MapPainter old) =>
      old.idx != idx || old.t != t || old.moving != moving || old.yatra != yatra;
}

class _StopPin extends StatelessWidget {
  const _StopPin({required this.icon, required this.state});
  final String icon;

  /// 0 upcoming, 1 visited, 2 current.
  final int state;

  @override
  Widget build(BuildContext context) => Container(
    width: 30,
    height: 30,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: state == 2 ? TnColors.saffron : Colors.white,
      border: Border.all(color: state == 0 ? const Color(0x551C3C6B) : TnColors.saffron, width: 2),
      boxShadow: state == 2
          ? const [BoxShadow(color: Color(0x88FFB347), blurRadius: 14, spreadRadius: 3)]
          : null,
    ),
    child: Text(
      state == 1 ? '✓' : icon,
      style: TextStyle(fontSize: state == 1 ? 13 : 14, color: TnColors.saffron),
    ),
  );
}

class _VehicleBadge extends StatelessWidget {
  const _VehicleBadge({required this.icon, required this.moving});
  final String icon;
  final bool moving;

  @override
  Widget build(BuildContext context) => AnimatedScale(
    scale: moving ? 1.1 : 1,
    duration: const Duration(milliseconds: 200),
    child: Container(
      width: 36,
      height: 30,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: TnColors.navy,
        borderRadius: BorderRadius.circular(10),
        boxShadow: const [BoxShadow(color: Color(0x40000000), blurRadius: 6, offset: Offset(0, 3))],
      ),
      child: Text(icon, style: const TextStyle(fontSize: 17)),
    ),
  );
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      margin: const EdgeInsets.only(right: 6),
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: TnColors.line),
      ),
      child: Column(
        children: [
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
          ),
          Text(label, style: const TextStyle(color: TnColors.muted, fontSize: 10.5)),
        ],
      ),
    ),
  );
}

class _Tag extends StatelessWidget {
  const _Tag(this.icon, this.text);
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(color: TnColors.paper, borderRadius: BorderRadius.circular(10)),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: TnColors.navy),
        const SizedBox(width: 4),
        Flexible(child: Text(text, style: const TextStyle(fontSize: 11.5))),
      ],
    ),
  );
}
