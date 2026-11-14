import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';
import 'package:video_player/video_player.dart';

import '../../../core/api/api_models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../../l10n/app_localizations.dart';
import '../../auth/data/session_controller.dart';
import '../../bookings/presentation/checkout_flow.dart';
import '../data/reels_repository.dart';
import 'reel_edit_sheet.dart';
import 'reel_player.dart';

/// Full-screen reels with For you / Following tabs, like, comment, save,
/// share, follow, report, and buttons to post or open your profile.
class ReelsScreen extends ConsumerStatefulWidget {
  const ReelsScreen({super.key, this.saved = false, this.hashtag});

  final bool saved;
  final String? hashtag;

  @override
  ConsumerState<ReelsScreen> createState() => _ReelsScreenState();
}

class _ReelsScreenState extends ConsumerState<ReelsScreen> {
  bool _following = false;

  FeedKey get _key => widget.saved
      ? savedFeed
      : widget.hashtag != null
      ? hashtagFeed(widget.hashtag!)
      : (_following ? followingFeed : forYouFeed);

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final feed = ref.watch(reelsFeedProvider(_key));
    final tabs = !widget.saved && widget.hashtag == null;
    Widget tab(String label, bool following) => GestureDetector(
      onTap: () {
        if (following && !requireSignedIn(context, ref)) return;
        setState(() => _following = following);
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                color: _following == following ? Colors.white : Colors.white60,
                fontWeight: FontWeight.w800,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 3),
            Container(
              width: 22,
              height: 2.5,
              color: _following == following ? Colors.white : Colors.transparent,
            ),
          ],
        ),
      ),
    );
    return Scaffold(
      backgroundColor: Colors.black,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        centerTitle: true,
        title: tabs
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [tab(l.forYou, false), tab(l.following, true)],
              )
            : Text(
                widget.hashtag != null ? '#${widget.hashtag}' : l.saved,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
              ),
        actions: [
          if (tabs) ...[
            IconButton(
              tooltip: l.newReel,
              icon: const Icon(Icons.add_box_outlined, size: 26),
              onPressed: () {
                if (requireSignedIn(context, ref)) context.push('/reels/new');
              },
            ),
            IconButton(
              tooltip: l.myReels,
              icon: const Icon(Icons.account_circle_outlined, size: 26),
              onPressed: () {
                if (requireSignedIn(context, ref)) context.push('/reels/mine');
              },
            ),
          ],
        ],
      ),
      body: AsyncView(
        value: feed,
        onRetry: () => ref.invalidate(reelsFeedProvider(_key)),
        builder: (page) => page.data.isEmpty
            ? _Empty(following: tabs && _following, canPost: tabs)
            : RefreshIndicator(
                onRefresh: () async => ref.invalidate(reelsFeedProvider(_key)),
                child: ReelPager(key: ValueKey(_key), reels: page.data),
              ),
      ),
    );
  }
}

class _Empty extends ConsumerWidget {
  const _Empty({required this.following, required this.canPost});

  final bool following;
  final bool canPost;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              following ? Icons.people_outline : Icons.play_circle_outline,
              color: Colors.white54,
              size: 56,
            ),
            const SizedBox(height: 12),
            Text(
              following ? l.followingEmpty : l.noReelsYet,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70),
            ),
            if (canPost && !following) ...[
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
    );
  }
}

/// Swipeable reels; only the reel on screen plays.
class ReelPager extends StatefulWidget {
  const ReelPager({super.key, required this.reels, this.initialIndex = 0});

  final List<ReelResponse> reels;
  final int initialIndex;

  @override
  State<ReelPager> createState() => _ReelPagerState();
}

class _ReelPagerState extends State<ReelPager> {
  late final _pages = PageController(initialPage: widget.initialIndex);
  late int _current = widget.initialIndex;
  bool _muted = false;

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PageView.builder(
    controller: _pages,
    scrollDirection: Axis.vertical,
    // Builds the next reel off-screen so its video is ready before the swipe.
    allowImplicitScrolling: true,
    itemCount: widget.reels.length,
    onPageChanged: (i) => setState(() => _current = i),
    itemBuilder: (_, i) => _ReelPage(
      key: ValueKey(widget.reels[i].id),
      reel: widget.reels[i],
      active: i == _current,
      muted: _muted,
      onMute: () => setState(() => _muted = !_muted),
    ),
  );
}

class _ReelPage extends ConsumerStatefulWidget {
  const _ReelPage({
    super.key,
    required this.reel,
    required this.active,
    required this.muted,
    required this.onMute,
  });

  final ReelResponse reel;
  final bool active;
  final bool muted;
  final VoidCallback onMute;

  @override
  ConsumerState<_ReelPage> createState() => _ReelPageState();
}

class _ReelPageState extends ConsumerState<_ReelPage> with TickerProviderStateMixin {
  VideoPlayerController? _video;
  ReelPlayback? _playback;
  late ReelResponse _reel = widget.reel;
  late bool _liked = widget.reel.likedByMe;
  late bool _savedByMe = widget.reel.savedByMe;
  late num _likes = widget.reel.likeCount;
  late bool _followingCreator = widget.reel.followingCreator;
  bool _expanded = false;
  bool _viewed = false;
  late final _disc = AnimationController(vsync: this, duration: const Duration(seconds: 5));
  late final _heart = AnimationController(vsync: this, duration: const Duration(milliseconds: 700));

  ReelEditsDto get _edits => _reel.edits ?? noEdits;

  @override
  void initState() {
    super.initState();
    _load();
    if (widget.active) _markViewed();
  }

  bool _failed = false;
  (bool, bool, bool, bool)? _lastState;

  void _load() {
    final url = widget.reel.playbackUrl;
    if (url == null) return;
    final v = VideoPlayerController.networkUrl(
      Uri.parse(url),
      videoPlayerOptions: VideoPlayerOptions(mixWithOthers: true),
    );
    _video = v;
    _failed = false;
    v
      ..setLooping(true)
      ..addListener(_tick)
      ..initialize()
          .then((_) async {
            if (!mounted) return;
            _playback = ReelPlayback(v, _edits);
            await _playback!.attach();
            await _applyVolume();
            if (widget.active) await v.play();
            if (mounted) setState(() {});
          })
          .catchError((Object _) {
            if (mounted) setState(() => _failed = true);
          });
  }

  void _retry() {
    final old = _video;
    _playback?.detach();
    _playback = null;
    if (old != null) {
      old.removeListener(_tick);
      unawaited(old.dispose());
    }
    setState(() => _video = null);
    _load();
  }

  @override
  void didUpdateWidget(_ReelPage old) {
    super.didUpdateWidget(old);
    final v = _video;
    if (old.active != widget.active && v != null && v.value.isInitialized) {
      if (widget.active) {
        unawaited(v.play());
        _markViewed();
      } else {
        unawaited(v.pause());
      }
    }
    if (old.muted != widget.muted) unawaited(_applyVolume());
  }

  void _markViewed() {
    if (_viewed) return;
    _viewed = true;
    ref.read(apiClientProvider).post('/reels/${widget.reel.id}/view').ignore();
  }

  Future<void> _applyVolume() async => _video?.setVolume(widget.muted || _edits.muted ? 0 : 1);

  /// Rebuild only when play / buffer / ready / error state changes, not on
  /// every position update (the progress bar listens on its own).
  void _tick() {
    final v = _video;
    if (v == null || !mounted) return;
    final st = (v.value.isInitialized, v.value.isPlaying, v.value.isBuffering, v.value.hasError);
    if (st == _lastState) return;
    _lastState = st;
    setState(() => _failed = v.value.hasError);
  }

  @override
  void dispose() {
    _playback?.detach();
    _video
      ?..removeListener(_tick)
      ..dispose();
    _heart.dispose();
    _disc.dispose();
    super.dispose();
  }

  Future<void> _toggle(String action, bool on) async {
    final api = ref.read(apiClientProvider);
    final path = '/reels/${widget.reel.id}/$action';
    try {
      on ? await api.post(path) : await api.delete(path);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  void _setLiked(bool on) {
    if (!requireSignedIn(context, ref)) return;
    if (on == _liked) return;
    setState(() {
      _liked = on;
      _likes += on ? 1 : -1;
    });
    unawaited(_toggle('like', on));
  }

  void _doubleTap() {
    unawaited(_heart.forward(from: 0));
    _setLiked(true);
  }

  Future<void> _follow() async {
    if (!requireSignedIn(context, ref)) return;
    final on = !_followingCreator;
    setState(() => _followingCreator = on);
    try {
      await ref.read(reelsRepositoryProvider).follow(_reel.creator.id, on: on);
      ref
        ..invalidate(creatorProvider(_reel.creator.id))
        ..invalidate(reelsFeedProvider(followingFeed));
    } on Object catch (e) {
      if (mounted) {
        setState(() => _followingCreator = !on);
        showSnack(context, errorText(context, e));
      }
    }
  }

  void _openCreator() => context.push('/reels/creator?id=${_reel.creator.id}');

  Future<void> _more({required bool mine}) async {
    final l = context.l10n;
    final choice = await showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (mine) ...[
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
            ] else ...[
              ListTile(
                leading: const Icon(Icons.person_outline),
                title: Text(l.viewProfile),
                onTap: () => Navigator.pop(ctx, 'profile'),
              ),
              ListTile(
                leading: const Icon(Icons.flag_outlined, color: TnColors.sos),
                title: Text(l.report, style: const TextStyle(color: TnColors.sos)),
                onTap: () => Navigator.pop(ctx, 'report'),
              ),
            ],
          ],
        ),
      ),
    );
    if (!mounted || choice == null) return;
    switch (choice) {
      case 'edit':
        final updated = await showReelEditSheet(context, _reel);
        if (updated != null && mounted) {
          setState(() => _reel = updated);
          await _playback?.apply(_edits);
          await _applyVolume();
        }
      case 'delete':
        await _delete();
      case 'profile':
        _openCreator();
      case 'report':
        await _report();
    }
  }

  Future<void> _report() async {
    if (!requireSignedIn(context, ref)) return;
    final l = context.l10n;
    final reasons = {
      'spam': l.reportSpam,
      'nudity': l.reportNudity,
      'hate': l.reportHate,
      'violence': l.reportViolence,
      'harassment': l.reportHarassment,
      'misinformation': l.reportMisinformation,
      'scam': l.reportScam,
      'other': l.reportOther,
    };
    final reason = await showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: Text(l.reportWhy, style: Theme.of(ctx).textTheme.titleMedium),
            ),
            for (final e in reasons.entries)
              ListTile(title: Text(e.value), onTap: () => Navigator.pop(ctx, e.key)),
          ],
        ),
      ),
    );
    if (reason == null || !mounted) return;
    try {
      await ref.read(reelsRepositoryProvider).report(_reel.id, reason);
      if (mounted) showSnack(context, l.reportThanks);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  Future<void> _delete() async {
    final l = context.l10n;
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
    final l = context.l10n;
    final r = _reel;
    final v = _video;
    final mine = ref.watch(sessionProvider).user?.id == r.creator.id;
    final ready = v != null && v.value.isInitialized;
    final top = MediaQuery.of(context).padding.top;
    final muted = widget.muted || _edits.muted;
    if (ready && v.value.isPlaying) {
      if (!_disc.isAnimating) unawaited(_disc.repeat());
    } else if (_disc.isAnimating) {
      _disc.stop();
    }
    return Stack(
      fit: StackFit.expand,
      children: [
        GestureDetector(
          onTap: () {
            if (!ready) return;
            v.value.isPlaying ? v.pause() : v.play();
          },
          onDoubleTap: _doubleTap,
          onLongPressStart: (_) => v?.pause(),
          onLongPressEnd: (_) => v?.play(),
          child: ready
              ? EditedVideo(controller: v, edits: _edits)
              : Stack(
                  fit: StackFit.expand,
                  children: [
                    if (r.posterUrl != null)
                      withReelFilter(
                        _edits.filter,
                        Image.network(
                          r.posterUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => const ColoredBox(color: TnColors.night),
                        ),
                      )
                    else
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [TnColors.night, Color(0xFF2A1A40)],
                          ),
                        ),
                      ),
                    ReelOverlays(overlays: _edits.overlays),
                    if (_failed)
                      Center(
                        child: FilledButton.icon(
                          onPressed: _retry,
                          icon: const Icon(Icons.refresh_rounded),
                          label: Text(l.retry),
                        ),
                      )
                    else if (r.playbackUrl != null && widget.active)
                      const Center(
                        child: SizedBox(
                          width: 34,
                          height: 34,
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white70),
                        ),
                      ),
                  ],
                ),
        ),
        // Readability scrims, top and bottom.
        IgnorePointer(
          child: Column(
            children: [
              Container(
                height: top + 110,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0x8C000000), Colors.transparent],
                  ),
                ),
              ),
              const Spacer(),
              Container(
                height: 340,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.transparent, Color(0x66000000), Color(0xD9000000)],
                    stops: [0, 0.45, 1],
                  ),
                ),
              ),
            ],
          ),
        ),
        IgnorePointer(
          child: Center(
            child: AnimatedOpacity(
              opacity: ready && !v.value.isPlaying ? 1 : 0,
              duration: const Duration(milliseconds: 180),
              child: Container(
                width: 74,
                height: 74,
                decoration: const BoxDecoration(color: Color(0x59000000), shape: BoxShape.circle),
                child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 52),
              ),
            ),
          ),
        ),
        // Double-tap heart.
        IgnorePointer(
          child: Center(
            child: AnimatedBuilder(
              animation: _heart,
              builder: (_, _) {
                final t = _heart.value;
                if (t == 0 || t == 1) return const SizedBox.shrink();
                final scale = t < 0.3 ? 0.6 + t * 2 : 1.2 - (t - 0.3) * 0.3;
                return Opacity(
                  opacity: t < 0.7 ? 1 : (1 - t) / 0.3,
                  child: Transform.scale(
                    scale: scale,
                    child: ShaderMask(
                      shaderCallback: (b) => const LinearGradient(
                        colors: [Color(0xFFFF3040), TnColors.saffron],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ).createShader(b),
                      child: const Icon(
                        Icons.favorite,
                        color: Colors.white,
                        size: 116,
                        shadows: [Shadow(blurRadius: 24, color: Colors.black38)],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        Positioned(
          right: 12,
          top: top + 58,
          child: GestureDetector(
            onTap: widget.onMute,
            child: Container(
              padding: const EdgeInsets.all(7),
              decoration: BoxDecoration(
                color: const Color(0x40000000),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white24),
              ),
              child: Icon(
                muted ? Icons.volume_off_rounded : Icons.volume_up_rounded,
                color: Colors.white,
                size: 18,
              ),
            ),
          ),
        ),
        Positioned(
          left: 14,
          right: 72,
          bottom: 22,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  GestureDetector(
                    onTap: _openCreator,
                    child: Row(
                      children: [
                        _RingAvatar(creator: r.creator),
                        const SizedBox(width: 9),
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 150),
                          child: Text(
                            r.creator.displayName,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                              shadows: [Shadow(blurRadius: 6, color: Colors.black54)],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (!mine) ...[
                    const SizedBox(width: 10),
                    GestureDetector(
                      onTap: _follow,
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                          color: _followingCreator ? const Color(0x33FFFFFF) : Colors.transparent,
                          border: Border.all(
                            color: _followingCreator ? Colors.transparent : Colors.white,
                            width: 1.2,
                          ),
                          borderRadius: BorderRadius.circular(9),
                        ),
                        child: Text(
                          _followingCreator ? l.followingButton : l.follow,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 10),
              if (r.caption != null)
                GestureDetector(
                  onTap: () => setState(() => _expanded = !_expanded),
                  child: AnimatedSize(
                    duration: const Duration(milliseconds: 200),
                    alignment: Alignment.topLeft,
                    child: _Caption(
                      text: r.caption!,
                      expanded: _expanded,
                      onTag: (t) => context.push('/reels/tag?t=${Uri.encodeComponent(t)}'),
                    ),
                  ),
                ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  if (r.templeName != null)
                    _GlassChip(
                      icon: Icons.location_on_rounded,
                      label: r.templeName!,
                      iconColor: TnColors.saffron,
                      onTap: r.templeId == null
                          ? null
                          : () => context.push('/temples/${r.templeId}'),
                    ),
                  _GlassChip(icon: Icons.play_arrow_rounded, label: compactCount(r.viewCount)),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  const Icon(Icons.graphic_eq_rounded, color: Colors.white, size: 15),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      '${l.originalAudio} · ${r.creator.displayName}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white, fontSize: 12.5),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        Positioned(
          right: 6,
          bottom: 18,
          child: Column(
            children: [
              _Action(
                icon: _liked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                label: compactCount(_likes),
                color: _liked ? const Color(0xFFFF3040) : Colors.white,
                pop: _liked,
                onTap: () => _setLiked(!_liked),
              ),
              _Action(
                icon: Icons.mode_comment_outlined,
                label: compactCount(r.commentCount),
                onTap: () => showReelComments(context, r.id),
              ),
              _Action(
                icon: Icons.send_rounded,
                label: l.share,
                onTap: () => SharePlus.instance.share(
                  ShareParams(text: '${r.caption ?? 'TirthNow'}\n— ${r.creator.displayName}'),
                ),
              ),
              _Action(
                icon: _savedByMe ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                label: '',
                pop: _savedByMe,
                onTap: () {
                  if (!requireSignedIn(context, ref)) return;
                  setState(() => _savedByMe = !_savedByMe);
                  unawaited(_toggle('save', _savedByMe));
                },
              ),
              _Action(
                icon: Icons.more_horiz_rounded,
                label: '',
                onTap: () => _more(mine: mine),
              ),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: _openCreator,
                child: RotationTransition(
                  turns: _disc,
                  child: Container(
                    width: 34,
                    height: 34,
                    padding: const EdgeInsets.all(6),
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: SweepGradient(
                        colors: [Color(0xFF222222), Color(0xFF555555), Color(0xFF222222)],
                      ),
                    ),
                    child: ClipOval(child: _Avatar(creator: r.creator)),
                  ),
                ),
              ),
            ],
          ),
        ),
        if (ready && v.value.isBuffering && widget.active)
          const IgnorePointer(
            child: Center(
              child: SizedBox(
                width: 34,
                height: 34,
                child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white70),
              ),
            ),
          ),
        if (ready && _playback != null)
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: ValueListenableBuilder<VideoPlayerValue>(
              valueListenable: v,
              builder: (_, _, _) => LinearProgressIndicator(
                value: _playback?.progress ?? 0,
                minHeight: 2.5,
                backgroundColor: Colors.white24,
                color: TnColors.saffron,
              ),
            ),
          ),
      ],
    );
  }
}

/// 950 → "950", 12_400 → "12.4K", 3_200_000 → "3.2M".
String compactCount(num n) {
  if (n < 1000) return '$n';
  if (n < 1000000) return '${(n / 1000).toStringAsFixed(n < 10000 ? 1 : 0)}K';
  return '${(n / 1000000).toStringAsFixed(1)}M';
}

class _Caption extends StatelessWidget {
  const _Caption({required this.text, required this.expanded, required this.onTag});

  final String text;
  final bool expanded;
  final void Function(String tag) onTag;

  @override
  Widget build(BuildContext context) {
    final spans = <InlineSpan>[];
    final re = RegExp(r'#([\p{L}\p{N}_]{1,40})', unicode: true);
    var last = 0;
    for (final m in re.allMatches(text)) {
      if (m.start > last) spans.add(TextSpan(text: text.substring(last, m.start)));
      final tag = m.group(1)!;
      spans.add(
        WidgetSpan(
          alignment: PlaceholderAlignment.baseline,
          baseline: TextBaseline.alphabetic,
          child: GestureDetector(
            onTap: () => onTag(tag.toLowerCase()),
            child: Text(
              '#$tag',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      );
      last = m.end;
    }
    if (last < text.length) spans.add(TextSpan(text: text.substring(last)));
    return Text.rich(
      TextSpan(children: spans),
      maxLines: expanded ? 12 : 2,
      overflow: TextOverflow.ellipsis,
      style: const TextStyle(color: Colors.white, height: 1.3),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.creator, this.radius});

  final CreatorResponse creator;
  final double? radius;

  @override
  Widget build(BuildContext context) {
    final url = creator.avatarUrl;
    final initial = Text(
      creator.displayName.isEmpty ? '🙏' : creator.displayName[0].toUpperCase(),
      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
    );
    if (radius == null) {
      return url == null
          ? ColoredBox(
              color: TnColors.saffron,
              child: Center(child: initial),
            )
          : Image.network(url, fit: BoxFit.cover);
    }
    return CircleAvatar(
      radius: radius,
      backgroundColor: TnColors.saffron,
      backgroundImage: url == null ? null : NetworkImage(url),
      child: url == null ? initial : null,
    );
  }
}

/// Creator avatar with an Instagram-style gradient ring.
class _RingAvatar extends StatelessWidget {
  const _RingAvatar({required this.creator});

  final CreatorResponse creator;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(2),
    decoration: const BoxDecoration(
      shape: BoxShape.circle,
      gradient: LinearGradient(
        colors: [TnColors.saffron, Color(0xFFE1306C), Color(0xFF8E24AA)],
        begin: Alignment.bottomLeft,
        end: Alignment.topRight,
      ),
    ),
    child: Container(
      padding: const EdgeInsets.all(1.5),
      decoration: const BoxDecoration(color: Colors.black, shape: BoxShape.circle),
      child: _Avatar(creator: creator, radius: 16),
    ),
  );
}

/// Frosted chip for temple tag and views.
class _GlassChip extends StatelessWidget {
  const _GlassChip({required this.icon, required this.label, this.iconColor, this.onTap});

  final IconData icon;
  final String label;
  final Color? iconColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.fromLTRB(8, 4, 10, 4),
      decoration: BoxDecoration(
        color: const Color(0x2EFFFFFF),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0x33FFFFFF)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: iconColor ?? Colors.white),
          const SizedBox(width: 4),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 170),
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _Action extends StatelessWidget {
  const _Action({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color = Colors.white,
    this.pop = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color color;

  /// Bounces once when this turns on (like, save).
  final bool pop;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Column(
      children: [
        IconButton(
          visualDensity: VisualDensity.compact,
          icon: TweenAnimationBuilder<double>(
            key: ValueKey(pop),
            tween: Tween(begin: pop ? 0.6 : 1, end: 1),
            duration: const Duration(milliseconds: 350),
            curve: Curves.elasticOut,
            builder: (_, s, child) => Transform.scale(scale: s, child: child),
            child: Icon(
              icon,
              color: color,
              size: 30,
              shadows: const [Shadow(blurRadius: 10, color: Colors.black54)],
            ),
          ),
          onPressed: onTap,
        ),
        if (label.isNotEmpty)
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w700,
              shadows: [Shadow(blurRadius: 6, color: Colors.black54)],
            ),
          ),
      ],
    ),
  );
}

/// Comments sheet with replies, like Instagram.
Future<void> showReelComments(BuildContext context, String reelId) => showModalBottomSheet<void>(
  useRootNavigator: true,
  context: context,
  isScrollControlled: true,
  showDragHandle: true,
  builder: (_) => _Comments(reelId: reelId),
);

class _Comments extends ConsumerStatefulWidget {
  const _Comments({required this.reelId});

  final String reelId;

  @override
  ConsumerState<_Comments> createState() => _CommentsState();
}

class _CommentsState extends ConsumerState<_Comments> {
  final _text = TextEditingController();
  final _focus = FocusNode();
  CommentResponse? _replyTo;
  bool _sending = false;

  @override
  void dispose() {
    _text.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final body = _text.text.trim();
    if (body.isEmpty || _sending || !requireSignedIn(context, ref)) return;
    final l = context.l10n;
    setState(() => _sending = true);
    try {
      await ref
          .read(reelsRepositoryProvider)
          .comment(widget.reelId, body, parentId: _replyTo?.parentId ?? _replyTo?.id);
      _text.clear();
      setState(() => _replyTo = null);
      ref.invalidate(reelCommentsProvider(widget.reelId));
      if (mounted) showSnack(context, l.commentPosted);
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _delete(CommentResponse c) async {
    try {
      await ref.read(reelsRepositoryProvider).deleteComment(widget.reelId, c.id);
      ref.invalidate(reelCommentsProvider(widget.reelId));
    } on Object catch (e) {
      if (mounted) showSnack(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final me = ref.watch(sessionProvider).user?.id;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.65,
        child: Column(
          children: [
            Text(l.comments, style: Theme.of(context).textTheme.titleMedium),
            const Divider(),
            Expanded(
              child: AsyncView(
                value: ref.watch(reelCommentsProvider(widget.reelId)),
                builder: (list) {
                  if (list.isEmpty) {
                    return EmptyState(icon: Icons.mode_comment_outlined, message: l.noCommentsYet);
                  }
                  // Top-level comments oldest first, each followed by its replies.
                  final top = list.where((c) => c.parentId == null).toList().reversed.toList();
                  final replies = <String, List<CommentResponse>>{};
                  for (final c in list.reversed.where((c) => c.parentId != null)) {
                    (replies[c.parentId!] ??= []).add(c);
                  }
                  return ListView(
                    children: [
                      for (final c in top) ...[
                        _CommentTile(
                          c: c,
                          mine: c.author.id == me,
                          onReply: () {
                            setState(() => _replyTo = c);
                            _focus.requestFocus();
                          },
                          onDelete: () => _delete(c),
                        ),
                        for (final r in replies[c.id] ?? const <CommentResponse>[])
                          Padding(
                            padding: const EdgeInsets.only(left: 44),
                            child: _CommentTile(
                              c: r,
                              mine: r.author.id == me,
                              onReply: () {
                                setState(() => _replyTo = r);
                                _focus.requestFocus();
                              },
                              onDelete: () => _delete(r),
                            ),
                          ),
                      ],
                    ],
                  );
                },
              ),
            ),
            if (_replyTo != null)
              Container(
                color: TnColors.accentSoft,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        l.replyingTo(_replyTo!.author.displayName),
                        style: const TextStyle(color: TnColors.muted, fontSize: 12),
                      ),
                    ),
                    GestureDetector(
                      onTap: () => setState(() => _replyTo = null),
                      child: const Icon(Icons.close, size: 16),
                    ),
                  ],
                ),
              ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 6, 12, 8),
                child: Row(
                  children: [
                    for (final e in ['🙏', '❤️', '🌸', '🔥', '😍'])
                      GestureDetector(
                        onTap: () {
                          _text.text = '${_text.text}$e';
                          _text.selection = TextSelection.collapsed(offset: _text.text.length);
                        },
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 3),
                          child: Text(e, style: const TextStyle(fontSize: 20)),
                        ),
                      ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: TextField(
                        controller: _text,
                        focusNode: _focus,
                        maxLength: 1000,
                        textInputAction: TextInputAction.send,
                        decoration: InputDecoration(
                          hintText: l.addComment,
                          counterText: '',
                          isDense: true,
                        ),
                        onSubmitted: (_) => _send(),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.send, color: TnColors.saffron),
                      onPressed: _sending ? null : _send,
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

class _CommentTile extends StatelessWidget {
  const _CommentTile({
    required this.c,
    required this.mine,
    required this.onReply,
    required this.onDelete,
  });

  final CommentResponse c;
  final bool mine;
  final VoidCallback onReply;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 8, 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: () => context.push('/reels/creator?id=${c.author.id}'),
            child: _Avatar(creator: c.author, radius: 15),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: c.author.displayName,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                      TextSpan(
                        text: '  ${timeAgo(l, DateTime.parse(c.createdAt))}',
                        style: const TextStyle(color: TnColors.muted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 2),
                Text(c.body),
                const SizedBox(height: 4),
                Row(
                  children: [
                    GestureDetector(
                      onTap: onReply,
                      child: Text(
                        l.reply,
                        style: const TextStyle(
                          color: TnColors.muted,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    if (mine) ...[
                      const SizedBox(width: 16),
                      GestureDetector(
                        onTap: onDelete,
                        child: Text(
                          l.delete,
                          style: const TextStyle(color: TnColors.sos, fontSize: 12),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// "now", "5m", "3h", "2d", "4w".
String timeAgo(AppLocalizations l, DateTime t) {
  final d = DateTime.now().toUtc().difference(t.toUtc());
  if (d.inMinutes < 1) return l.justNow;
  if (d.inHours < 1) return '${d.inMinutes}m';
  if (d.inDays < 1) return '${d.inHours}h';
  if (d.inDays < 7) return '${d.inDays}d';
  return '${d.inDays ~/ 7}w';
}
