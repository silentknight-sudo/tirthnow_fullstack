import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_models.dart';
import '../../../core/providers.dart';

/// Pandit Ji services: puja, path and jyotish / palmistry / astrology consultations.
/// They are bookable experiences (slot + payment) offered by `pandit` vendors.
const panditKinds = ['puja', 'path', 'jyotish', 'palmistry', 'astrology'];

final panditServicesProvider = FutureProvider<List<ExperienceResponse>>((ref) async {
  final list = await ref
      .watch(apiClientProvider)
      .getList('/experiences', query: {'group': 'pandit'});
  // Puja first, then path, then the consultations; cheapest first inside each.
  return list.map(ExperienceResponse.fromJson).toList()..sort((a, b) {
    final k = panditKinds.indexOf(a.kind).compareTo(panditKinds.indexOf(b.kind));
    return k != 0 ? k : a.pricePaise.compareTo(b.pricePaise);
  });
});

/// Selected category chip on the Pandit Ji screen (null = all).
final panditKindProvider = NotifierProvider<PanditKind, String?>(PanditKind.new);

class PanditKind extends Notifier<String?> {
  @override
  String? build() => null;

  void set(String? v) => state = v;
}
