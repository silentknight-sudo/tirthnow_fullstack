import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_models.dart';
import '../../../core/format/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../reviews/presentation/reviews_section.dart';
import '../data/bookings_repository.dart';
import 'checkout_flow.dart';

class ExperiencesScreen extends ConsumerWidget {
  const ExperiencesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return Scaffold(
      appBar: AppBar(title: Text(l.experiences)),
      body: AsyncView(
        value: ref.watch(experiencesProvider),
        onRetry: () => ref.invalidate(experiencesProvider),
        builder: (list) => list.isEmpty
            ? const EmptyState(icon: Icons.sailing_outlined)
            : ListView.separated(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                itemCount: list.length,
                separatorBuilder: (_, _) => const SizedBox(height: 12),
                itemBuilder: (_, i) {
                  final x = list[i];
                  return Card(
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(14),
                      title: Text(x.title, style: Theme.of(context).textTheme.titleMedium),
                      subtitle: Text('${x.durationMin} min · ${x.kind.replaceAll('_', ' ')}'),
                      trailing: Text(
                        formatRupees(x.pricePaise, locale: context.lang),
                        style: const TextStyle(fontWeight: FontWeight.w700, color: TnColors.navy),
                      ),
                      onTap: () => context.push('/book/experiences/${x.id}'),
                    ),
                  );
                },
              ),
      ),
    );
  }
}

class ExperienceDetailScreen extends ConsumerStatefulWidget {
  const ExperienceDetailScreen({super.key, required this.id});

  final String id;

  @override
  ConsumerState<ExperienceDetailScreen> createState() => _ExperienceDetailScreenState();
}

class _ExperienceDetailScreenState extends ConsumerState<ExperienceDetailScreen> {
  String? _slotId;
  int _seats = 1;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    return AsyncView(
      value: ref.watch(experienceProvider(widget.id)),
      onRetry: () => ref.invalidate(experienceProvider(widget.id)),
      builder: (x) {
        final slots = (x.slots ?? const <SlotResponse>[]).where((s) => s.remaining > 0).toList();
        return Scaffold(
          appBar: AppBar(title: Text(x.title)),
          body: ListView(
            padding: const EdgeInsets.fromLTRB(0, 8, 0, 120),
            children: [
              if (x.description != null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(x.description!),
                ),
              SectionTitle(l.slots),
              if (slots.isEmpty) const EmptyState(),
              RadioGroup<String>(
                groupValue: _slotId,
                onChanged: (v) => setState(() => _slotId = v),
                child: Column(
                  children: [
                    for (final s in slots)
                      RadioListTile<String>(
                        value: s.id,
                        title: Text(
                          '${formatIstDate(DateTime.parse(s.startsAt), locale: context.lang)} · ${formatIstTime(DateTime.parse(s.startsAt))}',
                        ),
                        subtitle: Text('${s.remaining} / ${s.capacity}'),
                      ),
                  ],
                ),
              ),
              ListTile(
                title: Text(l.seats),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.remove_circle_outline),
                      onPressed: _seats > 1 ? () => setState(() => _seats--) : null,
                    ),
                    Text('$_seats'),
                    IconButton(
                      icon: const Icon(Icons.add_circle_outline),
                      onPressed: _seats < x.maxGroupSize ? () => setState(() => _seats++) : null,
                    ),
                  ],
                ),
              ),
              ReviewsSection(targetType: 'experience', targetId: x.id),
            ],
          ),
          bottomNavigationBar: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton(
                onPressed: _slotId == null
                    ? null
                    : () => placeOrder(
                        context,
                        ref,
                        CreateOrderDto(
                          type: 'experience',
                          experience: ExperienceOrderDto(slotId: _slotId!, seats: _seats),
                        ),
                        description: x.title,
                      ),
                child: Text(l.payNow(formatRupees(x.pricePaise * _seats, locale: context.lang))),
              ),
            ),
          ),
        );
      },
    );
  }
}
