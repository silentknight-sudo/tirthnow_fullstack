import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_models.dart';
import '../../../core/providers.dart';
import '../../auth/data/session_controller.dart';
import '../../safety/data/location_service.dart';

/// Trips, live-location sharing and family groups.
class TripsRepository {
  TripsRepository(this._api);

  final ApiClient _api;

  Future<TripResponse?> active() async {
    final j = await _api.getJson('/trips/active');
    return j['trip'] is Map ? TripResponse.fromJson(asJson(j['trip'])) : null;
  }

  Future<List<TripResponse>> history() async =>
      TripPageResponse.fromJson(await _api.getJson('/trips', query: {'limit': 50})).data;

  Future<TripResponse> start({String? title, String? from, bool share = false}) async =>
      TripResponse.fromJson(
        asJson(
          await _api.post(
            '/trips',
            body: StartTripDto(title: title, fromPlace: from, shareLocation: share).toJson(),
          ),
        ),
      );

  Future<TripResponse> end(String id) async =>
      TripResponse.fromJson(asJson(await _api.post('/trips/$id/end')));

  Future<TripResponse> setSharing(String id, bool on) async => TripResponse.fromJson(
    asJson(await _api.patch('/trips/$id/sharing', body: TripSharingDto(sharing: on).toJson())),
  );

  Future<void> sendLocation(String id, Fix f) => _api.post(
    '/trips/$id/location',
    body: TripLocationDto(lat: f.lat, lng: f.lng, accuracyM: f.accuracyM?.round()).toJson(),
  );

  Future<TripShareResponse> share(String id) async =>
      TripShareResponse.fromJson(asJson(await _api.post('/trips/$id/share')));

  Future<List<FamilyGroupResponse>> groups() async =>
      (await _api.getList('/family/groups')).map(FamilyGroupResponse.fromJson).toList();

  Future<FamilyGroupResponse> createGroup(String name) async => FamilyGroupResponse.fromJson(
    asJson(await _api.post('/family/groups', body: CreateFamilyGroupDto(name: name).toJson())),
  );

  Future<FamilyGroupResponse> joinGroup(String code) async => FamilyGroupResponse.fromJson(
    asJson(await _api.post('/family/groups/join', body: JoinFamilyGroupDto(code: code).toJson())),
  );

  Future<void> setGroupSharing(String groupId, bool on) =>
      _api.patch('/family/groups/$groupId/me', body: FamilySharingDto(sharing: on).toJson());

  Future<void> leaveGroup(String groupId) => _api.delete('/family/groups/$groupId/me');
}

final tripsRepositoryProvider = Provider<TripsRepository>(
  (ref) => TripsRepository(ref.watch(apiClientProvider)),
);

final tripHistoryProvider = FutureProvider<List<TripResponse>>(
  (ref) => ref.watch(tripsRepositoryProvider).history(),
);

final familyGroupsProvider = FutureProvider<List<FamilyGroupResponse>>(
  (ref) => ref.watch(tripsRepositoryProvider).groups(),
);

/// The active trip, and a timer that sends the location every minute while
/// the traveller has sharing on (and only then).
class ActiveTripController extends AsyncNotifier<TripResponse?> {
  Timer? _timer;

  @override
  Future<TripResponse?> build() async {
    ref.onDispose(() => _timer?.cancel());
    final signedIn = ref.watch(sessionProvider.select((s) => s.signedIn && !s.isGuest));
    if (!signedIn) return null;
    final trip = await ref.read(tripsRepositoryProvider).active();
    _schedule(trip);
    return trip;
  }

  void _schedule(TripResponse? trip) {
    _timer?.cancel();
    if (trip == null || !trip.sharingLocation) return;
    unawaited(_send(trip.id));
    _timer = Timer.periodic(const Duration(minutes: 1), (_) => _send(trip.id));
  }

  Future<void> _send(String id) async {
    try {
      final fix = await ref.read(locationServiceProvider).current();
      // Never share a guessed position as if it were real.
      if (fix.approximate) return;
      await ref.read(tripsRepositoryProvider).sendLocation(id, fix);
    } on Object {
      // Try again on the next tick.
    }
  }

  void _set(TripResponse? t) {
    state = AsyncData(t);
    _schedule(t);
    ref.invalidate(tripHistoryProvider);
    ref.invalidate(familyGroupsProvider);
  }

  Future<void> start({String? title, String? from, required bool share}) async =>
      _set(await ref.read(tripsRepositoryProvider).start(title: title, from: from, share: share));

  Future<void> end() async {
    final t = state.value;
    if (t == null) return;
    await ref.read(tripsRepositoryProvider).end(t.id);
    _set(null);
  }

  Future<void> setSharing(bool on) async {
    final t = state.value;
    if (t == null) return;
    _set(await ref.read(tripsRepositoryProvider).setSharing(t.id, on));
  }
}

final activeTripProvider = AsyncNotifierProvider<ActiveTripController, TripResponse?>(
  ActiveTripController.new,
);
