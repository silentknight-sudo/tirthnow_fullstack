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

  Future<ReelPageResponse> feed(FeedKey key) async => ReelPageResponse.fromJson(
    await _api.getJson(
      key.saved ? '/reels/saved' : '/reels/feed',
      query: {
        'limit': key.hashtag == null ? 20 : 50,
        if (key.following) 'following': true,
        'hashtag': ?key.hashtag,
      },
    ),
  );

  Future<void> follow(String userId, {required bool on}) =>
      on ? _api.post('/users/$userId/follow') : _api.delete('/users/$userId/follow');

  Future<void> report(String reelId, String reason) => _api.post(
    '/reports',
    body: CreateReportDto(targetType: 'reel', targetId: reelId, reasonCode: reason).toJson(),
  );

  Future<List<CommentResponse>> comments(String reelId) async => (await _api.getList(
    '/reels/$reelId/comments',
    query: {'limit': 50},
  )).map(CommentResponse.fromJson).toList();

  Future<void> comment(String reelId, String body, {String? parentId}) => _api.post(
    '/reels/$reelId/comments',
    body: CreateCommentDto(body: body, parentId: parentId).toJson(),
  );

  Future<void> deleteComment(String reelId, String id) =>
      _api.delete('/reels/$reelId/comments/$id');

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
    ReelEditsDto? edits,
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
        edits: edits,
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
    ReelEditsDto? edits,
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
        if (edits != null) 'edits': edits.toJson(),
      },
    );
    return ReelResponse.fromJson(asJson(res));
  }

  Future<void> delete(String id) => _api.delete('/reels/$id');
}

final reelsRepositoryProvider = Provider<ReelsRepository>(
  (ref) => ReelsRepository(ref.watch(apiClientProvider)),
);

/// Which feed: For you, Following, Saved, or one hashtag.
typedef FeedKey = ({bool saved, bool following, String? hashtag});

const FeedKey forYouFeed = (saved: false, following: false, hashtag: null);
const FeedKey followingFeed = (saved: false, following: true, hashtag: null);
const FeedKey savedFeed = (saved: true, following: false, hashtag: null);
FeedKey hashtagFeed(String tag) => (saved: false, following: false, hashtag: tag);

final reelsFeedProvider = FutureProvider.family<ReelPageResponse, FeedKey>(
  (ref, key) => ref.watch(reelsRepositoryProvider).feed(key),
);

/// Any creator's page: profile, follow state and reels.
final creatorProvider = FutureProvider.family<CreatorPageResponse, String>(
  (ref, userId) => ref.watch(reelsRepositoryProvider).byUser(userId),
);

final reelCommentsProvider = FutureProvider.family<List<CommentResponse>, String>(
  (ref, reelId) => ref.watch(reelsRepositoryProvider).comments(reelId),
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
