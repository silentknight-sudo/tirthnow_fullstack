import 'package:flutter_test/flutter_test.dart';
import 'package:tirth_now/core/api/api_models.dart';
import 'package:tirth_now/features/ai/presentation/guide_cards.dart';

TempleSummaryResponse t(String id, String name, String city) => TempleSummaryResponse(
  cityId: city,
  crowdLevel: 2,
  id: id,
  lat: 27.5,
  lng: 77.6,
  name: name,
  slug: id,
  tags: const [],
);

void main() {
  final temples = [
    t('bb', 'Shri Banke Bihari Temple', 'vr'),
    t('pm', 'Prem Mandir', 'vr'),
    t('kj', 'Shri Krishna Janmabhoomi', 'mt'),
  ];
  const cities = [
    CityResponse(id: 'vr', lat: 27.58, lng: 77.7, name: 'Vrindavan', slug: 'vrindavan'),
    CityResponse(id: 'mt', lat: 27.49, lng: 77.67, name: 'Mathura', slug: 'mathura'),
  ];

  test('a temple named in the question wins', () {
    final p = detectPlace('Banke Bihari darshan timing?', 'In Vrindavan…', temples, cities);
    expect(p?.temple?.id, 'bb');
  });

  test('a city in the question gives its temples as highlights', () {
    final p = detectPlace('Show me details about Vrindavan Dham', 'The land…', temples, cities);
    expect(p?.city?.id, 'vr');
    expect(p?.cityTemples.map((e) => e.id), ['bb', 'pm']);
  });

  test('falls back to the answer, and to nothing', () {
    expect(detectPlace('Best sweets?', 'Try near Prem Mandir.', temples, cities)?.temple?.id, 'pm');
    expect(detectPlace('Hello', 'Radhe Radhe!', temples, cities), isNull);
  });
}
