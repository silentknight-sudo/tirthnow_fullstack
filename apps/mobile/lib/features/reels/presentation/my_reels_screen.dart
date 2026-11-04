import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_models.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../data/reels_repository.dart';
import 'reels_screen.dart';

/// Your profile as a creator: counts, a "New reel" button and a 3-column grid
/// of your reels (including ones still processing or under review).
class MyReelsScreen extends ConsumerWidget {
  const MyReelsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final page = ref.watch(myReelsProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text(l.myReels),
        actions: [
          IconButton(
            tooltip: l.newReel,
            icon: const Icon(Icons.add_box_outlined),
            onPressed: () => context.push('/reels/new'),
          ),
        ],
      ),
      body: AsyncView(
        value: page,
        onRetry: () => ref.invalidate(myReelsProvider),
        builder: (p) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(myReelsProvider),
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: _Header(profile: p.profile)),
              if (p.data.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Text(
                      l.noReelsYet,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: TnColors.muted),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.all(2),
                  sliver: SliverGrid.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      mainAxisSpacing: 2,
                      crossAxisSpacing: 2,
                      childAspectRatio: 9 / 16,
                    ),
                    itemCount: p.data.length,
                    itemBuilder: (_, i) => _Tile(
                      reel: p.data[i],
                      onTap: () => Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => _MyReelViewer(reels: p.data, index: i),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.profile});

  final CreatorProfileResponse profile;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    Widget stat(num n, String label) => Expanded(
      child: Column(
        children: [
          Text('$n', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          Text(label, style: const TextStyle(color: TnColors.muted, fontSize: 12)),
        ],
      ),
    );
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: TnColors.saffron,
                backgroundImage: profile.avatarUrl == null
                    ? null
                    : NetworkImage(profile.avatarUrl!),
                child: profile.avatarUrl == null
                    ? Text(
                        profile.displayName.isEmpty ? '🙏' : profile.displayName[0],
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              stat(profile.reelCount, l.reelsCount),
              stat(profile.followerCount, l.followers),
              stat(profile.followingCount, l.following),
            ],
          ),
          const SizedBox(height: 10),
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              profile.displayName,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () => context.push('/reels/new'),
              icon: const Icon(Icons.add),
              label: Text(l.newReel),
            ),
          ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.reel, required this.onTap});

  final ReelResponse reel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final status = reel.status != 'published'
        ? reel.status
        : (reel.moderationStatus == 'pending' || reel.moderationStatus == 'flagged'
              ? 'pending'
              : null);
    final label = switch (status) {
      'processing' => l.reelStatus_processing,
      'removed' => l.reelStatus_removed,
      'pending' => l.reelStatus_pending,
      _ => null,
    };
    return GestureDetector(
      onTap: onTap,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (reel.posterUrl != null)
            Image.network(
              reel.posterUrl!,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => const ColoredBox(color: TnColors.night),
            )
          else
            const ColoredBox(
              color: TnColors.night,
              child: Icon(Icons.movie_outlined, color: Colors.white38),
            ),
          Positioned(
            left: 6,
            bottom: 6,
            child: Row(
              children: [
                const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 16),
                Text(
                  '${reel.viewCount}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    shadows: [Shadow(blurRadius: 4)],
                  ),
                ),
              ],
            ),
          ),
          if (label != null)
            Positioned(left: 6, top: 6, child: Pill(label, color: TnColors.saffron)),
        ],
      ),
    );
  }
}

class _MyReelViewer extends StatelessWidget {
  const _MyReelViewer({required this.reels, required this.index});

  final List<ReelResponse> reels;
  final int index;

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: Colors.black,
    extendBodyBehindAppBar: true,
    appBar: AppBar(backgroundColor: Colors.transparent, foregroundColor: Colors.white),
    body: ReelPager(reels: reels, initialIndex: index),
  );
}
