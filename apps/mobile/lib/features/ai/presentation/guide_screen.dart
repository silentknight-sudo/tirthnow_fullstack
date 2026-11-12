import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:record/record.dart';

import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../auth/data/session_controller.dart';
import '../data/ai_repository.dart';
import 'identify.dart';

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
  final _recorder = AudioRecorder();
  final _player = AudioPlayer();
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
  }

  @override
  void dispose() {
    _sub?.cancel();
    _playerSub?.cancel();
    _input.dispose();
    _scroll.dispose();
    unawaited(_recorder.dispose());
    unawaited(_player.dispose());
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
    try {
      final lang = _voiceLang ?? ref.read(localeProvider).languageCode;
      setState(() => _speaking = true);
      // Voice translation: hear the answer in the chosen language.
      final spoken = await _ai.translate(text, lang);
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
    if (_paused) {
      await _player.resume();
    } else {
      await _player.pause();
    }
  }

  Future<void> _stopSpeaking() async {
    await _player.stop();
    if (mounted) setState(() => _speaking = false);
  }

  Future<void> _toggleMic() async {
    if (_recording) {
      await _stopRecording();
    } else {
      await _startRecording();
    }
  }

  Future<void> _startRecording() async {
    if (!await _recorder.hasPermission()) {
      if (mounted) showSnack(context, context.l10n.micPermission);
      return;
    }
    await _player.stop();
    await _recorder.start(const RecordConfig(encoder: AudioEncoder.opus), path: '');
    setState(() => _recording = true);
  }

  Future<void> _stopRecording() async {
    if (!_recording) return;
    setState(() => _recording = false);
    final path = await _recorder.stop();
    if (path == null) return;
    try {
      await _ensureSession();
      final bytes = await XFile(path).readAsBytes();
      final text = await _ai.transcribe(bytes, 'audio/webm');
      _lastWasVoice = true;
      await _send(text);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final suggestions = <(IconData, String)>[
      (Icons.local_fire_department_rounded, 'ISKCON Vrindavan sandhya aarti kab hai?'),
      (Icons.checkroom_rounded, 'What should I wear for Banke Bihari darshan?'),
      (Icons.route_rounded, 'Govardhan parikrama kitne km hai?'),
      (Icons.restaurant_rounded, 'Best sattvik food near Prem Mandir?'),
    ];
    return Scaffold(
      backgroundColor: const Color(0xFFF7F5EF),
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 1,
        titleSpacing: 12,
        title: Row(
          children: [
            const _GuideAvatar(radius: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l.guideTitle,
                    style: const TextStyle(
                      fontFamily: 'Cormorant',
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: TnColors.ink,
                    ),
                  ),
                  Row(
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          color: Color(0xFF2F9E44),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        _busy ? l.guideTyping : l.guideOnline,
                        style: const TextStyle(fontSize: 11.5, color: TnColors.muted),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: l.voiceSettings,
            icon: Icon(
              _autoSpeak ? Icons.record_voice_over_rounded : Icons.voice_over_off_rounded,
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
              CheckedPopupMenuItem(value: 'auto', checked: _autoSpeak, child: Text(l.voiceReplies)),
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
          IconButton(
            tooltip: l.newChat,
            icon: const Icon(Icons.edit_square, color: TnColors.navy),
            onPressed: () => setState(() {
              _sessionId = null;
              _messages.clear();
            }),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert_rounded, color: TnColors.navy),
            onSelected: (v) => switch (v) {
              'scan' => identifyTempleFromCamera(context),
              'plan' => context.push('/guide/planner'),
              _ => context.push('/sos'),
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                value: 'scan',
                child: ListTile(
                  leading: const Icon(Icons.photo_camera_outlined),
                  title: Text(l.identifyTemple),
                ),
              ),
              PopupMenuItem(
                value: 'plan',
                child: ListTile(leading: const Icon(Icons.map_outlined), title: Text(l.planner)),
              ),
              PopupMenuItem(
                value: 'sos',
                child: ListTile(
                  leading: const Icon(Icons.sos, color: TnColors.sos),
                  title: Text(l.sosTitle),
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              controller: _scroll,
              padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
              children: [
                if (_messages.isEmpty) ...[
                  _WelcomeCard(text: l.guideIntro),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      _ToolCard(
                        icon: Icons.photo_camera_rounded,
                        color: const Color(0xFF7B4FC9),
                        label: l.guideToolScan,
                        onTap: () => identifyTempleFromCamera(context),
                      ),
                      const SizedBox(width: 8),
                      _ToolCard(
                        icon: Icons.auto_awesome_rounded,
                        color: TnColors.saffron,
                        label: l.guideToolPlan,
                        onTap: () => context.push('/guide/planner'),
                      ),
                      const SizedBox(width: 8),
                      _ToolCard(
                        icon: Icons.local_fire_department_rounded,
                        color: const Color(0xFFE03131),
                        label: l.guideToolAarti,
                        onTap: () => context.push('/aarti'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Text(
                    l.guideTryAsking,
                    style: const TextStyle(
                      fontFamily: 'Cormorant',
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                      color: TnColors.ink,
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (final (icon, q) in suggestions)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Material(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(14),
                          onTap: () => _send(q),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: TnColors.line),
                            ),
                            child: Row(
                              children: [
                                Icon(icon, color: TnColors.saffron, size: 20),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    q,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      color: TnColors.ink,
                                    ),
                                  ),
                                ),
                                const Icon(
                                  Icons.north_east_rounded,
                                  size: 18,
                                  color: TnColors.muted,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                ],
                for (final m in _messages)
                  _Bubble(message: m, onSpeak: m.isUser ? null : () => _speak(m.content)),
                if (_busy)
                  _streaming.isEmpty
                      ? const _TypingBubble()
                      : _Bubble(
                          message: ChatMessage(role: 'assistant', content: _streaming),
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
          SafeArea(
            top: false,
            child: Container(
              margin: const EdgeInsets.fromLTRB(12, 4, 12, 10),
              padding: const EdgeInsets.fromLTRB(16, 4, 6, 4),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(30),
                border: Border.all(color: TnColors.line),
                boxShadow: const [
                  BoxShadow(color: Color(0x141C3C6B), blurRadius: 14, offset: Offset(0, 4)),
                ],
              ),
              child: Row(
                children: [
                  const Icon(Icons.auto_awesome, color: TnColors.saffron, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _input,
                      minLines: 1,
                      maxLines: 4,
                      maxLength: 1000,
                      textInputAction: TextInputAction.send,
                      decoration: InputDecoration(
                        hintText: l.guideHint,
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
                  GestureDetector(
                    onTap: _toggleMic,
                    onLongPressStart: (_) => _startRecording(),
                    onLongPressEnd: (_) => _stopRecording(),
                    child: Tooltip(
                      message: l.voiceAsk,
                      child: CircleAvatar(
                        radius: 21,
                        backgroundColor: _recording ? TnColors.sos : const Color(0xFFFFF1E4),
                        child: Icon(
                          Icons.mic_rounded,
                          color: _recording ? Colors.white : TnColors.saffron,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  IconButton.filled(
                    tooltip: l.send,
                    style: IconButton.styleFrom(
                      backgroundColor: TnColors.navy,
                      minimumSize: const Size(42, 42),
                    ),
                    onPressed: _busy ? null : _send,
                    icon: const Icon(Icons.arrow_upward_rounded, color: Colors.white),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

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

class _WelcomeCard extends StatelessWidget {
  const _WelcomeCard({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Container(
      height: 170,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        boxShadow: const [
          BoxShadow(color: Color(0x261C3C6B), blurRadius: 16, offset: Offset(0, 6)),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            'assets/images/canva/hero-travel.jpg',
            fit: BoxFit.cover,
            alignment: Alignment.centerRight,
          ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xF21C3C6B), Color(0xB31C3C6B), Color(0x001C3C6B)],
                stops: [0, 0.55, 1],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 120, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l.guideWelcome,
                  style: const TextStyle(
                    fontFamily: 'Cormorant',
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    height: 1.05,
                  ),
                ),
                const SizedBox(height: 6),
                Expanded(
                  child: Text(
                    text,
                    overflow: TextOverflow.fade,
                    style: const TextStyle(color: Colors.white70, fontSize: 12.5, height: 1.35),
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

class _ToolCard extends StatelessWidget {
  const _ToolCard({
    required this.icon,
    required this.color,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final Color color;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Container(
          height: 92,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: TnColors.line),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: color.withValues(alpha: 0.12),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(height: 6),
              Text(
                label,
                maxLines: 2,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: TnColors.ink,
                  height: 1.1,
                ),
              ),
            ],
          ),
        ),
      ),
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

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, this.onSpeak});

  final ChatMessage message;
  final VoidCallback? onSpeak;

  @override
  Widget build(BuildContext context) {
    final user = message.isUser;
    final bubble = Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.fromLTRB(14, 11, 14, 11),
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.74),
      decoration: BoxDecoration(
        gradient: user ? const LinearGradient(colors: [Color(0xFF24497F), TnColors.navy]) : null,
        color: user ? null : Colors.white,
        border: user ? null : Border.all(color: TnColors.line),
        boxShadow: const [BoxShadow(color: Color(0x0F1C3C6B), blurRadius: 8, offset: Offset(0, 3))],
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(18),
          topRight: const Radius.circular(18),
          bottomLeft: Radius.circular(user ? 18 : 4),
          bottomRight: Radius.circular(user ? 4 : 18),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            message.content,
            style: TextStyle(
              color: user ? Colors.white : TnColors.ink,
              height: 1.45,
              fontSize: 14.5,
            ),
          ),
          if (message.citations.isNotEmpty) ...[
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final c in message.citations)
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
          if (onSpeak != null) ...[
            const SizedBox(height: 4),
            InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: onSpeak,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
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
          ],
        ],
      ),
    );
    if (user) return Align(alignment: Alignment.centerRight, child: bubble);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        const Padding(padding: EdgeInsets.only(bottom: 8), child: _GuideAvatar()),
        const SizedBox(width: 8),
        Flexible(child: bubble),
      ],
    );
  }
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
