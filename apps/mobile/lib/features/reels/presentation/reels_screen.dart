import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:video_player/video_player.dart';

import '../../../core/api/api_models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../auth/data/session_controller.dart';
import '../../bookings/presentation/checkout_flow.dart';
import '../data/reels_repository.dart';
import 'reel_edit_sheet.dart';

/// Vertical, full-screen bhakti reels with like, save, share and comments,
/// plus buttons to post a new reel and open your own reels.
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
        title: Text(
          saved ? l.saved : l.reels,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
        ),
        actions: [
          if (!saved) ...[
            IconButton(
              tooltip: l.newReel,
              icon: const Icon(Icons.add_box_outlined, size: 28),
              onPressed: () {
                if (requireSignedIn(context, ref)) context.push('/reels/new');
              },
            ),
            IconButton(
              tooltip: l.myReels,
              icon: const Icon(Icons.account_circle_outlined, size: 28),
              onPressed: () {
                if (requireSignedIn(context, ref)) context.push('/reels/mine');
              },
            ),
          ],
        ],
      ),
      body: AsyncView(
        value: feed,
        onRetry: () => ref.invalidate(reelsFeedProvider(saved)),
        builder: (page) => page.data.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.play_circle_outline, color: Colors.white54, size: 56),
                      const SizedBox(height: 12),
                      Text(
                        l.noReelsYet,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white70),
                      ),
                      if (!saved) ...[
                        const SizedBox(height: 16),
                        FilledButton.icon(
                          onPressed: () {
                            if (requireSignedIn(context, ref)) context.push('/reels/new');
                          },
                          icon: const Icon(Icons.add),
                          label: Text(l.newReel),
                        ),
                      ],
                    ],
                  ),
                ),
              )
            : ReelPager(reels: page.data),
      ),
    );
  }
}

/// Swipeable reels, used by the feed and by "My reels".
class ReelPager extends StatelessWidget {
  const ReelPager({super.key, required this.reels, this.initialIndex = 0});

  final List<ReelResponse> reels;
  final int initialIndex;

  @override
  Widget build(BuildContext context) => PageView.builder(
    controller: PageController(initialPage: initialIndex),
    scrollDirection: Axis.vertical,
    itemCount: reels.length,
    itemBuilder: (_, i) => _ReelPage(reel: reels[i]),
  );
}

class _ReelPage extends ConsumerStatefulWidget {
  const _ReelPage({required this.reel});

  final ReelResponse reel;

  @override
  ConsumerState<_ReelPage> createState() => _ReelPageState();
}

class _ReelPageState extends ConsumerState<_ReelPage> {
  VideoPlayerController? _video;
  late ReelResponse _reel = widget.reel;
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

  Future<void> _more() async {
    final l = context.l10n;
    final choice = await showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: Text(l.editReel),
              onTap: () => Navigator.pop(ctx, 'edit'),
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: TnColors.sos),
              title: Text(l.deleteReel, style: const TextStyle(color: TnColors.sos)),
              onTap: () => Navigator.pop(ctx, 'delete'),
            ),
          ],
        ),
      ),
    );
    if (!mounted || choice == null) return;
    if (choice == 'edit') {
      final updated = await showReelEditSheet(context, _reel);
      if (updated != null && mounted) setState(() => _reel = updated);
      return;
    }
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.deleteReel),
        content: Text(l.deleteReelConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.cancel)),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: TnColors.sos),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l.delete),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await ref.read(reelsRepositoryProvider).delete(_reel.id);
      ref
        ..invalidate(myReelsProvider)
        ..invalidate(reelsFeedProvider);
      if (mounted) Navigator.of(context).maybePop();
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = _reel;
    final v = _video;
    final mine = ref.watch(sessionProvider).user?.id == r.creator.id;
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
              Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: TnColors.saffron,
                    child: Text(
                      r.creator.displayName.isEmpty ? '🙏' : r.creator.displayName[0],
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    r.creator.displayName,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (r.caption != null)
                Text(
                  r.caption!,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white),
                ),
              if (r.templeName != null) ...[
                const SizedBox(height: 6),
                Pill(r.templeName!, color: TnColors.accentSoft, icon: Icons.temple_hindu),
              ],
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
                onTap: () => SharePlus.instance.share(ShareParams(text: r.caption ?? 'TirthNow')),
              ),
              if (mine) _Action(icon: Icons.more_horiz, label: '', onTap: _more),
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
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Column(
      children: [
        IconButton(
          icon: Icon(icon, color: color, size: 28),
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
