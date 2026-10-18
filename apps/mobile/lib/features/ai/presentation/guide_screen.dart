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
  StreamSubscription<GuideEvent>? _sub;

  @override
  void dispose() {
    _sub?.cancel();
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
        _messages.add(
          ChatMessage(role: 'assistant', content: _streaming, citations: List.of(_streamCitations)),
        );
      }
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
      final url = await _ai.speak(text, ref.read(localeProvider).languageCode);
      await _player.play(UrlSource(url));
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  Future<void> _startRecording() async {
    if (!await _recorder.hasPermission()) return;
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
      await _send(text);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  Future<void> _identify() async {
    final photo = await ImagePicker().pickImage(
      source: ImageSource.camera,
      maxWidth: 1600,
      imageQuality: 85,
    );
    if (photo == null) return;
    try {
      await _ensureSession();
      final matches = await _ai.identifyLandmark(await photo.readAsBytes(), 'image/jpeg');
      if (!mounted) return;
      if (matches.isEmpty) {
        showSnack(context, context.l10n.emptyList);
        return;
      }
      final best = matches.first;
      await context.push('/temples/${best['templeId']}');
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final suggestions = [
      'ISKCON Vrindavan sandhya aarti kab hai?',
      'What should I wear for Banke Bihari darshan?',
      'Govardhan parikrama kitne km hai?',
    ];
    return Scaffold(
      appBar: AppBar(
        title: Text(l.guideTitle),
        actions: [
          IconButton(
            tooltip: l.sosTitle,
            icon: const Icon(Icons.sos, color: TnColors.sos),
            onPressed: () => context.push('/sos'),
          ),
          IconButton(
            tooltip: l.identifyTemple,
            icon: const Icon(Icons.photo_camera_outlined),
            onPressed: _identify,
          ),
          IconButton(
            tooltip: l.planner,
            icon: const Icon(Icons.map_outlined),
            onPressed: () => context.push('/guide/planner'),
          ),
          IconButton(
            tooltip: l.newChat,
            icon: const Icon(Icons.add_comment_outlined),
            onPressed: () => setState(() {
              _sessionId = null;
              _messages.clear();
            }),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              controller: _scroll,
              padding: const EdgeInsets.all(16),
              children: [
                _Bubble(
                  message: ChatMessage(role: 'assistant', content: l.guideIntro),
                ),
                if (_messages.isEmpty)
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final s in suggestions)
                        ActionChip(label: Text(s), onPressed: () => _send(s)),
                    ],
                  ),
                for (final m in _messages)
                  _Bubble(message: m, onSpeak: m.isUser ? null : () => _speak(m.content)),
                if (_busy)
                  _Bubble(
                    message: ChatMessage(
                      role: 'assistant',
                      content: _streaming.isEmpty ? '…' : _streaming,
                    ),
                  ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      minLines: 1,
                      maxLines: 4,
                      maxLength: 1000,
                      textInputAction: TextInputAction.send,
                      decoration: InputDecoration(hintText: l.guideHint, counterText: ''),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 6),
                  GestureDetector(
                    onLongPressStart: (_) => _startRecording(),
                    onLongPressEnd: (_) => _stopRecording(),
                    child: Tooltip(
                      message: l.voiceAsk,
                      child: CircleAvatar(
                        radius: 24,
                        backgroundColor: _recording ? TnColors.sos : TnColors.paper2,
                        child: Icon(Icons.mic, color: _recording ? Colors.white : TnColors.brown),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  IconButton.filled(
                    tooltip: l.send,
                    onPressed: _busy ? null : _send,
                    icon: const Icon(Icons.send),
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

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, this.onSpeak});

  final ChatMessage message;
  final VoidCallback? onSpeak;

  @override
  Widget build(BuildContext context) {
    final user = message.isUser;
    return Align(
      alignment: user ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.82),
        decoration: BoxDecoration(
          color: user ? TnColors.brown : TnColors.card,
          border: user ? null : Border.all(color: TnColors.line),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(user ? 18 : 6),
            bottomRight: Radius.circular(user ? 6 : 18),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.content,
              style: TextStyle(color: user ? TnColors.paper : TnColors.ink, height: 1.4),
            ),
            if (message.citations.isNotEmpty) ...[
              const SizedBox(height: 6),
              for (final c in message.citations)
                Text(
                  '[${c.n}] ${c.title}',
                  style: const TextStyle(
                    color: TnColors.gold,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
            ],
            if (onSpeak != null)
              Align(
                alignment: Alignment.centerRight,
                child: IconButton(
                  visualDensity: VisualDensity.compact,
                  tooltip: context.l10n.voiceAsk,
                  icon: const Icon(Icons.volume_up_outlined, size: 20, color: TnColors.gold),
                  onPressed: onSpeak,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
