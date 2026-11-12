import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_models.dart';
import '../../core/format/formatters.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common.dart';
import '../shared/partner_ui.dart';
import '../vendor/data/vendor_repository.dart';

final _reviewsProvider = FutureProvider.family<List<ReviewResponse>, String>(
  (ref, id) => ref.watch(vendorRepositoryProvider).reviews(id),
);

class ReviewsScreen extends ConsumerWidget {
  const ReviewsScreen({required this.vendorId, super.key});

  final String vendorId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.reviews)),
      body: AsyncView(
        value: ref.watch(_reviewsProvider(vendorId)),
        onRetry: () => ref.invalidate(_reviewsProvider(vendorId)),
        builder: (list) => list.isEmpty
            ? EmptyState(icon: Icons.star_outline_rounded, message: l.emptyList)
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                itemCount: list.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (_, i) => _ReviewCard(vendorId: vendorId, r: list[i]),
              ),
      ),
    );
  }
}

class _ReviewCard extends ConsumerWidget {
  const _ReviewCard({required this.vendorId, required this.r});

  final String vendorId;
  final ReviewResponse r;

  Future<void> _reply(BuildContext context, WidgetRef ref) async {
    final l = context.l10n;
    final c = TextEditingController(text: r.vendorReply);
    final text = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.reply),
        content: TextField(
          controller: c,
          maxLines: 4,
          decoration: InputDecoration(labelText: l.yourReply),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, c.text.trim()), child: Text(l.reply)),
        ],
      ),
    );
    if (text == null || text.isEmpty) return;
    try {
      await ref.read(vendorRepositoryProvider).reply(vendorId, r.id, text);
      ref.invalidate(_reviewsProvider(vendorId));
    } on Object catch (e) {
      if (context.mounted) showSnack(context, errorText(context, e));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final when = DateTime.tryParse(r.createdAt);
    return PanelCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundColor: TnColors.paper2,
                child: Text(
                  r.author.displayName.isEmpty ? '?' : r.author.displayName[0].toUpperCase(),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  r.author.displayName,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
              for (var i = 1; i <= 5; i++)
                Icon(
                  i <= r.rating ? Icons.star_rounded : Icons.star_outline_rounded,
                  size: 16,
                  color: const Color(0xFFF2A93B),
                ),
            ],
          ),
          if (when != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                formatIstDate(when, locale: context.lang),
                style: const TextStyle(fontSize: 12, color: TnColors.muted),
              ),
            ),
          if (r.body != null) ...[const SizedBox(height: 8), Text(r.body!)],
          if (r.vendorReply != null)
            Container(
              margin: const EdgeInsets.only(top: 10),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF3FA),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.reply_rounded, size: 16, color: TnColors.navy),
                  const SizedBox(width: 6),
                  Expanded(child: Text(r.vendorReply!, style: const TextStyle(fontSize: 13))),
                ],
              ),
            ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: () => _reply(context, ref),
              icon: const Icon(Icons.reply_rounded, size: 18),
              label: Text(r.vendorReply == null ? l.reply : l.edit),
            ),
          ),
        ],
      ),
    );
  }
}
