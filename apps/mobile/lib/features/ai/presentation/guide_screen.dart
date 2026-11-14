import 'dart:async';
import 'dart:math' as math;

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

import '../../../core/api/api_models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/place_images.dart';
import '../../auth/data/session_controller.dart';
import '../../catalog/data/catalog_repository.dart';
import '../../safety/data/location_service.dart';
import '../data/ai_repository.dart';
import 'guide_cards.dart';

/// Chat with the Braj guide. Answers stream in token by token; citations
/// are listed under each answer; any answer can be read aloud.
class GuideScreen extends ConsumerStatefulWidget {
  const GuideScreen({super.key});

  @override
  ConsumerState<GuideScreen> createState() => _GuideScreenState();
}

class _GuideScreenState extends ConsumerState<GuideScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _messages = <ChatMessage>[];
  final _meta = <_Meta>[];
  final _recorder = AudioRecorder();
  final _player = AudioPlayer();
  // On-device speech (free, works offline for Hindi/English on most phones).
  final _stt = SpeechToText();
  final _tts = FlutterTts();
  bool? _sttReady;
  bool _ttsActive = false;
  String _heard = '';
  bool _sentHeard = false;
  String _lastSpoken = '';
  String? _sessionId;
  String _streaming = '';
  final _streamCitations = <Citation>[];
  bool _busy = false;
  bool _recording = false;
  bool _speaking = false;
  bool _paused = false;
  bool _autoSpeak = true;
  bool _lastWasVoice = false;
  String? _voiceLang;
  StreamSubscription<GuideEvent>? _sub;
  StreamSubscription<PlayerState>? _playerSub;

  @override
  void initState() {
    super.initState();
    _playerSub = _player.onPlayerStateChanged.listen((s) {
      if (!mounted) return;
      setState(() {
        _speaking = s == PlayerState.playing || s == PlayerState.paused;
        _paused = s == PlayerState.paused;
      });
    });
    _tts
      ..setStartHandler(() {
        if (mounted) setState(() => _speaking = true);
      })
      ..setCompletionHandler(_ttsDone)
      ..setCancelHandler(_ttsDone)
      ..setErrorHandler((_) => _ttsDone())
      ..setPauseHandler(() {
        if (mounted) setState(() => _paused = true);
      })
      ..setContinueHandler(() {
        if (mounted) setState(() => _paused = false);
      });
  }

  void _ttsDone() {
    _ttsActive = false;
    if (mounted) setState(() => _speaking = _paused = false);
  }

  String _langTag(String lang) => lang == 'hi' ? 'hi-IN' : 'en-IN';

  /// Speaks with the phone's own voice; false when the device has none.
  Future<bool> _speakOnDevice(String text, String lang) async {
    try {
      final tag = _langTag(lang);
      final ok = await _tts.isLanguageAvailable(tag);
      await _tts.setLanguage(ok == true ? tag : 'en-IN');
      await _tts.setSpeechRate(0.48);
      await _tts.awaitSpeakCompletion(false);
      _ttsActive = true;
      _lastSpoken = text;
      final r = await _tts.speak(text);
      return r == 1 || r == true;
    } on Object {
      _ttsActive = false;
      return false;
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    _playerSub?.cancel();
    _input.dispose();
    _scroll.dispose();
    unawaited(_recorder.dispose());
    unawaited(_player.dispose());
    unawaited(_stt.cancel());
    unawaited(_tts.stop());
    super.dispose();
  }

  AiRepository get _ai => ref.read(aiRepositoryProvider);

  Future<bool> _ensureSession() async {
    if (_sessionId != null) return true;
    if (!ref.read(sessionProvider).signedIn) {
      await ref.read(sessionProvider.notifier).continueAsGuest();
    }
    _sessionId = await _ai.createSession(ref.read(localeProvider).languageCode);
    return true;
  }

  Future<void> _send([String? text]) async {
    final q = (text ?? _input.text).trim();
    if (q.isEmpty || _busy) return;
    _input.clear();
    setState(() {
      _busy = true;
      _messages.add(ChatMessage(role: 'user', content: q));
      _meta.add(_Meta(DateTime.now()));
      _streaming = '';
      _streamCitations.clear();
    });
    _scrollDown();
    try {
      await _ensureSession();
      final done = Completer<void>();
      _sub = _ai
          .ask(_sessionId!, q)
          .listen(
            (e) {
              switch (e) {
                case GuideToken(:final text):
                  setState(() => _streaming += text);
                  _scrollDown();
                case GuideCitation(:final citation):
                  _streamCitations.add(citation);
                case GuideError(:final code):
                  setState(
                    () => _streaming = code == 'AI_QUOTA_EXCEEDED'
                        ? context.l10n.errorGeneric
                        : _streaming,
                  );
                case GuideDone():
                  break;
              }
            },
            onError: (Object e) {
              if (mounted) showSnack(context, errorText(context, e));
              if (!done.isCompleted) done.complete();
            },
            onDone: () {
              if (!done.isCompleted) done.complete();
            },
          );
      await done.future;
      if (_streaming.isNotEmpty) {
        final answer = _streaming;
        _messages.add(
          ChatMessage(role: 'assistant', content: answer, citations: List.of(_streamCitations)),
        );
        _meta.add(_Meta(DateTime.now(), place: _placeFor(q, answer)));
        // Spoken reply after a voice question (or always, if chosen).
        if (_autoSpeak && _lastWasVoice) unawaited(_speak(answer));
      }
      _lastWasVoice = false;
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _streaming = '';
        });
      }
    }
  }

  void _scrollDown() => WidgetsBinding.instance.addPostFrameCallback((_) {
    if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
  });

  Future<void> _speak(String text) async {
    final lang = _voiceLang ?? ref.read(localeProvider).languageCode;
    setState(() => _speaking = true);
    // Voice translation: hear the answer in the chosen language. If the
    // translation service is unavailable, speak the original answer.
    var spoken = text;
    try {
      spoken = await _ai.translate(text, lang);
    } on Object {
      spoken = text;
    }
    if (await _speakOnDevice(spoken, lang)) return;
    try {
      final url = await _ai.speak(spoken, lang);
      await _player.play(UrlSource(url));
    } on Object catch (e) {
      if (mounted) {
        setState(() => _speaking = false);
        showSnack(context, errorText(context, e));
      }
    }
  }

  Future<void> _togglePlayback() async {
    if (_ttsActive) {
      if (_paused) {
        setState(() => _paused = false);
        await _tts.speak(_lastSpoken);
      } else {
        await _tts.pause();
        if (mounted) setState(() => _paused = true);
      }
      return;
    }
    if (_paused) {
      await _player.resume();
    } else {
      await _player.pause();
    }
  }

  Future<void> _stopSpeaking() async {
    await _tts.stop();
    _ttsActive = false;
    await _player.stop();
    if (mounted) setState(() => _speaking = _paused = false);
  }

  Future<void> _toggleMic() async {
    if (_recording) {
      await _stopRecording();
    } else {
      await _startRecording();
    }
  }

  Future<void> _startRecording() async {
    if (_recording) return;
    await _stopSpeaking();
    _sttReady ??= await _stt.initialize(
      onError: (_) {
        if (mounted && _recording) unawaited(_stopRecording());
      },
      onStatus: (status) {
        if (status == SpeechToText.doneStatus && _recording) unawaited(_stopRecording());
      },
    );
    if (_sttReady == true) {
      final lang = _voiceLang ?? ref.read(localeProvider).languageCode;
      _heard = '';
      _sentHeard = false;
      setState(() => _recording = true);
      await _stt.listen(
        onResult: _onHeard,
        listenOptions: SpeechListenOptions(
          localeId: lang == 'hi' ? 'hi_IN' : 'en_IN',
          partialResults: true,
          cancelOnError: true,
          pauseFor: const Duration(seconds: 3),
          listenFor: const Duration(seconds: 45),
        ),
      );
      return;
    }
    // Fallback: record and let the server transcribe.
    if (!await _recorder.hasPermission()) {
      if (mounted) showSnack(context, context.l10n.micPermission);
      return;
    }
    final path = kIsWeb
        ? ''
        : '${(await getTemporaryDirectory()).path}/tn_voice_${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _recorder.start(
      const RecordConfig(encoder: kIsWeb ? AudioEncoder.opus : AudioEncoder.aacLc),
      path: path,
    );
    setState(() => _recording = true);
  }

  void _onHeard(SpeechRecognitionResult r) {
    if (!mounted) return;
    _heard = r.recognizedWords;
    setState(() => _input.text = _heard);
    if (r.finalResult) unawaited(_stopRecording());
  }

  Future<void> _stopRecording() async {
    if (!_recording) return;
    setState(() => _recording = false);
    if (_sttReady == true) {
      await _stt.stop();
      final text = _heard.trim();
      if (text.isEmpty || _sentHeard) return;
      _sentHeard = true;
      _input.clear();
      _lastWasVoice = true;
      await _send(text);
      return;
    }
    final path = await _recorder.stop();
    if (path == null) return;
    try {
      await _ensureSession();
      final bytes = await XFile(path).readAsBytes();
      final text = await _ai.transcribe(bytes, kIsWeb ? 'audio/webm' : 'audio/mp4');
      _lastWasVoice = true;
      await _send(text);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  GuidePlace? _placeFor(String q, String answer) {
    final temples = ref.read(guideTemplesProvider).value ?? const [];
    final cities = ref.read(citiesProvider).value ?? const [];
    return detectPlace(q, answer, temples, cities);
  }

  void _newChat() => setState(() {
    _sessionId = null;
    _messages.clear();
    _meta.clear();
  });

  Future<void> _openSession(String id) async {
    try {
      final msgs = await _ai.messages(id);
      if (!mounted) return;
      setState(() {
        _sessionId = id;
        _messages
          ..clear()
          ..addAll(msgs);
        _meta
          ..clear()
          ..addAll([
            for (var i = 0; i < msgs.length; i++)
              _Meta(
                null,
                place: msgs[i].isUser || i == 0
                    ? null
                    : _placeFor(msgs[i - 1].content, msgs[i].content),
              ),
          ]);
      });
      _scrollDown();
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  /// Gallery or camera photo → landmark match → ask about that temple.
  Future<void> _askFromPhoto(ImageSource source) async {
    final photo = await ImagePicker().pickImage(source: source, maxWidth: 1600, imageQuality: 85);
    if (photo == null || !mounted) return;
    setState(() => _busy = true);
    try {
      await _ensureSession();
      final matches = await _ai.identifyLandmark(await photo.readAsBytes(), 'image/jpeg');
      if (!mounted) return;
      setState(() => _busy = false);
      if (matches.isEmpty) {
        showSnack(context, context.l10n.gPhotoNoMatch);
        return;
      }
      final temples = ref.read(guideTemplesProvider).value ?? const [];
      final id = matches.first['templeId'];
      final t = temples.where((x) => x.id == id || x.slug == id).firstOrNull;
      await _send(context.l10n.gAskAbout(t?.name ?? '${matches.first['name'] ?? ''}'));
    } on Object catch (e) {
      if (mounted) {
        setState(() => _busy = false);
        showSnack(context, errorText(context, e));
      }
    }
  }

  /// Phone location → nearest temples from the catalog.
  Future<void> _nearby() async {
    final fix = await ref.read(locationServiceProvider).current();
    final temples = await ref.read(guideTemplesProvider.future);
    if (!mounted) return;
    double km(TempleSummaryResponse t) {
      final dLat = (t.lat.toDouble() - fix.lat) * 111.0;
      final dLng = (t.lng.toDouble() - fix.lng) * 111.0 * 0.885; // cos(27.6°)
      return math.sqrt(dLat * dLat + dLng * dLng);
    }

    final list = [for (final t in temples) (t, km(t))]..sort((a, b) => a.$2.compareTo(b.$2));
    setState(() {
      _messages.add(ChatMessage(role: 'user', content: context.l10n.gNearbyAsk));
      _meta.add(_Meta(DateTime.now()));
      _messages.add(const ChatMessage(role: 'assistant', content: ''));
      _meta.add(_Meta(DateTime.now(), nearby: list.take(4).toList()));
    });
    _scrollDown();
  }

  void _attachSheet() {
    final l = context.l10n;
    unawaited(
      showModalBottomSheet<void>(
        context: context,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        builder: (sheet) {
          Widget item(IconData icon, Color color, String label, VoidCallback onTap) => Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () {
                Navigator.pop(sheet);
                onTap();
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Column(
                  children: [
                    Icon(icon, color: color, size: 30),
                    const SizedBox(height: 6),
                    Text(label, style: const TextStyle(fontSize: 12.5, color: TnColors.ink)),
                  ],
                ),
              ),
            ),
          );
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: TnColors.line,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      item(
                        Icons.photo_rounded,
                        const Color(0xFF1C6FD1),
                        l.gGallery,
                        () => unawaited(_askFromPhoto(ImageSource.gallery)),
                      ),
                      item(
                        Icons.photo_camera_rounded,
                        TnColors.navy,
                        l.gCamera,
                        () => unawaited(_askFromPhoto(ImageSource.camera)),
                      ),
                      item(
                        Icons.location_on_rounded,
                        const Color(0xFF1C6FD1),
                        l.gLocation,
                        () => unawaited(_nearby()),
                      ),
                      item(
                        Icons.picture_as_pdf_rounded,
                        const Color(0xFFE03131),
                        l.gTripPdf,
                        () => context.push('/guide/planner'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _moreSheet() {
    final l = context.l10n;
    final prompts = [
      l.gPromptWear,
      l.gPromptParikrama,
      l.gPromptFood,
      l.gPromptFestival,
      l.gPromptHolyPlaces,
    ];
    unawaited(
      showModalBottomSheet<void>(
        context: context,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        builder: (sheet) => SafeArea(
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.all(12),
            children: [
              for (final p in prompts)
                ListTile(
                  leading: const Icon(Icons.auto_awesome, color: TnColors.saffron),
                  title: Text(p),
                  onTap: () {
                    Navigator.pop(sheet);
                    unawaited(_send(p));
                  },
                ),
              ListTile(
                leading: const Icon(Icons.sos, color: TnColors.sos),
                title: Text(l.sosTitle),
                onTap: () {
                  Navigator.pop(sheet);
                  unawaited(context.push('/sos'));
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _templePicker() {
    final temples = ref.read(guideTemplesProvider).value ?? const [];
    unawaited(
      showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        builder: (sheet) => DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.6,
          builder: (_, sc) => ListView(
            controller: sc,
            padding: const EdgeInsets.all(12),
            children: [
              for (final t in temples)
                ListTile(
                  leading: ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: SizedBox(
                      width: 44,
                      height: 44,
                      child: guideImage(t.coverUrl ?? templeImage(t.slug)),
                    ),
                  ),
                  title: Text(t.name),
                  onTap: () {
                    Navigator.pop(sheet);
                    unawaited(_send(context.l10n.gAskAbout(t.name)));
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    ref
      ..watch(guideTemplesProvider)
      ..watch(citiesProvider);
    final chips = <(IconData, String, VoidCallback)>[
      (Icons.temple_hindu_rounded, l.gTempleInfo, _templePicker),
      (Icons.calendar_month_rounded, l.gAartiTimings, () => unawaited(_send(l.gPromptAarti))),
      (Icons.directions_car_rounded, l.gTravelGuide, () => unawaited(_send(l.gPromptTravel))),
      (Icons.more_horiz_rounded, l.gMore, _moreSheet),
    ];
    return Scaffold(
      backgroundColor: const Color(0xFFFFFBF3),
      drawer: _HistoryDrawer(onOpen: _openSession, onNew: _newChat, current: _sessionId),
      body: Stack(
        children: [
          Positioned.fill(
            child: Opacity(
              opacity: 0.55,
              child: Image.asset(
                'assets/images/canva/guide-bg.jpg',
                fit: BoxFit.cover,
                alignment: Alignment.topRight,
              ),
            ),
          ),
          SafeArea(
            bottom: false,
            child: Column(
              children: [
                // Header: menu (history) · Tirth Guide · map.
                Padding(
                  padding: const EdgeInsets.fromLTRB(4, 4, 8, 0),
                  child: Row(
                    children: [
                      Builder(
                        builder: (c) => IconButton(
                          tooltip: l.gHistory,
                          icon: const Icon(Icons.menu_rounded, size: 28, color: TnColors.ink),
                          onPressed: () => Scaffold.of(c).openDrawer(),
                        ),
                      ),
                      Expanded(
                        child: Column(
                          children: [
                            const Icon(
                              Icons.temple_hindu_rounded,
                              color: Color(0xFFF2A73B),
                              size: 30,
                            ),
                            Text(
                              l.guideTitle,
                              style: const TextStyle(
                                fontFamily: 'Cormorant',
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                color: TnColors.navy,
                                height: 1,
                              ),
                            ),
                            Text(
                              _busy ? l.guideTyping : l.gTagline,
                              style: const TextStyle(
                                fontFamily: 'Cormorant',
                                fontStyle: FontStyle.italic,
                                fontSize: 14,
                                color: TnColors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      PopupMenuButton<String>(
                        tooltip: l.voiceSettings,
                        icon: Icon(
                          _autoSpeak
                              ? Icons.record_voice_over_rounded
                              : Icons.voice_over_off_rounded,
                          color: TnColors.navy,
                        ),
                        onSelected: (v) => setState(() {
                          if (v == 'auto') {
                            _autoSpeak = !_autoSpeak;
                          } else {
                            _voiceLang = v == 'app' ? null : v;
                          }
                        }),
                        itemBuilder: (_) => [
                          CheckedPopupMenuItem(
                            value: 'auto',
                            checked: _autoSpeak,
                            child: Text(l.voiceReplies),
                          ),
                          const PopupMenuDivider(),
                          CheckedPopupMenuItem(
                            value: 'app',
                            checked: _voiceLang == null,
                            child: Text(l.voiceLangApp),
                          ),
                          CheckedPopupMenuItem(
                            value: 'hi',
                            checked: _voiceLang == 'hi',
                            child: const Text('हिन्दी'),
                          ),
                          CheckedPopupMenuItem(
                            value: 'en',
                            checked: _voiceLang == 'en',
                            child: const Text('English'),
                          ),
                        ],
                      ),
                      Material(
                        color: Colors.white,
                        elevation: 2,
                        borderRadius: BorderRadius.circular(14),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(14),
                          onTap: () => context.push('/journey'),
                          child: const Padding(
                            padding: EdgeInsets.all(9),
                            child: Icon(Icons.map_outlined, color: TnColors.navy, size: 26),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView(
                    controller: _scroll,
                    padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
                    children: [
                      _Row(
                        user: false,
                        time: null,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l.guideWelcome,
                              style: const TextStyle(
                                fontFamily: 'Cormorant',
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: TnColors.navy,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(l.gHello, style: const TextStyle(fontSize: 14, height: 1.35)),
                            const SizedBox(height: 6),
                            Text(
                              l.gHelloSub,
                              style: const TextStyle(
                                fontFamily: 'Cormorant',
                                fontStyle: FontStyle.italic,
                                fontSize: 14,
                                color: TnColors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      for (var i = 0; i < _messages.length; i++)
                        _entry(_messages[i], i < _meta.length ? _meta[i] : const _Meta(null)),
                      if (_busy)
                        _streaming.isEmpty
                            ? const _TypingBubble()
                            : _Row(
                                user: false,
                                time: null,
                                child: Text(_streaming, style: const TextStyle(height: 1.45)),
                              ),
                    ],
                  ),
                ),
                if (_recording || _speaking)
                  Container(
                    margin: const EdgeInsets.fromLTRB(12, 0, 12, 6),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: _recording ? const Color(0xFFFDECEA) : const Color(0xFFFFF3E4),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        _Pulse(color: _recording ? TnColors.sos : TnColors.saffron),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _recording ? l.listening : (_paused ? l.speakingPaused : l.speaking),
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: _recording ? TnColors.sos : TnColors.accent,
                            ),
                          ),
                        ),
                        if (_recording)
                          TextButton(onPressed: _stopRecording, child: Text(l.stopListening))
                        else ...[
                          IconButton(
                            tooltip: _paused ? l.play : l.pause,
                            icon: Icon(_paused ? Icons.play_arrow_rounded : Icons.pause_rounded),
                            onPressed: _togglePlayback,
                          ),
                          IconButton(
                            tooltip: l.stop,
                            icon: const Icon(Icons.stop_rounded),
                            onPressed: _stopSpeaking,
                          ),
                        ],
                      ],
                    ),
                  ),
                // Quick actions.
                SizedBox(
                  height: 40,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemCount: chips.length,
                    separatorBuilder: (_, _) => const SizedBox(width: 8),
                    itemBuilder: (_, i) {
                      final (icon, label, onTap) = chips[i];
                      return Material(
                        color: Colors.white,
                        elevation: 1.5,
                        shadowColor: const Color(0x331C3C6B),
                        borderRadius: BorderRadius.circular(23),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(23),
                          onTap: _busy ? null : onTap,
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            child: Row(
                              children: [
                                Icon(
                                  icon,
                                  size: 20,
                                  color: i == 3 ? TnColors.navy : const Color(0xFFE8890C),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  label,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: TnColors.ink,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                // Composer.
                Container(
                  margin: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                  padding: const EdgeInsets.fromLTRB(4, 4, 6, 4),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(30),
                    boxShadow: const [
                      BoxShadow(color: Color(0x1A1C3C6B), blurRadius: 14, offset: Offset(0, 4)),
                    ],
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        tooltip: l.gAttach,
                        icon: const Icon(Icons.attach_file_rounded, color: TnColors.navy),
                        onPressed: _busy ? null : _attachSheet,
                      ),
                      Expanded(
                        child: TextField(
                          controller: _input,
                          minLines: 1,
                          maxLines: 4,
                          maxLength: 1000,
                          textInputAction: TextInputAction.send,
                          decoration: InputDecoration(
                            hintText: l.gHint,
                            counterText: '',
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            filled: false,
                            isDense: true,
                          ),
                          onSubmitted: (_) => _send(),
                        ),
                      ),
                      Tooltip(
                        message: l.gTapToSpeak,
                        child: GestureDetector(
                          onTap: _toggleMic,
                          onLongPressStart: (_) => _startRecording(),
                          onLongPressEnd: (_) => _stopRecording(),
                          child: CircleAvatar(
                            radius: 18,
                            backgroundColor: _recording ? TnColors.sos : TnColors.navy,
                            child: const Icon(Icons.mic_rounded, color: Colors.white),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      IconButton.filled(
                        tooltip: l.send,
                        style: IconButton.styleFrom(
                          backgroundColor: const Color(0xFFEEF0F5),
                          minimumSize: const Size(40, 40),
                        ),
                        onPressed: _busy ? null : _send,
                        icon: const Icon(Icons.send_rounded, color: TnColors.navy),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _entry(ChatMessage m, _Meta meta) {
    if (m.isUser) {
      return _Row(
        user: true,
        time: meta.at,
        child: Text(m.content, style: const TextStyle(color: Colors.white, fontSize: 15.5)),
      );
    }
    final Widget body;
    if (meta.nearby != null) {
      body = NearbyCard(items: meta.nearby!);
    } else if (meta.place != null) {
      body = PlaceAnswerCard(place: meta.place!, answer: m.content);
    } else {
      body = Text(m.content, style: const TextStyle(height: 1.45, fontSize: 14.5));
    }
    return _Row(
      user: false,
      time: meta.at,
      onSpeak: meta.nearby != null ? null : () => _speak(m.content),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          body,
          if (m.citations.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final c in m.citations)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF3E4),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '[${c.n}] ${c.title}',
                      style: const TextStyle(
                        color: TnColors.accent,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                      ),
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

@immutable
class _Meta {
  const _Meta(this.at, {this.place, this.nearby});
  final DateTime? at;
  final GuidePlace? place;
  final List<(TempleSummaryResponse, double)>? nearby;
}

/// One message row: avatar + bubble (+ time, read tick, listen).
class _Row extends StatelessWidget {
  const _Row({required this.user, required this.time, required this.child, this.onSpeak});

  final bool user;
  final DateTime? time;
  final Widget child;
  final VoidCallback? onSpeak;

  @override
  Widget build(BuildContext context) {
    final bubble = Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.fromLTRB(13, 10, 13, 8),
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.76),
      decoration: BoxDecoration(
        gradient: user ? const LinearGradient(colors: [Color(0xFF24497F), TnColors.navy]) : null,
        color: user ? null : Colors.white,
        boxShadow: const [
          BoxShadow(color: Color(0x141C3C6B), blurRadius: 12, offset: Offset(0, 4)),
        ],
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          child,
          if (onSpeak != null || (!user && time != null))
            Row(
              children: [
                if (onSpeak != null)
                  InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: onSpeak,
                    child: Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.volume_up_rounded, size: 17, color: TnColors.saffron),
                          const SizedBox(width: 4),
                          Text(
                            context.l10n.guideListen,
                            style: const TextStyle(
                              color: TnColors.saffron,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                const Spacer(),
                if (time != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      formatChatTime(time!),
                      style: const TextStyle(fontSize: 11.5, color: TnColors.muted),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
    final avatar = user
        ? const CircleAvatar(
            radius: 18,
            backgroundColor: Color(0xFFE7EDF7),
            child: Icon(Icons.person_outline_rounded, color: TnColors.navy),
          )
        : const _GuideAvatar(radius: 18);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Column(
        crossAxisAlignment: user ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: user ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: user
                ? [Flexible(child: bubble), const SizedBox(width: 8), avatar]
                : [avatar, const SizedBox(width: 8), Flexible(child: bubble)],
          ),
          if (user && time != null)
            Padding(
              padding: const EdgeInsets.only(right: 56),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    formatChatTime(time!),
                    style: const TextStyle(fontSize: 11.5, color: TnColors.ink),
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.done_all_rounded, size: 15, color: TnColors.navy),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Past conversations (GET /ai/chat/sessions).
class _HistoryDrawer extends ConsumerWidget {
  const _HistoryDrawer({required this.onOpen, required this.onNew, required this.current});

  final Future<void> Function(String id) onOpen;
  final VoidCallback onNew;
  final String? current;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final sessions = ref.watch(chatSessionsProvider);
    return Drawer(
      backgroundColor: Colors.white,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text(
                l.gHistory,
                style: const TextStyle(
                  fontFamily: 'Cormorant',
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: TnColors.navy,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: TnColors.navy),
                onPressed: () {
                  Navigator.pop(context);
                  onNew();
                },
                icon: const Icon(Icons.add_rounded),
                label: Text(l.newChat),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: sessions.when(
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (_, _) => Center(child: Text(l.gSignInHistory)),
                data: (list) => list.isEmpty
                    ? Center(child: Text(l.emptyList))
                    : ListView(
                        children: [
                          for (final s in list)
                            ListTile(
                              selected: s.$1 == current,
                              leading: const Icon(Icons.chat_bubble_outline_rounded),
                              title: Text(
                                s.$2 ?? l.newChat,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              subtitle: s.$3 == null ? null : Text(s.$3!),
                              onTap: () {
                                Navigator.pop(context);
                                unawaited(onOpen(s.$1));
                              },
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

/// (id, title, last activity in IST) of the signed-in user's chats.
final chatSessionsProvider = FutureProvider.autoDispose<List<(String, String?, String?)>>((
  ref,
) async {
  final s = ref.watch(sessionProvider);
  if (!s.signedIn) return const [];
  final page = await ref.watch(apiClientProvider).getJson('/ai/chat/sessions');
  return [
    for (final r in (page['data'] as List<dynamic>? ?? const []))
      if (r is Map)
        (
          r['id'] as String,
          r['title'] as String?,
          r['lastMessageAt'] is String
              ? formatChatTime(DateTime.parse(r['lastMessageAt'] as String))
              : null,
        ),
  ];
});

class _GuideAvatar extends StatelessWidget {
  const _GuideAvatar({this.radius = 15});
  final double radius;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(1.5),
    decoration: const BoxDecoration(
      shape: BoxShape.circle,
      gradient: LinearGradient(colors: [TnColors.saffron, TnColors.navy]),
    ),
    child: CircleAvatar(
      radius: radius,
      backgroundColor: Colors.white,
      backgroundImage: const AssetImage('assets/images/canva/guide-avatar.jpg'),
    ),
  );
}

class _TypingBubble extends StatefulWidget {
  const _TypingBubble();

  @override
  State<_TypingBubble> createState() => _TypingBubbleState();
}

class _TypingBubbleState extends State<_TypingBubble> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))
    ..repeat();

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      children: [
        const _GuideAvatar(),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: TnColors.line),
          ),
          child: AnimatedBuilder(
            animation: _c,
            builder: (_, _) => Row(
              children: [
                for (var i = 0; i < 3; i++)
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 2),
                    width: 7,
                    height: 7,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: TnColors.saffron.withValues(
                        alpha: 0.3 + 0.7 * (((_c.value * 3 - i) % 3) < 1 ? 1 : 0),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    ),
  );
}

/// Pulsing dot for the listening / speaking states.
class _Pulse extends StatefulWidget {
  const _Pulse({required this.color});
  final Color color;

  @override
  State<_Pulse> createState() => _PulseState();
}

class _PulseState extends State<_Pulse> with SingleTickerProviderStateMixin {
  late final _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))
    ..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FadeTransition(
    opacity: Tween<double>(begin: 0.35, end: 1).animate(_c),
    child: Icon(Icons.graphic_eq_rounded, color: widget.color),
  );
}
