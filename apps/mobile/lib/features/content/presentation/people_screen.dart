import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_models.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common.dart';
import '../../reels/data/reels_repository.dart';

/// Sample pilgrims for the demo build. Never shown as real or verified
/// visitors: every place that uses them carries a "Demo" label.
class DemoPilgrim {
  const DemoPilgrim(this.photo, this.name, this.city, this.place);
  final String photo;
  final String name;
  final String city;
  final String place;
}

const demoPilgrims = [
  DemoPilgrim('p1', 'Aarav', 'Delhi', 'Banke Bihari Ji'),
  DemoPilgrim('p2', 'Meera', 'Jaipur', 'Prem Mandir'),
  DemoPilgrim('p3', 'Ramesh ji', 'Agra', 'Banke Bihari Ji'),
  DemoPilgrim('p4', 'Savitri ji', 'Lucknow', 'Keshi Ghat'),
  DemoPilgrim('p5', 'Ananya', 'Indore', 'ISKCON Vrindavan'),
  DemoPilgrim('p6', 'Vikram', 'Mumbai', 'Govardhan'),
];

/// "DEMO" tag shown next to every sample profile.
class DemoBadge extends StatelessWidget {
  const DemoBadge({super.key});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF3BF),
      borderRadius: BorderRadius.circular(6),
      border: Border.all(color: const Color(0xFFF59F00)),
    ),
    child: Text(
      context.l10n.demo,
      style: const TextStyle(color: Color(0xFFB35C00), fontSize: 9.5, fontWeight: FontWeight.w900),
    ),
  );
}

/// People & community: creators to follow, and pilgrims around Braj (demo).
class PeopleScreen extends ConsumerWidget {
  const PeopleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final reels = ref.watch(reelsFeedProvider(forYouFeed)).value?.data ?? const <ReelResponse>[];
    final creators = <String, CreatorResponse>{for (final r in reels) r.creator.id: r.creator}
        .values
        .toList();
    return Scaffold(
      appBar: AppBar(title: Text(l.people)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
        children: [
          if (creators.isNotEmpty) ...[
            Text(l.creatorsToFollow, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            SizedBox(
              height: 110,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  for (final c in creators)
                    GestureDetector(
                      onTap: () => context.push('/reels/creator?id=${c.id}'),
                      child: Padding(
                        padding: const EdgeInsets.only(right: 14),
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(2.5),
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(
                                  colors: [TnColors.saffron, Color(0xFFE1306C)],
                                ),
                              ),
                              child: CircleAvatar(
                                radius: 32,
                                backgroundColor: TnColors.navy,
                                backgroundImage: c.avatarUrl == null
                                    ? null
                                    : NetworkImage(c.avatarUrl!),
                                child: c.avatarUrl == null
                                    ? Text(
                                        c.displayName.characters.first.toUpperCase(),
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 22,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      )
                                    : null,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              '@${c.displayName}',
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 10),
          ],
          Row(
            children: [
              Text(l.pilgrimsInBraj, style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(width: 8),
              const DemoBadge(),
            ],
          ),
          const SizedBox(height: 4),
          Text(l.demoPeopleNote, style: const TextStyle(color: TnColors.muted, fontSize: 12)),
          const SizedBox(height: 8),
          for (final p in demoPilgrims)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(
                radius: 24,
                backgroundImage: AssetImage('assets/images/demo-people/${p.photo}.jpg'),
              ),
              title: Row(
                children: [
                  Text(p.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(width: 6),
                  const DemoBadge(),
                ],
              ),
              subtitle: Text('${p.city} · ${l.atPlace(p.place)}'),
            ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () => context.push('/account/edit'),
            icon: const Icon(Icons.person_add_alt_1_rounded),
            label: Text(l.createProfile),
          ),
        ],
      ),
    );
  }
}
