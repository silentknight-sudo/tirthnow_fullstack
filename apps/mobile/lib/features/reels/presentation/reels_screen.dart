import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:video_player/video_player.dart';

import '../../../core/api/api_models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../bookings/presentation/checkout_flow.dart';

final reelsFeedProvider = FutureProvider.family<ReelPageResponse, bool>((ref, saved) async {
  final api = ref.watch(apiClientProvider);
  return ReelPageResponse.fromJson(
    await api.getJson(saved ? '/reels/saved' : '/reels/feed', query: {'limit': 20}),
  );
});

/// Vertical, full-screen bhakti reels with like, save, share and comments.
class ReelsScreen extends ConsumerWidget {
  const ReelsScreen({super.key, this.saved = false});

  final bool saved;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final feed = ref.watch(reelsFeedProvider(saved));
    return Scaffold(
      backgroundColor: Colors.black,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        title: Text(saved ? l.saved : l.reels, style: const TextStyle(color: Colors.white)),
      ),
      body: AsyncView(
        value: feed,
        onRetry: () => ref.invalidate(reelsFeedProvider(saved)),
        builder: (page) => page.data.isEmpty
            ? const DefaultTextStyle(
                style: TextStyle(color: Colors.white70),
                child: EmptyState(icon: Icons.play_circle_outline),
              )
            : PageView.builder(
                scrollDirection: Axis.vertical,
                itemCount: page.data.length,
                itemBuilder: (_, i) => _ReelPage(reel: page.data[i], saved: saved),
              ),
      ),
    );
  }
}

class _ReelPage extends ConsumerStatefulWidget {
  const _ReelPage({required this.reel, required this.saved});

  final ReelResponse reel;
  final bool saved;

  @override
  ConsumerState<_ReelPage> createState() => _ReelPageState();
}

class _ReelPageState extends ConsumerState<_ReelPage> {
  VideoPlayerController? _video;
  late bool _liked = widget.reel.likedByMe;
  late bool _savedByMe = widget.reel.savedByMe;
  late num _likes = widget.reel.likeCount;

  @override
  void initState() {
    super.initState();
    final url = widget.reel.playbackUrl;
    if (url != null) {
      _video = VideoPlayerController.networkUrl(Uri.parse(url))
        ..setLooping(true)
        ..initialize()
            .then((_) {
              if (mounted) {
                setState(() {});
                _video?.play();
              }
            })
            .catchError((Object _) {});
    }
    ref.read(apiClientProvider).post('/reels/${widget.reel.id}/view').ignore();
  }

  @override
  void dispose() {
    _video?.dispose();
    super.dispose();
  }

  Future<void> _toggle(String action, bool on) async {
    if (!requireSignedIn(context, ref)) return;
    final api = ref.read(apiClientProvider);
    final path = '/reels/${widget.reel.id}/$action';
    try {
      on ? await api.post(path) : await api.delete(path);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.reel;
    final v = _video;
    return Stack(
      fit: StackFit.expand,
      children: [
        if (v != null && v.value.isInitialized)
          GestureDetector(
            onTap: () => setState(() => v.value.isPlaying ? v.pause() : v.play()),
            child: FittedBox(
              fit: BoxFit.cover,
              child: SizedBox(
                width: v.value.size.width,
                height: v.value.size.height,
                child: VideoPlayer(v),
              ),
            ),
          )
        else if (r.posterUrl != null)
          Image.network(
            r.posterUrl!,
            fit: BoxFit.cover,
            errorBuilder: (_, _, _) => const ColoredBox(color: TnColors.night),
          )
        else
          const ColoredBox(color: TnColors.night),
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.center,
              end: Alignment.bottomCenter,
              colors: [Colors.transparent, Color(0xB3000000)],
            ),
          ),
        ),
        Positioned(
          left: 16,
          right: 88,
          bottom: 32,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                r.creator.displayName,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
              ),
              if (r.caption != null) Text(r.caption!, style: const TextStyle(color: Colors.white)),
              if (r.templeName != null)
                Pill(r.templeName!, color: TnColors.goldSoft, icon: Icons.temple_hindu),
            ],
          ),
        ),
        Positioned(
          right: 8,
          bottom: 32,
          child: Column(
            children: [
              _Action(
                icon: _liked ? Icons.favorite : Icons.favorite_border,
                label: '$_likes',
                color: _liked ? TnColors.saffron : Colors.white,
                onTap: () {
                  setState(() {
                    _liked = !_liked;
                    _likes += _liked ? 1 : -1;
                  });
                  _toggle('like', _liked);
                },
              ),
              _Action(
                icon: Icons.mode_comment_outlined,
                label: '${r.commentCount}',
                onTap: () => showModalBottomSheet<void>(
                  useRootNavigator: true,
                  context: context,
                  isScrollControlled: true,
                  showDragHandle: true,
                  builder: (_) => _Comments(reelId: r.id),
                ),
              ),
              _Action(
                icon: _savedByMe ? Icons.bookmark : Icons.bookmark_border,
                label: '',
                onTap: () {
                  setState(() => _savedByMe = !_savedByMe);
                  _toggle('save', _savedByMe);
                },
              ),
              _Action(
                icon: Icons.share_outlined,
                label: '',
                onTap: () => SharePlus.instance.share(ShareParams(text: r.caption ?? 'Tirth Now')),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Action extends StatelessWidget {
  const _Action({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color = Colors.white,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Column(
      children: [
        IconButton(
          icon: Icon(icon, color: color, size: 30),
          onPressed: onTap,
        ),
        if (label.isNotEmpty)
          Text(label, style: const TextStyle(color: Colors.white, fontSize: 12)),
      ],
    ),
  );
}

final _commentsProvider = FutureProvider.family<List<CommentResponse>, String>((ref, id) async {
  final api = ref.watch(apiClientProvider);
  return (await api.getList(
    '/reels/$id/comments',
    query: {'limit': 50},
  )).map(CommentResponse.fromJson).toList();
});

class _Comments extends ConsumerStatefulWidget {
  const _Comments({required this.reelId});

  final String reelId;

  @override
  ConsumerState<_Comments> createState() => _CommentsState();
}

class _CommentsState extends ConsumerState<_Comments> {
  final _text = TextEditingController();

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final body = _text.text.trim();
    if (body.isEmpty || !requireSignedIn(context, ref)) return;
    try {
      await ref
          .read(apiClientProvider)
          .post('/reels/${widget.reelId}/comments', body: CreateCommentDto(body: body).toJson());
      _text.clear();
      ref.invalidate(_commentsProvider(widget.reelId));
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.6,
        child: Column(
          children: [
            Text(l.comments, style: Theme.of(context).textTheme.titleMedium),
            Expanded(
              child: AsyncView(
                value: ref.watch(_commentsProvider(widget.reelId)),
                builder: (list) => list.isEmpty
                    ? const EmptyState(icon: Icons.mode_comment_outlined)
                    : ListView(
                        children: [
                          for (final c in list)
                            ListTile(title: Text(c.author.displayName), subtitle: Text(c.body)),
                        ],
                      ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: TextField(
                controller: _text,
                maxLength: 500,
                decoration: InputDecoration(
                  hintText: l.addComment,
                  counterText: '',
                  suffixIcon: IconButton(icon: const Icon(Icons.send), onPressed: _send),
                ),
                onSubmitted: (_) => _send(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
