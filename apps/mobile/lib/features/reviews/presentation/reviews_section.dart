import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_models.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../bookings/presentation/checkout_flow.dart';

typedef ReviewTarget = ({String type, String id});

final reviewsProvider = FutureProvider.family<ReviewPageResponse, ReviewTarget>((ref, t) async {
  final api = ref.watch(apiClientProvider);
  return ReviewPageResponse.fromJson(
    await api.getJson('/reviews', query: {'targetType': t.type, 'targetId': t.id, 'limit': 5}),
  );
});

/// Rating summary, latest reviews and a "write a review" sheet. Only
/// verified guests can review bookable places; the API enforces that.
class ReviewsSection extends ConsumerWidget {
  const ReviewsSection({super.key, required this.targetType, required this.targetId});

  final String targetType;
  final String targetId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final target = (type: targetType, id: targetId);
    final page = ref.watch(reviewsProvider(target));
    return page.when(
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
      data: (p) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SectionTitle(
            p.summary.count > 0
                ? '★ ${p.summary.average.toStringAsFixed(1)} · ${p.summary.count}'
                : l.rating,
            action: l.writeReview,
            onAction: () => _write(context, ref, target),
          ),
          for (final r in p.data)
            ListTile(
              leading: CircleAvatar(
                backgroundColor: TnColors.paper2,
                child: Text(r.author.displayName.isEmpty ? '?' : r.author.displayName[0]),
              ),
              title: Text('${'★' * r.rating.round()}  ${r.author.displayName}'),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (r.body != null) Text(r.body!),
                  if (r.vendorReply != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        '↳ ${r.vendorReply!}',
                        style: const TextStyle(color: TnColors.muted),
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _write(BuildContext context, WidgetRef ref, ReviewTarget target) async {
    if (!requireSignedIn(context, ref)) return;
    final l = context.l10n;
    var rating = 5;
    final body = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      useRootNavigator: true,
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: EdgeInsets.fromLTRB(24, 0, 24, 24 + MediaQuery.of(ctx).viewInsets.bottom),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l.writeReview, style: Theme.of(ctx).textTheme.titleLarge),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var i = 1; i <= 5; i++)
                    IconButton(
                      tooltip: '$i',
                      icon: Icon(
                        i <= rating ? Icons.star : Icons.star_border,
                        color: TnColors.gold,
                        size: 32,
                      ),
                      onPressed: () => setSheet(() => rating = i),
                    ),
                ],
              ),
              TextField(
                controller: body,
                maxLines: 4,
                maxLength: 2000,
                decoration: InputDecoration(hintText: l.reviewHint),
              ),
              FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l.save)),
            ],
          ),
        ),
      ),
    );
    final text = body.text.trim();
    body.dispose();
    if (ok != true) return;
    try {
      await ref
          .read(apiClientProvider)
          .post(
            '/reviews',
            body: CreateReviewDto(
              targetType: target.type,
              targetId: target.id,
              rating: rating,
              body: text.isEmpty ? null : text,
            ).toJson(),
          );
      ref.invalidate(reviewsProvider(target));
    } on Object catch (e) {
      if (context.mounted) showSnack(context, errorText(context, e));
    }
  }
}
