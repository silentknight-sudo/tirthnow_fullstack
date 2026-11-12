import 'package:flutter_test/flutter_test.dart';
import 'package:tirth_now_vendor/features/shared/partner_ui.dart';

void main() {
  test('customer price adds 18% GST and 5% platform fee', () {
    expect(customerPrice(45000), 55350);
    expect(customerPrice(10000), 12300);
  });

  test('rupees typed by a partner become paise', () {
    expect(toPaise('450'), 45000);
    expect(toPaise('12.5'), 1250);
    expect(toPaise('abc'), isNull);
    expect(toPaise('-1'), isNull);
  });

  test('every vendor type maps to a service card', () {
    for (final t in ['cab', 'hotel', 'dharamshala', 'restaurant', 'store']) {
      expect(serviceFor(t).type, t);
    }
  });
}
