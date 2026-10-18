import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_models.dart';
import '../../../core/api/sse.dart';
import '../../../core/api/uploads.dart';
import '../../../core/providers.dart';

@immutable
class Citation {
  const Citation({required this.n, required this.title});

  final int n;
  final String title;
}

@immutable
class ChatMessage {
  const ChatMessage({required this.role, required this.content, this.citations = const []});

  factory ChatMessage.fromJson(Json j) => ChatMessage(
    role: j['role'] as String,
    content: j['content'] as String,
    citations: [
      for (final c in (j['citations'] as List<dynamic>? ?? const []))
        if (c is Map)
          Citation(n: ((c['n'] as num?) ?? 0).toInt(), title: (c['title'] as String?) ?? ''),
    ],
  );

  final String role;
  final String content;
  final List<Citation> citations;

  bool get isUser => role == 'user';
}

/// One streamed update from the guide.
sealed class GuideEvent {}

class GuideToken extends GuideEvent {
  GuideToken(this.text);
  final String text;
}

class GuideCitation extends GuideEvent {
  GuideCitation(this.citation);
  final Citation citation;
}

class GuideDone extends GuideEvent {}

class GuideError extends GuideEvent {
  GuideError(this.code);
  final String code;
}

GuideEvent? guideEventFromSse(SseEvent e) => switch (e.event) {
  'token' => GuideToken((e.data['text'] as String?) ?? ''),
  'citation' => GuideCitation(
    Citation(n: ((e.data['n'] as num?) ?? 0).toInt(), title: (e.data['title'] as String?) ?? ''),
  ),
  'done' => GuideDone(),
  'error' => GuideError((e.data['code'] as String?) ?? 'INTERNAL'),
  _ => null,
};

/// The Braj guide (SSE chat), trip planner and voice/photo helpers. Aarti
/// times in answers come from the API's schedule tool (ADR-0015).
class AiRepository {
  AiRepository(this._api);

  final ApiClient _api;

  Future<String> createSession(String lang) async =>
      asJson(
            await _api.post('/ai/chat/sessions', body: CreateChatSessionDto(lang: lang).toJson()),
          )['id']
          as String;

  Future<List<ChatMessage>> messages(String sessionId) async {
    final j = await _api.getJson('/ai/chat/sessions/$sessionId');
    return [
      for (final m in (j['messages'] as List<dynamic>? ?? const []))
        ChatMessage.fromJson(asJson(m)),
    ];
  }

  Stream<GuideEvent> ask(String sessionId, String content) => _api
      .postSse(
        '/ai/chat/sessions/$sessionId/messages',
        body: ChatMessageDto(content: content).toJson(),
      )
      .map(guideEventFromSse)
      .where((e) => e != null)
      .cast<GuideEvent>();

  Future<int?> quotaRemaining() async =>
      ((await _api.getJson('/ai/quota'))['remaining'] as num?)?.toInt();

  Future<Json> createItinerary(CreateItineraryDto dto) async =>
      asJson(await _api.post('/ai/itineraries', body: dto.toJson()));

  Future<List<Json>> itineraries() async => _api.getList('/ai/itineraries');

  Future<Json> itinerary(String id) => _api.getJson('/ai/itineraries/$id');

  Future<String> share(String id) async =>
      asJson(await _api.post('/ai/itineraries/$id/share'))['shareUrl'] as String;

  Future<String> speak(String text, String lang) async =>
      asJson(
            await _api.post(
              '/ai/voice/speak',
              body: SpeakDto(text: text, lang: lang).toJson(),
            ),
          )['url']
          as String;

  Future<String> transcribe(Uint8List audio, String mimeType) async {
    final id = await uploadMedia(_api, purpose: 'voice_note', mimeType: mimeType, bytes: audio);
    return asJson(
          await _api.post('/ai/voice/transcribe', body: TranscribeDto(mediaId: id).toJson()),
        )['text']
        as String;
  }

  Future<List<Json>> identifyLandmark(
    Uint8List photo,
    String mimeType, {
    double? lat,
    double? lng,
  }) async {
    final id = await uploadMedia(_api, purpose: 'landmark_photo', mimeType: mimeType, bytes: photo);
    final res = asJson(
      await _api.post(
        '/ai/landmark',
        body: LandmarkDto(mediaId: id, lat: lat, lng: lng).toJson(),
      ),
    );
    return asJsonList(res['matches']);
  }
}

final aiRepositoryProvider = Provider<AiRepository>(
  (ref) => AiRepository(ref.watch(apiClientProvider)),
);
