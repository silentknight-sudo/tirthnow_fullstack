import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_models.dart';
import '../../../core/api/uploads.dart';
import '../../../core/providers.dart';
import '../../auth/data/session_controller.dart';

/// Reels: feed, your own reels, and posting, editing or deleting a reel.
class ReelsRepository {
  ReelsRepository(this._api);

  final ApiClient _api;

  Future<ReelPageResponse> feed({bool saved = false}) async => ReelPageResponse.fromJson(
    await _api.getJson(saved ? '/reels/saved' : '/reels/feed', query: {'limit': 20}),
  );

  Future<CreatorPageResponse> byUser(String userId) async => CreatorPageResponse.fromJson(
    await _api.getJson('/users/$userId/reels', query: {'limit': 50}),
  );

  /// Uploads the video (and an optional cover), then publishes. The server
  /// transcodes it; the reel goes live when that finishes.
  Future<ReelResponse> post({
    required Uint8List video,
    required String videoMime,
    Uint8List? cover,
    String? caption,
    List<String> hashtags = const [],
    String? templeId,
    void Function(double fraction)? onProgress,
  }) async {
    final videoId = await uploadMedia(
      _api,
      purpose: 'reel_video',
      mimeType: videoMime,
      bytes: video,
      onProgress: (f) => onProgress?.call(f * (cover == null ? 1 : 0.9)),
    );
    String? coverId;
    if (cover != null) {
      coverId = await uploadMedia(
        _api,
        purpose: 'reel_thumbnail',
        mimeType: 'image/jpeg',
        bytes: cover,
        onProgress: (f) => onProgress?.call(0.9 + f * 0.1),
      );
    }
    final res = await _api.post(
      '/reels',
      body: CreateReelDto(
        videoMediaId: videoId,
        thumbnailMediaId: coverId,
        caption: caption,
        hashtags: hashtags,
        templeId: templeId,
      ).toJson(),
    );
    return ReelResponse.fromJson(asJson(res));
  }

  /// Edit caption, hashtags, temple tag (null removes it) or cover.
  Future<ReelResponse> edit(
    String id, {
    required String caption,
    required List<String> hashtags,
    required String? templeId,
    Uint8List? cover,
  }) async {
    final coverId = cover == null
        ? null
        : await uploadMedia(_api, purpose: 'reel_thumbnail', mimeType: 'image/jpeg', bytes: cover);
    final res = await _api.patch(
      '/reels/$id',
      body: {
        'caption': caption,
        'hashtags': hashtags,
        'templeId': templeId,
        'thumbnailMediaId': ?coverId,
      },
    );
    return ReelResponse.fromJson(asJson(res));
  }

  Future<void> delete(String id) => _api.delete('/reels/$id');
}

final reelsRepositoryProvider = Provider<ReelsRepository>(
  (ref) => ReelsRepository(ref.watch(apiClientProvider)),
);

final reelsFeedProvider = FutureProvider.family<ReelPageResponse, bool>(
  (ref, saved) => ref.watch(reelsRepositoryProvider).feed(saved: saved),
);

/// The signed-in user's reels (including ones still processing).
final myReelsProvider = FutureProvider<CreatorPageResponse>((ref) {
  final me = ref.watch(sessionProvider).user;
  if (me == null) throw StateError('signed out');
  return ref.watch(reelsRepositoryProvider).byUser(me.id);
});

/// "#Vrindavan aarti, #braj" → ["vrindavan", "braj"] (server normalises too).
List<String> hashtagsIn(String text) => RegExp(
  r'#([\p{L}\p{N}_]{1,40})',
  unicode: true,
).allMatches(text).map((m) => m.group(1)!.toLowerCase()).toSet().toList();
