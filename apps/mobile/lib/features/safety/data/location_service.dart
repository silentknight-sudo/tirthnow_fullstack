import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

/// A position fix. [approximate] is true when the GPS was unavailable and
/// the app fell back to the pilgrim's area (central Vrindavan).
class Fix {
  const Fix(this.lat, this.lng, {this.accuracyM, this.approximate = false});

  final double lat;
  final double lng;
  final double? accuracyM;
  final bool approximate;
}

abstract interface class LocationService {
  Future<Fix> current();
}

class GeolocatorLocationService implements LocationService {
  static const _fallback = Fix(27.5806, 77.7006, accuracyM: 5000, approximate: true);

  @override
  Future<Fix> current() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) return _fallback;
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) perm = await Geolocator.requestPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) {
        return _fallback;
      }
      final p = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );
      return Fix(p.latitude, p.longitude, accuracyM: p.accuracy);
    } on Object {
      final last = await Geolocator.getLastKnownPosition().catchError((Object _) => null);
      return last == null
          ? _fallback
          : Fix(last.latitude, last.longitude, accuracyM: last.accuracy);
    }
  }
}

final locationServiceProvider = Provider<LocationService>((ref) => GeolocatorLocationService());
